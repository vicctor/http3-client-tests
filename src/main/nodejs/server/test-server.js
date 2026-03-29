#!/usr/bin/env node

import EarlyHintsServer from './server.js';
import colors from 'colors';

/**
 * Test script for Early Hints Server
 */
async function testServer() {
    console.log(colors.rainbow('🧪 Testing HTTP Early Hints Server\n'));
    
    const server = new EarlyHintsServer({
        port: 3444, // Use different port for testing
        enableLogs: false
    });

    try {
        console.log(colors.blue('🚀 Starting test server...'));
        await server.start();
        
        // Wait a moment for server to fully start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(colors.green('✅ Server started successfully'));
        
        // Test basic connectivity
        console.log(colors.blue('🔍 Testing endpoints...'));
        
        const testEndpoints = [
            '/',
            '/info', 
            '/health',
            '/static/styles.css',
            '/api/critical-data'
        ];
        
        for (const endpoint of testEndpoints) {
            try {
                const response = await fetch(`https://localhost:3444${endpoint}`, {
                    rejectUnauthorized: false
                });
                
                const status = response.ok ? '✅' : '❌';
                console.log(`${status} ${endpoint}: ${response.status} ${response.statusText}`);
                
            } catch (error) {
                console.log(`❌ ${endpoint}: ${error.message}`);
            }
        }
        
        console.log(colors.green('\n🎉 Basic server tests completed!'));
        console.log(colors.yellow('💡 For full Early Hints testing, use the client:'));
        console.log('   node ../demo-client.js basic --url https://localhost:3444');
        
    } catch (error) {
        console.error(colors.red(`💥 Test failed: ${error.message}`));
        process.exit(1);
    } finally {
        server.stop();
        console.log(colors.blue('\n🏁 Test server stopped'));
    }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testServer();
}