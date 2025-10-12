#!/usr/bin/env bash

# HTTP/3 0-RTT Demonstration Script with Wireshark Capture
# This script runs the HTTP/3 0-RTT example with SSL key logging and optionally captures traffic

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use the custom JDK with HTTP/3 support
export JAVA_HOME=/home/grxybek/tata/jdk/build/linux-x86_64-server-release/images/jdk
export PATH="${JAVA_HOME}/bin:$PATH"

# Configuration
KEYLOG_FILE="$SCRIPT_DIR/wireshark-samples/http3-0rtt-demo.key_log"
PCAP_FILE="$SCRIPT_DIR/wireshark-samples/http3-0rtt-demo.pcapng"
TARGET_SERVER="https://cloudflare-quic.com"
CAPTURE_INTERFACE="any"  # Change this to your network interface if needed

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}🚀 HTTP/3 0-RTT (Zero Round Trip Time) Demonstration${NC}"
    echo -e "${BLUE}================================================================${NC}"
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

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

check_requirements() {
    echo -e "${BLUE}🔍 Checking requirements...${NC}"
    
    # Check Java version
    if ! command -v java &> /dev/null; then
        print_error "Java not found in PATH"
        exit 1
    fi
    
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "Java version: $JAVA_VERSION"
    
    # Check if we can access the target server
    echo "Testing connectivity to $TARGET_SERVER..."
    if curl -s --max-time 10 "$TARGET_SERVER" > /dev/null 2>&1; then
        print_status "Target server is accessible"
    else
        print_warning "Target server may not be accessible, but continuing anyway..."
    fi
    
    # Check for Wireshark/tshark if capture is requested
    if [ "$1" == "--capture" ] || [ "$1" == "-c" ]; then
        if command -v tshark &> /dev/null; then
            print_status "Wireshark/tshark found - packet capture available"
            WIRESHARK_AVAILABLE=true
        else
            print_warning "Wireshark/tshark not found - no packet capture"
            WIRESHARK_AVAILABLE=false
        fi
    fi
    
    echo ""
}

setup_environment() {
    echo -e "${BLUE}🔧 Setting up environment...${NC}"
    
    # Create directories
    mkdir -p "$(dirname "$KEYLOG_FILE")"
    mkdir -p "$(dirname "$PCAP_FILE")"
    
    # Clear previous key log file
    > "$KEYLOG_FILE"
    echo "# HTTP/3 0-RTT Demonstration - $(date)" >> "$KEYLOG_FILE"
    echo "# Target: $TARGET_SERVER" >> "$KEYLOG_FILE"
    echo "# This file contains SSL/TLS secrets for Wireshark decryption" >> "$KEYLOG_FILE"
    echo "" >> "$KEYLOG_FILE"
    
    print_status "SSL key log file initialized: $KEYLOG_FILE"
    
    # Java options for HTTP/3 with SSL key logging
    JAVA_OPTS=(
        "-Djavax.net.ssl.keylog=$KEYLOG_FILE"
        "-Djdk.httpclient.debug=false"
        "-Djdk.internal.httpclient.debug=false"
        "-Djdk.internal.httpclient.quic.debug=false"
    )
    
    export JAVA_TOOL_OPTIONS="${JAVA_OPTS[*]}"
    
    print_status "Environment configured"
    echo ""
}

compile_example() {
    echo -e "${BLUE}📦 Compiling HTTP/3 0-RTT example...${NC}"
    
    # Create target directory
    mkdir -p target/classes
    
    # Compile the example
    javac --enable-preview --release 26 \
          -d target/classes \
          src/main/java26/net/arturkeska/http3/HTTP3ZeroRTTImproved.java

    if [ $? -eq 0 ]; then
        print_status "Compilation successful"
    else
        print_error "Compilation failed"
        exit 1
    fi
    echo ""
}

start_packet_capture() {
    if [ "$CAPTURE_TRAFFIC" == "true" ] && [ "$WIRESHARK_AVAILABLE" == "true" ]; then
        echo -e "${BLUE}📡 Starting packet capture...${NC}"

        # Remove previous capture file
        rm -f "$PCAP_FILE"

        # Start tshark in background
        tshark -i "$CAPTURE_INTERFACE" \
               -f "udp port 443 or tcp port 443" \
               -w "$PCAP_FILE" \
               > /dev/null 2>&1 &

        TSHARK_PID=$!
        echo $TSHARK_PID > /tmp/http3-0rtt-tshark.pid

        print_status "Packet capture started (PID: $TSHARK_PID)"
        print_info "Capturing traffic on interface: $CAPTURE_INTERFACE"
        print_info "Output file: $PCAP_FILE"

        # Give tshark time to start
        sleep 2
        echo ""
    fi
}

