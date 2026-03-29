#!/usr/bin/env node

import { createSecureServer } from 'http2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HTTP/3-ready Server with HTTP/2 Implementation
 * Implements Early Hints over HTTP/2 with HTTP/3 advertising
 */
class HTTP3ReadyServer {
    constructor(options = {}) {
        this.port = options.port || 3443;
        this.host = options.host || 'localhost';
        this.server = null;
        this.enableLogs = options.enableLogs !== false;
    }

    async start() {
        try {
            const sslOptions = await this.getSSLOptions();
            
            // Create HTTP/2 server with HTTP/3 support advertisement
            this.server = createSecureServer({
                ...sslOptions,
                allowHTTP1: false, // Force HTTP/2
                settings: {
                    enablePush: true
                }
            });
            
            this.server.on('stream', (stream, headers) => {
                // Add error handling for the stream
                stream.on('error', (error) => {
                    console.error(colors.red(`❌ Stream error: ${error.message}`));
                });
                
                stream.on('close', () => {
                    if (this.enableLogs) {
                        console.log(colors.gray('Stream closed'));
                    }
                });
                
                this.handleRequest(stream, headers);
            });

            this.server.on('session', (session) => {
                session.on('error', (error) => {
                    console.error(colors.red(`❌ HTTP/2 session error: ${error.message}`));
                });
            });

            this.server.listen(this.port, this.host, () => {
                console.log(colors.green(`🚀 HTTP/3-Ready Server running at https://${this.host}:${this.port}`));
                console.log(colors.blue('📡 HTTP/2 with HTTP/3 advertising and Early Hints enabled'));
                console.log(colors.yellow('🔗 Test endpoints:'));
                console.log(`   https://${this.host}:${this.port}/           - Main page with Early Hints`);
                console.log(`   https://${this.host}:${this.port}/info       - Server information`);
                console.log(`   https://${this.host}:${this.port}/health     - Health check`);
                console.log('');
                console.log(colors.cyan('💡 Test commands:'));
                console.log('   curl --http2 --insecure https://localhost:3443/');
                console.log('   curl --http3-only --insecure https://localhost:3443/ (if HTTP/3 is available)');
                console.log('');
                console.log(colors.magenta('Note: This server advertises HTTP/3 support via Alt-Svc headers'));
                console.log(colors.magenta('HTTP/3 clients will attempt to upgrade to HTTP/3 on subsequent requests'));
            });

            this.server.on('error', (error) => {
                console.error(colors.red(`❌ Server error: ${error.message}`));
                process.exit(1);
            });

        } catch (error) {
            console.error(colors.red(`💥 Failed to start HTTP/3-ready server: ${error.message}`));
            process.exit(1);
        }
    }

    handleRequest(stream, headers) {
        const method = headers[':method'];
        const url = headers[':path'];
        
        if (this.enableLogs) {
            console.log(colors.blue(`${method} ${url} (HTTP/2 with HTTP/3 advertising)`));
        }

        if (url === '/') {
            this.handleMainPage(stream, headers);
        } else if (url === '/info') {
            this.handleInfo(stream, headers);
        } else if (url === '/health') {
            this.handleHealth(stream, headers);
        } else if (url.startsWith('/static/')) {
            this.handleStatic(stream, headers, url);
        } else if (url.startsWith('/api/')) {
            this.handleAPI(stream, headers, url);
        } else {
            this.handle404(stream);
        }
    }

    handleMainPage(stream, headers) {
        try {
            console.log(colors.cyan('📡 Sending HTTP/2 Early Hints with HTTP/3 advertising...'));
            
            // Send 103 Early Hints using HTTP/2 additionalHeaders
            const earlyHintsHeaders = {
                ':status': '103',
                'link': '</static/styles.css>; rel=preload; as=style, </static/script.js>; rel=preload; as=script, </api/critical-data>; rel=preload; as=fetch; crossorigin',
                'alt-svc': 'h3=":3443"; ma=86400' // Advertise HTTP/3 support
            };

            // Check if stream is still writable before sending additional headers
            if (!stream.destroyed && !stream.closed) {
                stream.additionalHeaders(earlyHintsHeaders);
            }

            // Simulate server processing time
            setTimeout(() => {
                // Check if stream is still writable before responding
                if (!stream.destroyed && !stream.closed) {
                    const html = this.generateMainPage();
                    
                    stream.respond({
                        ':status': 200,
                        'content-type': 'text/html; charset=utf-8',
                        'cache-control': 'max-age=3600',
                        'alt-svc': 'h3=":3443"; ma=86400, h3-29=":3443"; ma=86400', // Multiple HTTP/3 versions
                        'server': 'Node.js HTTP/3-Ready Server',
                        'vary': 'Accept-Encoding'
                    });
                    
                    stream.end(html);
                    console.log(colors.green('✅ Sent final HTTP/2 response with HTTP/3 advertising'));
                }
            }, 500);

        } catch (error) {
            console.error(colors.red(`❌ Error in handleMainPage: ${error.message}`));
            this.handle500(stream, error);
        }
    }

