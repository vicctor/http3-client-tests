#!/usr/bin/env node

import express from 'express';
import spdy from 'spdy';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';
import { program } from 'commander';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HTTP Early Hints Server
 * Implements proper 103 Early Hints responses with HTTP/2
 */
class EarlyHintsServer {
    constructor(options = {}) {
        this.port = options.port || 3443;
        this.host = options.host || 'localhost';
        this.app = express();
        this.server = null;
        this.enableLogs = options.enableLogs !== false;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupStaticResources();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Logging middleware
        if (this.enableLogs) {
            this.app.use((req, res, next) => {
                const start = Date.now();
                res.on('finish', () => {
                    const duration = Date.now() - start;
                    const method = req.method.padEnd(6);
                    const url = req.url.padEnd(30);
                    const status = res.statusCode;
                    const statusColor = status >= 400 ? 'red' : status >= 300 ? 'yellow' : 'green';
                    
                    console.log(`${colors.blue(method)} ${url} ${colors[statusColor](status)} ${duration}ms`);
                });
                next();
            });
        }

        // CORS headers
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    /**
     * Setup routes with Early Hints
     */
    setupRoutes() {
        // Root page with Early Hints and HTTP/3 advertising
        this.app.get('/', (req, res) => {
            this.sendEarlyHints(res, [
                { url: '/static/styles.css', as: 'style' },
                { url: '/static/script.js', as: 'script' },
                { url: '/api/critical-data', as: 'fetch', crossorigin: true }
            ]);

            // Simulate server processing time
            setTimeout(() => {
                const html = this.generateMainPage();
                res.status(200);
                res.set({
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'max-age=3600',
                    'Alt-Svc': 'h3=":3443"; ma=86400' // Advertise HTTP/3 support
                });
                res.send(html);
            }, 500); // 500ms processing delay
        });

        // Advanced page with multiple resource types
        this.app.get('/advanced', (req, res) => {
            this.sendEarlyHints(res, [
                { url: '/static/styles.css', as: 'style' },
                { url: '/static/advanced.css', as: 'style' },
                { url: '/static/script.js', as: 'script' },
                { url: '/static/analytics.js', as: 'script' },
                { url: '/api/critical-data', as: 'fetch', crossorigin: true },
                { url: '/api/user-preferences', as: 'fetch', crossorigin: true },
                { url: '/static/fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: true }
            ]);

            setTimeout(() => {
                const html = this.generateAdvancedPage();
                res.status(200);
                res.set({
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'max-age=1800',
                    'Alt-Svc': 'h3=":3443"; ma=86400'
                });
                res.send(html);
            }, 800); // Longer processing time
        });

        // API endpoints
        this.app.get('/api/critical-data', (req, res) => {
            // Simulate API processing
            setTimeout(() => {
                const data = {
                    message: "Critical data loaded via Early Hints preloading",
                    timestamp: new Date().toISOString(),
                    features: [
                        "HTTP Early Hints (103 status)",
                        "Resource preloading during server processing",
                        "Improved perceived performance",
                        "Better user experience"
                    ],
                    performance: {
                        "server_processing_time": "500ms",
                        "preload_opportunity": "100%",
                        "perceived_improvement": "30-50%"
                    }
                };
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'max-age=300');
                res.json(data);
            }, 200);
        });

        this.app.get('/api/user-preferences', (req, res) => {
            setTimeout(() => {
                const preferences = {
                    theme: 'auto',
                    language: 'en',
                    notifications: true,
                    analytics: false,
                    performance_mode: 'early_hints_enabled'
                };
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'max-age=600');
                res.json(preferences);
            }, 150);
        });

        // Info endpoint with HTTP/3 information
        this.app.get('/info', (req, res) => {
            const info = {
                server: 'Node.js HTTP Early Hints Server with HTTP/3 Advertising',
                version: '1.0.0',
                current_protocol: 'HTTP/2',
                advertised_protocols: ['HTTP/3'],
                features: [
                    'HTTP Early Hints (RFC 8297)',
                    'HTTP/2 Server Push simulation via 103 status',
                    'HTTP/3 advertising via Alt-Svc headers',
                    'Resource preloading optimization',
                    'Performance measurement endpoints'
                ],
                early_hints_implementation: {
                    status_code: 103,
                    header_format: 'Link: <url>; rel=preload; as=type',
                    supported_resource_types: ['style', 'script', 'fetch', 'font', 'image'],
                    timing: 'Sent immediately before server processing'
                },
                http3_support: {
                    advertised: true,
                    alt_svc_header: 'h3=":3443"; ma=86400',
                    upgrade_mechanism: 'Browsers will attempt HTTP/3 on subsequent requests',
                    benefits: ['0-RTT connections', 'No head-of-line blocking', 'Connection migration']
                },
                endpoints: {
                    '/': 'Main page with Early Hints and HTTP/3 advertising',
                    '/advanced': 'Advanced page with multiple resource hints',
                    '/static/*': 'Static resources (CSS, JS, fonts)',
                    '/api/*': 'API endpoints for data',
                    '/info': 'Server information',
                    '/benchmark': 'Performance testing endpoint'
                }
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Alt-Svc', 'h3=":3443"; ma=86400');
            res.json(info);
        });

        // Benchmark endpoint for performance testing
        this.app.get('/benchmark', (req, res) => {
            const resources = req.query.resources ? parseInt(req.query.resources) : 3;
            const delay = req.query.delay ? parseInt(req.query.delay) : 500;
            
            // Generate dynamic hints based on query parameters
            const hints = [];
            for (let i = 0; i < resources; i++) {
                hints.push({
                    url: `/static/resource-${i}.css`,
                    as: i % 2 === 0 ? 'style' : 'script'
                });
            }
            
            this.sendEarlyHints(res, hints);
            
            setTimeout(() => {
                const result = {
                    benchmark_id: Math.random().toString(36).substr(2, 9),
                    early_hints_sent: hints.length,
                    server_processing_time: delay,
                    timestamp: new Date().toISOString(),
                    hints: hints
                };
                
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify(result));
            }, delay);
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                server: 'early-hints-server',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Setup static resource routes
     */
    setupStaticResources() {
        // CSS files
        this.app.get('/static/styles.css', (req, res) => {
            const css = this.generateCSS();
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cache-Control', 'max-age=86400');
            res.send(css);
        });

        this.app.get('/static/advanced.css', (req, res) => {
            const css = this.generateAdvancedCSS();
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cache-Control', 'max-age=86400');
            res.send(css);
        });

        // JavaScript files
        this.app.get('/static/script.js', (req, res) => {
            const js = this.generateJavaScript();
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'max-age=86400');
            res.send(js);
        });

        this.app.get('/static/analytics.js', (req, res) => {
            const js = this.generateAnalyticsJS();
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'max-age=86400');
            res.send(js);
        });

        // Font files (placeholder)
        this.app.get('/static/fonts/main.woff2', (req, res) => {
            res.setHeader('Content-Type', 'font/woff2');
            res.setHeader('Cache-Control', 'max-age=31536000'); // 1 year
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(Buffer.from('WOFF2-PLACEHOLDER')); // Placeholder font data
        });

        // Dynamic resources for benchmarking
        this.app.get('/static/resource-:id.css', (req, res) => {
            const id = req.params.id;
            const css = `/* Dynamic CSS Resource ${id} */\n.resource-${id} { color: #${id}${id}${id}; }`;
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cache-Control', 'max-age=3600');
            res.send(css);
        });

        this.app.get('/static/resource-:id.js', (req, res) => {
            const id = req.params.id;
            const js = `/* Dynamic JS Resource ${id} */\nconsole.log('Resource ${id} loaded via Early Hints');`;
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'max-age=3600');
            res.send(js);
        });
    }

