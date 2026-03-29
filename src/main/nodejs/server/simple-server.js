#!/usr/bin/env node

import http2 from 'http2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple HTTP Early Hints Server
 * Uses native Node.js HTTP/2 for proper Early Hints implementation
 */
class SimpleEarlyHintsServer {
    constructor(options = {}) {
        this.port = options.port || 3443;
        this.host = options.host || 'localhost';
        this.server = null;
    }

    async start() {
        try {
            const options = await this.getSSLOptions();
            
            this.server = http2.createSecureServer(options);
            
            this.server.on('stream', (stream, headers) => {
                this.handleRequest(stream, headers);
            });

            this.server.listen(this.port, this.host, () => {
                console.log(colors.green(`🚀 Simple Early Hints Server running at https://${this.host}:${this.port}`));
                console.log(colors.blue('📡 HTTP Early Hints (103 status) enabled'));
                console.log(colors.yellow('🔗 Test endpoints:'));
                console.log('   https://localhost:3443/           - Main page with Early Hints');
                console.log('   https://localhost:3443/info       - Server information');
                console.log('   https://localhost:3443/health     - Health check');
                console.log('');
                console.log(colors.cyan('💡 Test with the Node.js client:'));
                console.log('   cd ../  # Go back to client directory');
                console.log('   node -e "import EarlyHintsClient from \'./index.js\'; const c = new EarlyHintsClient({baseUrl: \'https://localhost:3443\'}); console.log(await c.requestWithEarlyHints(\'/\')); c.close();"');
            });

        } catch (error) {
            console.error(colors.red(`💥 Failed to start server: ${error.message}`));
            process.exit(1);
        }
    }

    handleRequest(stream, headers) {
        const method = headers[':method'];
        const path = headers[':path'];
        
        console.log(colors.blue(`${method} ${path}`));

        if (path === '/') {
            this.handleMainPage(stream);
        } else if (path === '/info') {
            this.handleInfo(stream);
        } else if (path === '/health') {
            this.handleHealth(stream);
        } else if (path.startsWith('/static/')) {
            this.handleStatic(stream, path);
        } else if (path.startsWith('/api/')) {
            this.handleAPI(stream, path);
        } else {
            this.handle404(stream);
        }
    }

    handleMainPage(stream) {
        try {
            // Send 103 Early Hints using raw stream writing
            console.log(colors.cyan('📡 Sending Early Hints...'));
            
            // Write 103 Early Hints frame manually
            const earlyHintsHeaders = {
                ':status': '103',
                'link': '</static/styles.css>; rel=preload; as=style, </static/script.js>; rel=preload; as=script, </api/critical-data>; rel=preload; as=fetch; crossorigin'
            };

            // Send Early Hints frame
            stream.additionalHeaders(earlyHintsHeaders);

            // Simulate server processing
            setTimeout(() => {
                const html = this.generateMainPage();
                
                stream.respond({
                    ':status': 200,
                    'content-type': 'text/html; charset=utf-8',
                    'cache-control': 'max-age=3600'
                });
                
                stream.end(html);
                console.log(colors.green('✅ Sent final response with HTML'));
            }, 500);

        } catch (error) {
            console.error(colors.red(`❌ Error in handleMainPage: ${error.message}`));
            this.handle500(stream, error);
        }
    }

    handleInfo(stream) {
        const info = {
            server: 'Simple Node.js HTTP Early Hints Server',
            version: '1.0.0',
            early_hints: {
                supported: true,
                status_code: 103,
                implementation: 'Native Node.js HTTP/2'
            },
            endpoints: {
                '/': 'Main page with Early Hints',
                '/info': 'Server information', 
                '/health': 'Health check',
                '/static/*': 'Static resources',
                '/api/*': 'API endpoints'
            }
        };

        stream.respond({
            ':status': 200,
            'content-type': 'application/json'
        });
        
        stream.end(JSON.stringify(info, null, 2));
    }

    handleHealth(stream) {
        const health = {
            status: 'healthy',
            server: 'simple-early-hints-server',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };

        stream.respond({
            ':status': 200,
            'content-type': 'application/json'
        });
        
        stream.end(JSON.stringify(health));
    }

    handleStatic(stream, path) {
        if (path === '/static/styles.css') {
            const css = this.generateCSS();
            stream.respond({
                ':status': 200,
                'content-type': 'text/css',
                'cache-control': 'max-age=86400'
            });
            stream.end(css);
        } else if (path === '/static/script.js') {
            const js = this.generateJS();
            stream.respond({
                ':status': 200,
                'content-type': 'application/javascript',
                'cache-control': 'max-age=86400'
            });
            stream.end(js);
        } else {
            this.handle404(stream);
        }
    }

    handleAPI(stream, path) {
        if (path === '/api/critical-data') {
            setTimeout(() => {
                const data = {
                    message: "Critical data loaded via Early Hints!",
                    timestamp: new Date().toISOString(),
                    server_processing_time: "200ms",
                    early_hints_benefit: "This data was hinted for preloading"
                };
                
                stream.respond({
                    ':status': 200,
                    'content-type': 'application/json',
                    'cache-control': 'max-age=300'
                });
                
                stream.end(JSON.stringify(data));
            }, 200);
        } else {
            this.handle404(stream);
        }
    }

    handle404(stream) {
        stream.respond({
            ':status': 404,
            'content-type': 'application/json'
        });
        stream.end(JSON.stringify({ error: 'Not Found' }));
    }

    handle500(stream, error) {
        stream.respond({
            ':status': 500,
            'content-type': 'application/json'
        });
        stream.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }

    generateMainPage() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP Early Hints Demo - Simple Node.js Server</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script src="/static/script.js"></script>
</head>
<body>
    <header>
        <h1>🚀 HTTP Early Hints Working!</h1>
        <p class="subtitle">Simple Node.js HTTP/2 Server</p>
    </header>
    