stop_packet_capture() {
    if [ -f /tmp/http3-0rtt-tshark.pid ]; then
        TSHARK_PID=$(cat /tmp/http3-0rtt-tshark.pid)
        echo -e "${BLUE}🛑 Stopping packet capture...${NC}"

        if kill $TSHARK_PID 2>/dev/null; then
            # Wait for tshark to finish writing
            sleep 2
            print_status "Packet capture stopped"

            if [ -f "$PCAP_FILE" ]; then
                PCAP_SIZE=$(ls -lh "$PCAP_FILE" | awk '{print $5}')
                print_status "Capture file created: $PCAP_FILE ($PCAP_SIZE)"
            fi
        else
            print_warning "Could not stop packet capture process"
        fi

        rm -f /tmp/http3-0rtt-tshark.pid
        echo ""
    fi
}

run_0rtt_example() {
    echo -e "${BLUE}⚡ Running HTTP/3 0-RTT demonstration...${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Run the Java example
    java --enable-preview \
         -cp target/classes \
         net.arturkeska.http3.HTTP3ZeroRTTImproved
    
    echo ""
    print_status "HTTP/3 0-RTT demonstration completed"
}

analyze_results() {
    echo -e "${BLUE}📊 Analyzing results...${NC}"
    echo ""
    
    # Check SSL key log file
    if [ -f "$KEYLOG_FILE" ] && [ -s "$KEYLOG_FILE" ]; then
        KEYLOG_SIZE=$(wc -c < "$KEYLOG_FILE")
        KEYLOG_LINES=$(wc -l < "$KEYLOG_FILE")
        print_status "SSL key log file: $KEYLOG_SIZE bytes, $KEYLOG_LINES lines"
        
        # Count different types of secrets
        CLIENT_HANDSHAKE=$(grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "$KEYLOG_FILE" 2>/dev/null || echo "0")
        SERVER_HANDSHAKE=$(grep -c "SERVER_HANDSHAKE_TRAFFIC_SECRET" "$KEYLOG_FILE" 2>/dev/null || echo "0")
        CLIENT_TRAFFIC=$(grep -c "CLIENT_TRAFFIC_SECRET_0" "$KEYLOG_FILE" 2>/dev/null || echo "0")
        SERVER_TRAFFIC=$(grep -c "SERVER_TRAFFIC_SECRET_0" "$KEYLOG_FILE" 2>/dev/null || echo "0")
        
        echo "   📋 SSL secrets logged:"
        echo "      • Client handshake secrets: $CLIENT_HANDSHAKE"
        echo "      • Server handshake secrets: $SERVER_HANDSHAKE"
        echo "      • Client application secrets: $CLIENT_TRAFFIC"
        echo "      • Server application secrets: $SERVER_TRAFFIC"
        
        TOTAL_SECRETS=$((CLIENT_HANDSHAKE + SERVER_HANDSHAKE + CLIENT_TRAFFIC + SERVER_TRAFFIC))
        if [ $TOTAL_SECRETS -gt 0 ]; then
            print_status "SSL secrets logged successfully - Wireshark decryption possible"
        else
            print_warning "No SSL secrets found in key log file"
        fi
    else
        print_error "SSL key log file not created or empty"
    fi
    
    # Check packet capture file
    if [ "$CAPTURE_TRAFFIC" == "true" ] && [ -f "$PCAP_FILE" ]; then
        PCAP_SIZE=$(ls -lh "$PCAP_FILE" | awk '{print $5}')
        print_status "Packet capture file: $PCAP_FILE ($PCAP_SIZE)"
        
        # Basic analysis with tshark if available
        if command -v tshark &> /dev/null; then
            echo "   📊 Packet analysis:"
            
            # Count QUIC packets
            QUIC_PACKETS=$(tshark -r "$PCAP_FILE" -Y "quic" 2>/dev/null | wc -l || echo "0")
            echo "      • QUIC packets: $QUIC_PACKETS"
            
            # Count Initial packets (first connection)
            INITIAL_PACKETS=$(tshark -r "$PCAP_FILE" -Y "quic.packet_type == 0" 2>/dev/null | wc -l || echo "0")
            echo "      • QUIC Initial packets: $INITIAL_PACKETS"
            
            # Count 0-RTT packets
            ZERO_RTT_PACKETS=$(tshark -r "$PCAP_FILE" -Y "quic.packet_type == 1" 2>/dev/null | wc -l || echo "0")
            echo "      • QUIC 0-RTT packets: $ZERO_RTT_PACKETS"
            
            if [ $ZERO_RTT_PACKETS -gt 0 ]; then
                print_status "0-RTT packets detected in capture!"
            else
                print_info "No 0-RTT packets detected (may still have been used)"
            fi
        fi
    fi
    
    echo ""
}

