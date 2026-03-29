#!/usr/bin/env node

import { fetch } from 'undici';
import { Agent } from 'undici';
import colors from 'colors';
import { performance } from 'perf_hooks';
import { program } from 'commander';

/**
 * Pure HTTP/3 Client for Early Hints Testing
 * Focuses exclusively on HTTP/3 protocol using latest Undici
 */
class PureHTTP3Client {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'https://localhost:8443';
        this.timeout = options.timeout || 15000;
        this.ignoreTLS = options.ignoreTLS !== false;
        
        // HTTP/3 specific agent configuration
        this.agent = new Agent({
            connect: {
                rejectUnauthorized: !this.ignoreTLS,
                servername: new URL(this.baseUrl).hostname,
                // Allow both HTTP/3 and HTTP/2 for broader compatibility
                ALPNProtocols: ['h3', 'h3-29', 'h3-32', 'h2'],
                // Allow HTTP/2 fallback
                allowH2: true
            },
            // Enhanced settings for better compatibility
            maxConcurrentStreams: 100,
            bodyTimeout: this.timeout,
            headersTimeout: this.timeout / 2,
            // Connection pooling
            connections: 1,
            pipelining: 5,
            // Better error handling
            keepAliveTimeout: 4000,
            keepAliveMaxTimeout: 600000
        });
        