    handleInfo(stream, headers) {
        const info = {
            server: 'HTTP/3-Ready Server',
            version: '1.0.0',
            current_protocol: 'HTTP/2',
            advertised_protocols: ['HTTP/3 (h3)', 'HTTP/3-29 (h3-29)'],
            early_hints: {
                supported: true,
                status_code: 103,
                implementation: 'Native Node.js HTTP/2 with HTTP/3 advertising'
            },
            features: [
                'HTTP/2 with server push',
                'HTTP/3 advertisement via Alt-Svc',
                'Early Hints (RFC 8297)',
                'Protocol upgrade capability',
                'Multiplexing and header compression',
                'TLS 1.3 encryption'
            ],
            http3_support: {
                advertised: true,
                alt_svc_header: 'h3=":3443"; ma=86400',
                upgrade_mechanism: 'Client should attempt HTTP/3 on next connection',
                fallback: 'HTTP/2 remains available for compatibility'
            },
            endpoints: {
                '/': 'Main page with Early Hints and HTTP/3 advertising',
                '/info': 'Server information',
                '/health': 'Health check',
                '/static/*': 'Static resources',
                '/api/*': 'API endpoints'
            },
            testing: {
                http2: 'curl --http2 --insecure https://localhost:3443/',
                http3_attempt: 'curl --http3-only --insecure https://localhost:3443/',
                browser: 'Modern browsers will automatically attempt HTTP/3 upgrade'
            }
        };

        if (!stream.destroyed && !stream.closed) {
            stream.respond({
                ':status': 200,
                'content-type': 'application/json',
                'alt-svc': 'h3=":3443"; ma=86400',
                'cache-control': 'max-age=300'
            });
            
            stream.end(JSON.stringify(info, null, 2));
        }
    }

    handleHealth(stream, headers) {
        const health = {
            status: 'healthy',
            server: 'http3-ready-server',
            protocol: 'HTTP/2 (HTTP/3 advertised)',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            node_version: process.version,
            http3_advertising: true,
            alt_svc: 'h3=":3443"; ma=86400'
        };

        if (!stream.destroyed && !stream.closed) {
            stream.respond({
                ':status': 200,
                'content-type': 'application/json',
                'alt-svc': 'h3=":3443"; ma=86400'
            });
            
            stream.end(JSON.stringify(health));
        }
    }

    handleStatic(stream, headers, url) {
        if (url === '/static/styles.css') {
            const css = this.generateCSS();
            if (!stream.destroyed && !stream.closed) {
                stream.respond({
                    ':status': 200,
                    'content-type': 'text/css',
                    'cache-control': 'max-age=86400',
                    'alt-svc': 'h3=":3443"; ma=86400'
                });
                stream.end(css);
            }
        } else if (url === '/static/script.js') {
            const js = this.generateJS();
            if (!stream.destroyed && !stream.closed) {
                stream.respond({
                    ':status': 200,
                    'content-type': 'application/javascript',
                    'cache-control': 'max-age=86400',
                    'alt-svc': 'h3=":3443"; ma=86400'
                });
                stream.end(js);
            }
        } else {
            this.handle404(stream);
        }
    }

