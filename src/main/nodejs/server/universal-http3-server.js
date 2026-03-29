#!/usr/bin/env node

import { createServer as createQuicServer } from 'quico';
import { createSecureServer as createHttp2Server } from 'http2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Universal HTTP/3 Early Hints Server with HTTP/2 Fallback
 * Uses quico for HTTP/3 with graceful fallback to HTTP/2
 */
class UniversalHTTP3Server {
    constructor(options = {}) {
        this.port = options.port || 3443;
        this.http2Port = options.http2Port || 3444;
        this.host = options.host || 'localhost';
        this.http3Server = null;
        this.http2Server = null;
        this.enableLogs = options.enableLogs !== false;
    }

    async start() {
        try {
            const sslOptions = await this.getSSLOptions();
            
            // Try to start HTTP/3 server
            await this.startHTTP3Server(sslOptions);
            
            // Start HTTP/2 fallback server
            await this.startHTTP2Server(sslOptions);
            
            console.log(colors.green(`🚀 Universal HTTP/3 Server started successfully!`));
            console.log(colors.blue(`📡 HTTP/3 (QUIC): https://${this.host}:${this.port}`));
            console.log(colors.cyan(`📡 HTTP/2 Fallback: https://${this.host}:${this.http2Port}`));
            console.log('');
            console.log(colors.yellow('🔗 Test endpoints:'));
            console.log(`   https://${this.host}:${this.port}/           - Main page with HTTP/3 Early Hints`);
            console.log(`   https://${this.host}:${this.http2Port}/      - Same page with HTTP/2 Early Hints`);
            console.log('');
            console.log(colors.cyan('💡 Test commands:'));
            console.log('   curl --http3 --insecure https://localhost:3443/');
            console.log('   curl --http2 --insecure https://localhost:3444/');

        } catch (error) {
            console.error(colors.red(`💥 Failed to start servers: ${error.message}`));
            process.exit(1);
        }
    }

    async startHTTP3Server(sslOptions) {
        try {
            this.http3Server = createQuicServer({
                key: sslOptions.key,
                cert: sslOptions.cert,
                alpn: ['h3']
            });

            this.http3Server.on('request', (req, res) => {
                this.handleRequest(req, res, 'HTTP/3');
            });

            this.http3Server.on('connect', () => {
                if (this.enableLogs) {
                    console.log(colors.green('✅ HTTP/3 client connected'));
                }
            });

            this.http3Server.on('error', (error) => {
                console.error(colors.red(`❌ HTTP/3 Server error: ${error.message}`));
            });

            return new Promise((resolve, reject) => {
                this.http3Server.listen(this.port, this.host, (error) => {
                    if (error) {
                        console.log(colors.yellow('⚠️  HTTP/3 server failed to start, continuing with HTTP/2 only'));
                        resolve();
                    } else {
                        console.log(colors.green(`✅ HTTP/3 server listening on port ${this.port}`));
                        resolve();
                    }
                });
            });

        } catch (error) {
            console.log(colors.yellow(`⚠️  HTTP/3 not available: ${error.message}`));
            console.log(colors.yellow('Continuing with HTTP/2 only...'));
        }
    }

    async startHTTP2Server(sslOptions) {
        this.http2Server = createHttp2Server(sslOptions);
        
        this.http2Server.on('stream', (stream, headers) => {
            this.handleHTTP2Request(stream, headers);
        });

        return new Promise((resolve, reject) => {
            this.http2Server.listen(this.http2Port, this.host, () => {
                console.log(colors.green(`✅ HTTP/2 fallback server listening on port ${this.http2Port}`));
                resolve();
            });
        });
    }

    handleRequest(req, res, protocol = 'HTTP/3') {
        const method = req.method;
        const url = req.url;
        
        if (this.enableLogs) {
            console.log(colors.blue(`${method} ${url} (${protocol})`));
        }

        if (url === '/') {
            this.handleMainPage(req, res, protocol);
        } else if (url === '/info') {
            this.handleInfo(req, res, protocol);
        } else if (url === '/health') {
            this.handleHealth(req, res, protocol);
        } else if (url.startsWith('/static/')) {
            this.handleStatic(req, res, url, protocol);
        } else if (url.startsWith('/api/')) {
            this.handleAPI(req, res, url, protocol);
        } else {
            this.handle404(req, res);
        }
    }