    <main>
        <section class="early-hints-demo">
            <h2>✨ Early Hints in Action</h2>
            <p>This page demonstrates <strong>HTTP Early Hints (RFC 8297)</strong>:</p>
            <ol>
                <li>Your browser sent a request to this server</li>
                <li><strong>103 Early Hints</strong> response sent immediately</li>
                <li>Browser started preloading CSS, JavaScript, and API data</li>
                <li>Server processed request (500ms delay)</li>
                <li><strong>200 OK</strong> response sent with this HTML</li>
                <li>Resources were already preloaded - instant rendering! 🎯</li>
            </ol>
        </section>
        
        <section class="api-demo">
            <h2>📡 Preloaded API Data</h2>
            <div id="api-data" class="loading">Loading...</div>
        </section>
        
        <section class="performance">
            <h2>📊 Performance Benefits</h2>
            <ul>
                <li>⚡ Resources preloaded during server processing</li>
                <li>🧠 Reduced perceived loading time</li>
                <li>🔧 Better user experience</li>
                <li>📈 Measurable performance improvements</li>
            </ul>
        </section>
    </main>
    
    <footer>
        <p>🌟 HTTP Early Hints implementation with Node.js HTTP/2 | 
           <a href="https://tools.ietf.org/html/rfc8297">RFC 8297</a></p>
    </footer>
    
    <script>
        // Load API data that was preloaded via Early Hints
        loadApiData();
        
        // Show performance timing
        window.addEventListener('load', () => {
            if (window.performance) {
                const nav = window.performance.getEntriesByType('navigation')[0];
                console.log('Page load time:', nav.loadEventEnd - nav.fetchStart, 'ms');
                console.log('Resources:', window.performance.getEntriesByType('resource'));
            }
        });
    </script>
</body>
</html>`;
    }

    generateCSS() {
        return `/* HTTP Early Hints Demo Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

header {
    text-align: center;
    padding: 3rem 1rem;
    color: white;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.subtitle {
    font-size: 1.3rem;
    opacity: 0.9;
}

main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
}

section {
    background: rgba(255, 255, 255, 0.95);
    margin: 2rem 0;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

h2 {
    color: #2c3e50;
    margin-bottom: 1.5rem;
    border-bottom: 3px solid #3498db;
    padding-bottom: 0.5rem;
}

.early-hints-demo ol {
    background: #e8f5e8;
    padding: 1.5rem;
    border-radius: 10px;
    border-left: 5px solid #27ae60;
}

.early-hints-demo li {
    margin: 0.5rem 0;
    padding: 0.25rem 0;
}

#api-data {
    background: #e3f2fd;
    padding: 1.5rem;
    border-radius: 10px;
    border: 2px solid #2196f3;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
}

.loading {
    color: #666;
    font-style: italic;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.performance ul {
    list-style: none;
    padding: 1rem 0;
}

.performance li {
    padding: 0.75rem;
    margin: 0.5rem 0;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

footer {
    text-align: center;
    padding: 2rem;
    color: white;
}

footer a {
    color: #ecf0f1;
    text-decoration: underline;
}`;
    }

    generateJS() {
        return `// HTTP Early Hints Demo JavaScript
console.log('🚀 JavaScript loaded via Early Hints!');

async function loadApiData() {
    try {
        console.log('📡 Loading API data (should be preloaded)...');
        const response = await fetch('/api/critical-data');
        const data = await response.json();
        
        const element = document.getElementById('api-data');
        if (element) {
            element.classList.remove('loading');
            element.textContent = JSON.stringify(data, null, 2);
            console.log('✅ API data loaded successfully');
        }
    } catch (error) {
        console.error('❌ Error loading API data:', error);
        const element = document.getElementById('api-data');
        if (element) {
            element.textContent = 'Error loading data: ' + error.message;
        }
    }
}

// Early Hints detection
console.log('🔍 Checking for Early Hints effectiveness...');
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.performance) {
            const resources = window.performance.getEntriesByType('resource');
            const hintedResources = resources.filter(r => 
                r.name.includes('/static/') || r.name.includes('/api/')
            );
            
            console.log('📊 Performance Analysis:');
            console.log('Total resources loaded:', resources.length);
            console.log('Hinted resources:', hintedResources.length);
            
            hintedResources.forEach(resource => {
                console.log(\`  \${resource.name}: \${resource.duration.toFixed(2)}ms\`);
            });
        }
    }, 1000);
});`;
    }

    async getSSLOptions() {
        const certPath = path.join(__dirname, 'simple-server.crt');
        const keyPath = path.join(__dirname, 'simple-server.key');
        
        try {
            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                return {
                    cert: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath)
                };
            }
        } catch (error) {
            console.log(colors.yellow('⚠️  SSL certificates not found, generating...'));
        }
        
        // Generate self-signed certificate
        const selfsigned = await import('selfsigned');
        const attrs = [{ name: 'commonName', value: 'localhost' }];
        const pems = selfsigned.default.generate(attrs, { 
            days: 365,
            keySize: 2048
        });
        
        // Save certificates
        fs.writeFileSync(certPath, pems.cert);
        fs.writeFileSync(keyPath, pems.private);
        
        console.log(colors.green('✅ Generated self-signed SSL certificates'));
        
        return {
            cert: pems.cert,
            key: pems.private
        };
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log(colors.yellow('🛑 Server stopped'));
        }
    }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new SimpleEarlyHintsServer({
        port: process.argv[2] ? parseInt(process.argv[2]) : 3443
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n' + colors.yellow('🛑 Shutting down server...'));
        server.stop();
        process.exit(0);
    });

    server.start();
}

export default SimpleEarlyHintsServer;