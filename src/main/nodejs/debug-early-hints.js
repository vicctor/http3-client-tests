#!/usr/bin/env node

import http2 from 'http2';
import colors from 'colors';

/**
 * Simple HTTP/2 Test for Early Hints
 * Minimal implementation to debug Early Hints issues
 */

class SimpleHTTP2Test {
    constructor(baseUrl = 'https://localhost:8443') {
        this.baseUrl = baseUrl;
    }

    async simpleRequest(path) {
        return new Promise((resolve, reject) => {
            console.log(colors.blue(`📡 Simple HTTP/2 request: ${path}`));
            
            const client = http2.connect(this.baseUrl, {
                rejectUnauthorized: false
            });

            client.on('error', (error) => {
                console.error(colors.red(`Connection error: ${error.message}`));
                reject(error);
            });

            const req = client.request({
                ':method': 'GET',
                ':path': path,
                'user-agent': 'Simple HTTP/2 Test Client'
            });

            let responses = [];
            let body = '';

            req.on('response', (headers, flags) => {
                const status = parseInt(headers[':status']);
                console.log(colors.cyan(`Response: ${status}`));
                
                if (status === 103) {
                    console.log(colors.yellow(`Early Hints detected!`));
                    // Show all headers
                    Object.entries(headers).forEach(([key, value]) => {
                        if (key.toLowerCase() === 'link') {
                            console.log(colors.green(`  Link: ${value}`));
                        }
                    });
                }
                
                responses.push({ status, headers });
            });

            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', () => {
                console.log(colors.green(`Request completed`));
                client.close();
                resolve({ responses, body });
            });

            req.on('error', (error) => {
                console.error(colors.red(`Request error: ${error.message}`));
                client.close();
                reject(error);
            });

            req.end();
        });
    }

    async testEndpoints() {
        console.log(colors.rainbow('\n🔧 Simple HTTP/2 Early Hints Debug\n'));
        
        const endpoints = ['/info', '/', '/health'];
        
        for (const endpoint of endpoints) {
            console.log(colors.underline(`\nTesting: ${endpoint}`));
            
            try {
                const result = await this.simpleRequest(endpoint);
                console.log(`  Responses received: ${result.responses.length}`);
                console.log(`  Body length: ${result.body.length} bytes`);
                
                const earlyHints = result.responses.filter(r => r.status === 103);
                if (earlyHints.length > 0) {
                    console.log(colors.green(`  Early Hints found: ${earlyHints.length}`));
                } else {
                    console.log(colors.gray(`  No Early Hints`));
                }
                
            } catch (error) {
                console.error(colors.red(`  Failed: ${error.message}`));
            }
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Also test with raw curl to compare
async function testWithCurl() {
    console.log(colors.rainbow('\n🧪 Testing with curl for comparison\n'));
    
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
        const curl = spawn('curl', [
            '-k',
            '--http2',
            '-v',
            'https://localhost:8443/',
            '-o', '/dev/null'
        ]);

        let output = '';
        
        curl.stderr.on('data', (data) => {
            output += data.toString();
        });

        curl.on('close', (code) => {
            console.log('Curl output (looking for Early Hints):');
            
            const lines = output.split('\n');
            let found103 = false;
            
            lines.forEach(line => {
                if (line.includes('103') || line.includes('link:') || line.includes('Link:')) {
                    console.log(colors.green(`  ${line.trim()}`));
                    found103 = true;
                } else if (line.includes('HTTP/2') && (line.includes('200') || line.includes('103'))) {
                    console.log(colors.cyan(`  ${line.trim()}`));
                }
            });
            
            if (found103) {
                console.log(colors.green('\n✅ Curl detected Early Hints!'));
            } else {
                console.log(colors.yellow('\n⚠️  Curl did not detect Early Hints'));
            }
            
            resolve();
        });
    });
}

async function main() {
    const tester = new SimpleHTTP2Test();
    
    try {
        await tester.testEndpoints();
        await testWithCurl();
        
        console.log(colors.cyan('\n💡 Debugging Summary:'));
        console.log('- If curl shows Early Hints but Node.js doesn\'t, it\'s a client issue');
        console.log('- If neither shows Early Hints, it\'s a server issue');
        console.log('- Protocol errors suggest HTTP/2 stream handling issues');
        
    } catch (error) {
        console.error(colors.red(`Test failed: ${error.message}`));
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}