    handleHTTP2Request(stream, headers) {
        const method = headers[':method'];
        const url = headers[':path'];
        
        if (this.enableLogs) {
            console.log(colors.blue(`${method} ${url} (HTTP/2)`));
        }

        // Create a req/res-like interface for HTTP/2
        const req = { method, url, headers };
        const res = {
            writeHead: (status, headers) => {
                stream.respond({ ':status': status, ...headers });
            },
            end: (data) => {
                stream.end(data);
            }
        };

        if (url === '/') {
            this.handleMainPageHTTP2(stream, headers);
        } else if (url === '/info') {
            this.handleInfo(req, res, 'HTTP/2');
        } else if (url === '/health') {
            this.handleHealth(req, res, 'HTTP/2');
        } else if (url.startsWith('/static/')) {
            this.handleStatic(req, res, url, 'HTTP/2');
        } else if (url.startsWith('/api/')) {
            this.handleAPI(req, res, url, 'HTTP/2');
        } else {
            stream.respond({ ':status': 404 });
            stream.end(JSON.stringify({ error: 'Not Found' }));
        }
    }

    handleMainPage(req, res, protocol) {
        try {
            console.log(colors.cyan(`📡 Sending ${protocol} Early Hints...`));
            
            this.sendEarlyHints(res, [
                { url: '/static/styles.css', as: 'style' },
                { url: '/static/script.js', as: 'script' },
                { url: '/api/critical-data', as: 'fetch', crossorigin: true }
            ], protocol);

            setTimeout(() => {
                const html = this.generateMainPage(protocol);
                
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'max-age=3600',
                    'Alt-Svc': 'h3=":3443"; ma=86400',
                    'Server': `Node.js ${protocol} Early Hints Server`
                });
                
                res.end(html);
                console.log(colors.green(`✅ Sent final ${protocol} response with HTML`));
            }, 500);

        } catch (error) {
            console.error(colors.red(`❌ Error in handleMainPage: ${error.message}`));
            this.handle500(req, res, error);
        }
    }

    handleMainPageHTTP2(stream, headers) {
        try {
            console.log(colors.cyan('📡 Sending HTTP/2 Early Hints...'));
            
            // Send 103 Early Hints using HTTP/2 additionalHeaders
            const earlyHintsHeaders = {
                ':status': '103',
                'link': '</static/styles.css>; rel=preload; as=style, </static/script.js>; rel=preload; as=script, </api/critical-data>; rel=preload; as=fetch; crossorigin'
            };

            stream.additionalHeaders(earlyHintsHeaders);

            setTimeout(() => {
                const html = this.generateMainPage('HTTP/2');
                
                stream.respond({
                    ':status': 200,
                    'content-type': 'text/html; charset=utf-8',
                    'cache-control': 'max-age=3600',
                    'alt-svc': 'h3=":3443"; ma=86400',
                    'server': 'Node.js HTTP/2 Early Hints Server'
                });
                
                stream.end(html);
                console.log(colors.green('✅ Sent final HTTP/2 response with HTML'));
            }, 500);

        } catch (error) {
            console.error(colors.red(`❌ Error in handleMainPageHTTP2: ${error.message}`));
            stream.respond({ ':status': 500 });
            stream.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    }

    sendEarlyHints(res, resources, protocol) {
        try {
            const linkHeader = resources.map(resource => this.formatLinkHeader(resource)).join(', ');
            
            // Send 103 Early Hints status
            res.writeHead(103, {
                'Link': linkHeader
            });
            
            if (this.enableLogs) {
                console.log(colors.cyan(`📡 ${protocol} Early Hints sent: ${resources.length} resources`));
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

    handleInfo(req, res, protocol) {
        const info = {
            server: 'Universal HTTP/3 Early Hints Server',
            version: '1.0.0',
            current_protocol: protocol,
            available_protocols: ['HTTP/3', 'HTTP/2'],
            early_hints: {
                supported: true,
                status_code: 103,
                implementation: `Native Node.js ${protocol}`
            },
            features: [
                'HTTP/3 over QUIC (primary)',
                'HTTP/2 fallback',
                'Early Hints (RFC 8297)',
                'Multiplexing without head-of-line blocking',
                '0-RTT connection establishment (HTTP/3)',
                'Connection migration support (HTTP/3)'
            ],
            endpoints: {
                '/': 'Main page with Early Hints',
                '/info': 'Server information', 
                '/health': 'Health check',
                '/static/*': 'Static resources',
                '/api/*': 'API endpoints'
            },
            ports: {
                http3: this.port,
                http2_fallback: this.http2Port
            }
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Alt-Svc': 'h3=":3443"; ma=86400'
        });
        
        res.end(JSON.stringify(info, null, 2));
    }

    handleHealth(req, res, protocol) {
        const health = {
            status: 'healthy',
            server: 'universal-http3-server',
            protocol: protocol,
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

    handleStatic(req, res, url, protocol) {
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

    handleAPI(req, res, url, protocol) {
        if (url === '/api/critical-data') {
            setTimeout(() => {
                const data = {
                    message: `Critical data loaded via ${protocol} Early Hints!`,
                    timestamp: new Date().toISOString(),
                    protocol: protocol,
                    server_processing_time: "200ms",
                    early_hints_benefit: `This data was hinted for preloading over ${protocol}`,
                    protocol_features: this.getProtocolFeatures(protocol)
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

    getProtocolFeatures(protocol) {
        if (protocol === 'HTTP/3') {
            return [
                "No head-of-line blocking",
                "0-RTT connection establishment",
                "Connection migration",
                "Improved multiplexing",
                "QUIC transport layer"
            ];
        } else if (protocol === 'HTTP/2') {
            return [
                "Multiplexing",
                "Header compression",
                "Server push capability",
                "Binary protocol",
                "Stream prioritization"
            ];
        }
        return [];
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

    generateMainPage(protocol) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${protocol} Early Hints Demo - Universal Server</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script src="/static/script.js"></script>
</head>
<body>
    <header>
        <h1>🚀 ${protocol} Early Hints Working!</h1>
        <p class="subtitle">Universal Node.js ${protocol} Server</p>
    </header>
    
    <main>
        <section class="protocol-indicator">
            <h2>📡 Current Protocol: <span class="protocol-badge">${protocol}</span></h2>
            <p class="protocol-info">
                ${protocol === 'HTTP/3' ? 
                    'You are using HTTP/3 over QUIC - the latest and fastest protocol!' : 
                    'You are using HTTP/2 - still fast with multiplexing support!'}
            </p>
        </section>

        <section class="protocol-info">
            <h2>⚡ ${protocol} Protocol Benefits</h2>
            <div class="benefits-grid">
                ${this.generateProtocolBenefits(protocol)}
            </div>
        </section>

        <section class="early-hints-demo">
            <h2>✨ ${protocol} Early Hints in Action</h2>
            <p>This page demonstrates <strong>HTTP Early Hints (RFC 8297)</strong> over <strong>${protocol}</strong>:</p>
            <ol>
                <li>Your browser established a ${protocol.toLowerCase()} connection</li>
                <li><strong>103 Early Hints</strong> response sent immediately</li>
                <li>Browser started preloading resources using ${protocol}</li>
                <li>Server processed request (500ms delay)</li>
                <li><strong>200 OK</strong> response sent with this HTML</li>
                <li>Resources were already preloaded! 🎯</li>
            </ol>
        </section>
        
        <section class="api-demo">
            <h2>📡 Preloaded API Data (${protocol})</h2>
            <div id="api-data" class="loading">Loading...</div>
        </section>
        
        <section class="server-comparison">
            <h2>🔗 Try Both Protocols</h2>
            <div class="comparison-grid">
                <div class="server-option">
                    <h3>HTTP/3 Server</h3>
                    <p>Port 3443 - Latest protocol</p>
                    <a href="https://localhost:3443/" class="button">Visit HTTP/3</a>
                </div>
                <div class="server-option">
                    <h3>HTTP/2 Fallback</h3>
                    <p>Port 3444 - Reliable fallback</p>
                    <a href="https://localhost:3444/" class="button">Visit HTTP/2</a>
                </div>
            </div>
        </section>
    </main>
    
    <footer>
        <p>🌟 Universal HTTP/3 Early Hints implementation | 
           <a href="https://tools.ietf.org/html/rfc8297">RFC 8297</a> | 
           <a href="https://tools.ietf.org/html/rfc9114">RFC 9114 (HTTP/3)</a></p>
    </footer>
    
    <script>
        // Load API data that was preloaded via Early Hints
        loadApiData('${protocol}');
        
        // Show protocol and performance information
        window.addEventListener('load', () => {
            console.log('🚀 Page loaded over ${protocol}!');
            
            if (window.performance) {
                const nav = window.performance.getEntriesByType('navigation')[0];
                console.log('Protocol detected:', nav.nextHopProtocol || 'Unknown');
                console.log('Page load time:', nav.loadEventEnd - nav.fetchStart, 'ms');
            }
        });
    </script>
</body>
</html>`;
    }

    generateProtocolBenefits(protocol) {
        if (protocol === 'HTTP/3') {
            return `
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
                    <h3>📦 QUIC Transport</h3>
                    <p>Built-in security and reliability</p>
                </div>
            `;
        } else {
            return `
                <div class="benefit">
                    <h3>🔀 Multiplexing</h3>
                    <p>Multiple requests per connection</p>
                </div>
                <div class="benefit">
                    <h3>📦 Header Compression</h3>
                    <p>Reduced overhead</p>
                </div>
                <div class="benefit">
                    <h3>⚡ Binary Protocol</h3>
                    <p>Efficient data transfer</p>
                </div>
                <div class="benefit">
                    <h3>🎯 Stream Priority</h3>
                    <p>Optimized resource loading</p>
                </div>
            `;
        }
    }

    generateCSS() {
        return `/* Universal HTTP/3 Early Hints Demo Styles */
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

.protocol-indicator {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: white;
}

.protocol-indicator h2 {
    color: white;
    border-bottom-color: rgba(255,255,255,0.3);
}

.protocol-badge {
    background: rgba(255,255,255,0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9em;
    text-transform: uppercase;
}

.protocol-info {
    font-size: 1.1rem;
    margin-top: 1rem;
    opacity: 0.9;
}

.benefits-grid, .comparison-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.benefit, .server-option {
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #e74c3c;
    text-align: center;
}

.benefit h3, .server-option h3 {
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

.button {
    display: inline-block;
    background: #3498db;
    color: white;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    margin: 0.5rem;
    transition: all 0.3s;
    font-weight: 500;
}

.button:hover {
    background: #2980b9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
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
    .benefits-grid, .comparison-grid {
        grid-template-columns: 1fr;
    }
    
    header h1 {
        font-size: 2rem;
    }
}`;
    }

    generateJS() {
        return `// Universal HTTP/3 Early Hints Demo JavaScript
console.log('🚀 JavaScript loaded via Early Hints!');

async function loadApiData(protocol) {
    try {
        console.log(\`📡 Loading API data (should be preloaded via \${protocol})...\`);
        const response = await fetch('/api/critical-data');
        const data = await response.json();
        
        const element = document.getElementById('api-data');
        if (element) {
            element.classList.remove('loading');
            element.textContent = JSON.stringify(data, null, 2);
            console.log(\`✅ API data loaded successfully over \${protocol}\`);
        }
    } catch (error) {
        console.error('❌ Error loading API data:', error);
        const element = document.getElementById('api-data');
        if (element) {
            element.textContent = 'Error loading data: ' + error.message;
        }
    }
}

// Protocol detection and performance monitoring
console.log('🔍 Analyzing protocol and Early Hints effectiveness...');
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.performance) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            const resources = window.performance.getEntriesByType('resource');
            
            console.log('📊 Performance Analysis:');
            console.log('Protocol detected:', navigation.nextHopProtocol || 'Unknown');
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
                console.log('Benefits: No head-of-line blocking, 0-RTT, connection migration');
            } else if (navigation.nextHopProtocol && navigation.nextHopProtocol.includes('h2')) {
                console.log('✅ HTTP/2 connection detected');
                console.log('Benefits: Multiplexing, header compression, binary protocol');
            } else {
                console.log('ℹ️  Protocol detection inconclusive');
            }
        }
    }, 1000);
});

// Monitor connection changes (useful for HTTP/3 connection migration)
if (navigator.connection) {
    navigator.connection.addEventListener('change', () => {
        console.log('🔄 Network connection changed:', navigator.connection);
        console.log('This is where HTTP/3 connection migration would be beneficial!');
    });
}

// Performance comparison helper
function compareProtocols() {
    console.log('🔍 Protocol Comparison Tips:');
    console.log('• HTTP/3: Best for high-latency, lossy networks');
    console.log('• HTTP/2: Reliable fallback with good performance');
    console.log('• Both support Early Hints for faster loading');
}

// Call comparison on load
setTimeout(compareProtocols, 2000);`;
    }

    async getSSLOptions() {
        const certPath = path.join(__dirname, 'universal-server.crt');
        const keyPath = path.join(__dirname, 'universal-server.key');
        
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
        
        console.log(colors.green('✅ Generated self-signed SSL certificates for Universal server'));
        
        return {
            cert: pems.cert,
            key: pems.private
        };
    }

    stop() {
        if (this.http3Server) {
            this.http3Server.close();
            console.log(colors.yellow('🛑 HTTP/3 Server stopped'));
        }
        if (this.http2Server) {
            this.http2Server.close();
            console.log(colors.yellow('🛑 HTTP/2 Server stopped'));
        }
    }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.argv[2] ? parseInt(process.argv[2]) : 3443;
    const server = new UniversalHTTP3Server({
        port: port,
        http2Port: port + 1
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n' + colors.yellow('🛑 Shutting down Universal HTTP/3 server...'));
        server.stop();
        process.exit(0);
    });

    server.start();
}

export default UniversalHTTP3Server;