    /**
     * Send Early Hints (103 status) with Link headers
     */
    sendEarlyHints(res, resources) {
        try {
            // For Express with spdy, we need to be more careful about header sending
            if (!res.headersSent) {
                // Send 103 Early Hints status using the underlying HTTP/2 stream
                if (res.stream && res.stream.additionalHeaders) {
                    // Use HTTP/2 additionalHeaders method
                    const linkHeaders = resources.map(resource => this.formatLinkHeader(resource));
                    res.stream.additionalHeaders({
                        ':status': '103',
                        'link': linkHeaders
                    });
                } else {
                    // Fallback for HTTP/1.1 or other protocols
                    res.writeHead(103, {
                        'Link': resources.map(resource => this.formatLinkHeader(resource))
                    });
                }
                
                if (this.enableLogs) {
                    console.log(colors.cyan(`📡 Early Hints sent: ${resources.length} resources`));
                    resources.forEach(resource => {
                        console.log(colors.gray(`   → ${resource.url} (${resource.as})`));
                    });
                }
            }
            
        } catch (error) {
            console.error(colors.red(`❌ Error sending Early Hints: ${error.message}`));
        }
    }

    /**
     * Format Link header for Early Hints
     */
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

    /**
     * Generate main HTML page
     */
    generateMainPage() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP Early Hints Demo with HTTP/3 Advertising - Node.js Server</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script src="/static/script.js"></script>
</head>
<body>
    <header>
        <h1>🚀 HTTP Early Hints Demo</h1>
        <p class="subtitle">Node.js Server with HTTP/3 Advertising</p>
    </header>
    
