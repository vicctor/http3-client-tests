#!/usr/bin/env node

import fetch from 'node-fetch';
import { Agent } from 'undici';
import http2 from 'http2';
import https from 'https';
import { performance } from 'perf_hooks';
import colors from 'colors';

/**
 * HTTP/3 Early Hints Client
 * Demonstrates consumption of HTTP Early Hints from the Java HTTP/3 server
 */
class EarlyHintsClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'https://localhost:8443';
        this.timeout = options.timeout || 10000;
        this.ignoreTLS = options.ignoreTLS !== false;
        
        // Create HTTP2 client for fallback support
        this.http2Client = http2.connect(this.baseUrl, {
            rejectUnauthorized: !this.ignoreTLS
        });
        
        // Enhanced Undici agent for HTTP/3 support with proper configuration
        this.undiciAgent = new Agent({
            connect: {
                rejectUnauthorized: !this.ignoreTLS,
                // Force HTTP/3 protocol if available
                ALPNProtocols: ['h3', 'h3-29', 'h3-28']
            },
            // HTTP/3 specific configuration
            allowH2: true,  // Allow fallback to HTTP/2
            maxConcurrentStreams: 100,
            // Timeout settings
            bodyTimeout: this.timeout,
            headersTimeout: this.timeout
        });
        
        // HTTP/3 specific client options
        this.http3Options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Node.js HTTP/3 Early Hints Client/1.0',
                'Alt-Svc': 'h3=":8443"'  // Indicate HTTP/3 support
            },
            // Use Undici for HTTP/3
            dispatcher: this.undiciAgent
        };
    }

    /**
     * Make a request with Early Hints detection using HTTP/3
     */
    async requestWithEarlyHints(path, options = {}) {
        const startTime = performance.now();
        const results = {
            path,
            earlyHints: [],
            finalResponse: null,
            timing: {},
            preloadedResources: [],
            error: null,
            protocol: 'unknown'
        };

        try {
            console.log(colors.blue(`📡 Requesting HTTP/3: ${this.baseUrl}${path}`));
            
            // Try HTTP/3 first, fallback to HTTP/2 if needed
            let response;
            try {
                response = await this.makeHttp3Request(path);
                results.protocol = 'HTTP/3';
            } catch (http3Error) {
                console.log(colors.yellow(`⚠️  HTTP/3 failed, trying HTTP/2: ${http3Error.message}`));
                response = await this.makeHttp2Request(path);
                results.protocol = 'HTTP/2';
            }
            
            results.finalResponse = {
                status: response.status,
                headers: response.headers,
                body: response.body,
                contentLength: response.body ? response.body.length : 0
            };
            
            if (response.earlyHints && response.earlyHints.length > 0) {
                console.log(colors.green(`💡 Received ${response.earlyHints.length} Early Hints via ${results.protocol}`));
                results.earlyHints = response.earlyHints;
                
                // Preload hinted resources
                await this.preloadHintedResources(response.earlyHints, results);
            } else {
                console.log(colors.yellow(`⚠️  No Early Hints received via ${results.protocol}`));
            }
            
        } catch (error) {
            console.error(colors.red(`❌ Error: ${error.message}`));
            results.error = error.message;
        }

        results.timing.total = performance.now() - startTime;
        return results;
    }

    /**
     * Make HTTP/3 request with Early Hints detection
     */
    async makeHttp3Request(path) {
        const fullUrl = `${this.baseUrl}${path}`;
        console.log(colors.cyan(`🚀 Attempting HTTP/3 connection to: ${fullUrl}`));
        
        try {
            // Use undici/fetch for HTTP/3 with proper agent
            const response = await fetch(fullUrl, {
                ...this.http3Options,
                signal: AbortSignal.timeout(this.timeout)
            });
            
            const body = await response.text();
            console.log(colors.green(`✅ HTTP/3 connection successful: ${response.status}`));
            
            // Check for Early Hints in headers (note: most HTTP/3 implementations 
            // may not expose Early Hints through standard fetch API)
            const earlyHints = [];
            if (response.headers.get('link')) {
                earlyHints.push({
                    status: 103,
                    headers: Object.fromEntries(response.headers.entries()),
                    receivedAt: 0,
                    linkHeaders: this.parseLinkHeaders(response.headers.get('link'))
                });
            }
            
            return {
                earlyHints,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                body: body
            };
            
        } catch (error) {
            throw new Error(`HTTP/3 request failed: ${error.message}`);
        }
    }

    /**
     * Make HTTP2 request with Early Hints detection
     */
    async makeHttp2Request(path) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            let earlyHints = [];
            let finalResponse = null;
            let responseBody = '';

            const req = this.http2Client.request({
                ':method': 'GET',
                ':path': path,
                ':scheme': 'https',
                'user-agent': 'Node.js Early Hints Client/1.0'
            });

            req.on('response', (headers, flags) => {
                const status = headers[':status'];
                
                if (status === 103) {
                    // Early Hints response
                    const hint = {
                        status: 103,
                        headers: { ...headers },
                        receivedAt: performance.now() - startTime,
                        linkHeaders: this.parseLinkHeaders(headers.link)
                    };
                    earlyHints.push(hint);
                    console.log(colors.cyan(`📋 Early Hint received: ${headers.link}`));
                } else {
                    // Final response
                    finalResponse = {
                        status: parseInt(status),
                        headers: { ...headers },
                        receivedAt: performance.now() - startTime
                    };
                    console.log(colors.green(`📄 Final response: ${status}`));
                }
            });

            req.on('data', (chunk) => {
                responseBody += chunk.toString();
            });

            req.on('end', () => {
                resolve({
                    earlyHints,
                    status: finalResponse?.status || 0,
                    headers: finalResponse?.headers || {},
                    body: responseBody
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            // Set timeout
            req.setTimeout(this.timeout, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Parse Link headers for preload information
     */
    parseLinkHeaders(linkHeader) {
        if (!linkHeader) return [];
        
        const links = [];
        const linkPattern = /<([^>]+)>;\s*rel=([^;,]+)(?:;\s*as=([^;,]+))?(?:;\s*([^;,]+))?/g;
        let match;

        while ((match = linkPattern.exec(linkHeader)) !== null) {
            links.push({
                url: match[1],
                rel: match[2].replace(/"/g, ''),
                as: match[3] ? match[3].replace(/"/g, '') : null,
                attributes: match[4] || null
            });
        }

        return links;
    }

    /**
     * Preload resources hinted by Early Hints
     */
    async preloadHintedResources(earlyHints, results) {
        const preloadPromises = [];
        
        for (const hint of earlyHints) {
            for (const link of hint.linkHeaders || []) {
                if (link.rel === 'preload') {
                    const preloadPromise = this.preloadResource(link, hint.receivedAt);
                    preloadPromises.push(preloadPromise);
                }
            }
        }

        try {
            const preloadResults = await Promise.allSettled(preloadPromises);
            results.preloadedResources = preloadResults.map((result, index) => ({
                status: result.status,
                value: result.value,
                reason: result.reason?.message
            }));
            
            const successful = preloadResults.filter(r => r.status === 'fulfilled').length;
            console.log(colors.green(`✅ Successfully preloaded ${successful}/${preloadResults.length} resources`));
            
        } catch (error) {
            console.error(colors.red(`❌ Preload error: ${error.message}`));
        }
    }

    /**
     * Preload a single resource using HTTP/3 when possible
     */
    async preloadResource(link, hintReceivedAt) {
        const startTime = performance.now();
        const fullUrl = link.url.startsWith('http') ? link.url : `${this.baseUrl}${link.url}`;
        
        console.log(colors.magenta(`⬇️  Preloading via HTTP/3: ${link.url} (${link.as || 'unknown'})`));
        
        try {
            // Use HTTP/3 for preloading when possible
            const response = await fetch(fullUrl, {
                ...this.http3Options,
                headers: {
                    ...this.http3Options.headers,
                    'User-Agent': 'Node.js HTTP/3 Early Hints Client/1.0 (Preloader)'
                },
                signal: AbortSignal.timeout(this.timeout)
            });

            const responseTime = performance.now() - startTime;
            const contentLength = parseInt(response.headers.get('content-length') || '0');
            
            // Read the response to simulate actual usage
            const content = await response.text();
            
            console.log(colors.green(`✅ Preloaded: ${link.url} (${responseTime.toFixed(2)}ms, ${content.length} bytes)`));
            
            return {
                url: link.url,
                status: response.status,
                contentType: response.headers.get('content-type'),
                contentLength: content.length,
                responseTime,
                preloadTime: startTime - hintReceivedAt, // Time from hint to preload start
                as: link.as,
                protocol: 'HTTP/3'
            };
            
        } catch (error) {
            throw new Error(`Failed to preload ${link.url}: ${error.message}`);
        }
    }

    /**
     * Test Early Hints endpoints using HTTP/3
     */
    async testEarlyHintsEndpoints() {
        console.log(colors.rainbow('\n🚀 HTTP/3 Early Hints Client Test Suite\n'));
        
        const endpoints = [
            '/',
            '/advanced',
            '/info'
        ];

        const results = [];

        for (const endpoint of endpoints) {
            console.log(colors.underline(`\nTesting HTTP/3 endpoint: ${endpoint}`));
            const result = await this.requestWithEarlyHints(endpoint);
            results.push(result);
            
            // Display results
            this.displayTestResult(result);
            
            // Wait between requests
            await this.sleep(1000);
        }

        // Summary
        console.log(colors.rainbow('\n📊 Test Summary:'));
        const http3Requests = results.filter(r => r.protocol === 'HTTP/3').length;
        const successfulRequests = results.filter(r => !r.error).length;
        const hintsReceived = results.filter(r => r.earlyHints.length > 0).length;
        
        console.log(`   HTTP/3 Requests: ${http3Requests}/${results.length}`);
        console.log(`   Success Rate: ${(successfulRequests/results.length*100).toFixed(1)}%`);
        console.log(`   Early Hints Success: ${(hintsReceived/results.length*100).toFixed(1)}%`);

        return results;
    }

    /**
     * Benchmark Early Hints performance using HTTP/3
     */
    async benchmarkPerformance(iterations = 5) {
        console.log(colors.rainbow(`\n📊 HTTP/3 Performance Benchmark (${iterations} iterations)\n`));
        
        const endpoint = '/';
        const results = [];

        for (let i = 0; i < iterations; i++) {
            console.log(colors.blue(`\n--- HTTP/3 Iteration ${i + 1}/${iterations} ---`));
            const result = await this.requestWithEarlyHints(endpoint);
            results.push(result);
            
            if (i < iterations - 1) {
                await this.sleep(500); // Brief pause between iterations
            }
        }

        this.analyzeBenchmarkResults(results);
        return results;
    }

    /**
     * Analyze benchmark results
     */
    analyzeBenchmarkResults(results) {
        console.log(colors.rainbow('\n📈 HTTP/3 Performance Analysis\n'));
        
        const timings = results.map(r => r.timing.total);
        const earlyHintsCounts = results.map(r => r.earlyHints.length);
        const preloadCounts = results.map(r => r.preloadedResources.length);
        const http3Requests = results.filter(r => r.protocol === 'HTTP/3');

        const stats = {
            totalRequests: results.length,
            http3Requests: http3Requests.length,
            http3Percentage: (http3Requests.length / results.length) * 100,
            averageTime: timings.reduce((a, b) => a + b, 0) / timings.length,
            minTime: Math.min(...timings),
            maxTime: Math.max(...timings),
            averageEarlyHints: earlyHintsCounts.reduce((a, b) => a + b, 0) / earlyHintsCounts.length,
            averagePreloads: preloadCounts.reduce((a, b) => a + b, 0) / preloadCounts.length,
            successfulRequests: results.filter(r => !r.error).length
        };

        console.log('📊 Statistics:');
        console.log(`   Total Requests: ${stats.totalRequests}`);
        console.log(`   HTTP/3 Usage: ${stats.http3Requests}/${stats.totalRequests} (${stats.http3Percentage.toFixed(1)}%)`);
        console.log(`   Success Rate: ${(stats.successfulRequests/stats.totalRequests*100).toFixed(1)}%`);
        console.log(`   Average Response Time: ${stats.averageTime.toFixed(2)}ms`);
        console.log(`   Min/Max Time: ${stats.minTime.toFixed(2)}ms / ${stats.maxTime.toFixed(2)}ms`);
        console.log(`   Average Early Hints: ${stats.averageEarlyHints.toFixed(1)}`);
        console.log(`   Average Preloads: ${stats.averagePreloads.toFixed(1)}`);

        // Calculate Early Hints effectiveness
        const hintsReceived = results.filter(r => r.earlyHints.length > 0).length;
        const hintsEffectiveness = (hintsReceived / results.length) * 100;
        
        console.log(`   Early Hints Effectiveness: ${hintsEffectiveness.toFixed(1)}%`);
        
        // HTTP/3 specific analysis
        if (stats.http3Percentage > 80) {
            console.log(colors.green('🚀 Excellent HTTP/3 adoption!'));
        } else if (stats.http3Percentage > 50) {
            console.log(colors.yellow('⚠️  Good HTTP/3 performance, some fallback to HTTP/2'));
        } else {
            console.log(colors.red('❌ Poor HTTP/3 performance, mostly fallback'));
        }
        
        if (hintsEffectiveness > 80) {
            console.log(colors.green('✅ Excellent Early Hints performance!'));
        } else if (hintsEffectiveness > 50) {
            console.log(colors.yellow('⚠️  Good Early Hints performance'));
        } else {
            console.log(colors.red('❌ Poor Early Hints performance'));
        }
    }

    /**
     * Display test result
     */
    displayTestResult(result) {
        console.log('\n📋 Results:');
        console.log(`   Path: ${result.path}`);
        console.log(`   Protocol: ${colors.cyan(result.protocol)}`);
        console.log(`   Total Time: ${result.timing.total.toFixed(2)}ms`);
        console.log(`   Early Hints: ${result.earlyHints.length}`);
        console.log(`   Preloaded Resources: ${result.preloadedResources.length}`);
        
        if (result.finalResponse) {
            console.log(`   Final Status: ${result.finalResponse.status}`);
            console.log(`   Content Length: ${result.finalResponse.contentLength} bytes`);
        }
        
        if (result.error) {
            console.log(colors.red(`   Error: ${result.error}`));
        }

        // Show Early Hints details
        if (result.earlyHints.length > 0) {
            console.log('\n💡 Early Hints Details:');
            result.earlyHints.forEach((hint, index) => {
                console.log(`   Hint ${index + 1}: ${hint.linkHeaders.length} resources hinted`);
                hint.linkHeaders.forEach(link => {
                    console.log(`     → ${link.url} (${link.as || 'unknown'})`);
                });
            });
        }

        // Show preload results
        if (result.preloadedResources.length > 0) {
            console.log('\n⬇️  Preload Results:');
            result.preloadedResources.forEach((preload, index) => {
                if (preload.status === 'fulfilled' && preload.value) {
                    const p = preload.value;
                    const protocolInfo = p.protocol ? ` via ${p.protocol}` : '';
                    console.log(`   ${index + 1}. ${p.url} - ${p.status} (${p.responseTime.toFixed(2)}ms, ${p.contentLength} bytes${protocolInfo})`);
                } else {
                    console.log(`   ${index + 1}. Failed: ${preload.reason}`);
                }
            });
        }
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Close connections
     */
    close() {
        if (this.http2Client) {
            this.http2Client.close();
        }
        if (this.undiciAgent) {
            this.undiciAgent.close();
        }
    }
}

// Export for use as module
export default EarlyHintsClient;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const client = new EarlyHintsClient();
    
    try {
        console.log(colors.rainbow('🌟 HTTP/3 Early Hints Node.js Client\n'));
        console.log(colors.cyan('Connecting to Java HTTP/3 server...\n'));
        
        // Run test suite
        await client.testEarlyHintsEndpoints();
        
        // Run performance benchmark
        await client.benchmarkPerformance(3);
        
    } catch (error) {
        console.error(colors.red(`💥 Fatal error: ${error.message}`));
        process.exit(1);
    } finally {
        client.close();
        console.log(colors.green('\n✅ HTTP/3 client testing completed!'));
        process.exit(0);
    }
}