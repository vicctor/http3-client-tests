#!/usr/bin/env node

import { fetch } from 'undici';
import colors from 'colors';

/**
 * Simple HTTP/3 Test for Java Server
 * Focus specifically on testing the Java HTTP/3 server
 */

class SimpleHTTP3Test {
    constructor(baseUrl = 'https://localhost:8443') {
        this.baseUrl = baseUrl;
        this.timeout = 10000;
    }

    async testEndpoint(path) {
        const fullUrl = `${this.baseUrl}${path}`;
        console.log(colors.blue(`📡 Testing: ${fullUrl}`));

        try {
            const startTime = Date.now();
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Node.js HTTP/3 Test Client/1.0',
                    'Accept': '*/*'
                },
                signal: AbortSignal.timeout(this.timeout),
                // Use default dispatcher for better compatibility
                // dispatcher: undefined
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const body = await response.text();

            // Check for HTTP/3 indicators
            const altSvc = response.headers.get('alt-svc');
            const protocol = altSvc && altSvc.includes('h3') ? 'HTTP/3' : 'HTTP/2+';
            
            // Check for Early Hints indicators
            const linkHeader = response.headers.get('link');
            const earlyHints = linkHeader ? 'detected' : 'none';

            console.log(colors.green(`✅ Success: ${response.status} ${response.statusText}`));
            console.log(colors.cyan(`   Response time: ${responseTime}ms`));
            console.log(colors.yellow(`   Protocol: ${protocol}`));
            console.log(colors.magenta(`   Early Hints: ${earlyHints}`));
            console.log(colors.gray(`   Content length: ${body.length} bytes`));
            
            if (altSvc) {
                console.log(colors.gray(`   Alt-Svc: ${altSvc}`));
            }
            
            if (linkHeader) {
                console.log(colors.gray(`   Link: ${linkHeader}`));
            }

            return {
                success: true,
                status: response.status,
                responseTime,
                protocol,
                earlyHints: earlyHints !== 'none',
                contentLength: body.length,
                headers: Object.fromEntries(response.headers.entries())
            };

        } catch (error) {
            console.log(colors.red(`❌ Failed: ${error.message}`));
            return {
                success: false,
                error: error.message
            };
        }
    }

    async runTests() {
        console.log(colors.rainbow('🚀 Simple HTTP/3 Java Server Test\n'));
        console.log(colors.gray(`Target: ${this.baseUrl}\n`));

        const endpoints = [
            { path: '/info', name: 'Server Info' },
            { path: '/', name: 'Main Page' },
            { path: '/health', name: 'Health Check' }
        ];

        const results = [];

        for (const endpoint of endpoints) {
            console.log(colors.underline(`\n--- ${endpoint.name} ---`));
            const result = await this.testEndpoint(endpoint.path);
            results.push({ ...result, path: endpoint.path, name: endpoint.name });
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.displaySummary(results);
        return results;
    }

    displaySummary(results) {
        console.log(colors.rainbow('\n📊 Test Summary\n'));

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const withEarlyHints = results.filter(r => r.earlyHints);

        console.log(`📈 Results:`);
        console.log(`   Successful: ${successful.length}/${results.length}`);
        console.log(`   Failed: ${failed.length}/${results.length}`);
        console.log(`   Early Hints detected: ${withEarlyHints.length}/${successful.length}`);

        if (successful.length > 0) {
            const avgTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
            console.log(`   Average response time: ${avgTime.toFixed(2)}ms`);
            
            const protocols = [...new Set(successful.map(r => r.protocol))];
            console.log(`   Protocols detected: ${protocols.join(', ')}`);
        }

        if (successful.length === results.length) {
            console.log(colors.green('\n🎉 All tests passed!'));
        } else if (successful.length > 0) {
            console.log(colors.yellow('\n⚠️  Some tests failed'));
        } else {
            console.log(colors.red('\n❌ All tests failed'));
        }

        if (withEarlyHints.length > 0) {
            console.log(colors.green('💡 Early Hints are working!'));
        } else {
            console.log(colors.yellow('⚠️  No Early Hints detected'));
        }
    }
}

async function main() {
    const serverUrl = process.argv[2] || 'https://localhost:8443';
    
    console.log(colors.cyan('🌟 HTTP/3 Java Server Test\n'));
    console.log(colors.gray('Testing basic HTTP/3 connectivity and Early Hints\n'));

    const tester = new SimpleHTTP3Test(serverUrl);
    
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