    <main>
        <section class="demo-info">
            <h2>✨ What Just Happened?</h2>
            <p>This page demonstrates <strong>HTTP Early Hints (RFC 8297)</strong> with <strong>HTTP/3 advertising</strong>:</p>
            <ol>
                <li>Server received your request over HTTP/2</li>
                <li><strong>103 Early Hints</strong> response sent immediately with resource hints</li>
                <li>Alt-Svc header advertised HTTP/3 support for future requests</li>
                <li>Your browser started preloading CSS, JavaScript, and API data</li>
                <li>Server processed the request (500ms delay)</li>
                <li>Final <strong>200 OK</strong> response sent with this HTML</li>
                <li>Resources were already loaded - instant page rendering! 🎯</li>
                <li>Your browser now knows HTTP/3 is available for next time! 🚀</li>
            </ol>
        </section>
        
        <section class="http3-info">
            <h2>📡 HTTP/3 Protocol Advertising</h2>
            <div class="feature-grid">
                <div class="feature">
                    <h3>📢 Alt-Svc Header</h3>
                    <p>Server advertises HTTP/3 availability via Alt-Svc headers</p>
                </div>
                <div class="feature">
                    <h3>🔄 Automatic Upgrade</h3>
                    <p>Modern browsers will attempt HTTP/3 on subsequent requests</p>
                </div>
                <div class="feature">
                    <h3>🛡️ Graceful Fallback</h3>
                    <p>HTTP/2 remains available if HTTP/3 connection fails</p>
                </div>
                <div class="feature">
                    <h3>⚡ Performance Benefits</h3>
                    <p>0-RTT connections, no head-of-line blocking, connection migration</p>
                </div>
            </div>
        </section>
        
        <section class="features">
            <h2>🎯 Early Hints Benefits</h2>
            <div class="feature-grid">
                <div class="feature">
                    <h3>⚡ Faster Loading</h3>
                    <p>Resources preload during server processing time</p>
                </div>
                <div class="feature">
                    <h3>🧠 Smart Preloading</h3>
                    <p>Only critical resources are hinted</p>
                </div>
                <div class="feature">
                    <h3>🔧 Better UX</h3>
                    <p>Reduced perceived loading time</p>
                </div>
                <div class="feature">
                    <h3>📊 Measurable</h3>
                    <p>Performance improvements can be quantified</p>
                </div>
            </div>
        </section>
        
