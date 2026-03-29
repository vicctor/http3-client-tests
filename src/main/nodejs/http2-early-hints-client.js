#!/usr/bin/env node

import http2 from 'http2';
import colors from 'colors';
import { performance } from 'perf_hooks';

/**
 * HTTP/2 Client with Early Hints Support
 * Properly handles 103 Early Hints responses from Java server
 */

class EarlyHintsHTTP2Client {
    constructor(baseUrl = 'https://localhost:8443') {
        this.baseUrl = baseUrl;
        this.timeout = 15000;
        this.client = null;
    }

    connect() {
        if (this.client) return;
        
        console.log(colors.cyan(`🔗 Connecting to ${this.baseUrl}`));
        
        this.client = http2.connect(this.baseUrl, {
            rejectUnauthorized: false, // Allow self-signed certificates
            timeout: this.timeout
        });

        this.client.on('error', (error) => {
            console.error(colors.red(`❌ Connection error: ${error.message}`));
        });

        this.client.on('connect', () => {
            console.log(colors.green('✅ HTTP/2 connection established'));
        });
    }

    async makeRequest(path) {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                this.connect();
            }

            const startTime = performance.now();
            let earlyHints = [];
            let finalResponse = null;
            let responseBody = '';
            let isCompleted = false;

            console.log(colors.blue(`📡 Requesting: ${path}`));

            const req = this.client.request({
                ':method': 'GET',
                ':path': path,
                ':scheme': 'https',
                'user-agent': 'Node.js HTTP/2 Early Hints Client/1.0',
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br'
            });

            // Handle different response statuses
            req.on('response', (headers, flags) => {
                const status = parseInt(headers[':status']);
                const responseTime = performance.now() - startTime;

                if (status === 103) {
                    // Early Hints response!
                    console.log(colors.cyan(`💡 Early Hints received (${responseTime.toFixed(2)}ms)`));
                    
                    const linkHeaders = this.extractLinkHeaders(headers);
                    const hint = {
                        status: 103,
                        headers: { ...headers },
                        linkHeaders,
                        receivedAt: responseTime,
                        resourceCount: linkHeaders.length
                    };
                    
                    earlyHints.push(hint);
                    
                    // Display Early Hints details
                    console.log(colors.yellow(`   Resources hinted: ${linkHeaders.length}`));
                    linkHeaders.forEach((link, idx) => {
                        console.log(colors.gray(`     ${idx + 1}. ${link.url} (${link.rel}${link.as ? `, as=${link.as}` : ''})`));
                    });
                    
                } else if (status >= 200) {
                    // Final response
                    console.log(colors.green(`📄 Final response: ${status} (${responseTime.toFixed(2)}ms)`));
                    
                    finalResponse = {
                        status,
                        statusText: this.getStatusText(status),
                        headers: { ...headers },
                        receivedAt: responseTime
                    };
                }
            });

            req.on('data', (chunk) => {
                responseBody += chunk.toString();
            });

            req.on('end', () => {
                if (isCompleted) return;
                isCompleted = true;
                
                const totalTime = performance.now() - startTime;
                
                const result = {
                    path,
                    success: finalResponse && finalResponse.status < 400,
                    finalResponse,
                    earlyHints,
                    responseBody,
                    totalTime,
                    earlyHintsCount: earlyHints.length,
                    totalResourcesHinted: earlyHints.reduce((sum, hint) => sum + hint.resourceCount, 0)
                };

                console.log(colors.green(`✅ Request completed (${totalTime.toFixed(2)}ms total)`));
                resolve(result);
            });

            req.on('error', (error) => {
                if (isCompleted) return;
                isCompleted = true;
                
                console.error(colors.red(`❌ Request error: ${error.message}`));
                reject(error);
            });