display_wireshark_instructions() {
    echo -e "${BLUE}🔍 Wireshark Analysis Instructions${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    echo "To analyze the captured HTTP/3 0-RTT traffic:"
    echo ""
    echo "1. 📂 Open Wireshark and load the capture file:"
    echo "   File: $PCAP_FILE"
    echo ""
    echo "2. 🔓 Configure SSL key logging:"
    echo "   • Go to: Edit → Preferences → Protocols → TLS"
    echo "   • Set '(Pre)-Master-Secret log filename' to:"
    echo "     $KEYLOG_FILE"
    echo "   • Click OK"
    echo ""
    echo "3. 🔍 Apply filters to see HTTP/3 traffic:"
    echo "   • QUIC traffic: quic"
    echo "   • HTTP/3 traffic: http3"
    echo "   • 0-RTT packets: quic.packet_type == 1"
    echo "   • Initial packets: quic.packet_type == 0"
    echo ""
    echo "4. 🎯 Look for 0-RTT indicators:"
    echo "   • 📦 QUIC 0-RTT packets (packet type 1)"
    echo "   • 🚀 HTTP/3 requests sent before handshake completion"
    echo "   • 🔄 Session resumption and ticket usage"
    echo "   • ⚡ Reduced handshake latency in subsequent connections"
    echo ""
    echo "5. 📊 Compare connection timings:"
    echo "   • First connection: Full handshake with certificates"
    echo "   • Subsequent connections: Reduced handshake with early data"
    echo "   • Measure time difference between Initial packet and first HTTP request"
    echo ""
    
    if [ -f "$KEYLOG_FILE" ] && [ -s "$KEYLOG_FILE" ]; then
        echo -e "${GREEN}✅ SSL key file is ready for Wireshark decryption${NC}"
    else
        echo -e "${RED}❌ SSL key file not available - traffic will appear encrypted${NC}"
    fi
    
    if [ -f "$PCAP_FILE" ]; then
        echo -e "${GREEN}✅ Packet capture file is ready for analysis${NC}"
    else
        echo -e "${YELLOW}⚠️  No packet capture file - analysis limited to timing data${NC}"
    fi
    echo ""
}

cleanup() {
    echo -e "${BLUE}🧹 Cleanup${NC}"
    
    # Stop packet capture if running
    stop_packet_capture
    
    # Clean up temporary files
    rm -f /tmp/http3-0rtt-tshark.pid
    
    print_status "Cleanup completed"
}

# Parse command line arguments
CAPTURE_TRAFFIC=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--capture)
            CAPTURE_TRAFFIC=true
            shift
            ;;
        -i|--interface)
            CAPTURE_INTERFACE="$2"
            shift 2
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            SHOW_HELP=true
            shift
            ;;
    esac
done

if [ "$SHOW_HELP" == "true" ]; then
    echo "HTTP/3 0-RTT Demonstration Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -c, --capture           Capture network traffic with Wireshark/tshark"
    echo "  -i, --interface IFACE   Network interface for packet capture (default: any)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      Run 0-RTT demo without packet capture"
    echo "  $0 -c                   Run demo with packet capture"
    echo "  $0 -c -i eth0           Run demo with capture on specific interface"
    echo ""
    exit 0
fi

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    print_header
    
    check_requirements "$@"
    setup_environment
    compile_example
    
    if [ "$CAPTURE_TRAFFIC" == "true" ]; then
        start_packet_capture
    fi
    
    run_0rtt_example
    
    if [ "$CAPTURE_TRAFFIC" == "true" ]; then
        stop_packet_capture
    fi
    
    analyze_results
    display_wireshark_instructions
    
    echo -e "${GREEN}🎉 HTTP/3 0-RTT demonstration completed!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "📁 Generated files:"
    echo "   • SSL key log: $KEYLOG_FILE"
    if [ -f "$PCAP_FILE" ]; then
        echo "   • Packet capture: $PCAP_FILE"
    fi
    echo ""
    echo "Next steps:"
    echo "   1. Open Wireshark and load the capture file"
    echo "   2. Configure the SSL key log file in TLS preferences"
    echo "   3. Apply QUIC/HTTP3 filters to analyze 0-RTT behavior"
    echo "   4. Compare initial vs subsequent connection timings"
}

# Run main function
main "$@"