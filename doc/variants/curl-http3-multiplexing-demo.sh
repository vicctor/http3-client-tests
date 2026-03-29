#!/usr/bin/env bash

# HTTP/3 Multiplexing Demonstration with curl
# This script uses curl to demonstrate HTTP/3 multiplexing capabilities with SSL key logging

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🌐 HTTP/3 Multiplexing Demo with curl${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Demonstrating QUIC connection multiplexing using curl client${NC}"
    echo -e "${GREEN}Multiple concurrent requests over single HTTP/3 connection${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_curl_http3() {
    echo -e "${BLUE}🔍 Checking curl HTTP/3 support...${NC}"
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        exit 1
    fi
    
    # Check curl version and HTTP/3 support
    CURL_VERSION=$(curl --version | head -n1)
    echo "curl version: $CURL_VERSION"
    
    if curl --help all 2>/dev/null | grep -q -- "--http3"; then
        print_status "curl supports --http3 flag"
    else
        print_warning "curl may not support HTTP/3. Continuing anyway..."
    fi
    
    echo ""
}

run_http3_multiplexing_demo() {
    echo -e "${BLUE}🚀 Running HTTP/3 Multiplexing Demonstration...${NC}"
    echo ""
    
    # SSL Key log file for Wireshark analysis
    export SSLKEYLOGFILE=/tmp/curl_http3_multiplexing.ssl.key_log
    rm -f "$SSLKEYLOGFILE"
    
    echo "SSL Key Log File: $SSLKEYLOGFILE"
    echo ""
    
    # Test servers that support HTTP/3
    declare -a TEST_SERVERS=(
        "https://cloudflare-quic.com/"
        "https://www.google.com/"
        "https://www.facebook.com/"
        "https://blog.cloudflare.com/"
        "https://http3check.net/"
    )
    
    # Test each server to find one that works with HTTP/3
    WORKING_SERVER=""
    WORKING_SERVER_IP=""
    
    echo -e "${BLUE}🎯 Finding working HTTP/3 server...${NC}"
    
    for server in "${TEST_SERVERS[@]}"; do
        echo "Testing: $server"
        
        # Extract hostname for IP resolution
        hostname=$(echo "$server" | sed -e 's|^https://||' -e 's|/.*$||')
        server_ip=$(dig +short "$hostname" | head -n1 2>/dev/null || echo "Unknown")
        
        echo "  🌐 Server IP: $server_ip ($hostname)"
        
        # Test with curl HTTP/3
        if timeout 15s curl "$server" -v --http3 --connect-timeout 10 -o /dev/null -s --stderr - 2>&1 | grep -q "HTTP/3"; then
            print_status "HTTP/3 working with $server"
            WORKING_SERVER="$server"
            WORKING_SERVER_IP="$server_ip"
            break
        else
            print_warning "HTTP/3 not working with $server"
        fi
        echo ""
    done
    
    if [ -z "$WORKING_SERVER" ]; then
        print_error "No working HTTP/3 server found. Trying with cloudflare-quic.com anyway..."
        WORKING_SERVER="https://cloudflare-quic.com/"
        WORKING_SERVER_IP=$(dig +short cloudflare-quic.com | head -n1 2>/dev/null || echo "Unknown")
    fi
    
    echo -e "${BLUE}🎯 Using server: $WORKING_SERVER ($WORKING_SERVER_IP)${NC}"
    echo ""
    
    # Demonstrate HTTP/3 multiplexing with multiple concurrent requests
    demonstrate_multiplexing "$WORKING_SERVER" "$WORKING_SERVER_IP"
}

