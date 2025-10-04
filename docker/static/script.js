// HTTP/3 Early Hints Demo JavaScript
console.log('🚀 Script loaded via Early Hints preloading!');

/**
 * HTTP/3 Early Hints Demo Application
 * Demonstrates Early Hints functionality with HTTP/3
 */
class HTTP3EarlyHintsDemo {
    constructor() {
        this.results = null;
        this.protocolInfo = {};
        this.init();
    }

    init() {
        console.log('🌟 Initializing HTTP/3 Early Hints Demo...');
        this.results = document.getElementById('results');
        this.detectProtocol();
        this.setupEventListeners();
        this.loadCriticalData();
        this.analyzePerformance();
    }

    setupEventListeners() {
        // Test buttons
        const testButtons = document.querySelectorAll('.test-btn');
        testButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleTestAction(action);
            });
        });

        // Auto-refresh for protocol detection
        setInterval(() => this.updateProtocolStatus(), 5000);
    }

    detectProtocol() {
        console.log('🔍 Detecting current protocol...');
        
        if (window.performance && window.performance.getEntriesByType) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            
            if (navigation) {
                this.protocolInfo = {
                    protocol: navigation.nextHopProtocol || 'Unknown',
                    type: navigation.type,
                    loadTime: navigation.loadEventEnd - navigation.fetchStart,
                    domainLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
                    connection: navigation.connectEnd - navigation.connectStart,
                    request: navigation.responseStart - navigation.requestStart,
                    response: navigation.responseEnd - navigation.responseStart
                };

                console.log('📊 Protocol Information:', this.protocolInfo);
                this.updateProtocolDisplay();
            }
        }

        // Check for HTTP/3 specific features
        this.checkHTTP3Features();
    }

    checkHTTP3Features() {
        const features = {
            quic_support: this.protocolInfo.protocol && this.protocolInfo.protocol.includes('h3'),
            http2_support: this.protocolInfo.protocol && this.protocolInfo.protocol.includes('h2'),
            alt_svc_advertised: false,
            early_hints_received: false,
            chrome_http3_capable: false
        };

        // Check if we're running in Chrome and if it supports HTTP/3
        if (navigator.userAgent.includes('Chrome')) {
            // Chrome version that supports HTTP/3 (87+)
            const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
            if (chromeMatch) {
                const chromeVersion = parseInt(chromeMatch[1]);
                features.chrome_http3_capable = chromeVersion >= 87;
                console.log(`🔍 Chrome version ${chromeVersion} detected - HTTP/3 capable: ${features.chrome_http3_capable}`);
            }
        }

        // Check response headers for Alt-Svc and HTTP/3 negotiation headers
        fetch('/protocol-info', { method: 'GET' })
            .then(response => {
                const altSvc = response.headers.get('alt-svc');
                const earlyHints = response.headers.get('x-early-hints-preloaded');
                const chromeHttp3 = response.headers.get('x-chrome-http3-compatible');
                const quicStatus = response.headers.get('x-quic-status');
                
                features.alt_svc_advertised = !!altSvc;
                features.early_hints_received = !!earlyHints;
                
                console.log('🚀 HTTP/3 Features detected:', features);
                console.log('📡 Alt-Svc header:', altSvc);
                console.log('✨ Early Hints:', earlyHints);
                console.log('🌐 Chrome HTTP/3 compatible:', chromeHttp3);
                console.log('🔗 QUIC status:', quicStatus);
                
                // Show Chrome-specific HTTP/3 negotiation advice
                if (features.chrome_http3_capable && altSvc) {
                    console.log('🎉 Chrome HTTP/3 Negotiation Ready!');
                    console.log('💡 Tip: Refresh the page - Chrome may upgrade to HTTP/3');
                    this.showChromeHTTP3Advice();
                }
                
                this.updateFeatureDisplay(features);
                return response.json();
            })
            .then(protocolData => {
                console.log('📊 Protocol Information:', protocolData);
                this.displayProtocolNegotiation(protocolData);
            })
            .catch(error => {
                console.error('❌ Error checking HTTP/3 features:', error);
            });
    }

    showChromeHTTP3Advice() {
        // Add visual indicator for Chrome users
        const protocolInfo = document.getElementById('protocol-info');
        if (protocolInfo && this.protocolInfo.protocol && !this.protocolInfo.protocol.includes('h3')) {
            const advice = document.createElement('div');
            advice.className = 'chrome-http3-advice';
            advice.innerHTML = `
                <div style="background: #e8f5e8; border: 2px solid #27ae60; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                    <h4 style="color: #27ae60; margin-bottom: 0.5rem;">🌐 Chrome HTTP/3 Upgrade Available!</h4>
                    <p>Your Chrome browser supports HTTP/3. The server is advertising HTTP/3 availability.</p>
                    <p><strong>Try refreshing the page</strong> - Chrome may automatically upgrade to HTTP/3!</p>
                    <button onclick="location.reload()" style="background: #27ae60; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">
                        🔄 Refresh for HTTP/3
                    </button>
                </div>
            `;
            protocolInfo.appendChild(advice);
        }
    }

    displayProtocolNegotiation(protocolData) {
        // Create a section to show detailed protocol negotiation info
        const existingNegotiation = document.getElementById('protocol-negotiation');
        if (existingNegotiation) {
            existingNegotiation.remove();
        }

        const negotiationSection = document.createElement('section');
        negotiationSection.id = 'protocol-negotiation';
        negotiationSection.className = 'protocol-negotiation';
        negotiationSection.innerHTML = `
            <h3>🔄 Protocol Negotiation Status</h3>
            <div class="negotiation-details">
                <div class="negotiation-item">
                    <strong>Current Protocol:</strong> ${protocolData.current_protocol || 'Unknown'}
                </div>
                <div class="negotiation-item">
                    <strong>HTTP Version:</strong> ${protocolData.http_version || 'Unknown'}
                </div>
                <div class="negotiation-item">
                    <strong>Alt-Svc Header:</strong> ${protocolData.alt_svc_header || 'Not present'}
                </div>
                <div class="negotiation-item">
                    <strong>Chrome Ready:</strong> ${protocolData.chrome_http3_ready ? '✅ Yes' : '❌ No'}
                </div>
                <div class="negotiation-item">
                    <strong>Negotiation Status:</strong> ${protocolData.negotiation_status || 'Unknown'}
                </div>
            </div>
        `;

        // Insert after the protocol status section
        const protocolStatus = document.querySelector('.protocol-status');
        if (protocolStatus) {
            protocolStatus.parentNode.insertBefore(negotiationSection, protocolStatus.nextSibling);
        }
    }

    updateProtocolDisplay() {
        const protocolBadge = document.getElementById('protocol-badge');
        const protocolInfo = document.getElementById('protocol-info');
        
        if (protocolBadge) {
            let displayProtocol = 'Unknown';
            let badgeClass = 'protocol-badge';
            
            if (this.protocolInfo.protocol) {
                if (this.protocolInfo.protocol.includes('h3')) {
                    displayProtocol = 'HTTP/3';
                    badgeClass += ' http3';
                } else if (this.protocolInfo.protocol.includes('h2')) {
                    displayProtocol = 'HTTP/2';
                    badgeClass += ' http2';
                } else if (this.protocolInfo.protocol.includes('http/1')) {
                    displayProtocol = 'HTTP/1.1';
                    badgeClass += ' http1';
                }
            }
            
            protocolBadge.textContent = displayProtocol;
            protocolBadge.className = badgeClass;
        }

        if (protocolInfo) {
            protocolInfo.innerHTML = `
                <strong>Current Protocol:</strong> ${this.protocolInfo.protocol || 'Unknown'}<br>
                <strong>Page Load Time:</strong> ${(this.protocolInfo.loadTime || 0).toFixed(2)}ms<br>
                <strong>Connection Time:</strong> ${(this.protocolInfo.connection || 0).toFixed(2)}ms<br>
                <strong>Request/Response:</strong> ${(this.protocolInfo.request || 0).toFixed(2)}ms / ${(this.protocolInfo.response || 0).toFixed(2)}ms
            `;
        }
    }

    updateFeatureDisplay(features) {
        const featuresList = document.getElementById('features-list');
        if (featuresList) {
            featuresList.innerHTML = `
                <li class="${features.quic_support ? 'success' : 'info'}">
                    ${features.quic_support ? '✅' : '📡'} HTTP/3 (QUIC): ${features.quic_support ? 'Active' : 'Advertised via Alt-Svc'}
                </li>
                <li class="${features.http2_support ? 'success' : 'error'}">
                    ${features.http2_support ? '✅' : '❌'} HTTP/2: ${features.http2_support ? 'Active' : 'Not detected'}
                </li>
                <li class="${features.alt_svc_advertised ? 'success' : 'info'}">
                    ${features.alt_svc_advertised ? '✅' : 'ℹ️'} Alt-Svc Header: ${features.alt_svc_advertised ? 'Present (HTTP/3 advertised)' : 'Not detected'}
                </li>
                <li class="${features.early_hints_received ? 'success' : 'info'}">
                    ${features.early_hints_received ? '✅' : 'ℹ️'} Early Hints: ${features.early_hints_received ? 'Received' : 'Simulated via Link headers'}
                </li>
                <li class="${features.chrome_http3_capable ? 'success' : 'info'}">
                    ${features.chrome_http3_capable ? '✅' : 'ℹ️'} Chrome HTTP/3: ${features.chrome_http3_capable ? 'Compatible (v87+)' : 'Check browser compatibility'}
                </li>
            `;

            // Add Chrome-specific upgrade button if applicable
            if (features.chrome_http3_capable && features.alt_svc_advertised && !features.quic_support) {
                const upgradeButton = document.createElement('li');
                upgradeButton.className = 'info';
                upgradeButton.innerHTML = `
                    🔄 <strong>HTTP/3 Upgrade Available:</strong> 
                    <button onclick="this.nextElementSibling.style.display='block'; location.reload();" 
                            style="background: #007bff; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">
                        Refresh for HTTP/3
                    </button>
                    <small style="display: none; color: #666; font-style: italic;">Refreshing to allow Chrome to negotiate HTTP/3...</small>
                `;
                featuresList.appendChild(upgradeButton);
            }
        }
    }

    async loadCriticalData() {
        console.log('📡 Loading critical data (should be preloaded via Early Hints)...');
        
        const startTime = performance.now();
        
        try {
            const response = await fetch('/api/critical-data');
            const data = await response.json();
            const loadTime = performance.now() - startTime;
            
            console.log('✅ Critical data loaded in', loadTime.toFixed(2), 'ms');
            console.log('📦 Data:', data);
            
            this.displayCriticalData(data, loadTime);
            
        } catch (error) {
            console.error('❌ Error loading critical data:', error);
            this.displayError('Failed to load critical data: ' + error.message);
        }
    }

    displayCriticalData(data, loadTime) {
        const dataDisplay = document.getElementById('critical-data');
        if (dataDisplay) {
            dataDisplay.innerHTML = `
                <div class="data-card">
                    <h4>🚀 Critical Data Loaded</h4>
                    <p><strong>Load Time:</strong> ${loadTime.toFixed(2)}ms</p>
                    <p><strong>Protocol:</strong> ${data.protocol || 'Unknown'}</p>
                    <p><strong>Message:</strong> ${data.message}</p>
                    <p><strong>Server:</strong> ${data.server}</p>
                    <p><strong>Early Hints:</strong> ${data.early_hints ? JSON.stringify(data.early_hints) : 'Not available'}</p>
                </div>
            `;
        }
    }

    analyzePerformance() {
        console.log('📊 Analyzing page performance...');
        
        if (window.performance) {
            const resources = performance.getEntriesByType('resource');
            const preloadedResources = resources.filter(resource => 
                resource.name.includes('/static/') || 
                resource.name.includes('/api/critical-data')
            );
            
            console.log('📈 Performance Analysis:');
            console.log('Total resources:', resources.length);
            console.log('Preloaded resources:', preloadedResources.length);
            
            preloadedResources.forEach(resource => {
                console.log(`  ${resource.name}:`, {
                    duration: resource.duration.toFixed(2) + 'ms',
                    protocol: resource.nextHopProtocol || 'Unknown',
                    transferSize: resource.transferSize || 'Unknown'
                });
            });
            
            this.displayPerformanceMetrics(preloadedResources);
        }
    }

    displayPerformanceMetrics(resources) {
        const metricsDisplay = document.getElementById('performance-metrics');
        if (metricsDisplay) {
            const totalLoadTime = resources.reduce((sum, resource) => sum + resource.duration, 0);
            const avgLoadTime = resources.length > 0 ? totalLoadTime / resources.length : 0;
            
            metricsDisplay.innerHTML = `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>📊 Performance Metrics</h4>
                        <p><strong>Preloaded Resources:</strong> ${resources.length}</p>
                        <p><strong>Total Load Time:</strong> ${totalLoadTime.toFixed(2)}ms</p>
                        <p><strong>Average Load Time:</strong> ${avgLoadTime.toFixed(2)}ms</p>
                    </div>
                </div>
            `;
        }
    }

    handleTestAction(action) {
        console.log('🧪 Handling test action:', action);
        
        switch (action) {
            case 'test-protocol':
                this.testProtocol();
                break;
            case 'test-early-hints':
                this.testEarlyHints();
                break;
            case 'test-performance':
                this.testPerformance();
                break;
            case 'reload-page':
                this.reloadPage();
                break;
            default:
                console.warn('Unknown test action:', action);
        }
    }

    async testProtocol() {
        this.displayResult('🔍 Testing protocol capabilities...\n', 'loading');
        
        try {
            const response = await fetch('/api/critical-data');
            const protocol = this.protocolInfo.protocol || 'Unknown';
            
            let result = `Protocol Test Results:\n`;
            result += `Current Protocol: ${protocol}\n`;
            result += `Response Status: ${response.status} ${response.statusText}\n`;
            result += `Alt-Svc Header: ${response.headers.get('alt-svc') || 'Not present'}\n`;
            result += `X-Protocol Header: ${response.headers.get('x-protocol') || 'Not present'}\n`;
            
            if (protocol.includes('h3')) {
                result += `\n🎉 HTTP/3 (QUIC) Connection Confirmed!\n`;
                result += `Benefits: 0-RTT, No head-of-line blocking, Connection migration\n`;
            } else if (protocol.includes('h2')) {
                result += `\n📡 HTTP/2 Connection with HTTP/3 Advertising\n`;
                result += `Benefits: Multiplexing, Header compression, Server push\n`;
                result += `Note: Browser may upgrade to HTTP/3 on next request\n`;
            } else {
                result += `\n🔄 HTTP/1.1 Connection\n`;
                result += `Recommendation: Enable HTTP/2 or HTTP/3 for better performance\n`;
            }
            
            this.displayResult(result, 'success');
            
        } catch (error) {
            this.displayResult(`❌ Protocol test failed: ${error.message}`, 'error');
        }
    }

    async testEarlyHints() {
        this.displayResult('✨ Testing Early Hints functionality...\n', 'loading');
        
        try {
            const startTime = performance.now();
            
            // Test multiple resources that should be preloaded
            const tests = [
                fetch('/static/style.css'),
                fetch('/static/script.js'),
                fetch('/api/critical-data')
            ];
            
            const responses = await Promise.all(tests);
            const endTime = performance.now();
            
            let result = `Early Hints Test Results:\n`;
            result += `Total test time: ${(endTime - startTime).toFixed(2)}ms\n\n`;
            
            responses.forEach((response, index) => {
                const urls = ['/static/style.css', '/static/script.js', '/api/critical-data'];
                const preloaded = response.headers.get('x-preloaded') || response.headers.get('x-early-hints-preloaded');
                
                result += `${urls[index]}:\n`;
                result += `  Status: ${response.status} ${response.statusText}\n`;
                result += `  Preloaded: ${preloaded ? 'Yes' : 'No'}\n`;
                result += `  Cache: ${response.headers.get('cache-control') || 'Not specified'}\n\n`;
            });
            
            result += `Note: Early Hints are simulated via Link headers in this nginx setup.\n`;
            result += `True Early Hints (103 status) require application-level implementation.`;
            
            this.displayResult(result, 'success');
            
        } catch (error) {
            this.displayResult(`❌ Early Hints test failed: ${error.message}`, 'error');
        }
    }

    testPerformance() {
        this.displayResult('📊 Running performance analysis...\n', 'loading');
        
        setTimeout(() => {
            if (window.performance) {
                const navigation = performance.getEntriesByType('navigation')[0];
                const resources = performance.getEntriesByType('resource');
                
                let result = `Performance Analysis Results:\n\n`;
                
                if (navigation) {
                    result += `Page Load Metrics:\n`;
                    result += `  DNS Lookup: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms\n`;
                    result += `  TCP Connection: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms\n`;
                    result += `  TLS Handshake: ${(navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0).toFixed(2)}ms\n`;
                    result += `  Request: ${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms\n`;
                    result += `  Response: ${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms\n`;
                    result += `  Total Page Load: ${(navigation.loadEventEnd - navigation.fetchStart).toFixed(2)}ms\n\n`;
                }
                
                const preloadedResources = resources.filter(r => 
                    r.name.includes('/static/') || r.name.includes('/api/')
                );
                
                result += `Resource Loading:\n`;
                result += `  Total Resources: ${resources.length}\n`;
                result += `  Preloaded Resources: ${preloadedResources.length}\n\n`;
                
                preloadedResources.forEach(resource => {
                    const url = new URL(resource.name);
                    result += `  ${url.pathname}:\n`;
                    result += `    Duration: ${resource.duration.toFixed(2)}ms\n`;
                    result += `    Protocol: ${resource.nextHopProtocol || 'Unknown'}\n`;
                    result += `    Size: ${resource.transferSize || 'Unknown'} bytes\n\n`;
                });
                
                if (this.protocolInfo.protocol && this.protocolInfo.protocol.includes('h3')) {
                    result += `🚀 HTTP/3 Performance Benefits:\n`;
                    result += `  ✅ 0-RTT connection establishment for repeat visits\n`;
                    result += `  ✅ No head-of-line blocking\n`;
                    result += `  ✅ Connection migration support\n`;
                    result += `  ✅ Improved multiplexing efficiency\n`;
                } else if (this.protocolInfo.protocol && this.protocolInfo.protocol.includes('h2')) {
                    result += `📡 HTTP/2 Performance Benefits:\n`;
                    result += `  ✅ Request/response multiplexing\n`;
                    result += `  ✅ Header compression (HPACK)\n`;
                    result += `  ✅ Server push capability\n`;
                    result += `  🔄 HTTP/3 upgrade available via Alt-Svc\n`;
                }
                
                this.displayResult(result, 'success');
            } else {
                this.displayResult('❌ Performance API not available', 'error');
            }
        }, 1000);
    }

    reloadPage() {
        this.displayResult('🔄 Reloading page to test protocol upgrade...', 'loading');
        
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    displayResult(text, type = 'info') {
        if (this.results) {
            this.results.textContent = text;
            this.results.className = `results-display ${type}`;
        }
    }

    displayError(message) {
        this.displayResult(`❌ Error: ${message}`, 'error');
    }

    updateProtocolStatus() {
        // Periodic update of protocol status
        if (window.performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation && navigation.nextHopProtocol !== this.protocolInfo.protocol) {
                console.log('🔄 Protocol change detected:', navigation.nextHopProtocol);
                this.detectProtocol();
            }
        }
    }
}

// Initialize the demo when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new HTTP3EarlyHintsDemo();
    });
} else {
    new HTTP3EarlyHintsDemo();
}

// Export for potential use in other scripts
window.HTTP3EarlyHintsDemo = HTTP3EarlyHintsDemo;

console.log('✅ HTTP/3 Early Hints Demo script fully loaded!');