#!/usr/bin/env node

/**
 * HTTP/3 Early Hints Client using Node.js native HTTP/3 support
 * This client specifically targets HTTP/3 over QUIC protocol
 */

import { connect } from 'http2';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Http3EarlyHintsClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'https://localhost:8443';
        this.debug = options.debug || false;
        this.client = null;
        this.stats = {
            totalRequests: 0,
            http3Requests: 0,
            earlyHintsReceived: 0,
            resourcesPreloaded: 0
        };
    }

    /**
     * Connect to HTTP/3 server with QUIC support
     */
    async connect() {
        try {
            this.client = connect(this.baseUrl, {
                rejectUnauthorized: false,
                // Force HTTP/3 if supported
                settings: {
                    enablePush: false // Disable HTTP/2 push, use Early Hints instead
                },
                // Try to negotiate HTTP/3
                ALPNProtocols: ['h3', 'h2', 'http/1.1']
            });

            this.client.on('error', (err) => {
                if (this.debug) console.error('❌ Client error:', err.message);
            });

            this.client.on('connect', () => {
                if (this.debug) {
                    const session = this.client.session;
                    console.log('🔗 Connected with protocol:', session?.alpnProtocol || 'unknown');
                    if (session?.alpnProtocol === 'h3') {
                        console.log('🎉 HTTP/3 over QUIC connection established!');
                    }
                }
            });

            return new Promise((resolve, reject) => {
                this.client.on('connect', () => resolve(this));
                this.client.on('error', reject);
            });

        } catch (error) {
            throw new Error(`Failed to connect: ${error.message}`);
        }
    }

    /**
     * Make HTTP/3 request with Early Hints detection
     */
    async requestWithEarlyHints(path = '/') {
        if (!this.client) {
            await this.connect();
        }

        const startTime = performance.now();
        const result = {
            path,
            protocol: 'unknown',
            earlyHints: [],
            finalResponse: null,
            preloadedResources: [],
            timing: {
                start: startTime,
                earlyHints: null,
                finalResponse: null,
                total: 0
            },
            error: null
        };

        try {
            console.log(`📡 Requesting: ${this.baseUrl}${path}`);
            
            const request = this.client.request({
                ':method': 'GET',
                ':path': path,
                'user-agent': 'HTTP/3 Early Hints Client/1.0'
            });

            // Track protocol used
            const session = this.client.session;
            result.protocol = session?.alpnProtocol || 'unknown';
            
            if (result.protocol === 'h3') {
                console.log('🚀 Using HTTP/3 over QUIC');
                this.stats.http3Requests++;
            }

            // Handle Early Hints (103 status code)
            request.on('response', (headers) => {
                const status = headers[':status'];
                
                if (status === 103) {
                    // Early Hints received!
                    result.timing.earlyHints = performance.now() - startTime;
                    this.stats.earlyHintsReceived++;
                    
                    const earlyHint = {
                        timestamp: performance.now(),
                        headers: { ...headers },
                        linkHeaders: this.parseLinkHeaders(headers.link)
                    };
                    
                    result.earlyHints.push(earlyHint);
                    console.log(`📡 Early Hints received (${result.earlyHints.length})`);
                    
                    // Start preloading hinted resources
                    this.preloadResources(earlyHint.linkHeaders, result);
                    
                } else if (status >= 200 && status < 300) {
                    // Final response
                    result.timing.finalResponse = performance.now() - startTime;
                    result.finalResponse = {
                        status: parseInt(status),
                        headers: { ...headers }
                    };
                    console.log(`📄 Final response: ${status}`);
                }
            });

            // Collect response data
            let responseData = '';
            request.on('data', (chunk) => {
                responseData += chunk.toString();
            });

            // Handle request completion
            await new Promise((resolve, reject) => {
                request.on('end', () => {
                    result.timing.total = performance.now() - startTime;
                    result.finalResponse.data = responseData;
                    this.stats.totalRequests++;
                    resolve();
                });

                request.on('error', (err) => {
                    result.error = err.message;
                    console.log(`❌ Error: ${err.message}`);
                    reject(err);
                });
            });

            // Wait for preloaded resources to complete
            if (result.preloadedResources.length > 0) {
                await Promise.allSettled(result.preloadedResources);
            }

            return result;

        } catch (error) {
            result.error = error.message;
            result.timing.total = performance.now() - startTime;
            return result;
        }
    }

    /**
     * Parse Link headers to extract preload resources
     */
    parseLinkHeaders(linkHeader) {
        if (!linkHeader) return [];
        
        const links = [];
        const linkParts = linkHeader.split(',');
        
        linkParts.forEach(part => {
            const trimmed = part.trim();
            const urlMatch = trimmed.match(/<([^>]+)>/);
            const relMatch = trimmed.match(/rel=([^;,\s]+)/);
            const asMatch = trimmed.match(/as=([^;,\s]+)/);
            
            if (urlMatch && relMatch) {
                links.push({
                    url: urlMatch[1],
                    rel: relMatch[1],
                    as: asMatch ? asMatch[1] : null
                });
            }
        });
        
        return links;
    }

    /**
     * Preload resources hinted by Early Hints
     */
    async preloadResources(linkHeaders, result) {
        for (const link of linkHeaders) {
            if (link.rel === 'preload') {
                const preloadPromise = this.preloadResource(link.url, link.as);
                result.preloadedResources.push(preloadPromise);
                this.stats.resourcesPreloaded++;
            }
        }
    }

    /**
     * Preload a single resource
     */
    async preloadResource(url, resourceType) {
        const startTime = performance.now();
        
        try {
            const request = this.client.request({
                ':method': 'GET',
                ':path': url,
                'user-agent': 'HTTP/3 Early Hints Client/1.0 (preload)'
            });

            let contentLength = 0;
            let responseData = '';

            return new Promise((resolve, reject) => {
                request.on('response', (headers) => {
                    contentLength = parseInt(headers['content-length'] || '0');
                });

                request.on('data', (chunk) => {
                    responseData += chunk.toString();
                });

                request.on('end', () => {
                    const responseTime = performance.now() - startTime;
                    resolve({
                        url,
                        as: resourceType,
                        contentLength: contentLength || responseData.length,
                        responseTime,
                        success: true
                    });
                });

                request.on('error', (err) => {
                    reject({
                        url,
                        as: resourceType,
                        error: err.message,
                        responseTime: performance.now() - startTime,
                        success: false
                    });
                });
            });

        } catch (error) {
            return {
                url,
                as: resourceType,
                error: error.message,
                responseTime: performance.now() - startTime,
                success: false
            };
        }
    }

    /**
     * Get client statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Close the HTTP/3 connection
     */
    close() {
        if (this.client) {
            this.client.close();
            this.client = null;
        }
    }

    /**
     * Test HTTP/3 Early Hints functionality
     */
    async testHttp3EarlyHints() {
        console.log('🚀 HTTP/3 Early Hints Client Test\n');
        
        try {
            await this.connect();
            
            // Test basic Early Hints
            console.log('📋 Testing basic HTTP/3 Early Hints...');
            const basicResult = await this.requestWithEarlyHints('/');
            this.displayResult(basicResult);
            
            // Test advanced Early Hints
            console.log('\n📋 Testing advanced HTTP/3 Early Hints...');
            const advancedResult = await this.requestWithEarlyHints('/advanced');
            this.displayResult(advancedResult);
            
            // Display final statistics
            console.log('\n📊 HTTP/3 Session Statistics:');
            const stats = this.getStats();
            console.log(`   Total Requests: ${stats.totalRequests}`);
            console.log(`   HTTP/3 Requests: ${stats.http3Requests}`);
            console.log(`   Early Hints Received: ${stats.earlyHintsReceived}`);
            console.log(`   Resources Preloaded: ${stats.resourcesPreloaded}`);
            
            if (stats.http3Requests > 0) {
                console.log('\n🎉 HTTP/3 over QUIC successfully tested!');
            } else {
                console.log('\n⚠️  HTTP/3 not available, fallback protocols used');
            }
            
        } catch (error) {
            console.error('❌ HTTP/3 test failed:', error.message);
        } finally {
            this.close();
        }
    }

    /**
     * Display test results
     */
    displayResult(result) {
        console.log(`   Protocol: ${result.protocol}`);
        console.log(`   Status: ${result.finalResponse?.status || 'Error'}`);
        console.log(`   Early Hints: ${result.earlyHints.length}`);
        console.log(`   Preloaded Resources: ${result.preloadedResources.length}`);
        console.log(`   Total Time: ${result.timing.total.toFixed(2)}ms`);
        
        if (result.earlyHints.length > 0) {
            console.log(`   Early Hints Time: ${result.timing.earlyHints.toFixed(2)}ms`);
        }
        
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const client = new Http3EarlyHintsClient({
        baseUrl: process.argv[2] || 'https://localhost:8443',
        debug: true
    });
    
    await client.testHttp3EarlyHints();
}

export default Http3EarlyHintsClient;