            // Set timeout
            req.setTimeout(this.timeout, () => {
                if (isCompleted) return;
                isCompleted = true;
                
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    extractLinkHeaders(headers) {
        const links = [];
        
        // Look for all link headers (they can be arrays)
        Object.keys(headers).forEach(key => {
            if (key.toLowerCase() === 'link') {
                const linkValue = headers[key];
                const linkArray = Array.isArray(linkValue) ? linkValue : [linkValue];
                
                linkArray.forEach(link => {
                    const parsed = this.parseLinkHeader(link);
                    if (parsed) links.push(parsed);
                });
            }
        });
        
        return links;
    }

    parseLinkHeader(linkHeader) {
        if (!linkHeader) return null;
        
        // Parse: <url>; rel=preload; as=style
        const match = linkHeader.match(/<([^>]+)>;\s*rel=([^;,]+)(?:;\s*as=([^;,]+))?(?:;\s*([^;,]+))?/);
        
        if (match) {
            return {
                url: match[1],
                rel: match[2],
                as: match[3] || null,
                attributes: match[4] || null
            };
        }
        
        return null;
    }

    getStatusText(status) {
        const statusTexts = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error'
        };
        return statusTexts[status] || 'Unknown';
    }

    async testEarlyHints() {
        console.log(colors.rainbow('\n🚀 HTTP/2 Early Hints Test\n'));
        
        const endpoints = [
            { path: '/info', name: 'Server Info', expectHints: false },
            { path: '/', name: 'Main Page', expectHints: true },
            { path: '/health', name: 'Health Check', expectHints: false }
        ];

        const results = [];

        for (const endpoint of endpoints) {
            console.log(colors.underline(`\n--- ${endpoint.name} ---`));
            
            try {
                const result = await this.makeRequest(endpoint.path);
                result.endpoint = endpoint;
                results.push(result);
                
                this.displayResult(result);
                
                // Brief pause between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(colors.red(`❌ Failed: ${error.message}`));
                results.push({
                    path: endpoint.path,
                    endpoint,
                    success: false,
                    error: error.message,
                    earlyHintsCount: 0
                });
            }
        }

        this.displaySummary(results);
        return results;
    }

    displayResult(result) {
        console.log('\n📊 Result Summary:');
        console.log(`   Success: ${result.success ? colors.green('✅') : colors.red('❌')}`);
        console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
        console.log(`   Early Hints: ${result.earlyHintsCount}`);
        console.log(`   Resources Hinted: ${result.totalResourcesHinted}`);
        
        if (result.finalResponse) {
            console.log(`   Final Status: ${result.finalResponse.status} ${result.finalResponse.statusText}`);
            console.log(`   Content Length: ${result.responseBody.length} bytes`);
        }

        // Show timing breakdown
        if (result.earlyHints.length > 0) {
            console.log('\n⏱️  Timing Analysis:');
            result.earlyHints.forEach((hint, idx) => {
                console.log(`   Early Hints ${idx + 1}: ${hint.receivedAt.toFixed(2)}ms`);
            });
            if (result.finalResponse) {
                console.log(`   Final Response: ${result.finalResponse.receivedAt.toFixed(2)}ms`);
                const preloadTime = result.finalResponse.receivedAt - result.earlyHints[0].receivedAt;
                console.log(colors.green(`   Preload Window: ${preloadTime.toFixed(2)}ms`));
            }
        }
    }

    displaySummary(results) {
        console.log(colors.rainbow('\n📊 Early Hints Test Summary\n'));

        const successful = results.filter(r => r.success);
        const withEarlyHints = results.filter(r => r.earlyHintsCount > 0);
        const totalHints = results.reduce((sum, r) => sum + (r.earlyHintsCount || 0), 0);
        const totalResources = results.reduce((sum, r) => sum + (r.totalResourcesHinted || 0), 0);

        console.log('📈 Statistics:');
        console.log(`   Total Tests: ${results.length}`);
        console.log(`   Successful: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
        console.log(`   With Early Hints: ${withEarlyHints.length}/${results.length}`);
        console.log(`   Total Early Hints: ${totalHints}`);
        console.log(`   Total Resources Hinted: ${totalResources}`);

        if (successful.length > 0) {
            const avgTime = successful.reduce((sum, r) => sum + r.totalTime, 0) / successful.length;
            console.log(`   Average Response Time: ${avgTime.toFixed(2)}ms`);
        }

        // Assessment
        console.log('\n🎯 Assessment:');
        if (withEarlyHints.length > 0) {
            console.log(colors.green('✅ Early Hints implementation is working!'));
            console.log(colors.cyan(`   ${totalResources} resources can be preloaded`));
            console.log(colors.yellow(`   Performance benefit: Resources load during server processing`));
        } else {
            console.log(colors.yellow('⚠️  No Early Hints detected'));
        }

        if (successful.length === results.length) {
            console.log(colors.green('🎉 All HTTP/2 connections successful!'));
        } else {
            console.log(colors.yellow('⚠️  Some connections failed'));
        }
    }

    close() {
        if (this.client) {
            this.client.close();
            console.log(colors.gray('🔌 HTTP/2 connection closed'));
        }
    }
}

async function main() {
    const serverUrl = process.argv[2] || 'https://localhost:8443';
    
    console.log(colors.rainbow('🌟 HTTP/2 Early Hints Client\n'));
    console.log(colors.cyan('Specialized client for detecting and analyzing Early Hints\n'));
    console.log(colors.gray(`Target: ${serverUrl}\n`));

    const client = new EarlyHintsHTTP2Client(serverUrl);
    
    try {
        const results = await client.testEarlyHints();
        
        console.log(colors.green('\n✅ Early Hints testing completed!'));
        
        // Show final recommendations
        const withHints = results.filter(r => r.earlyHintsCount > 0);
        if (withHints.length > 0) {
            console.log(colors.cyan('\n💡 Recommendations:'));
            console.log('   - Early Hints are working correctly');
            console.log('   - Use Early Hints endpoints for performance testing');
            console.log('   - Monitor preload effectiveness in real applications');
        }
        
    } catch (error) {
        console.error(colors.red(`💥 Test failed: ${error.message}`));
        process.exit(1);
    } finally {
        client.close();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}