        <section class="api-demo">
            <h2>📡 API Data Demo</h2>
            <p>This data was also preloaded via Early Hints:</p>
            <div id="api-data" class="loading">Loading...</div>
        </section>
        
        <section class="links">
            <h2>🔗 Try More Examples</h2>
            <nav>
                <a href="/advanced" class="button">Advanced Demo</a>
                <a href="/info" class="button">Server Info</a>
                <a href="/benchmark?resources=5&delay=1000" class="button">Benchmark</a>
            </nav>
        </section>
    </main>
    
    <footer>
        <p>🌟 HTTP Early Hints with HTTP/3 advertising implementation in Node.js | 
           <a href="https://tools.ietf.org/html/rfc8297">RFC 8297</a> |
           <a href="https://tools.ietf.org/html/rfc9114">RFC 9114 (HTTP/3)</a></p>
    </footer>
    
    <script>
        // Load API data (should be preloaded via Early Hints)
        loadApiData();
        
        // Show timing info and protocol detection
        if (window.performance) {
            console.log('Navigation timing:', window.performance.getEntriesByType('navigation')[0]);
            console.log('Resource timing:', window.performance.getEntriesByType('resource'));
            
            // Check for HTTP/3 upgrade on next visit
            window.addEventListener('load', () => {
                const nav = window.performance.getEntriesByType('navigation')[0];
                if (nav.nextHopProtocol && nav.nextHopProtocol.includes('h3')) {
                    console.log('🎉 HTTP/3 connection detected!');
                } else {
                    console.log('📡 HTTP/2 connection with HTTP/3 advertised for next visit');
                }
            });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Generate advanced HTML page
     */
    generateAdvancedPage() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced HTTP Early Hints Demo</title>
    <link rel="stylesheet" href="/static/styles.css">
    <link rel="stylesheet" href="/static/advanced.css">
    <script src="/static/script.js"></script>
    <script src="/static/analytics.js"></script>
</head>
<body class="advanced">
    <header>
        <h1>🔥 Advanced Early Hints Demo</h1>
        <p class="subtitle">Multiple Resource Types & Performance Analysis</p>
    </header>
    
    <main>
        <section class="metrics">
            <h2>📊 Performance Metrics</h2>
            <div id="performance-metrics" class="loading">Calculating...</div>
        </section>
        
        <section class="resource-types">
            <h2>📦 Preloaded Resource Types</h2>
            <div class="resource-grid">
                <div class="resource-item">
                    <h3>🎨 Stylesheets</h3>
                    <p>Critical CSS for immediate rendering</p>
                    <small>styles.css, advanced.css</small>
                </div>
                <div class="resource-item">
                    <h3>⚙️ Scripts</h3>
                    <p>Essential JavaScript functionality</p>
                    <small>script.js, analytics.js</small>
                </div>
                <div class="resource-item">
                    <h3>📡 API Data</h3>
                    <p>Critical data for page functionality</p>
                    <small>critical-data, user-preferences</small>
                </div>
                <div class="resource-item">
                    <h3>🔤 Fonts</h3>
                    <p>Web fonts for typography</p>
                    <small>main.woff2</small>
                </div>
            </div>
        </section>
        
        <section class="data-display">
            <h2>📋 Preloaded Data</h2>
            <div class="data-container">
                <div class="data-section">
                    <h3>Critical Data:</h3>
                    <div id="critical-data" class="loading">Loading...</div>
                </div>
                <div class="data-section">
                    <h3>User Preferences:</h3>
                    <div id="user-preferences" class="loading">Loading...</div>
                </div>
            </div>
        </section>
    </main>
    
    <footer>
        <p><a href="/">← Back to Main Demo</a> | 
           <a href="/info">Server Info</a></p>
    </footer>
    
    <script>
        // Load all preloaded data
        loadCriticalData();
        loadUserPreferences();
        calculatePerformanceMetrics();
    </script>
</body>
</html>`;
    }

    /**
     * Generate CSS
     */
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
    padding: 2rem;
    color: white;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.subtitle {
    font-size: 1.2rem;
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
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

h2 {
    color: #2c3e50;
    margin-bottom: 1rem;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.5rem;
}

.feature-grid, .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.feature, .resource-item {
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

.feature h3, .resource-item h3 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
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
    border-radius: 5px;
    margin: 0.5rem;
    transition: background 0.3s;
}

.button:hover {
    background: #2980b9;
}

footer {
    text-align: center;
    padding: 2rem;
    color: white;
}

footer a {
    color: #ecf0f1;
}

#api-data {
    background: #e8f5e8;
    padding: 1rem;
    border-radius: 5px;
    border: 1px solid #27ae60;
}`;
    }

