#!/bin/bash

# HTTP Early Hints Demonstration Script
# This script demonstrates HTTP Early Hints (RFC 8297) functionality

set -e

echo "🚀 HTTP Early Hints Demonstration"
echo "=================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="https://localhost:8443"
CLIENT_URL="http://localhost:8080"
SSL_KEYLOG_FILE="wireshark-samples/ssl.key_log"

print_step() {
    echo -e "${BLUE}📌 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to setup SSL key logging for Wireshark analysis
setup_ssl_keylog() {
    print_step "Setting up SSL Key Logging for Wireshark Analysis"
    
    # Create wireshark-samples directory if it doesn't exist
    mkdir -p "$(dirname "$SSL_KEYLOG_FILE")"
    
    # Set SSLKEYLOGFILE environment variable for curl and other tools
    export SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE"
    
    # Clear any existing key log file
    > "$SSL_KEYLOG_FILE"
    
    echo "SSL Key logging configured:"
    echo "  Key log file: $PWD/$SSL_KEYLOG_FILE"
    echo "  Environment variable: SSLKEYLOGFILE=$SSLKEYLOGFILE"
    echo
    print_success "SSL key logging setup completed"
    echo
}

# Function to check if server is running
check_server() {
    local url=$1
    local name=$2
    
    if curl -k -s --max-time 5 "$url/actuator/health" > /dev/null 2>&1 || \
       curl -k -s --max-time 5 "$url/foo" > /dev/null 2>&1; then
        print_success "$name is running at $url"
        return 0
    else
        print_error "$name is not running at $url"
        return 1
    fi
}

# Function to make HTTP/3 request with curl (if available)
test_with_curl() {
    print_step "Testing HTTP Early Hints with curl (with SSL key logging)"
    
    if command -v curl >/dev/null 2>&1; then
        # Check if curl supports HTTP/3
        if curl --help | grep -q "http3\|h3"; then
            echo "Making HTTP/3 request to Early Hints endpoint with SSL key logging..."
            
            # Request main page that should trigger Early Hints
            echo "1. Requesting main page (should trigger 103 Early Hints):"
            SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k --http3 -I "$SERVER_URL/early-hints-demo/page" 2>/dev/null | grep -E "(HTTP|Link:|Cache-Control)" || true
            
            echo "2. Requesting hinted CSS resource:"
            SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k --http3 -I "$SERVER_URL/early-hints-demo/styles.css" 2>/dev/null | grep -E "(HTTP|Content-Type|Cache-Control)" || true
            
            echo "3. Requesting hinted JS resource:"
            SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k --http3 -I "$SERVER_URL/early-hints-demo/script.js" 2>/dev/null | grep -E "(HTTP|Content-Type|Cache-Control)" || true
            
            print_success "curl HTTP/3 test with SSL key logging completed"
        else
            print_warning "curl does not support HTTP/3 - testing with HTTP/2 and SSL key logging"
            
            echo "1. Requesting main page with HTTP/2 (fallback):"
            SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k --http2 -I "$SERVER_URL/early-hints-demo/page" 2>/dev/null | grep -E "(HTTP|Link:|Cache-Control)" || true
            
            echo "2. Requesting CSS resource:"
            SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k --http2 -I "$SERVER_URL/early-hints-demo/styles.css" 2>/dev/null | grep -E "(HTTP|Content-Type|Cache-Control)" || true
            
            print_success "curl HTTP/2 test with SSL key logging completed"
        fi
    else
        print_warning "curl not available - skipping curl tests"
    fi
    echo
}

# Function to test Early Hints endpoints
test_early_hints_endpoints() {
    print_step "Testing Early Hints Endpoints (with SSL key logging)"
    
    echo "1. Testing main page with Early Hints:"
    SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k -s "$SERVER_URL/early-hints-demo/page" | head -5
    echo "..."
    echo
    
    echo "2. Testing advanced Early Hints endpoint:"
    SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k -s "$SERVER_URL/early-hints-demo/advanced-page" | head -5
    echo "..."
    echo
    
    echo "3. Testing Early Hints info:"
    SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k -s "$SERVER_URL/early-hints-demo/info" | jq '.title, .description' 2>/dev/null || \
    SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k -s "$SERVER_URL/early-hints-demo/info" | head -3
    echo
    
    echo "4. Testing critical API data (hinted resource):"
    SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k -s "$SERVER_URL/early-hints-demo/api/critical-data" | jq '.message' 2>/dev/null || \
    SSLKEYLOGFILE="$PWD/$SSL_KEYLOG_FILE" curl -k -s "$SERVER_URL/early-hints-demo/api/critical-data" | head -2
    echo
    
    print_success "Early Hints endpoints test completed"
}

# Function to test client endpoints
test_client_endpoints() {
    print_step "Testing Client Endpoints"
    
    echo "1. Testing basic client request:"
    curl -s "$CLIENT_URL/early-hints-client-demo/basic-request" | jq '.success, .duration_ms, .message' 2>/dev/null || \
    curl -s "$CLIENT_URL/early-hints-client-demo/basic-request" | head -3
    echo
    
    echo "2. Testing concurrent requests (3 requests):"
    curl -s "$CLIENT_URL/early-hints-client-demo/concurrent-requests?requestCount=3" | \
    jq '.success, .request_count, .average_duration_ms, .note' 2>/dev/null || \
    curl -s "$CLIENT_URL/early-hints-client-demo/concurrent-requests?requestCount=3" | head -5
    echo
    
    echo "3. Testing advanced Early Hints request:"
    curl -s "$CLIENT_URL/early-hints-client-demo/advanced-request" | jq '.success, .duration_ms, .message' 2>/dev/null || \
    curl -s "$CLIENT_URL/early-hints-client-demo/advanced-request" | head -3
    echo
    
    echo "4. Testing performance comparison (3 iterations):"
    curl -s "$CLIENT_URL/early-hints-client-demo/performance-comparison?iterations=3" | \
    jq '.success, .performance_improvement_percent, .note' 2>/dev/null || \
    curl -s "$CLIENT_URL/early-hints-client-demo/performance-comparison?iterations=3" | head -5
    echo
    
    echo "5. Testing timing analysis:"
    curl -s "$CLIENT_URL/early-hints-client-demo/timing-analysis" | \
    jq '.success, .early_hints_benefit' 2>/dev/null || \
    curl -s "$CLIENT_URL/early-hints-client-demo/timing-analysis" | head -3
    echo
    
    print_success "Client endpoints test completed"
}

# Function to demonstrate HTTP/3 features
demonstrate_http3_features() {
    print_step "Demonstrating HTTP Early Hints Features"
    
    echo "HTTP Early Hints Benefits:"
    echo "• Proactive resource hints with 103 status code"
    echo "• Preloading during server processing time"
    echo "• Better browser compatibility than server push"
    echo "• Client maintains control over resource loading"
    echo "• Works with HTTP/1.1, HTTP/2, and HTTP/3"
    echo "• No cache management complexity"
    echo
    
    echo "Test the following URLs manually in a browser:"
    echo "• Main demo page: $SERVER_URL/early-hints-demo/page"
    echo "• Advanced demo: $SERVER_URL/early-hints-demo/advanced-page"
    echo "• Early Hints info: $SERVER_URL/early-hints-demo/info"
    echo "• Critical API data: $SERVER_URL/early-hints-demo/api/critical-data"
    echo
    
    echo "Client testing endpoints:"
    echo "• Basic test: $CLIENT_URL/early-hints-client-demo/basic-request"
    echo "• Performance test: $CLIENT_URL/early-hints-client-demo/performance-comparison"
    echo "• Timing analysis: $CLIENT_URL/early-hints-client-demo/timing-analysis"
    echo "• Client info: $CLIENT_URL/early-hints-client-demo/client-info"
    echo
}

# Function to show network analysis tips
show_network_analysis() {
    print_step "Network Analysis Tips"
    
    echo "To analyze HTTP/3 server push in detail:"
    echo
    echo "1. Using Wireshark with SSL Key Log:"
    echo "   • Open Wireshark"
    echo "   • Go to Edit → Preferences → Protocols → TLS"
    echo "   • Set '(Pre)-Master-Secret log filename' to:"
    echo "     $PWD/$SSL_KEYLOG_FILE"
    echo "   • Capture traffic on loopback interface (lo)"
    echo "   • Filter: quic or tls or udp.port == 8443"
    echo "   • Look for decrypted HTTP/3 traffic and server push streams"
    echo
    echo "2. Using Browser DevTools:"
    echo "   • Open DevTools → Network tab"
    echo "   • Look for 'Push' or 'h3' in the Protocol column"
    echo "   • Check timing for pushed resources"
    echo
    echo "3. Using curl with timing and key logging:"
    echo "   SSLKEYLOGFILE='$PWD/$SSL_KEYLOG_FILE' curl -w '@curl-format.txt' --http3 -k $SERVER_URL/early-hints-demo/page"
    echo
    echo "4. Application logs:"
    echo "   • Check server logs for push decisions"
    echo "   • Monitor connection reuse"
    echo "   • Track cache effectiveness"
    echo
    echo "5. SSL Key Log File:"
    echo "   • Location: $PWD/$SSL_KEYLOG_FILE"
    if [ -f "$SSL_KEYLOG_FILE" ]; then
        local keylog_size=$(wc -l < "$SSL_KEYLOG_FILE")
        echo "   • Current entries: $keylog_size lines"
        echo "   • Use this file in Wireshark to decrypt QUIC/TLS traffic"
    else
        echo "   • File will be created when SSL connections are made"
    fi
    echo
}

# Main execution
main() {
    echo "Starting HTTP/3 Server Push demonstration..."
    echo
    
    # Setup SSL key logging first
    setup_ssl_keylog
    
    # Check if servers are running
    if ! check_server "$SERVER_URL" "HTTP/3 Server"; then
        echo "Please start the HTTP/3 server first:"
        echo "  ./gradlew bootRun"
        echo
        exit 1
    fi
    
    if ! check_server "$CLIENT_URL" "Client Application"; then
        print_warning "Client application not detected - some tests may be skipped"
        echo
    fi
    
    # Run tests
    test_with_curl
    test_early_hints_endpoints
    
    if check_server "$CLIENT_URL" "Client Application" >/dev/null 2>&1; then
        test_client_endpoints
    fi
    
    demonstrate_http3_features
    show_network_analysis
    
    echo
    print_success "HTTP Early Hints demonstration completed!"
    echo
    echo "Key observations:"
    echo "• Early Hints reduces perceived latency during server processing"
    echo "• 103 status code allows preloading before final response"
    echo "• Better browser compatibility than server push"
    echo "• Client maintains control over resource loading"
    echo "• Works across all HTTP versions"
    echo "• SSL key log captured for Wireshark analysis"
    echo
    echo "SSL Key Log File: $PWD/$SSL_KEYLOG_FILE"
    if [ -f "$SSL_KEYLOG_FILE" ]; then
        local keylog_size=$(wc -l < "$SSL_KEYLOG_FILE")
        echo "Captured $keylog_size SSL key log entries for traffic decryption"
    fi
    echo
    echo "Next steps:"
    echo "• Use the SSL key log file in Wireshark to decrypt QUIC traffic"
    echo "• Monitor Early Hints effectiveness in browser DevTools"
    echo "• Tune Early Hints timing based on server processing patterns"
    echo "• Implement conditional Early Hints based on request patterns"
    echo "• Test Early Hints performance across different network conditions"
}

# Execute main function
main "$@"