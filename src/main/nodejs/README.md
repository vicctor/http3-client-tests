node simple-server.js 3443# HTTP Early Hints Node.js Client

A comprehensive Node.js client for testing and demonstrating HTTP Early Hints functionality with the Java HTTP/3 server.

## 🚀 Features

- **Early Hints Detection**: Automatically detects and handles `103 Early Hints` responses
- **Resource Preloading**: Preloads hinted resources during server processing time
- **Performance Analysis**: Measures and analyzes Early Hints effectiveness
- **Multiple Protocols**: Supports HTTP/1.1, HTTP/2, and HTTP/3
- **Comprehensive Testing**: Various test scenarios and benchmarks
- **Real-time Monitoring**: Live monitoring of Early Hints performance

## 📦 Installation

```bash
cd src/main/nodejs
npm install
```

## 🎯 Usage

### Basic Usage

```bash
# Run the main client
node index.js

# Run quick test
npm test

# Run demo suite
npm run demo

# Run performance benchmark
npm run benchmark
```

### Command Line Interface

```bash
# Basic Early Hints test
node demo-client.js basic

# Advanced Early Hints test
node demo-client.js advanced

# Performance comparison
node demo-client.js performance

# Resource type analysis
node demo-client.js analysis

# Real-time monitoring (30 seconds)
node demo-client.js monitor

# Run all demos
node demo-client.js all
```

### Custom Server URL

```bash
node demo-client.js basic --url https://your-server:8443
```

## 📋 Available Scripts

### Main Scripts

- **`index.js`**: Core Early Hints client library
- **`demo-client.js`**: Interactive demo with multiple scenarios
- **`test-early-hints.js`**: Simple test script for validation
- **`benchmark.js`**: Comprehensive performance benchmark

### Demo Scenarios

1. **Basic Request**: Simple Early Hints demonstration
2. **Advanced Request**: Multiple resource types with detailed analysis
3. **Performance Comparison**: Early Hints vs traditional requests
4. **Resource Analysis**: Breakdown by resource type (CSS, JS, API, fonts)
5. **Real-time Monitoring**: Continuous monitoring with live statistics

## 🔧 Core Features

### Early Hints Detection

The client automatically detects `103 Early Hints` responses:

```javascript
const client = new EarlyHintsClient();
const result = await client.requestWithEarlyHints('/early-hints-demo/page');

console.log(`Received ${result.earlyHints.length} Early Hints`);
console.log(`Preloaded ${result.preloadedResources.length} resources`);
```

### Resource Preloading

Automatically preloads resources hinted by the server:

```javascript
// Example Early Hints response triggers these preloads:
// Link: </styles.css>; rel=preload; as=style
// Link: </script.js>; rel=preload; as=script
// Link: </api/data>; rel=preload; as=fetch; crossorigin
```

### Performance Measurement

Detailed timing and performance metrics:

```javascript
{
  "timing": {
    "total": 245.67
  },
  "earlyHints": [
    {
      "status": 103,
      "receivedAt": 12.34,
      "linkHeaders": [...]
    }
  ],
  "preloadedResources": [
    {
      "url": "/styles.css",
      "responseTime": 45.67,
      "contentLength": 2048,
      "as": "style"
    }
  ]
}
```

## 📊 Example Output

### Basic Test Results

```
🧪 HTTP Early Hints Test Script

Test 1: Basic Early Hints Page
========================================
✅ SUCCESS: Received 1 Early Hints
   Hint 1: 3 resources
     - /early-hints-demo/styles.css (style, preload)
     - /early-hints-demo/script.js (script, preload)
     - /early-hints-demo/api/critical-data (fetch, preload)
   Preloaded: 3 resources
   Total time: 567.89ms

📊 Test Summary
========================================
Total Early Hints received: 3
Total resources preloaded: 9
Average response time: 234.56ms

✅ Early Hints are working correctly!
```

### Performance Benchmark

```
🏆 HTTP Early Hints Performance Benchmark

📊 Benchmark 1: Single Request Performance
==================================================
📈 Results:
   Average time: 245.67ms
   Median time: 234.12ms
   Min/Max: 198.45ms / 312.89ms
   Std deviation: 23.45ms
   Average hints: 1.0
   Average preloads: 3.0

🎯 Key Findings:
• Average response time: 245.67ms
• Response time consistency: 23.45ms std dev
• Average Early Hints per request: 1.0
• Average successful preloads: 3.0
• Preload success rate: 100.0%

✅ Excellent Early Hints performance!
```