    /**
     * Generate advanced CSS
     */
    generateAdvancedCSS() {
        return `/* Advanced Demo Styles */
.advanced {
    background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
}

.metrics {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.metrics h2 {
    color: white;
    border-bottom-color: rgba(255,255,255,0.3);
}

.data-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
}

.data-section {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
}

#performance-metrics {
    font-family: 'Courier New', monospace;
    background: rgba(255,255,255,0.1);
    padding: 1rem;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.2);
}

#critical-data, #user-preferences {
    background: #e3f2fd;
    padding: 1rem;
    border-radius: 5px;
    border: 1px solid #2196f3;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
}

@media (max-width: 768px) {
    .data-container {
        grid-template-columns: 1fr;
    }
    
    .feature-grid, .resource-grid {
        grid-template-columns: 1fr;
    }
}`;
    }

    /**
     * Generate JavaScript
     */
    generateJavaScript() {
        return `// HTTP Early Hints Demo JavaScript
console.log('🚀 Script loaded via Early Hints!');

async function loadApiData() {
    try {
        const response = await fetch('/api/critical-data');
        const data = await response.json();
        
        const element = document.getElementById('api-data');
        if (element) {
            element.classList.remove('loading');
            element.innerHTML = \`
                <h3>\${data.message}</h3>
                <p><strong>Timestamp:</strong> \${data.timestamp}</p>
                <p><strong>Performance Improvement:</strong> \${data.performance.perceived_improvement}</p>
                <details>
                    <summary>View Full Data</summary>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                </details>
            \`;
        }
    } catch (error) {
        console.error('Error loading API data:', error);
        const element = document.getElementById('api-data');
        if (element) {
            element.innerHTML = 'Error loading data';
        }
    }
}

async function loadCriticalData() {
    try {
        const response = await fetch('/api/critical-data');
        const data = await response.json();
        
        const element = document.getElementById('critical-data');
        if (element) {
            element.classList.remove('loading');
            element.textContent = JSON.stringify(data, null, 2);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadUserPreferences() {
    try {
        const response = await fetch('/api/user-preferences');
        const data = await response.json();
        
        const element = document.getElementById('user-preferences');
        if (element) {
            element.classList.remove('loading');
            element.textContent = JSON.stringify(data, null, 2);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Show Early Hints timing information
if (window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            const resources = window.performance.getEntriesByType('resource');
            
            console.group('🕒 Performance Timing');
            console.log('Page load time:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
            console.log('DOM ready time:', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms');
            console.log('Resources loaded:', resources.length);
            
            resources.forEach(resource => {
                console.log(\`  \${resource.name}: \${resource.duration.toFixed(2)}ms\`);
            });
            
            console.groupEnd();
        }, 1000);
    });
}`;
    }

