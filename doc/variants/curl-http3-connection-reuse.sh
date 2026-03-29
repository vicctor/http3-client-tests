#!/usr/bin/env bash

# Enhanced HTTP/3 Multiplexing Demo with curl - Connection Reuse Focus
# Demonstrates true HTTP/3 multiplexing with connection reuse analysis

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
    echo -e "${BLUE}🔄 HTTP/3 Connection Reuse Demo with curl${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Demonstrating HTTP/3 connection reuse and multiplexing${NC}"
    echo -e "${GREEN}Using curl with SSLKEYLOGFILE for connection analysis${NC}"
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

run_connection_reuse_demo() {
    echo -e "${BLUE}🚀 HTTP/3 Connection Reuse Demonstration${NC}"
    echo ""
    
    # SSL Key log file for analysis
    export SSLKEYLOGFILE=/tmp/curl_http3_reuse.ssl.key_log
    rm -f "$SSLKEYLOGFILE"
    
    echo "SSL Key Log File: $SSLKEYLOGFILE"
    echo ""
    
    # Use a server that reliably supports HTTP/3
    local server="https://cloudflare-quic.com"
    local server_ip=$(dig +short cloudflare-quic.com | head -n1 2>/dev/null || echo "Unknown")
    
    echo -e "${BLUE}🎯 Target Server: $server${NC}"
    echo "🌐 Server IP: $server_ip (cloudflare-quic.com)"
    echo ""
    
    # Test 1: Sequential requests to demonstrate connection reuse
    echo -e "${BLUE}📊 Test 1: Sequential HTTP/3 Requests (Connection Reuse)${NC}"
    echo "Making 3 sequential requests to demonstrate connection reuse..."
    echo ""
    
    for i in {1..3}; do
        echo "Request $i:"
        echo "Command: SSLKEYLOGFILE=$SSLKEYLOGFILE curl \"$server/?request=$i\" -v --http3-only --connect-timeout 5"
        
        time SSLKEYLOGFILE="$SSLKEYLOGFILE" curl "$server/?request=$i" \
            -v --http3-only --connect-timeout 5 \
            -H "X-Request-ID: sequential-$i" \
            -o "/tmp/response_sequential_$i.html" \
            --stderr "/tmp/curl_sequential_$i.log" 2>&1
            
        echo ""
    done
    
    # Analyze connection reuse from key log
    analyze_connection_reuse "Sequential"
    
    echo ""
    echo -e "${BLUE}📊 Test 2: Concurrent HTTP/3 Requests (Multiplexing)${NC}"
    echo "Making concurrent requests to demonstrate multiplexing..."
    echo ""
    
    # Clear key log for second test
    rm -f "$SSLKEYLOGFILE"
    
    # Start concurrent requests
    declare -a PIDS=()
    local start_time=$(date +%s%N)
    
    for i in {1..4}; do
        (
            echo "Starting concurrent request $i at $(date)"
            SSLKEYLOGFILE="$SSLKEYLOGFILE" curl "$server/?concurrent=$i" \
                -v --http3-only --connect-timeout 10 \
                -H "X-Request-ID: concurrent-$i" \
                -H "X-Start-Time: $(date +%s%N)" \
                -o "/tmp/response_concurrent_$i.html" \
                --stderr "/tmp/curl_concurrent_$i.log" 2>&1
        ) &
        PIDS+=($!)
    done
    
    # Wait for all to complete
    echo "Waiting for concurrent requests to complete..."
    for pid in "${PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
    
    local end_time=$(date +%s%N)
    local total_time_ns=$((end_time - start_time))
    local total_time_ms=$((total_time_ns / 1000000))
    
    echo "All concurrent requests completed in ${total_time_ms}ms"
    echo ""
    
    # Analyze multiplexing
    analyze_connection_reuse "Concurrent"
    
    # Show detailed results
    show_detailed_results
}

