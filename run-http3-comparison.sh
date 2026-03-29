#!/usr/bin/env bash

# HTTP/3 vs HTTP/2 Comparison with curl
# Demonstrates the difference between protocols and captures traffic

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYLOG_FILE="$SCRIPT_DIR/wireshark-samples/curl-http3-comparison.key_log"
TARGET_SERVER="https://www.google.com"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}🔍 HTTP/3 vs HTTP/2 Comparison${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
}

test_http2() {
    echo -e "${BLUE}📊 Testing HTTP/2${NC}"
    echo "-------------------"
    
    # Clear key log
    > "$KEYLOG_FILE"
    echo "# HTTP/2 vs HTTP/3 Comparison - $(date)" >> "$KEYLOG_FILE"
    echo "# HTTP/2 requests" >> "$KEYLOG_FILE"
    
    for i in {1..3}; do
        echo "HTTP/2 Request $i:"
        time curl -w "Status: %{http_code}, Time: %{time_total}s, Protocol: %{http_version}\n" \
                  --http2 \
                  --silent \
                  --output /dev/null \
                  --sslkeylogfile "$KEYLOG_FILE" \
                  "$TARGET_SERVER"
        echo ""
    done
}

test_http3() {
    echo -e "${BLUE}⚡ Testing HTTP/3${NC}"
    echo "-------------------"
    
    echo "# HTTP/3 requests" >> "$KEYLOG_FILE"
    
    for i in {1..3}; do
        echo "HTTP/3 Request $i:"
        time curl -w "Status: %{http_code}, Time: %{time_total}s, Protocol: %{http_version}\n" \
                  --http3 \
                  --silent \
                  --output /dev/null \
                  --sslkeylogfile "$KEYLOG_FILE" \
                  "$TARGET_SERVER" || echo "HTTP/3 not supported by curl or server"
        echo ""
    done
}

analyze_keylog() {
    echo -e "${BLUE}🔍 SSL Key Log Analysis${NC}"
    echo "----------------------"
    
    if [ -f "$KEYLOG_FILE" ] && [ -s "$KEYLOG_FILE" ]; then
        echo "Key log file: $KEYLOG_FILE"
        echo "Size: $(wc -c < "$KEYLOG_FILE") bytes"
        echo "Lines: $(wc -l < "$KEYLOG_FILE") lines"
        echo ""
        
        echo "Key types found:"
        grep -E "CLIENT_|SERVER_" "$KEYLOG_FILE" | cut -d' ' -f1 | sort | uniq -c || echo "No SSL secrets found"
        echo ""
        
        echo "Usage with Wireshark:"
        echo "1. Edit → Preferences → Protocols → TLS"
        echo "2. Set '(Pre)-Master-Secret log filename' to:"
        echo "   $KEYLOG_FILE"
        echo "3. Apply filters: 'quic' or 'http2' or 'http3'"
    else
        echo "No key log file generated"
    fi
}

print_header

# Check if curl supports HTTP/3
if curl --help all 2>/dev/null | grep -q "http3"; then
    echo -e "${GREEN}✅ curl supports HTTP/3${NC}"
else
    echo -e "${YELLOW}⚠️  curl does not support HTTP/3 (using Java example instead)${NC}"
    echo "Running Java HTTP/3 example for comparison..."
    echo ""
    exec ./run-http3-0rtt-demo.sh
fi

echo "Target: $TARGET_SERVER"
echo "Key log: $KEYLOG_FILE"
echo ""

# Create key log directory
mkdir -p "$(dirname "$KEYLOG_FILE")"

# Test HTTP/2
test_http2

# Test HTTP/3  
test_http3

# Analysis
analyze_keylog

echo -e "${GREEN}🎉 Comparison completed!${NC}"
echo ""
echo "For packet capture analysis:"
echo "  1. Run: tshark -i any -f 'tcp port 443 or udp port 443' -w comparison.pcapng"
echo "  2. Execute this script in another terminal"
echo "  3. Stop capture and analyze with Wireshark"