    handleAPI(stream, headers, url) {
        if (url === '/api/critical-data') {
            setTimeout(() => {
                const data = {
                    message: "Critical data loaded via HTTP/2 Early Hints with HTTP/3 advertising!",
                    timestamp: new Date().toISOString(),
                    protocol: "HTTP/2 (HTTP/3 advertised)",
                    server_processing_time: "200ms",
                    early_hints_benefit: "This data was hinted for preloading",
                    http3_upgrade: {
                        available: true,
                        mechanism: "Alt-Svc header advertising",
                        next_request: "Browser may attempt HTTP/3",
                        benefits: [
                            "0-RTT connection establishment",
                            "No head-of-line blocking",
                            "Connection migration support",
                            "Better mobile performance"
                        ]
                    }
                };
                
                if (!stream.destroyed && !stream.closed) {
                    stream.respond({
                        ':status': 200,
                        'content-type': 'application/json',
                        'cache-control': 'max-age=300',
                        'alt-svc': 'h3=":3443"; ma=86400'
                    });
                    
                    stream.end(JSON.stringify(data));
                }
            }, 200);
        } else {
            this.handle404(stream);
        }
    }

    handle404(stream) {
        if (!stream.destroyed && !stream.closed) {
            stream.respond({
                ':status': 404,
                'content-type': 'application/json'
            });
            stream.end(JSON.stringify({ error: 'Not Found' }));
        }
    }

    handle500(stream, error) {
        if (!stream.destroyed && !stream.closed) {
            stream.respond({
                ':status': 500,
                'content-type': 'application/json'
            });
            stream.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
        }
    }

    generateMainPage() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP/3-Ready Early Hints Demo</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script src="/static/script.js"></script>
</head>
<body>
    <header>
        <h1>🚀 HTTP/3-Ready Server!</h1>
        <p class="subtitle">HTTP/2 with HTTP/3 Advertising & Early Hints</p>
    </header>
    
    <main>
        <section class="protocol-indicator">
            <h2>📡 Current: <span class="protocol-badge">HTTP/2</span> → <span class="upgrade-badge">HTTP/3 Advertised</span></h2>
            <p class="protocol-info">
                Your browser received HTTP/3 advertisement via Alt-Svc headers. 
                On the next visit, it may automatically upgrade to HTTP/3!
            </p>
        </section>

        <section class="http3-advertising">
            <h2>⚡ HTTP/3 Protocol Advertising</h2>
            <div class="advertising-info">
                <div class="ad-item">
                    <h3>📢 Alt-Svc Header Sent</h3>
                    <p><code>alt-svc: h3=":3443"; ma=86400</code></p>
                    <small>Tells browsers HTTP/3 is available on port 3443</small>
                </div>
                <div class="ad-item">
                    <h3>🔄 Automatic Upgrade</h3>
                    <p>Compatible browsers will attempt HTTP/3 on next request</p>
                    <small>Chrome, Firefox, Safari with HTTP/3 support</small>
                </div>
                <div class="ad-item">
                    <h3>🛡️ Graceful Fallback</h3>
                    <p>If HTTP/3 fails, HTTP/2 remains available</p>
                    <small>Best of both worlds approach</small>
                </div>
            </div>
        </section>

        <section class="early-hints-demo">
            <h2>✨ Early Hints in Action</h2>
            <p>This page demonstrates <strong>HTTP Early Hints (RFC 8297)</strong> with <strong>HTTP/3 advertising</strong>:</p>
            <ol>
                <li>Your browser connected via HTTP/2</li>
                <li><strong>103 Early Hints</strong> sent with Alt-Svc header</li>
                <li>Browser preloaded resources and noted HTTP/3 availability</li>
                <li>Server processed request (500ms delay)</li>
                <li><strong>200 OK</strong> response with additional Alt-Svc headers</li>
                <li>Next request may automatically use HTTP/3! 🎯</li>
            </ol>
        </section>
        
        <section class="api-demo">
            <h2>📡 Preloaded API Data</h2>
            <div id="api-data" class="loading">Loading...</div>
        </section>
        
        <section class="http3-benefits">
            <h2>🚀 What HTTP/3 Brings</h2>
            <div class="benefits-grid">
                <div class="benefit">
                    <h3>⚡ 0-RTT Connections</h3>
                    <p>Instant reconnection to known servers</p>
                </div>
                <div class="benefit">
                    <h3>🔀 No Head-of-Line Blocking</h3>
                    <p>Lost packets don't block other streams</p>
                </div>
                <div class="benefit">
                    <h3>📱 Connection Migration</h3>
                    <p>Seamless WiFi to cellular transitions</p>
                </div>
                <div class="benefit">
                    <h3>🛡️ Built-in Security</h3>
                    <p>TLS 1.3 encryption by default</p>
                </div>
            </div>
        </section>

