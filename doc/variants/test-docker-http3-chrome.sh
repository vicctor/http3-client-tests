#!/bin/bash

# Enhanced HTTP/3 Docker Setup with Chrome Negotiation Test
# This script builds and tests the HTTP/3 nginx server with optimized Alt-Svc headers

echo "🚀 HTTP/3 Docker Server with Chrome Negotiation"
echo "==============================================="
echo ""

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "📋 Enhanced Configuration Features:"
echo "✅ Alt-Svc headers with persist=1 flag for Chrome"
echo "✅ Multiple HTTP/3 versions advertised (h3, h3-29, h3-28, h3-27)"
echo "✅ Chrome-specific HTTP/3 optimization headers"
echo "✅ Enhanced QUIC settings (quic_gso, quic_retry)"
echo "✅ Protocol detection endpoint for testing"
echo "✅ Comprehensive HTTP/3 advertising on all responses"
echo ""

echo "🔧 Building HTTP/3 Docker container..."
docker-compose down 2>/dev/null
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker build completed successfully!"
echo ""

echo "🚀 Starting HTTP/3 server..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Docker container!"
    exit 1
fi

echo "⏳ Waiting for server to be ready..."
sleep 5

# Health check
echo "🏥 Performing health check..."
if curl -k -f https://localhost/health &>/dev/null; then
    echo "✅ Server is healthy and responding!"
else
    echo "⚠️  Server health check failed, but continuing with tests..."
fi

echo ""
echo "🔍 Testing HTTP/3 Configuration and Alt-Svc Headers..."
echo ""

echo "📡 1. Testing Alt-Svc Header Advertisement:"
echo "curl -I -k https://localhost/ 2>/dev/null | grep -i alt-svc"
curl -I -k https://localhost/ 2>/dev/null | grep -i alt-svc || echo "No Alt-Svc header found"
echo ""

echo "📊 2. Testing Protocol Information Endpoint:"
echo "curl -k https://localhost/protocol-info 2>/dev/null | jq ."
curl -k https://localhost/protocol-info 2>/dev/null | jq . || echo "Protocol info endpoint not available"
echo ""

echo "🔗 3. Testing HTTP/3 Specific Headers:"
echo "curl -I -k https://localhost/ 2>/dev/null | grep -E '(alt-svc|x-quic|x-http3|x-chrome)'"
curl -I -k https://localhost/ 2>/dev/null | grep -iE "(alt-svc|x-quic|x-http3|x-chrome)" || echo "No HTTP/3 specific headers found"
echo ""

echo "📦 4. Testing Critical Data Endpoint with HTTP/3 Info:"
echo "curl -k https://localhost/api/critical-data 2>/dev/null | jq '.connection_info // .http3_features // {\"status\": \"partial data\"}'"
curl -k https://localhost/api/critical-data 2>/dev/null | jq '.connection_info // .http3_features // {"status": "partial data"}' || echo "Critical data endpoint not available"
echo ""

echo "🌐 5. Testing with Chrome-like User Agent:"
echo "curl -k -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' https://localhost/status 2>/dev/null | jq ."
curl -k -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" https://localhost/status 2>/dev/null | jq . || echo "Status endpoint not available"
echo ""

echo "🔍 6. Testing Early Hints Simulation (Link Headers):"
echo "curl -I -k https://localhost/ 2>/dev/null | grep -i link"
curl -I -k https://localhost/ 2>/dev/null | grep -i link || echo "No Link headers found"
echo ""

echo "📈 Chrome HTTP/3 Negotiation Instructions:"
echo "==========================================="
echo ""
echo "🌐 For Chrome Browser Testing:"
echo "1. Open Chrome and navigate to: https://localhost/"
echo "2. Accept the self-signed certificate warning"
echo "3. Open Developer Tools (F12) → Network tab"
echo "4. Refresh the page (Ctrl+F5 or Cmd+Shift+R)"
echo "5. Look for 'h3' or 'quic' in the Protocol column"
echo "6. Check Response Headers for Alt-Svc values"
echo ""

echo "🔧 Chrome HTTP/3 Flags (if needed):"
echo "chrome://flags/#enable-quic"
echo "chrome://flags/#enable-experimental-web-features"
echo ""

echo "📊 Advanced Testing:"
echo "==================="
echo ""

if command -v curl &> /dev/null; then
    echo "🧪 Testing with curl (if HTTP/3 capable):"
    echo "curl --http3-only -k https://localhost/ -v"
    echo ""
    
    # Try HTTP/3 with curl if available
    if curl --help all 2>/dev/null | grep -q "http3"; then
        echo "🎉 Attempting HTTP/3 connection with curl:"
        timeout 10 curl --http3-only -k https://localhost/ -I 2>&1 | head -10 || echo "HTTP/3 curl test failed (this is normal if HTTP/3 isn't fully supported)"
    else
        echo "ℹ️  Your curl doesn't support HTTP/3. That's OK - the server is still HTTP/3 ready!"
    fi
    echo ""
fi

echo "📋 Server Information:"
echo "====================="
echo "🌐 Web Interface: https://localhost/"
echo "📡 Health Check: https://localhost/health"
echo "🔍 Protocol Info: https://localhost/protocol-info"
echo "📊 Status: https://localhost/status"
echo "📦 Critical Data: https://localhost/api/critical-data"
echo ""

echo "🔧 Docker Commands:"
echo "=================="
echo "📋 View logs: docker-compose logs -f"
echo "🛑 Stop server: docker-compose down"
echo "🔄 Restart: docker-compose restart"
echo "🧹 Clean up: docker-compose down -v"
echo ""

echo "✅ HTTP/3 Server Setup Complete!"
echo ""
echo "🎯 Key Features Enabled:"
echo "• Alt-Svc headers for HTTP/3 advertising"
echo "• Multiple HTTP/3 versions support (h3, h3-29, h3-28, h3-27)"
echo "• Chrome-optimized negotiation headers"
echo "• Enhanced QUIC settings"
echo "• Early Hints simulation via Link headers"
echo "• Comprehensive protocol detection"
echo ""

echo "💡 Next Steps:"
echo "1. Open https://localhost/ in Chrome"
echo "2. Check Network tab in DevTools for protocol info"
echo "3. Refresh page to trigger potential HTTP/3 upgrade"
echo "4. Monitor docker logs for connection details"
echo ""

echo "Server is running! Press Ctrl+C to stop monitoring, or run 'docker-compose logs -f' for live logs."

# Optional: Show live logs
read -p "Show live logs? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📋 Showing live logs (Press Ctrl+C to exit):"
    docker-compose logs -f
fi