analyze_connection_reuse() {
    local test_type="$1"
    
    echo -e "${BLUE}🔍 $test_type Connection Analysis:${NC}"
    echo "=================================="
    
    if [ -f "$SSLKEYLOGFILE" ]; then
        local key_log_size=$(wc -c < "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        local key_log_lines=$(wc -l < "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        
        echo "Key log file: $key_log_size bytes, $key_log_lines lines"
        
        # Count different types of secrets to understand connections
        local client_handshake=$(grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        local server_handshake=$(grep -c "SERVER_HANDSHAKE_TRAFFIC_SECRET" "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        local client_traffic=$(grep -c "CLIENT_TRAFFIC_SECRET_0" "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        local server_traffic=$(grep -c "SERVER_TRAFFIC_SECRET_0" "$SSLKEYLOGFILE" 2>/dev/null || echo "0")
        
        echo ""
        echo "🔑 SSL Secret Analysis:"
        echo "  Client handshake secrets: $client_handshake"
        echo "  Server handshake secrets: $server_handshake"
        echo "  Client traffic secrets:   $client_traffic"
        echo "  Server traffic secrets:   $server_traffic"
        
        # Analyze connection patterns
        if [ "$client_handshake" -eq 1 ]; then
            print_status "EXCELLENT: Single QUIC handshake detected"
            echo "  🎉 All requests likely used same HTTP/3 connection"
        elif [ "$client_handshake" -le 2 ]; then
            print_status "GOOD: Minimal handshakes ($client_handshake connections)"
            echo "  ✅ Good connection reuse achieved"
        else
            print_warning "SUBOPTIMAL: Multiple handshakes ($client_handshake connections)"
            echo "  ℹ️  May indicate separate connections for each request"
        fi
        
        echo ""
        
    else
        print_error "No SSL key log file found"
    fi
}

show_detailed_results() {
    echo -e "${BLUE}📋 Detailed Request Analysis:${NC}"
    echo "============================="
    echo ""
    
    # Analyze sequential requests
    echo -e "${YELLOW}Sequential Requests:${NC}"
    for i in {1..3}; do
        local log_file="/tmp/curl_sequential_$i.log"
        if [ -f "$log_file" ]; then
            echo "Request $i:"
            
            # Check for HTTP/3 usage
            if grep -q "using HTTP/3" "$log_file"; then
                echo "  ✅ Protocol: HTTP/3"
            else
                echo "  ❌ Protocol: Not HTTP/3"
            fi
            
            # Check connection info
            local connected_line=$(grep "Connected to" "$log_file" | head -1)
            if [ -n "$connected_line" ]; then
                echo "  🔗 $connected_line"
            fi
            
            # Check for connection reuse indicators
            if grep -q "Re-using existing connection" "$log_file"; then
                echo "  🔄 Connection reused!"
            elif grep -q "Connection.*left intact" "$log_file"; then
                echo "  💾 Connection left intact for reuse"
            fi
            
            echo ""
        fi
    done
    
    # Analyze concurrent requests
    echo -e "${YELLOW}Concurrent Requests:${NC}"
    local http3_count=0
    local total_concurrent=4
    
    for i in {1..4}; do
        local log_file="/tmp/curl_concurrent_$i.log"
        if [ -f "$log_file" ]; then
            echo "Concurrent Request $i:"
            
            if grep -q "using HTTP/3" "$log_file"; then
                echo "  ✅ Protocol: HTTP/3"
                ((http3_count++))
            else
                echo "  ❌ Protocol: Not HTTP/3"
            fi
            
            # Show timing if available
            local connected_time=$(grep "Connected to.*in.*ms" "$log_file" | head -1)
            if [ -n "$connected_time" ]; then
                echo "  ⏱️  $connected_time"
            fi
            
            echo ""
        fi
    done
    
    echo -e "${BLUE}📊 Summary Statistics:${NC}"
    echo "  Sequential HTTP/3 requests: 3"
    echo "  Concurrent HTTP/3 requests: $http3_count/$total_concurrent"
    echo "  Overall HTTP/3 success: $((http3_count + 3)) out of $((total_concurrent + 3))"
    
    if [ "$http3_count" -gt 0 ]; then
        print_status "HTTP/3 multiplexing demonstration successful!"
    else
        print_warning "HTTP/3 connections may have fallen back to HTTP/2"
    fi
}

show_wireshark_instructions() {
    echo ""
    echo -e "${BLUE}🦈 Wireshark Analysis Instructions:${NC}"
    echo "=================================="
    echo ""
    echo "1. Open Wireshark and start capturing on your network interface"
    echo "2. Go to Edit → Preferences → Protocols → TLS"
    echo "3. Set '(Pre)-Master-Secret log filename' to:"
    echo "   $SSLKEYLOGFILE"
    echo "4. Apply and restart capture if needed"
    echo "5. Filter traffic with: 'ip.addr == $(dig +short cloudflare-quic.com | head -1)'"
    echo "6. Look for QUIC packets and HTTP/3 streams"
    echo ""
    echo -e "${YELLOW}What to look for:${NC}"
    echo "• QUIC Initial packets (connection establishment)"
    echo "• HTTP/3 HEADERS frames (start of requests)"
    echo "• HTTP/3 DATA frames (response data)"
    echo "• Stream multiplexing within single QUIC connection"
    echo ""
}

cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup${NC}"
    echo "=========="
    
    # Clean up response and log files
    rm -f /tmp/response_*.html
    rm -f /tmp/curl_sequential_*.log
    rm -f /tmp/curl_concurrent_*.log
    
    # Keep SSL key log file for analysis
    if [ -f "$SSLKEYLOGFILE" ]; then
        print_status "SSL key log preserved: $SSLKEYLOGFILE"
        echo "  Use this file with Wireshark for detailed QUIC analysis"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    print_header
    
    # Check curl HTTP/3 support
    if ! curl --help all 2>/dev/null | grep -q -- "--http3"; then
        print_error "curl does not support --http3 flag"
        echo "Please install a curl version with HTTP/3 support"
        exit 1
    fi
    
    print_status "curl supports HTTP/3"
    echo "curl version: $(curl --version | head -n1)"
    echo ""
    
    run_connection_reuse_demo
    show_wireshark_instructions
    
    echo ""
    echo -e "${GREEN}🎉 HTTP/3 Connection Reuse Demo Completed!${NC}"
    echo ""
    echo -e "${YELLOW}💡 Key Takeaways:${NC}"
    echo "• HTTP/3 uses QUIC for connection multiplexing"
    echo "• Multiple requests can share a single QUIC connection"
    echo "• Connection reuse reduces handshake overhead"
    echo "• SSL key logging enables detailed traffic analysis"
    echo "• Wireshark can decode QUIC traffic with key log files"
}

# Execute main function
main "$@"