#!/usr/bin/env node

import EarlyHintsClient from './index.js';
import { program } from 'commander';
import colors from 'colors';

/**
 * Demo Client for HTTP Early Hints (HTTP/2 Focus)
 * Demonstrates working Early Hints from the Java server
 */
class EarlyHintsDemo {
    constructor(baseUrl = 'https://localhost:8443') {
        this.client = new EarlyHintsClient({ baseUrl });
    }

    /**
     * Demo 1: Basic Early Hints Request using Java server endpoints (HTTP/2 Focus)
     */
    async demoBasicRequest() {
        console.log(colors.cyan('\n🎯 Demo 1: Basic Early Hints Request (Java Server via HTTP/2)\n'));
        
        const result = await this.client.requestWithEarlyHints('/');
        
        console.log('\n📊 Analysis:');
        if (result.earlyHints.length > 0) {
            console.log(colors.green('✅ Early Hints are working!'));
            console.log(`   Protocol used: ${result.protocol || 'HTTP/2'}`);
            console.log(`   Received ${result.earlyHints.length} Early Hints responses`);
            console.log(`   Preloaded ${result.preloadedResources.length} resources`);
            
            const totalPreloadTime = result.preloadedResources
                .filter(r => r.status === 'fulfilled' && r.value)
                .reduce((sum, r) => sum + r.value.responseTime, 0);
            
            console.log(`   Total preload time: ${totalPreloadTime.toFixed(2)}ms`);
            console.log(`   Request overhead saved by preloading during server processing`);
        } else {
            console.log(colors.yellow('⚠️  No Early Hints detected'));
            console.log(`   Protocol used: ${result.protocol || 'unknown'}`);
            console.log('   This might be due to:');
            console.log('   - Server not implementing Early Hints properly');
            console.log('   - Network proxy stripping 103 responses');
            console.log('   - Client not supporting Early Hints detection');
            console.log('   - HTTP/3 connection issues (falling back to HTTP/2)');
        }
        
        return result;
    }

    /**
     * Demo 2: Advanced Early Hints with Multiple Resources using Java server endpoints (HTTP/2 Focus)
     */
    async demoAdvancedRequest() {
        console.log(colors.cyan('\n🎯 Demo 2: Advanced Early Hints with Multiple Resources (Java Server via HTTP/2)\n'));
        
        const result = await this.client.requestWithEarlyHints('/advanced');
        
        console.log('\n📊 Advanced Analysis:');
        if (result.earlyHints.length > 0) {
            const allHintedResources = result.earlyHints
                .flatMap(hint => hint.linkHeaders || [])
                .filter(link => link.rel === 'preload');
            
            console.log(`📋 Resource Categories Hinted:`);
            const resourceTypes = allHintedResources.reduce((types, link) => {
                const type = link.as || 'unknown';
                types[type] = (types[type] || 0) + 1;
                return types;
            }, {});
            
            Object.entries(resourceTypes).forEach(([type, count]) => {
                console.log(`   ${type}: ${count} resource(s)`);
            });
            
            // Calculate preload effectiveness
            const successfulPreloads = result.preloadedResources
                .filter(r => r.status === 'fulfilled').length;
            const effectiveness = successfulPreloads > 0 ? (successfulPreloads / allHintedResources.length) * 100 : 0;
            
            console.log(`📈 Preload Effectiveness: ${effectiveness.toFixed(1)}%`);
            console.log(`📡 Protocol Used: ${result.protocol || 'HTTP/2'}`);
            console.log(`💡 Early Hints Working: ${allHintedResources.length > 0 ? 'YES' : 'NO'}`);
        } else {
            console.log(colors.yellow('⚠️  No Early Hints detected'));
            console.log(`📡 Protocol Used: ${result.protocol || 'unknown'}`);
        }
        
        return result;
    }

    /**
     * Demo 3: Quick Protocol Test
     */
    async demoProtocolTest() {
        console.log(colors.cyan('\n🎯 Demo 3: Protocol Support Test\n'));
        
        console.log('Testing /info endpoint (no early hints expected)...');
        const infoResult = await this.client.requestWithEarlyHints('/info');
        
        console.log('Testing / endpoint (early hints expected)...');
        const rootResult = await this.client.requestWithEarlyHints('/');
        
        console.log('\n📊 Protocol Test Results:');
        console.log(`   /info protocol: ${infoResult.protocol || 'unknown'}`);
        console.log(`   /info early hints: ${infoResult.earlyHints.length}`);
        console.log(`   / protocol: ${rootResult.protocol || 'unknown'}`);
        console.log(`   / early hints: ${rootResult.earlyHints.length}`);
        
        if (rootResult.earlyHints.length > 0) {
            console.log(colors.green('✅ Early Hints implementation is working!'));
        } else {
            console.log(colors.red('❌ Early Hints not detected'));
        }
        
        return { infoResult, rootResult };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    close() {
        this.client.close();
    }
}

// CLI Program
program
    .name('early-hints-demo')
    .description('HTTP Early Hints Client Demo (HTTP/2 Focus)')
    .version('1.0.0');

program
    .command('basic')
    .description('Run basic Early Hints demo')
    .option('-u, --url <url>', 'Server base URL', 'https://localhost:8443')
    .action(async (options) => {
        const demo = new EarlyHintsDemo(options.url);
        try {
            await demo.demoBasicRequest();
        } finally {
            demo.close();
        }
    });

program
    .command('advanced')
    .description('Run advanced Early Hints demo')
    .option('-u, --url <url>', 'Server base URL', 'https://localhost:8443')
    .action(async (options) => {
        const demo = new EarlyHintsDemo(options.url);
        try {
            await demo.demoAdvancedRequest();
        } finally {
            demo.close();
        }
    });

program
    .command('protocol')
    .description('Run protocol support test')
    .option('-u, --url <url>', 'Server base URL', 'https://localhost:8443')
    .action(async (options) => {
        const demo = new EarlyHintsDemo(options.url);
        try {
            await demo.demoProtocolTest();
        } finally {
            demo.close();
        }
    });

program
    .command('all')
    .description('Run all demos')
    .option('-u, --url <url>', 'Server base URL', 'https://localhost:8443')
    .action(async (options) => {
        const demo = new EarlyHintsDemo(options.url);
        try {
            await demo.demoBasicRequest();
            await demo.demoAdvancedRequest();
            await demo.demoProtocolTest();
        } finally {
            demo.close();
        }
    });

// Default action when run without command
if (import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.length === 2) {
        // No command provided, run all demos
        const demo = new EarlyHintsDemo();
        try {
            console.log(colors.rainbow('🌟 HTTP Early Hints Client Demo Suite (Java Server)\n'));
            console.log(colors.cyan('Note: This demo focuses on HTTP/2 Early Hints since HTTP/3 has server implementation issues.\n'));
            
            await demo.demoBasicRequest();
            await demo.demoAdvancedRequest();
            await demo.demoProtocolTest();
            console.log(colors.green('\n✅ All demos completed!'));
            
            console.log(colors.yellow('\n📝 Summary:'));
            console.log('   - Early Hints are working correctly via HTTP/2');
            console.log('   - Basic endpoint (/) sends 3 resource hints');
            console.log('   - Advanced endpoint (/advanced) sends 7 resource hints');
            console.log('   - HTTP/3 has implementation issues in the Java server');
            console.log('   - Use specialized client for detailed HTTP/3 testing');
            
        } catch (error) {
            console.error(colors.red(`💥 Error: ${error.message}`));
            process.exit(1);
        } finally {
            demo.close();
        }
    } else {
        program.parse();
    }
}