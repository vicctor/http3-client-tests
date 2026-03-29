#!/usr/bin/env node

import EarlyHintsClient from './index.js';
import colors from 'colors';

/**
 * Simple test script for HTTP Early Hints
 */
async function testEarlyHints() {
    console.log(colors.rainbow('🧪 HTTP Early Hints Test Script\n'));
    
    const client = new EarlyHintsClient({
        baseUrl: 'https://localhost:8443',
        ignoreTLS: true
    });

    try {
        // Test 1: Basic page with Early Hints
        console.log(colors.blue('Test 1: Basic Early Hints Page'));
        console.log('=' .repeat(40));
        
        const result1 = await client.requestWithEarlyHints('/early-hints-demo/page');
        
        if (result1.earlyHints.length > 0) {
            console.log(colors.green(`✅ SUCCESS: Received ${result1.earlyHints.length} Early Hints`));
            
            result1.earlyHints.forEach((hint, i) => {
                console.log(`   Hint ${i+1}: ${hint.linkHeaders.length} resources`);
                hint.linkHeaders.forEach(link => {
                    console.log(`     - ${link.url} (${link.as || 'unknown'}, ${link.rel})`);
                });
            });
            
            console.log(`   Preloaded: ${result1.preloadedResources.length} resources`);
            console.log(`   Total time: ${result1.timing.total.toFixed(2)}ms`);
        } else {
            console.log(colors.yellow('⚠️  No Early Hints received'));
        }

        console.log('\n');

        // Test 2: Advanced page
        console.log(colors.blue('Test 2: Advanced Early Hints Page'));
        console.log('=' .repeat(40));
        
        const result2 = await client.requestWithEarlyHints('/early-hints-demo/advanced-page');
        
        console.log(`Early Hints: ${result2.earlyHints.length}`);
        console.log(`Preloaded: ${result2.preloadedResources.length}`);
        console.log(`Time: ${result2.timing.total.toFixed(2)}ms`);
        
        if (result2.error) {
            console.log(colors.red(`Error: ${result2.error}`));
        }

        console.log('\n');

        // Test 3: Info endpoint (no Early Hints expected)
        console.log(colors.blue('Test 3: Info Endpoint (Control Test)'));
        console.log('=' .repeat(40));
        
        const result3 = await client.requestWithEarlyHints('/early-hints-demo/info');
        
        console.log(`Early Hints: ${result3.earlyHints.length} (expected: 0)`);
        console.log(`Response status: ${result3.finalResponse?.status || 'unknown'}`);
        console.log(`Time: ${result3.timing.total.toFixed(2)}ms`);

        console.log('\n');

        // Summary
        console.log(colors.rainbow('📊 Test Summary'));
        console.log('=' .repeat(40));
        
        const totalHints = result1.earlyHints.length + result2.earlyHints.length + result3.earlyHints.length;
        const totalPreloads = result1.preloadedResources.length + result2.preloadedResources.length + result3.preloadedResources.length;
        const avgTime = (result1.timing.total + result2.timing.total + result3.timing.total) / 3;
        
        console.log(`Total Early Hints received: ${totalHints}`);
        console.log(`Total resources preloaded: ${totalPreloads}`);
        console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
        
        if (totalHints > 0) {
            console.log(colors.green('\n✅ Early Hints are working correctly!'));
            console.log('The Node.js client successfully:');
            console.log('  - Detected 103 Early Hints responses');
            console.log('  - Parsed Link headers');
            console.log('  - Preloaded hinted resources');
            console.log('  - Measured performance benefits');
        } else {
            console.log(colors.yellow('\n⚠️  No Early Hints detected'));
            console.log('Possible reasons:');
            console.log('  - Server not sending 103 responses');
            console.log('  - Network proxy stripping Early Hints');
            console.log('  - Protocol version incompatibility');
        }

        // Test individual resource endpoints
        console.log('\n');
        console.log(colors.blue('Test 4: Individual Resource Endpoints'));
        console.log('=' .repeat(40));
        
        const resources = [
            '/static/styles.css',
            '/static/script.js',
            '/api/critical-data'
        ];
        
        for (const resource of resources) {
            try {
                const start = performance.now();
                const result = await client.requestWithEarlyHints(resource);
                const time = performance.now() - start;
                
                if (result.finalResponse) {
                    console.log(`✅ ${resource}: ${result.finalResponse.status} (${time.toFixed(2)}ms, ${result.finalResponse.contentLength} bytes)`);
                } else {
                    console.log(`❌ ${resource}: Failed`);
                }
            } catch (error) {
                console.log(`❌ ${resource}: Error - ${error.message}`);
            }
        }

    } catch (error) {
        console.error(colors.red(`💥 Test failed: ${error.message}`));
        console.error(error.stack);
        process.exit(1);
    } finally {
        client.close();
        console.log(colors.green('\n🏁 Test completed!'));
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testEarlyHints();
}