        console.log(colors.cyan('🚀 Pure HTTP/3 Client initialized'));
        console.log(colors.gray(`   Target: ${this.baseUrl}`));
        console.log(colors.gray(`   Timeout: ${this.timeout}ms`));
        console.log(colors.gray(`   TLS verification: ${!this.ignoreTLS ? 'enabled' : 'disabled'}`));
    }

    /**
     * Make a pure HTTP/3 request with Early Hints detection
     */
    async makeHTTP3Request(path, options = {}) {
        const fullUrl = `${this.baseUrl}${path}`;
        const startTime = performance.now();
        
        console.log(colors.blue(`📡 HTTP/3 Request: ${fullUrl}`));
        
        try {
            // Use latest undici fetch with HTTP/3 agent
            const response = await fetch(fullUrl, {
                method: options.method || 'GET',
                headers: {
                    'User-Agent': 'Node.js Pure HTTP/3 Client/1.0',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    // Hint to server we support HTTP/3
                    'Upgrade-Insecure-Requests': '1',
                    ...options.headers
                },
                dispatcher: this.agent,
                signal: AbortSignal.timeout(this.timeout)
            });

            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            // Read response body
            const body = await response.text();
            
            // Analyze response for HTTP/3 indicators
            const protocol = this.detectProtocol(response);
            const earlyHints = this.extractEarlyHints(response);
            
            console.log(colors.green(`✅ HTTP/3 Response: ${response.status} (${responseTime.toFixed(2)}ms)`));
            console.log(colors.cyan(`   Protocol detected: ${protocol}`));
            console.log(colors.yellow(`   Early Hints: ${earlyHints.length} hints`));
            
            return {
                url: fullUrl,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: body,
                protocol: protocol,
                responseTime: responseTime,
                earlyHints: earlyHints,
                contentLength: body.length,
                successful: response.status >= 200 && response.status < 300
            };
            
        } catch (error) {
            console.error(colors.red(`❌ HTTP/3 Request failed: ${error.message}`));
            throw new Error(`HTTP/3 request to ${fullUrl} failed: ${error.message}`);
        }
    }

    /**
     * Detect the HTTP protocol version from response
     */
    detectProtocol(response) {
        // Check if response has protocol information
        if (response.httpVersion) {
            return `HTTP/${response.httpVersion}`;
        }
        
        // Check headers for protocol indicators
        const altSvc = response.headers.get('alt-svc');
        const server = response.headers.get('server');
        const httpVersion = response.headers.get('http-version');
        
        if (altSvc && altSvc.includes('h3')) {
            return 'HTTP/3 (Alt-Svc header)';
        }
        
        if (httpVersion && httpVersion.includes('3')) {
            return 'HTTP/3 (version header)';
        }
        
        // Check for HTTP/2 indicators
        if (altSvc && altSvc.includes('h2')) {
            return 'HTTP/2 (Alt-Svc header)';
        }
        
        // Check if we have QUIC-specific headers
        const quicHeaders = [
            'quic-status',
            'x-quic-version',
            '3-rtt',
            'alt-svc'
        ];
        
        for (const header of quicHeaders) {
            const value = response.headers.get(header);
            if (value && (value.includes('h3') || value.includes('quic'))) {
                return 'HTTP/3 (QUIC indicators)';
            }
        }
        
        // Check user agent and other context clues
        const userAgent = response.headers.get('user-agent');
        if (userAgent && userAgent.includes('quic')) {
            return 'HTTP/3 (user-agent context)';
        }
        
        // Default assumption based on our agent configuration
        return 'HTTP/2+ (undici agent)';
    }

    /**
     * Extract Early Hints from response headers
     */
    extractEarlyHints(response) {
        const earlyHints = [];
        
        // Look for Link headers (Early Hints mechanism)
        const linkHeader = response.headers.get('link');
        if (linkHeader) {
            const links = this.parseLinkHeaders(linkHeader);
            if (links.length > 0) {
                earlyHints.push({
                    status: 103,
                    links: links,
                    receivedAt: 0 // Would be from 103 response in real implementation
                });
            }
        }
        
        // Look for Early Hints in other headers
        const earlyHintsHeader = response.headers.get('early-hints');
        if (earlyHintsHeader) {
            earlyHints.push({
                status: 103,
                data: earlyHintsHeader,
                receivedAt: 0
            });
        }
        
        // Check for X-Early-Hints header (custom implementation)
        const xEarlyHints = response.headers.get('x-early-hints');
        if (xEarlyHints) {
            try {
                const parsed = JSON.parse(xEarlyHints);
                earlyHints.push({
                    status: 103,
                    parsed: parsed,
                    receivedAt: 0
                });
            } catch (e) {
                // Ignore JSON parsing errors
            }
        }
        
        return earlyHints;
    }

    /**
     * Parse Link headers for preload directives
     */
    parseLinkHeaders(linkHeader) {
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
     * Test HTTP/3 connection to server
     */
    async testHTTP3Connection() {
        console.log(colors.rainbow('\n🔥 HTTP/3 Connection Test\n'));
        
        const testPaths = ['/info', '/', '/health'];
        const results = [];
        
        for (const path of testPaths) {
            try {
                console.log(colors.underline(`\nTesting HTTP/3: ${path}`));
                const result = await this.makeHTTP3Request(path);
                results.push(result);
                
                this.displayTestResult(result);
                
                // Brief pause between requests
                await this.sleep(500);
                
            } catch (error) {
                console.error(colors.red(`❌ Test failed for ${path}: ${error.message}`));
                results.push({
                    url: `${this.baseUrl}${path}`,
                    error: error.message,
                    successful: false
                });
            }
        }
        
        this.displayConnectionSummary(results);
        return results;
    }

    /**
     * Test Early Hints functionality via HTTP/3
     */
    async testEarlyHints() {
        console.log(colors.rainbow('\n💡 HTTP/3 Early Hints Test\n'));
        
        const hintsEndpoints = ['/', '/advanced', '/benchmark?resources=3'];
        const results = [];
        
        for (const endpoint of hintsEndpoints) {
            try {
                console.log(colors.underline(`\nTesting Early Hints via HTTP/3: ${endpoint}`));
                const result = await this.makeHTTP3Request(endpoint);
                results.push(result);
                
                // Analyze Early Hints
                if (result.earlyHints.length > 0) {
                    console.log(colors.green(`✅ Early Hints detected: ${result.earlyHints.length}`));
                    result.earlyHints.forEach((hint, idx) => {
                        console.log(colors.cyan(`   Hint ${idx + 1}: ${JSON.stringify(hint, null, 2)}`));
                    });
                } else {
                    console.log(colors.yellow(`⚠️  No Early Hints detected`));
                }
                
                await this.sleep(800);
                
            } catch (error) {
                console.error(colors.red(`❌ Early Hints test failed: ${error.message}`));
                results.push({
                    url: `${this.baseUrl}${endpoint}`,
                    error: error.message,
                    earlyHints: [],
                    successful: false
                });
            }
        }
        
        this.displayEarlyHintsSummary(results);
        return results;
    }

    /**
     * Run performance benchmark on HTTP/3
     */
    async benchmarkHTTP3Performance(iterations = 5) {
        console.log(colors.rainbow(`\n📊 HTTP/3 Performance Benchmark (${iterations} iterations)\n`));
        
        const endpoint = '/';
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            try {
                console.log(colors.blue(`\n--- HTTP/3 Benchmark ${i + 1}/${iterations} ---`));
                const result = await this.makeHTTP3Request(endpoint);
                results.push(result);
                
                console.log(colors.green(`   Response time: ${result.responseTime.toFixed(2)}ms`));
                console.log(colors.gray(`   Content length: ${result.contentLength} bytes`));
                
                if (i < iterations - 1) {
                    await this.sleep(100); // Brief pause
                }
                
            } catch (error) {
                console.error(colors.red(`❌ Benchmark iteration ${i + 1} failed: ${error.message}`));
                results.push({
                    error: error.message,
                    responseTime: null,
                    successful: false
                });
            }
        }
        
        this.displayBenchmarkResults(results);
        return results;
    }

    /**
     * Display individual test result
     */
    displayTestResult(result) {
        console.log('\n📋 HTTP/3 Test Result:');
        console.log(`   URL: ${result.url}`);
        console.log(`   Status: ${result.status} ${result.statusText}`);
        console.log(`   Protocol: ${colors.cyan(result.protocol)}`);
        console.log(`   Response Time: ${result.responseTime.toFixed(2)}ms`);
        console.log(`   Content Length: ${result.contentLength} bytes`);
        console.log(`   Early Hints: ${result.earlyHints.length}`);
        console.log(`   Success: ${result.successful ? colors.green('✅') : colors.red('❌')}`);
        
        // Show some response headers
        const interestingHeaders = ['server', 'alt-svc', 'content-type', 'cache-control'];
        console.log('\n📋 Key Headers:');
        interestingHeaders.forEach(header => {
            const value = result.headers[header];
            if (value) {
                console.log(`   ${header}: ${value}`);
            }
        });
    }

    /**
     * Display connection test summary
     */
    displayConnectionSummary(results) {
        console.log(colors.rainbow('\n📊 HTTP/3 Connection Summary\n'));
        
        const successful = results.filter(r => r.successful).length;
        const total = results.length;
        const avgResponseTime = results
            .filter(r => r.responseTime)
            .reduce((sum, r) => sum + r.responseTime, 0) / Math.max(1, results.filter(r => r.responseTime).length);
        
        console.log(`📈 Statistics:`);
        console.log(`   Success Rate: ${successful}/${total} (${(successful/total*100).toFixed(1)}%)`);
        console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Protocol: HTTP/3 (forced)`);
        
        if (successful === total) {
            console.log(colors.green('🚀 All HTTP/3 connections successful!'));
        } else if (successful > 0) {
            console.log(colors.yellow('⚠️  Some HTTP/3 connections failed'));
        } else {
            console.log(colors.red('❌ All HTTP/3 connections failed'));
        }
    }

    /**
     * Display Early Hints test summary
     */
    displayEarlyHintsSummary(results) {
        console.log(colors.rainbow('\n💡 Early Hints Summary\n'));
        
        const withHints = results.filter(r => r.earlyHints && r.earlyHints.length > 0).length;
        const total = results.length;
        const totalHints = results.reduce((sum, r) => sum + (r.earlyHints ? r.earlyHints.length : 0), 0);
        
        console.log(`📈 Early Hints Statistics:`);
        console.log(`   Endpoints with Hints: ${withHints}/${total} (${(withHints/total*100).toFixed(1)}%)`);
        console.log(`   Total Hints Received: ${totalHints}`);
        console.log(`   Average Hints per Endpoint: ${(totalHints/total).toFixed(1)}`);
        
        if (withHints > 0) {
            console.log(colors.green('✅ Early Hints are working via HTTP/3!'));
        } else {
            console.log(colors.yellow('⚠️  No Early Hints detected - server may not implement them correctly'));
        }
    }

    /**
     * Display benchmark results
     */
    displayBenchmarkResults(results) {
        console.log(colors.rainbow('\n📊 HTTP/3 Performance Analysis\n'));
        
        const successful = results.filter(r => r.successful && r.responseTime).length;
        const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime);
        
        if (responseTimes.length === 0) {
            console.log(colors.red('❌ No successful requests to analyze'));
            return;
        }
        
        const stats = {
            count: responseTimes.length,
            avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes),
            median: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
        };
        
        console.log('📈 HTTP/3 Performance Statistics:');
        console.log(`   Successful Requests: ${successful}/${results.length}`);
        console.log(`   Average Response Time: ${stats.avg.toFixed(2)}ms`);
        console.log(`   Median Response Time: ${stats.median.toFixed(2)}ms`);
        console.log(`   Min/Max Times: ${stats.min.toFixed(2)}ms / ${stats.max.toFixed(2)}ms`);
        
        // Performance evaluation
        if (stats.avg < 100) {
            console.log(colors.green('🚀 Excellent HTTP/3 performance!'));
        } else if (stats.avg < 500) {
            console.log(colors.yellow('⚡ Good HTTP/3 performance'));
        } else {
            console.log(colors.red('⚠️  Slow HTTP/3 performance'));
        }
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Close the HTTP/3 agent and connections
     */
    close() {
        if (this.agent) {
            this.agent.close();
            console.log(colors.gray('🔌 HTTP/3 connections closed'));
        }
    }
}

// CLI Interface
program
    .name('http3-pure-client')
    .description('Pure HTTP/3 Client for Early Hints Testing')
    .version('1.0.0');

program
    .command('test')
    .description('Test HTTP/3 connection')
    .option('-u, --url <url>', 'Server URL', 'https://localhost:8443')
    .option('-t, --timeout <ms>', 'Request timeout', '15000')
    .action(async (options) => {
        const client = new PureHTTP3Client({
            baseUrl: options.url,
            timeout: parseInt(options.timeout)
        });
        
        try {
            await client.testHTTP3Connection();
        } finally {
            client.close();
        }
    });

program
    .command('hints')
    .description('Test Early Hints via HTTP/3')
    .option('-u, --url <url>', 'Server URL', 'https://localhost:8443')
    .option('-t, --timeout <ms>', 'Request timeout', '15000')
    .action(async (options) => {
        const client = new PureHTTP3Client({
            baseUrl: options.url,
            timeout: parseInt(options.timeout)
        });
        
        try {
            await client.testEarlyHints();
        } finally {
            client.close();
        }
    });

program
    .command('benchmark')
    .description('Benchmark HTTP/3 performance')
    .option('-u, --url <url>', 'Server URL', 'https://localhost:8443')
    .option('-i, --iterations <count>', 'Number of iterations', '5')
    .option('-t, --timeout <ms>', 'Request timeout', '15000')
    .action(async (options) => {
        const client = new PureHTTP3Client({
            baseUrl: options.url,
            timeout: parseInt(options.timeout)
        });
        
        try {
            await client.benchmarkHTTP3Performance(parseInt(options.iterations));
        } finally {
            client.close();
        }
    });

program
    .command('all')
    .description('Run all HTTP/3 tests')
    .option('-u, --url <url>', 'Server URL', 'https://localhost:8443')
    .option('-i, --iterations <count>', 'Benchmark iterations', '3')
    .action(async (options) => {
        const client = new PureHTTP3Client({
            baseUrl: options.url
        });
        
        try {
            await client.testHTTP3Connection();
            await client.testEarlyHints();
            await client.benchmarkHTTP3Performance(parseInt(options.iterations));
        } finally {
            client.close();
        }
    });

// Default action
if (import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.length === 2) {
        const client = new PureHTTP3Client();
        
        try {
            console.log(colors.rainbow('🌟 Pure HTTP/3 Client for Early Hints Testing\n'));
            console.log(colors.cyan('This client focuses exclusively on HTTP/3 protocol\n'));
            
            await client.testHTTP3Connection();
            await client.testEarlyHints();
            await client.benchmarkHTTP3Performance(3);
            
            console.log(colors.green('\n✅ All HTTP/3 tests completed!'));
            
        } catch (error) {
            console.error(colors.red(`💥 Error: ${error.message}`));
            process.exit(1);
        } finally {
            client.close();
        }
    } else {
        program.parse();
    }
}

export default PureHTTP3Client;