    /**
     * Generate analytics JavaScript
     */
    generateAnalyticsJS() {
        return `// Analytics and Performance Monitoring
console.log('📊 Analytics loaded via Early Hints!');

function calculatePerformanceMetrics() {
    const element = document.getElementById('performance-metrics');
    if (!element || !window.performance) return;
    
    setTimeout(() => {
        const navigation = window.performance.getEntriesByType('navigation')[0];
        const resources = window.performance.getEntriesByType('resource');
        
        const metrics = {
            'Page Load Time': \`\${(navigation.loadEventEnd - navigation.fetchStart).toFixed(2)}ms\`,
            'DOM Ready Time': \`\${(navigation.domContentLoadedEventEnd - navigation.fetchStart).toFixed(2)}ms\`,
            'First Paint': getFirstPaint(),
            'Resources Loaded': resources.length,
            'Early Hints Benefit': 'Resources preloaded during server processing'
        };
        
        element.classList.remove('loading');
        element.innerHTML = Object.entries(metrics)
            .map(([key, value]) => \`\${key}: \${value}\`)
            .join('\\n');
    }, 1500);
}

function getFirstPaint() {
    const paintEntries = window.performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? \`\${firstPaint.startTime.toFixed(2)}ms\` : 'N/A';
}

// Track Early Hints effectiveness
document.addEventListener('DOMContentLoaded', () => {
    console.log('📈 Tracking Early Hints effectiveness...');
    
    // Simulate measurement of preload effectiveness
    const earlyHintsMetrics = {
        resourcesHinted: 7,
        resourcesPreloaded: 7,
        preloadSuccessRate: '100%',
        estimatedTimeSaved: '500ms',
        serverProcessingTime: '800ms'
    };
    
    console.table(earlyHintsMetrics);
});`;
    }

    /**
     * Start the server
     */
    async start() {
        try {
            const options = await this.getSSLOptions();
            
            this.server = spdy.createServer(options, this.app);
            
            this.server.listen(this.port, this.host, () => {
                console.log(colors.green(`🚀 HTTP Early Hints Server running at https://${this.host}:${this.port}`));
                console.log(colors.blue('📡 Early Hints (103 status) enabled'));
                console.log(colors.yellow('🔗 Available endpoints:'));
                console.log('   https://localhost:3443/           - Main demo page');
                console.log('   https://localhost:3443/advanced   - Advanced demo');
                console.log('   https://localhost:3443/info       - Server information');
                console.log('   https://localhost:3443/benchmark  - Performance testing');
                console.log('   https://localhost:3443/health     - Health check');
                console.log('');
                console.log(colors.cyan('💡 Test with the Node.js client:'));
                console.log('   cd ../  # Go back to client directory');
                console.log('   node demo-client.js basic --url https://localhost:3443');
            });

            this.server.on('error', (error) => {
                console.error(colors.red(`❌ Server error: ${error.message}`));
                process.exit(1);
            });

        } catch (error) {
            console.error(colors.red(`💥 Failed to start server: ${error.message}`));
            process.exit(1);
        }
    }

    /**
     * Get SSL options (generate self-signed cert if needed)
     */
    async getSSLOptions() {
        const certPath = path.join(__dirname, 'server.crt');
        const keyPath = path.join(__dirname, 'server.key');
        
        try {
            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                return {
                    cert: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath)
                };
            }
        } catch (error) {
            console.log(colors.yellow('⚠️  SSL certificates not found, generating self-signed certificates...'));
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
        
        console.log(colors.green('✅ Generated self-signed SSL certificates'));
        
        return {
            cert: pems.cert,
            key: pems.private
        };
    }

    /**
     * Stop the server
     */
    stop() {
        if (this.server) {
            this.server.close();
            console.log(colors.yellow('🛑 Server stopped'));
        }
    }
}

// CLI setup
program
    .name('early-hints-server')
    .description('HTTP Early Hints Server')
    .version('1.0.0')
    .option('-p, --port <port>', 'Server port', '3443')
    .option('-h, --host <host>', 'Server host', 'localhost')
    .option('--no-logs', 'Disable request logging')
    .option('--demo', 'Run demo mode with extra logging');

program.parse();

const options = program.opts();

// Start server
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new EarlyHintsServer({
        port: parseInt(options.port),
        host: options.host,
        enableLogs: options.logs !== false
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n' + colors.yellow('🛑 Shutting down server...'));
        server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        server.stop();
        process.exit(0);
    });

    server.start();
}

export default EarlyHintsServer;