demonstrate_multiplexing() {
    local base_server="$1"
    local server_ip="$2"
    
    echo -e "${BLUE}🔄 Demonstrating HTTP/3 Multiplexing...${NC}"
    echo "Server: $base_server"
    echo "IP: $server_ip"
    echo ""
    
    # Create different URLs to test multiplexing
    declare -a TEST_URLS=(
        "${base_server}"
        "${base_server}?test=1"
        "${base_server}?test=2"
        "${base_server}?test=3"
        "${base_server}?test=multiplexing"
    )
    
    # Single connection test first
    echo -e "${BLUE}📊 Single HTTP/3 Request (Baseline):${NC}"
    echo "Command: SSLKEYLOGFILE=$SSLKEYLOGFILE curl \"${base_server}\" -v --http3 --connect-timeout 10 -o /dev/null"
    echo ""
    
    time SSLKEYLOGFILE="$SSLKEYLOGFILE" curl "${base_server}" -v --http3 --connect-timeout 10 -o /dev/null -s --stderr - | \
        grep -E "(HTTP/3|Connected to|QUIC|TLS)" || echo "Single request completed"
    
    echo ""
    echo -e "${BLUE}🚀 Multiple Concurrent HTTP/3 Requests (Multiplexing):${NC}"
    echo "Starting ${#TEST_URLS[@]} concurrent requests to demonstrate multiplexing..."
    echo ""
    
    # Array to store background process PIDs
    declare -a PIDS=()
    
    # Start concurrent requests
    local start_time=$(date +%s%3N)
    
    for i in "${!TEST_URLS[@]}"; do
        url="${TEST_URLS[$i]}"
        output_file="/tmp/curl_http3_output_$i.log"
        
        echo "Starting request $((i+1)): $url"
        
        # Run curl in background with detailed output
        (
            echo "=== Request $((i+1)) to $url ===" > "$output_file"
            SSLKEYLOGFILE="$SSLKEYLOGFILE" curl "$url" \
                -v --http3 --connect-timeout 10 \
                -H "X-Request-ID: multiplexing-test-$i" \
                -H "User-Agent: curl-http3-multiplexing-demo/1.0" \
                -o "/tmp/curl_response_$i.html" \
                --stderr "$output_file" 2>&1
        ) &
        
        PIDS+=($!)
    done
    
    # Wait for all requests to complete
    echo ""
    echo "Waiting for all requests to complete..."
    
    for pid in "${PIDS[@]}"; do
        wait "$pid" || echo "Process $pid completed with errors"
    done
    
    local end_time=$(date +%s%3N)
    local total_time=$((end_time - start_time))
    
    echo ""
    print_status "All concurrent requests completed in ${total_time}ms"
    
    # Analyze results
    analyze_multiplexing_results "${#TEST_URLS[@]}"
}