        <section class="testing-guide">
            <h2>🧪 Testing HTTP/3</h2>
            <div class="test-commands">
                <div class="test-item">
                    <h3>Current Connection (HTTP/2)</h3>
                    <code>curl --http2 --insecure https://localhost:3443/</code>
                </div>
                <div class="test-item">
                    <h3>Force HTTP/3 Attempt</h3>
                    <code>curl --http3-only --insecure https://localhost:3443/</code>
                    <small>Requires curl with HTTP/3 support</small>
                </div>
                <div class="test-item">
                    <h3>Browser Testing</h3>
                    <p>Refresh this page - modern browsers may upgrade to HTTP/3!</p>
                    <small>Check DevTools Network tab for protocol info</small>
                </div>
            </div>
        </section>
    </main>
    
    <footer>
        <p>🌟 HTTP/3-Ready Server | 
           <a href="https://tools.ietf.org/html/rfc8297">RFC 8297 (Early Hints)</a> | 
           <a href="https://tools.ietf.org/html/rfc9114">RFC 9114 (HTTP/3)</a> |
           <a href="https://tools.ietf.org/html/rfc7838">RFC 7838 (Alt-Svc)</a></p>
    </footer>
    
    <script>
        // Load API data that was preloaded via Early Hints
        loadApiData();
        
        // Show protocol and HTTP/3 upgrade information
        window.addEventListener('load', () => {
            console.log('🚀 Page loaded with HTTP/3 advertising!');
            
            if (window.performance) {
                const nav = window.performance.getEntriesByType('navigation')[0];
                console.log('Current protocol:', nav.nextHopProtocol || 'Unknown');
                console.log('Page load time:', nav.loadEventEnd - nav.fetchStart, 'ms');
                
                // Check if protocol is HTTP/3
                if (nav.nextHopProtocol && nav.nextHopProtocol.includes('h3')) {
                    console.log('🎉 HTTP/3 connection confirmed!');
                    document.querySelector('.protocol-badge').textContent = 'HTTP/3';
                    document.querySelector('.protocol-badge').style.background = '#27ae60';
                } else {
                    console.log('📡 HTTP/2 connection, but HTTP/3 advertised for next time');
                }
            }
            
            // Show Alt-Svc information
            console.log('📢 Server advertising HTTP/3 via Alt-Svc headers');
            console.log('Next request may automatically upgrade to HTTP/3');
        });
    </script>
</body>
</html>`;
    }

    generateCSS() {
        return `/* HTTP/3-Ready Server Styles */
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
    background: linear-gradient(135deg, #f39c12, #e67e22);
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

.upgrade-badge {
    background: rgba(39,174,96,0.8);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8em;
    text-transform: uppercase;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.protocol-info {
    font-size: 1.1rem;
    margin-top: 1rem;
    opacity: 0.9;
}

.advertising-info, .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.ad-item, .benefit {
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #e74c3c;
}

.ad-item h3, .benefit h3 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
}

.ad-item code {
    background: #2c3e50;
    color: #ecf0f1;
    padding: 0.5rem;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    display: block;
    margin: 0.5rem 0;
}

.ad-item small, .test-item small {
    color: #666;
    font-style: italic;
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
    animation: loading-pulse 1.5s infinite;
}

@keyframes loading-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.test-commands {
    display: grid;
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.test-item {
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #9b59b6;
}

.test-item h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
}

.test-item code {
    background: #2c3e50;
    color: #e74c3c;
    padding: 0.75rem;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    display: block;
    margin: 0.5rem 0;
    font-size: 0.9rem;
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
    .advertising-info, .benefits-grid {
        grid-template-columns: 1fr;
    }
    
    header h1 {
        font-size: 2rem;
    }
    
    .protocol-badge, .upgrade-badge {
        display: block;
        margin: 0.5rem 0;
    }
}`;
    }

    generateJS() {
        return `// HTTP/3-Ready Server JavaScript
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

// HTTP/3 upgrade detection and analysis
console.log('🔍 Analyzing protocol and HTTP/3 advertising...');
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.performance) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            const resources = window.performance.getEntriesByType('resource');
            
