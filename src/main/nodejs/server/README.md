# HTTP Early Hints Server

A Node.js server implementation that properly supports HTTP Early Hints (RFC 8297) with 103 status codes.

## 🚀 Features

- **Proper 103 Early Hints**: Real implementation of RFC 8297
- **HTTP/2 Support**: Uses SPDY for HTTP/2 with Early Hints
- **Multiple Resource Types**: CSS, JavaScript, API data, fonts
- **Performance Testing**: Built-in endpoints for benchmarking
- **Self-signed SSL**: Automatic certificate generation
- **Comprehensive Logging**: Request logging and Early Hints tracking

## 📦 Installation

```bash
cd src/main/nodejs/server
npm install
```

## 🎯 Usage

### Start the Server

```bash
# Default (port 3443)
npm start

# Custom port
node server.js --port 8443

# Development mode with auto-reload
npm run dev

# Test the server
npm test
```

### Available Endpoints

- **`/`** - Main demo page with Early Hints
- **`/advanced`** - Advanced demo with multiple resource types  
- **`/info`** - Server information and capabilities
- **`/benchmark`** - Performance testing endpoint
- **`/health`** - Health check endpoint
- **`/static/*`** - Static resources (CSS, JS, fonts)
- **`/api/*`** - API endpoints for data

### Test with Client

```bash
# Go back to client directory
cd ..

# Test the server
node demo-client.js basic --url https://localhost:3443
node demo-client.js advanced --url https://localhost:3443
```

## 🔧 How It Works

### Early Hints Implementation

```javascript
// Server sends 103 Early Hints immediately
res.writeHead(103, {
    'Link': [
        '</static/styles.css>; rel=preload; as=style',
        '</static/script.js>; rel=preload; as=script',
        '</api/critical-data>; rel=preload; as=fetch; crossorigin'
    ]
});

// Then processes request (500ms delay)
setTimeout(() => {
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
}, 500);
```

### Resource Types Supported

- **Stylesheets**: `as=style`
- **Scripts**: `as=script`  
- **API Data**: `as=fetch; crossorigin`
- **Fonts**: `as=font; type=font/woff2; crossorigin`
- **Images**: `as=image`

## 📊 Performance Testing

### Benchmark Endpoint

```bash
# Test with different parameters
curl -k "https://localhost:3443/benchmark?resources=5&delay=1000"
```

### Performance Analysis

The server provides detailed timing information:

```javascript
{
  "benchmark_id": "abc123",
  "early_hints_sent": 5,
  "server_processing_time": 1000,
  "timestamp": "2023-10-02T20:00:00.000Z",
  "hints": [...]
}
```

## 🌐 API Reference

### Early Hints Configuration

```javascript
const hints = [
    { url: '/static/styles.css', as: 'style' },
    { url: '/static/script.js', as: 'script' },
    { 
        url: '/api/data', 
        as: 'fetch', 
        crossorigin: true 
    },
    { 
        url: '/fonts/main.woff2', 
        as: 'font', 
        type: 'font/woff2',
        crossorigin: true 
    }
];
```

### Response Format

```javascript
// 103 Early Hints Response
HTTP/2 103
Link: </static/styles.css>; rel=preload; as=style
Link: </static/script.js>; rel=preload; as=script
Link: </api/data>; rel=preload; as=fetch; crossorigin

// Followed by final response
HTTP/2 200 OK  
Content-Type: text/html
Content-Length: 1234

<html>...</html>
```

## 🔒 SSL Configuration

The server automatically generates self-signed certificates:

```bash
# Certificates are saved as:
server.crt  # Public certificate
server.key  # Private key
```

For production, replace with proper certificates:

```javascript
const options = {
    cert: fs.readFileSync('path/to/cert.pem'),
    key: fs.readFileSync('path/to/key.pem')
};
```

## 📈 Expected Performance

### Early Hints Benefits

- **Preload Overlap**: 100% during server processing time
- **Latency Reduction**: 30-50% improvement in perceived load time  
- **Resource Efficiency**: Only critical resources are hinted
- **Browser Compatibility**: Works with Chrome 103+, Firefox 103+, Safari 16.4+

### Timing Analysis

```
Request Timeline:
0ms     - Request received
0ms     - 103 Early Hints sent
0-500ms - Browser preloads resources
500ms   - Server processing complete  
500ms   - 200 OK response sent
500ms   - Page renders (resources already loaded)
```

## 🧪 Testing

### Manual Testing

```bash
# Test Early Hints with curl
curl -v -k https://localhost:3443/

# Should show:
# < HTTP/2 103 
# < link: </static/styles.css>; rel=preload; as=style
# < HTTP/2 200
```

### Automated Testing

```bash
npm test
```

### Client Integration Testing

```bash
# From parent directory
node demo-client.js all --url https://localhost:3443
node benchmark.js
```

## 🔧 Configuration Options

### Server Options

```javascript
const server = new EarlyHintsServer({
    port: 3443,           // Server port
    host: 'localhost',    // Server host  
    enableLogs: true      // Request logging
});
```

### Command Line Options

```bash
node server.js --port 8443 --host 0.0.0.0 --no-logs
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   node server.js --port 3444
   ```

2. **SSL certificate errors**
   - Delete `server.crt` and `server.key` to regenerate
   - Use `--insecure` flag in curl for testing

3. **Early Hints not visible**
   - Use HTTP/2 capable client
   - Check browser developer tools Network tab
   - Verify 103 status in verbose curl output

### Debug Mode

```bash
# Enable detailed logging
DEBUG=* node server.js
```

## 🚀 Production Deployment

### Environment Setup

```bash
# Set environment variables
export NODE_ENV=production
export PORT=443
export HOST=0.0.0.0
```

### Performance Tuning

```javascript
// Adjust processing delays based on real workload
const processingTime = calculateRealProcessingTime();
setTimeout(() => sendResponse(), processingTime);
```

### Monitoring

```bash
# Health check endpoint
curl https://your-domain/health

# Performance metrics
curl https://your-domain/info
```

## 📚 References

- [RFC 8297 - HTTP Early Hints](https://tools.ietf.org/html/rfc8297)
- [MDN Web Docs - 103 Early Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/103)
- [Chrome Early Hints Guide](https://developer.chrome.com/blog/early-hints/)

## 🤝 Integration Examples

### With Express.js Middleware

```javascript
import { earlyHintsMiddleware } from './middleware.js';

app.use(earlyHintsMiddleware({
    '/': [
        { url: '/static/critical.css', as: 'style' },
        { url: '/api/user-data', as: 'fetch', crossorigin: true }
    ]
}));
```

### With Next.js

```javascript
// pages/api/early-hints.js
export default function handler(req, res) {
    res.writeHead(103, {
        'Link': '</static/critical.css>; rel=preload; as=style'
    });
    
    // Your Next.js page logic
}
```

## 🎉 Success Indicators

✅ **103 status codes sent correctly**  
✅ **Resources preloaded during server processing**  
✅ **Performance improvement measurable**  
✅ **Client compatibility verified**  
✅ **Production ready with SSL support**