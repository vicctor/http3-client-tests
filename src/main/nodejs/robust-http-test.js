#!/usr/bin/env node

import { fetch } from 'undici';
import https from 'https';
import colors from 'colors';

/**
 * Robust HTTP/3 and HTTP/2 Test for Java Server
 * Tests multiple protocols and configurations
 */

class RobustHTTPTest {
    constructor(baseUrl = 'https://localhost:8443') {
        this.baseUrl = baseUrl;
        this.timeout = 10000;
        
        // Create HTTPS agent that ignores TLS errors
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true
        });
    }

    async testWithUndici(path, options = {}) {
        const fullUrl = `${this.baseUrl}${path}`;
        console.log(colors.blue(`📡 Undici: ${fullUrl}`));

        try {
            const startTime = Date.now();
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Node.js Undici HTTP Client/1.0',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                signal: AbortSignal.timeout(this.timeout),
                // Disable certificate validation for localhost
                agent: false
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const body = await response.text();

            // Analyze response
            const result = this.analyzeResponse(response, body, responseTime);
            result.method = 'undici';
            
            console.log(colors.green(`✅ Undici: ${response.status} (${responseTime}ms)`));
            this.displayResult(result);
            
            return result;

        } catch (error) {
            console.log(colors.red(`❌ Undici failed: ${error.message}`));
            return { success: false, error: error.message, method: 'undici' };
        }
    }

    async testWithNodeFetch(path) {
        const fullUrl = `${this.baseUrl}${path}`;
        console.log(colors.blue(`📡 Node Fetch: ${fullUrl}`));

        try {
            // Import node-fetch dynamically
            const { default: fetch } = await import('node-fetch');
            
            const startTime = Date.now();
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Node.js node-fetch HTTP Client/1.0',
                    'Accept': '*/*'
                },
                agent: this.httpsAgent,
                timeout: this.timeout
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const body = await response.text();

            const result = this.analyzeResponse(response, body, responseTime);
            result.method = 'node-fetch';
            
            console.log(colors.green(`✅ Node Fetch: ${response.status} (${responseTime}ms)`));
            this.displayResult(result);
            
            return result;

        } catch (error) {
            console.log(colors.red(`❌ Node Fetch failed: ${error.message}`));
            return { success: false, error: error.message, method: 'node-fetch' };
        }
    }

    analyzeResponse(response, body, responseTime) {
        // Determine protocol
        const altSvc = response.headers.get ? response.headers.get('alt-svc') : response.headers['alt-svc'];
        const server = response.headers.get ? response.headers.get('server') : response.headers['server'];
        
        let protocol = 'HTTP/1.1';
        if (altSvc) {
            if (altSvc.includes('h3')) protocol = 'HTTP/3 (Alt-Svc)';
            else if (altSvc.includes('h2')) protocol = 'HTTP/2 (Alt-Svc)';
        }
        
        // Check for Early Hints
        const linkHeader = response.headers.get ? response.headers.get('link') : response.headers['link'];
        const earlyHints = linkHeader ? this.parseLinkHeaders(linkHeader) : [];
        
        return {
            success: response.status >= 200 && response.status < 400,
            status: response.status,
            statusText: response.statusText || '',
            responseTime,
            protocol,
            earlyHints,
            earlyHintsCount: earlyHints.length,
            contentLength: body.length,
            server: server || 'unknown',
            headers: response.headers.get ? Object.fromEntries(response.headers.entries()) : response.headers
        };
    }

    parseLinkHeaders(linkHeader) {
        if (!linkHeader) return [];
        
        const links = [];
        const linkPattern = /<([^>]+)>;\s*rel=([^;,]+)(?:;\s*as=([^;,]+))?/g;
        let match;

        while ((match = linkPattern.exec(linkHeader)) !== null) {
            links.push({
                url: match[1],
                rel: match[2].replace(/"/g, ''),
                as: match[3] ? match[3].replace(/"/g, '') : null
            });
        }

        return links;
    }

    displayResult(result) {
        if (result.success) {
            console.log(colors.cyan(`   Protocol: ${result.protocol}`));
            console.log(colors.yellow(`   Server: ${result.server}`));
            if (result.earlyHintsCount > 0) {
                console.log(colors.green(`   Early Hints: ${result.earlyHintsCount} detected`));
                result.earlyHints.forEach(link => {
                    console.log(colors.gray(`     → ${link.url} (${link.rel}${link.as ? `, as=${link.as}` : ''})`));
                });
            } else {
                console.log(colors.gray(`   Early Hints: none`));
            }
            console.log(colors.gray(`   Content: ${result.contentLength} bytes`));
        }
    }

    async testEndpoint(path, name) {
        console.log(colors.underline(`\n--- ${name} ---`));
        
        const results = [];
        
        // Try undici first
        const undiciResult = await this.testWithUndici(path);
        results.push(undiciResult);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Try node-fetch as fallback
        const fetchResult = await this.testWithNodeFetch(path);
        results.push(fetchResult);
        
        return results;
    }

    async runTests() {
        console.log(colors.rainbow('🔍 Robust HTTP Test for Java Server\n'));
        console.log(colors.gray(`Target: ${this.baseUrl}\n`));

        const endpoints = [
            { path: '/info', name: 'Server Info' },
            { path: '/', name: 'Main Page (Early Hints expected)' },
            { path: '/health', name: 'Health Check' }
        ];

        const allResults = [];

        for (const endpoint of endpoints) {
            const results = await this.testEndpoint(endpoint.path, endpoint.name);
            allResults.push(...results);
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.displaySummary(allResults);
        return allResults;
    }

    displaySummary(results) {
        console.log(colors.rainbow('\n📊 Test Summary\n'));

        const successful = results.filter(r => r.success);
        const withEarlyHints = results.filter(r => r.earlyHintsCount > 0);
        
        const methodStats = {};
        results.forEach(r => {
            if (!methodStats[r.method]) methodStats[r.method] = { success: 0, total: 0 };
            methodStats[r.method].total++;
            if (r.success) methodStats[r.method].success++;
        });

        console.log(`📈 Overall Results:`);
        console.log(`   Total tests: ${results.length}`);
        console.log(`   Successful: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
        console.log(`   Early Hints detected: ${withEarlyHints.length}/${successful.length}`);

        console.log(`\n📈 By Method:`);
        Object.entries(methodStats).forEach(([method, stats]) => {
            const successRate = (stats.success / stats.total * 100).toFixed(1);
            console.log(`   ${method}: ${stats.success}/${stats.total} (${successRate}%)`);
        });

        if (successful.length > 0) {
            const avgTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
            console.log(`\n⏱️  Average response time: ${avgTime.toFixed(2)}ms`);
            
            const protocols = [...new Set(successful.map(r => r.protocol))];
            console.log(`🔗 Protocols detected: ${protocols.join(', ')}`);
        }

        // Final assessment
        if (successful.length > 0) {
            console.log(colors.green('\n✅ Java server is reachable!'));
            
            if (withEarlyHints.length > 0) {
                console.log(colors.green('💡 Early Hints are working!'));
            } else {
                console.log(colors.yellow('⚠️  No Early Hints detected - check server implementation'));
            }
        } else {
            console.log(colors.red('\n❌ Cannot connect to Java server'));
            console.log(colors.yellow('💡 Make sure the server is running on https://localhost:8443'));
        }
    }
}

async function main() {
    const serverUrl = process.argv[2] || 'https://localhost:8443';
    
    console.log(colors.cyan('🌟 Robust HTTP Test for Java Server\n'));
    console.log(colors.gray('Testing multiple HTTP client methods and protocols\n'));

    const tester = new RobustHTTPTest(serverUrl);
    
    try {
        await tester.runTests();
        console.log(colors.green('\n✅ Testing completed!'));
    } catch (error) {
        console.error(colors.red(`💥 Test failed: ${error.message}`));
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}