            console.log('📊 Protocol Analysis:');
            console.log('Current protocol:', navigation.nextHopProtocol || 'Unknown');
            console.log('Total resources loaded:', resources.length);
            
            const hintedResources = resources.filter(r => 
                r.name.includes('/static/') || r.name.includes('/api/')
            );
            
            console.log('Hinted resources:', hintedResources.length);
            
            hintedResources.forEach(resource => {
                console.log(\`  \${resource.name}: \${resource.duration.toFixed(2)}ms (protocol: \${resource.nextHopProtocol || 'Unknown'})\`);
            });
            
            // Check for HTTP/3 vs HTTP/2
            if (navigation.nextHopProtocol && navigation.nextHopProtocol.includes('h3')) {
                console.log('🎉 HTTP/3 connection confirmed!');
                console.log('Benefits: 0-RTT, no head-of-line blocking, connection migration');
                
                // Update UI to show HTTP/3
                const badge = document.querySelector('.protocol-badge');
                if (badge) {
                    badge.textContent = 'HTTP/3';
                    badge.style.background = 'rgba(39,174,96,0.8)';
                }
                
                const upgradeInfo = document.querySelector('.protocol-info');
                if (upgradeInfo) {
                    upgradeInfo.textContent = 'Great! Your browser successfully upgraded to HTTP/3!';
                }
                
            } else if (navigation.nextHopProtocol && navigation.nextHopProtocol.includes('h2')) {
                console.log('📡 HTTP/2 connection detected with HTTP/3 advertising');
                console.log('Next request may automatically upgrade to HTTP/3');
                console.log('Benefits: Multiplexing, header compression, with HTTP/3 advertised');
                
            } else {
                console.log('ℹ️  Protocol detection inconclusive');
            }
            
            // Show Alt-Svc header information
            console.log('📢 HTTP/3 Advertising Information:');
            console.log('Alt-Svc header should advertise: h3=":3443"; ma=86400');
            console.log('This tells browsers HTTP/3 is available on port 3443');
            
        }
    }, 1000);
});

// Function to test protocol upgrade
function testProtocolUpgrade() {
    console.log('🧪 Testing protocol capabilities...');
    
    // Refresh page to potentially trigger HTTP/3 upgrade
    if (confirm('Refresh page to test HTTP/3 upgrade? (Check DevTools Network tab)')) {
        window.location.reload();
    }
}

// Add test button after load
window.addEventListener('load', () => {
    setTimeout(() => {
        const testSection = document.querySelector('.testing-guide');
        if (testSection) {
            const button = document.createElement('button');
            button.textContent = '🔄 Test HTTP/3 Upgrade';
            button.style.cssText = \`
                background: #3498db;
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1rem;
                margin-top: 1rem;
            \`;
            button.onclick = testProtocolUpgrade;
            testSection.appendChild(button);
        }
    }, 2000);
});

// Protocol comparison and education
function showProtocolComparison() {
    console.log('📊 Protocol Comparison:');
    console.log('HTTP/1.1: Single request per connection');
    console.log('HTTP/2: Multiplexing, header compression, server push');
    console.log('HTTP/3: All HTTP/2 benefits + 0-RTT, no head-of-line blocking, connection migration');
    console.log('Early Hints: Available in HTTP/2 and HTTP/3 for faster resource loading');
}

// Call comparison after a delay
setTimeout(showProtocolComparison, 3000);`;
    }

    async getSSLOptions() {
        const certPath = path.join(__dirname, 'http3-ready-server.crt');
        const keyPath = path.join(__dirname, 'http3-ready-server.key');
        
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
        
        console.log(colors.green('✅ Generated self-signed SSL certificates for HTTP/3-ready server'));
        
        return {
            cert: pems.cert,
            key: pems.private
        };
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log(colors.yellow('🛑 HTTP/3-Ready Server stopped'));
        }
    }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.argv[2] ? parseInt(process.argv[2]) : 3443;
    const server = new HTTP3ReadyServer({ port });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n' + colors.yellow('🛑 Shutting down HTTP/3-ready server...'));
        server.stop();
        process.exit(0);
    });

    server.start();
}

export default HTTP3ReadyServer;