## 🌐 Protocol Support

### HTTP/2 Support

The client uses HTTP/2 for optimal Early Hints support:

```javascript
// Automatically uses HTTP/2 for better 103 response handling
const http2Client = http2.connect(baseUrl);
```

### HTTP/3 Support

Uses Undici for HTTP/3 capabilities when available:

```javascript
const undiciAgent = new Agent({
  connect: { rejectUnauthorized: false }
});
```

## 🔍 Testing Features

### Comprehensive Test Suite

- **Early Hints Detection**: Verifies 103 status code reception
- **Link Header Parsing**: Extracts and validates preload hints
- **Resource Preloading**: Tests actual resource fetching
- **Performance Measurement**: Timing and efficiency analysis
- **Error Handling**: Graceful failure handling and reporting

### Real-time Monitoring

```bash
node demo-client.js monitor --duration 60
```

Provides live monitoring with:
- Request success rates
- Early Hints effectiveness
- Average response times
- Resource preload statistics

## 🎛️ Configuration Options

### Client Configuration

```javascript
const client = new EarlyHintsClient({
  baseUrl: 'https://localhost:8443',
  timeout: 10000,
  ignoreTLS: true
});
```

### Available Options

- **`baseUrl`**: Server base URL (default: `https://localhost:8443`)
- **`timeout`**: Request timeout in milliseconds (default: `10000`)
- **`ignoreTLS`**: Ignore TLS certificate errors (default: `true`)

## 🔧 Troubleshooting

### Common Issues

1. **No Early Hints Received**
   - Check server Early Hints implementation
   - Verify 103 status code support
   - Test with different HTTP versions

2. **Preload Failures**
   - Check resource URLs and accessibility
   - Verify CORS settings for cross-origin resources
   - Monitor network connectivity

3. **Performance Issues**
   - Test with different concurrency levels
   - Monitor server processing times
   - Check network latency

### Debug Mode

Enable verbose logging:

```javascript
// Set environment variable
process.env.DEBUG = 'early-hints:*';
```

## 🚀 Integration Examples

### With Express.js

```javascript
import EarlyHintsClient from './index.js';

const client = new EarlyHintsClient();

app.get('/test-early-hints', async (req, res) => {
  const result = await client.requestWithEarlyHints('/early-hints-demo/page');
  res.json({
    hintsReceived: result.earlyHints.length,
    resourcesPreloaded: result.preloadedResources.length,
    totalTime: result.timing.total
  });
});
```

### With Testing Frameworks

```javascript
import { describe, it, expect } from 'vitest';
import EarlyHintsClient from './index.js';

describe('Early Hints', () => {
  const client = new EarlyHintsClient();
  
  it('should receive Early Hints', async () => {
    const result = await client.requestWithEarlyHints('/early-hints-demo/page');
    expect(result.earlyHints.length).toBeGreaterThan(0);
    expect(result.preloadedResources.length).toBeGreaterThan(0);
  });
});
```

## 📚 API Reference

### EarlyHintsClient

#### Methods

- **`requestWithEarlyHints(path, options)`**: Make request with Early Hints detection
- **`testEarlyHintsEndpoints()`**: Test multiple endpoints
- **`benchmarkPerformance(iterations)`**: Run performance benchmark
- **`close()`**: Close client connections

#### Response Format

```javascript
{
  path: string,
  earlyHints: Array<{
    status: 103,
    headers: object,
    receivedAt: number,
    linkHeaders: Array<{
      url: string,
      rel: string,
      as: string,
      attributes: string
    }>
  }>,
  finalResponse: {
    status: number,
    headers: object,
    body: string,
    contentLength: number
  },
  timing: {
    total: number
  },
  preloadedResources: Array<{
    status: 'fulfilled' | 'rejected',
    value: {
      url: string,
      status: number,
      contentType: string,
      contentLength: number,
      responseTime: number,
      as: string
    }
  }>,
  error: string | null
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see the [LICENSE](../../../LICENSE) file for details.

## 🙏 Acknowledgments

- **Node.js HTTP/2 Module** for native HTTP/2 support
- **Undici** for modern HTTP client capabilities
- **Colors.js** for beautiful console output
- **Commander.js** for CLI functionality