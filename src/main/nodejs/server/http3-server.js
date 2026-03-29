#!/usr/bin/env node

import { createServer as createQuicServer } from 'quico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HTTP/3 Early Hints Server
 * Uses Node.js experimental HTTP/3 support for proper implementation
 */
class HTTP3EarlyHintsServer {
    constructor(options = {}) {
        this.port = options.port || 3443;
        this.host = options.host || 'localhost';
        this.server = null;
        this.enableLogs = options.enableLogs !== false;
    }

    async start() {
        try {
            const options = await this.getSSLOptions();
            
            this.server = createQuicServer(options, (req, res) => {
                this.handleRequest(req, res);
            });

            this.server.listen(this.port, this.host, () => {
                console.log(colors.green(`🚀 HTTP/3 Early Hints Server running at https://${this.host}:${this.port}`));
                console.log(colors.blue('📡 HTTP/3 (QUIC) with Early Hints enabled'));
                console.log(colors.yellow('🔗 Test endpoints:'));
                console.log(`   https://${this.host}:${this.port}/           - Main page with Early Hints`);
                console.log(`   https://${this.host}:${this.port}/info       - Server information`);
                console.log(`   https://${this.host}:${this.port}/health     - Health check`);
                console.log('');
                console.log(colors.cyan('💡 Test with HTTP/3 capable client:'));
                console.log('   curl --http3 --insecure https://localhost:3443/');
                console.log('   or use Chrome with --enable-quic flag');
            });

            this.server.on('error', (error) => {
                console.error(colors.red(`❌ Server error: ${error.message}`));
                process.exit(1);
            });

        } catch (error) {
            console.error(colors.red(`💥 Failed to start HTTP/3 server: ${error.message}`));
            console.log(colors.yellow('Note: HTTP/3 requires compatible client and proper certificates'));
            process.exit(1);
        }
    }

    handleRequest(req, res) {
        const method = req.method;
        const url = req.url;
        
        if (this.enableLogs) {
            console.log(colors.blue(`${method} ${url} (HTTP/3)`));
        }

        if (url === '/') {
            this.handleMainPage(req, res);
        } else if (url === '/info') {
            this.handleInfo(req, res);
        } else if (url === '/health') {
            this.handleHealth(req, res);
        } else if (url.startsWith('/static/')) {
            this.handleStatic(req, res, url);
        } else if (url.startsWith('/api/')) {
            this.handleAPI(req, res, url);
        } else {
            this.handle404(req, res);
        }
    }