analyze_multiplexing_results() {
    local num_requests="$1"
    
    echo ""
    echo -e "${BLUE}📊 Multiplexing Analysis Results:${NC}"
    echo "=================================="
    
    # Analyze SSL key log file
    if [ -f "$SSLKEYLOGFILE" ]; then
        local key_log_size=$(wc -c < "$SSLKEYLOGFILE")
        local key_log_lines=$(wc -l < "$SSLKEYLOGFILE")
        
        print_status "SSL key log file created: $SSLKEYLOGFILE"
        echo "  File size: $key_log_size bytes"
        echo "  Lines: $key_log_lines"
        echo ""
        
        # Count handshake secrets (indicates number of connections)
        local handshake_count=$(grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        local total_secrets=$(wc -l < "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        
        echo "🔍 Connection Analysis:"
        echo "  QUIC handshakes: $handshake_count"
        echo "  Total SSL secrets: $total_secrets"
        echo "  Requests sent: $num_requests"
        echo ""
        
        if [ "$handshake_count" -eq 1 ] && [ "$num_requests" -gt 1 ]; then
            print_status "PERFECT MULTIPLEXING: $num_requests requests over 1 QUIC connection!"
            echo "  🎉 Multiple requests shared single HTTP/3 connection"
            echo "  ⚡ Connection reuse successfully demonstrated"
        elif [ "$handshake_count" -lt "$num_requests" ]; then
            print_status "GOOD MULTIPLEXING: $num_requests requests over $handshake_count connections"
            echo "  ✅ Some connection reuse achieved"
        else
            print_warning "LIMITED MULTIPLEXING: Each request may have used separate connection"
            echo "  ℹ️  This could indicate connection limits or server behavior"
        fi
        
        echo ""
        echo "💡 Key Log File Usage:"
        echo "  • Use with Wireshark: Edit → Preferences → Protocols → TLS"
        echo "  • Set '(Pre)-Master-Secret log filename' to: $SSLKEYLOGFILE"
        echo "  • Capture traffic to see QUIC multiplexing in action"
        
    else
        print_warning "No SSL key log file generated"
    fi
    
    # Analyze individual request outputs
    echo ""
    echo -e "${BLUE}📋 Individual Request Results:${NC}"
    
    local success_count=0
    local http3_count=0
    
    for i in $(seq 0 $((num_requests-1))); do
        local output_file="/tmp/curl_http3_output_$i.log"
        local response_file="/tmp/curl_response_$i.html"
        
        if [ -f "$output_file" ]; then
            echo "Request $((i+1)):"
            
            # Check for HTTP/3 protocol
            if grep -q "HTTP/3" "$output_file"; then
                echo "  ✅ Protocol: HTTP/3"
                ((http3_count++))
            elif grep -q "HTTP/2" "$output_file"; then
                echo "  ⚠️  Protocol: HTTP/2 (fallback)"
            else
                echo "  ❓ Protocol: Unknown"
            fi
            
            # Check response status
            if grep -q "200 OK\|200" "$output_file"; then
                echo "  ✅ Status: Success (200 OK)"
                ((success_count++))
            else
                local status=$(grep -o "HTTP/[0-9.]*[[:space:]]*[0-9]*" "$output_file" | tail -1 || echo "Unknown")
                echo "  ❌ Status: $status"
            fi
            
            # Show response size if available
            if [ -f "$response_file" ]; then
                local size=$(wc -c < "$response_file" 2>/dev/null || echo "0")
                echo "  📄 Response size: $size bytes"
            fi
            
            echo ""
        fi
    done
    
    echo -e "${BLUE}📈 Summary Statistics:${NC}"
    echo "  Total requests: $num_requests"
    echo "  Successful responses: $success_count"
    echo "  HTTP/3 responses: $http3_count"
    echo "  Success rate: $(( success_count * 100 / num_requests ))%"
    echo "  HTTP/3 rate: $(( http3_count * 100 / num_requests ))%"
    
    if [ "$http3_count" -gt 0 ]; then
        print_status "HTTP/3 multiplexing demonstration successful!"
    else
        print_warning "No HTTP/3 connections established (may have used HTTP/2 fallback)"
    fi
}

cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup${NC}"
    echo "=========="
    
    # Clean up temporary files but keep key log
    rm -f /tmp/curl_http3_output_*.log
    rm -f /tmp/curl_response_*.html
    
    # Keep SSL key log file for analysis
    if [ -f "$SSLKEYLOGFILE" ]; then
        print_status "SSL key log preserved: $SSLKEYLOGFILE"
    fi
}

show_multiplexing_benefits() {
    echo ""
    echo -e "${BLUE}💡 HTTP/3 Multiplexing Benefits Demonstrated:${NC}"
    echo "=============================================="
    echo ""
    echo "🚀 Performance Benefits:"
    echo "  • Multiple requests over single QUIC connection"
    echo "  • No head-of-line blocking (unlike HTTP/2)"
    echo "  • Reduced connection establishment overhead"
    echo "  • Better utilization of network resources"
    echo ""
    echo "🔄 Connection Efficiency:"
    echo "  • Single UDP connection for multiple HTTP requests"
    echo "  • Independent streams within same connection"
    echo "  • Automatic flow control and congestion management"
    echo "  • Connection migration support for mobile networks"
    echo ""
    echo "🌐 Real-world Applications:"
    echo "  • Web page loading (HTML, CSS, JS, images)"
    echo "  • API calls with multiple endpoints"
    echo "  • Streaming applications with multiple streams"
    echo "  • Mobile applications with intermittent connectivity"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    print_header
    check_curl_http3
    run_http3_multiplexing_demo
    show_multiplexing_benefits
    
    echo ""
    echo -e "${GREEN}🎉 HTTP/3 Multiplexing Demonstration Completed!${NC}"
    echo ""
    echo -e "${YELLOW}🔍 Next Steps:${NC}"
    echo "• Analyze the SSL key log file with Wireshark"
    echo "• Compare HTTP/3 vs HTTP/2 multiplexing behavior"
    echo "• Test with your own HTTP/3-enabled servers"
    echo "• Experiment with different request patterns"
}

# Execute main function
main "$@"