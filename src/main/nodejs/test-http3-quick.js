#!/usr/bin/env node

import PureHTTP3Client from './http3-pure-client.js';
import colors from 'colors';

/**
 * Quick HTTP/3 Test Script
 * Tests the Java server HTTP/3 implementation
 */

async function runQuickTest() {
    console.log(colors.rainbow('🚀 Quick HTTP/3 Test\n'));
    
    // Test different servers
    const servers = [
        'https://localhost:8443',  // Java server
        'https://localhost:3443'   // Node.js server
    ];
    
    for (const serverUrl of servers) {
        console.log(colors.cyan(`\n--- Testing ${serverUrl} ---`));
        
        const client = new PureHTTP3Client({
            baseUrl: serverUrl,
            timeout: 10000
        });
        
        try {
            // Quick connection test
            console.log(colors.blue('🔗 Testing HTTP/3 connection...'));
            const result = await client.makeHTTP3Request('/');
            
            console.log(colors.green(`✅ Success: ${result.status} ${result.statusText}`));
            console.log(colors.cyan(`   Protocol: ${result.protocol}`));
            console.log(colors.yellow(`   Response time: ${result.responseTime.toFixed(2)}ms`));
            console.log(colors.gray(`   Content length: ${result.contentLength} bytes`));
            
            if (result.earlyHints.length > 0) {
                console.log(colors.green(`💡 Early Hints detected: ${result.earlyHints.length}`));
            } else {
                console.log(colors.yellow(`⚠️  No Early Hints detected`));
            }
            
        } catch (error) {
            console.log(colors.red(`❌ Failed: ${error.message}`));
        } finally {
            client.close();
        }
    }
}

async function testSpecificEndpoints() {
    console.log(colors.rainbow('\n🎯 Testing Specific Endpoints\n'));
    
    const client = new PureHTTP3Client({
        baseUrl: 'https://localhost:8443'
    });
    
    const endpoints = [
        { path: '/info', description: 'Server info' },
        { path: '/', description: 'Main page with Early Hints' },
        { path: '/advanced', description: 'Advanced Early Hints' },
        { path: '/health', description: 'Health check' }
    ];
    
    try {
        for (const endpoint of endpoints) {
            console.log(colors.underline(`\nTesting: ${endpoint.path} (${endpoint.description})`));
            
            try {
                const result = await client.makeHTTP3Request(endpoint.path);
                
                console.log(colors.green(`   ✅ ${result.status} - ${result.responseTime.toFixed(2)}ms`));
                console.log(colors.cyan(`   Protocol: ${result.protocol}`));
                
                if (result.earlyHints.length > 0) {
                    console.log(colors.yellow(`   💡 Early Hints: ${result.earlyHints.length}`));
                }
                
                // Show interesting headers
                const altSvc = result.headers['alt-svc'];
                if (altSvc) {
                    console.log(colors.gray(`   Alt-Svc: ${altSvc}`));
                }
                
            } catch (error) {
                console.log(colors.red(`   ❌ Failed: ${error.message}`));
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
    } finally {
        client.close();
    }
}

async function main() {
    try {
        console.log(colors.rainbow('🌟 HTTP/3 Client Test Suite\n'));
        console.log(colors.gray('Testing HTTP/3 implementation against Java server\n'));
        
        await runQuickTest();
        await testSpecificEndpoints();
        
        console.log(colors.green('\n✅ All tests completed!'));
        console.log(colors.cyan('\n💡 Tips:'));
        console.log('   - Ensure Java server is running on https://localhost:8443');
        console.log('   - Server should support HTTP/3 and Early Hints');
        console.log('   - Use --insecure flag if using self-signed certificates');
        
    } catch (error) {
        console.error(colors.red(`💥 Test suite failed: ${error.message}`));
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}