    handleMainPage(req, res) {
        try {
            // Send 103 Early Hints for HTTP/3
            console.log(colors.cyan('📡 Sending HTTP/3 Early Hints...'));
            
            this.sendEarlyHints(res, [
                { url: '/static/styles.css', as: 'style' },
                { url: '/static/script.js', as: 'script' },
                { url: '/api/critical-data', as: 'fetch', crossorigin: true }
            ]);

            // Simulate server processing
            setTimeout(() => {
                const html = this.generateMainPage();
                
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'max-age=3600',
                    'Alt-Svc': 'h3=":3443"; ma=86400', // Advertise HTTP/3 support
                    'Server': 'Node.js HTTP/3 Early Hints Server'
                });
                
                res.end(html);
                console.log(colors.green('✅ Sent final HTTP/3 response with HTML'));
            }, 500);

        } catch (error) {
            console.error(colors.red(`❌ Error in handleMainPage: ${error.message}`));
            this.handle500(req, res, error);
        }
    }

    sendEarlyHints(res, resources) {
        try {
            const linkHeader = resources.map(resource => this.formatLinkHeader(resource)).join(', ');
            
            // Send 103 Early Hints status
            res.writeHead(103, {
                'Link': linkHeader
            });
            
            if (this.enableLogs) {
                console.log(colors.cyan(`📡 HTTP/3 Early Hints sent: ${resources.length} resources`));
                resources.forEach(resource => {
                    console.log(colors.gray(`   → ${resource.url} (${resource.as})`));
                });
            }
            
        } catch (error) {
            console.error(colors.red(`❌ Error sending Early Hints: ${error.message}`));
        }
    }

    formatLinkHeader(resource) {
        let link = `<${resource.url}>; rel=preload; as=${resource.as}`;
        
        if (resource.type) {
            link += `; type=${resource.type}`;
        }
        
        if (resource.crossorigin) {
            link += `; crossorigin`;
        }
        
        return link;
    }

    handleInfo(req, res) {
        const info = {
            server: 'Node.js HTTP/3 Early Hints Server',
            version: '1.0.0',
            protocol: 'HTTP/3 (QUIC)',
            early_hints: {
                supported: true,
                status_code: 103,
                implementation: 'Native Node.js HTTP/3'
            },
            features: [
                'HTTP/3 over QUIC',
                'Early Hints (RFC 8297)',
                'Multiplexing without head-of-line blocking',
                '0-RTT connection establishment',
                'Connection migration support'
            ],
            endpoints: {
                '/': 'Main page with Early Hints',
                '/info': 'Server information', 
                '/health': 'Health check',
                '/static/*': 'Static resources',
                '/api/*': 'API endpoints'
            }
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Alt-Svc': 'h3=":3443"; ma=86400'
        });
        
        res.end(JSON.stringify(info, null, 2));
    }

    handleHealth(req, res) {
        const health = {
            status: 'healthy',
            server: 'http3-early-hints-server',
            protocol: 'HTTP/3',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            node_version: process.version
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Alt-Svc': 'h3=":3443"; ma=86400'
        });
        
        res.end(JSON.stringify(health));
    }

    handleStatic(req, res, url) {
        if (url === '/static/styles.css') {
            const css = this.generateCSS();
            res.writeHead(200, {
                'Content-Type': 'text/css',
                'Cache-Control': 'max-age=86400',
                'Alt-Svc': 'h3=":3443"; ma=86400'
            });
            res.end(css);
        } else if (url === '/static/script.js') {
            const js = this.generateJS();
            res.writeHead(200, {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'max-age=86400',
                'Alt-Svc': 'h3=":3443"; ma=86400'
            });
            res.end(js);
        } else {
            this.handle404(req, res);
        }
    }

    handleAPI(req, res, url) {
        if (url === '/api/critical-data') {
            setTimeout(() => {
                const data = {
                    message: "Critical data loaded via HTTP/3 Early Hints!",
                    timestamp: new Date().toISOString(),
                    protocol: "HTTP/3 (QUIC)",
                    server_processing_time: "200ms",
                    early_hints_benefit: "This data was hinted for preloading over HTTP/3",
                    quic_features: [
                        "No head-of-line blocking",
                        "0-RTT connection establishment",
                        "Connection migration",
                        "Improved multiplexing"
                    ]
                };
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'max-age=300',
                    'Alt-Svc': 'h3=":3443"; ma=86400'
                });
                
                res.end(JSON.stringify(data));
            }, 200);
        } else {
            this.handle404(req, res);
        }
    }

    handle404(req, res) {
        res.writeHead(404, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }

    handle500(req, res, error) {
        res.writeHead(500, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }

    generateMainPage() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP/3 Early Hints Demo - Node.js Server</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script src="/static/script.js"></script>
</head>
<body>
    <header>
        <h1>🚀 HTTP/3 Early Hints Working!</h1>
        <p class="subtitle">Node.js HTTP/3 (QUIC) Server</p>
    </header>
    
    <main>
        <section class="protocol-info">
            <h2>⚡ HTTP/3 Protocol Benefits</h2>
            <div class="benefits-grid">
                <div class="benefit">
                    <h3>🔀 No Head-of-Line Blocking</h3>
                    <p>Independent stream processing</p>
                </div>
                <div class="benefit">
                    <h3>⚡ 0-RTT Connections</h3>
                    <p>Faster connection establishment</p>
                </div>
                <div class="benefit">
                    <h3>🔄 Connection Migration</h3>
                    <p>Seamless network transitions</p>
                </div>
                <div class="benefit">
                    <h3>📦 Built-in Multiplexing</h3>
                    <p>Better resource utilization</p>
                </div>
            </div>
        </section>

        <section class="early-hints-demo">
            <h2>✨ HTTP/3 Early Hints in Action</h2>
            <p>This page demonstrates <strong>HTTP Early Hints (RFC 8297)</strong> over <strong>HTTP/3 (QUIC)</strong>:</p>
            <ol>
                <li>Your browser established a QUIC connection</li>
                <li><strong>103 Early Hints</strong> response sent immediately over HTTP/3</li>
                <li>Browser started preloading resources using HTTP/3 multiplexing</li>
                <li>Server processed request (500ms delay)</li>
                <li><strong>200 OK</strong> response sent with this HTML</li>
                <li>Resources were already preloaded with no head-of-line blocking! 🎯</li>
            </ol>
        </section>
        
        <section class="api-demo">
            <h2>📡 Preloaded API Data (HTTP/3)</h2>
            <div id="api-data" class="loading">Loading...</div>
        </section>
        
        <section class="performance">
            <h2>📊 HTTP/3 Performance Benefits</h2>
            <ul>
                <li>⚡ Resources preloaded during server processing</li>
                <li>🚫 No head-of-line blocking between streams</li>
                <li>🧠 Reduced perceived loading time</li>
                <li>🔧 Better connection resilience</li>
                <li>📈 Improved multiplexing efficiency</li>
            </ul>
        </section>

        <section class="technical-details">
            <h2>🔧 Technical Implementation</h2>
            <div class="tech-grid">
                <div class="tech-item">
                    <h3>Transport Protocol</h3>
                    <p>QUIC over UDP</p>
                </div>
                <div class="tech-item">
                    <h3>Application Protocol</h3>
                    <p>HTTP/3</p>
                </div>
                <div class="tech-item">
                    <h3>Early Hints</h3>
                    <p>RFC 8297 (103 status)</p>
                </div>
                <div class="tech-item">
                    <h3>Encryption</h3>
                    <p>TLS 1.3 by default</p>
                </div>
            </div>
        </section>
    </main>
    
    <footer>
        <p>🌟 HTTP/3 Early Hints implementation with Node.js | 
           <a href="https://tools.ietf.org/html/rfc8297">RFC 8297</a> | 
           <a href="https://tools.ietf.org/html/rfc9114">RFC 9114 (HTTP/3)</a></p>
    </footer>
    
    <script>
        // Load API data that was preloaded via HTTP/3 Early Hints
        loadApiData();
        
        // Show protocol and performance information
        window.addEventListener('load', () => {
            console.log('🚀 Page loaded over HTTP/3!');
            
            if (window.performance) {
                const nav = window.performance.getEntriesByType('navigation')[0];
                console.log('Protocol:', nav.nextHopProtocol || 'Unknown');
                console.log('Page load time:', nav.loadEventEnd - nav.fetchStart, 'ms');
                console.log('Resources:', window.performance.getEntriesByType('resource'));
            }
            
            // Check if connection is HTTP/3
            if (navigator.connection) {
                console.log('Connection info:', navigator.connection);
            }
        });
    </script>
</body>
</html>`;
    }

    generateCSS() {
        return `/* HTTP/3 Early Hints Demo Styles */
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
    max-width: 1200px;
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

.benefits-grid, .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.benefit, .tech-item {
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #e74c3c;
    text-align: center;
}

.benefit h3, .tech-item h3 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
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
    border-left: 4px solid #e74c3c;
}

footer {
    text-align: center;
    padding: 2rem;
    color: white;
}

footer a {
    color: #ecf0f1;
    text-decoration: underline;
}

@media (max-width: 768px) {
    .benefits-grid, .tech-grid {
        grid-template-columns: 1fr;
    }
    
    header h1 {
        font-size: 2rem;
    }
}`;
    }

    generateJS() {
        return `// HTTP/3 Early Hints Demo JavaScript
console.log('🚀 JavaScript loaded via HTTP/3 Early Hints!');

async function loadApiData() {
    try {
        console.log('📡 Loading API data (should be preloaded via HTTP/3)...');
        const response = await fetch('/api/critical-data');
        const data = await response.json();
        
        const element = document.getElementById('api-data');
        if (element) {
            element.classList.remove('loading');
            element.textContent = JSON.stringify(data, null, 2);
            console.log('✅ API data loaded successfully over HTTP/3');
        }
    } catch (error) {
        console.error('❌ Error loading API data:', error);
        const element = document.getElementById('api-data');
        if (element) {
            element.textContent = 'Error loading data: ' + error.message;
        }
    }
}

// HTTP/3 specific performance monitoring
console.log('🔍 Checking for HTTP/3 Early Hints effectiveness...');
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.performance) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            const resources = window.performance.getEntriesByType('resource');
            
            console.log('📊 HTTP/3 Performance Analysis:');
            console.log('Protocol used:', navigation.nextHopProtocol || 'Unknown');
            console.log('Total resources loaded:', resources.length);
            
            const hintedResources = resources.filter(r => 
                r.name.includes('/static/') || r.name.includes('/api/')
            );
            
            console.log('Hinted resources:', hintedResources.length);
            
            hintedResources.forEach(resource => {
                console.log(\`  \${resource.name}: \${resource.duration.toFixed(2)}ms (protocol: \${resource.nextHopProtocol || 'Unknown'})\`);
            });
            
            // Check for HTTP/3 specific features
            if (navigation.nextHopProtocol && navigation.nextHopProtocol.includes('h3')) {
                console.log('🎉 HTTP/3 connection confirmed!');
            } else {
                console.log('⚠️  HTTP/3 not detected, may have fallen back to HTTP/2 or HTTP/1.1');
            }
        }
    }, 1000);
});

// Monitor connection changes (useful for HTTP/3 connection migration)
if (navigator.connection) {
    navigator.connection.addEventListener('change', () => {
        console.log('🔄 Network connection changed:', navigator.connection);
    });
}`;
    }

    async getSSLOptions() {
        const certPath = path.join(__dirname, 'http3-server.crt');
        const keyPath = path.join(__dirname, 'http3-server.key');
        
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
            keySize: 2048,
            extensions: [{
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 7, ip: '127.0.0.1' }
                ]
            }]
        });
        
        // Save certificates
        fs.writeFileSync(certPath, pems.cert);
        fs.writeFileSync(keyPath, pems.private);
        
        console.log(colors.green('✅ Generated self-signed SSL certificates for HTTP/3'));
        
        return {
            cert: pems.cert,
            key: pems.private
        };
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log(colors.yellow('🛑 HTTP/3 Server stopped'));
        }
    }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new HTTP3EarlyHintsServer({
        port: process.argv[2] ? parseInt(process.argv[2]) : 3443
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n' + colors.yellow('🛑 Shutting down HTTP/3 server...'));
        server.stop();
        process.exit(0);
    });

    server.start();
}

export default HTTP3EarlyHintsServer;