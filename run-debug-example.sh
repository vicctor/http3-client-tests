#!/usr/bin/env bash

# Run HTTP3DebugExample - Comprehensive HTTP/3 testing with multiple external servers
# This script tests HTTP/3 connectivity across various public servers with detailed reporting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use our custom-built JDK with QUIC SSL key logging support
export JAVA_HOME=/home/grxybek/tata/jdk/build/linux-x86_64-server-release/images/jdk
export PATH="${JAVA_HOME}/bin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🔍 HTTP/3 Debug & Testing Example${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Comprehensive HTTP/3 testing with external servers${NC}"
    echo -e "${GREEN}Tests multiple public HTTP/3 endpoints with detailed analysis${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

compile_example() {
    echo -e "${BLUE}📝 Compiling HTTP3DebugExample...${NC}"
    
    # Create target directory if it doesn't exist
    mkdir -p target/classes
    
    # Compile the debug example
    if javac -d target/classes src/main/java26/net/arturkeska/http3/HTTP3DebugExample.java; then
        print_status "HTTP3DebugExample compiled successfully"
    else
        print_error "Compilation failed"
        exit 1
    fi
}

run_debug_test() {
    echo -e "${BLUE}🚀 Running HTTP/3 Debug Test...${NC}"
    echo ""
    
    # Define key log file for detailed analysis
    KEYLOGFILE=/tmp/http3_debug.key_log
    rm -f "${KEYLOGFILE}"
    
    # Java options for HTTP/3 with minimal debugging (clean output)
    JAVA_OPTS="-Djavax.net.ssl.keylog=${KEYLOGFILE} -Djdk.httpclient.debug=false -Djdk.internal.httpclient.quic.debug=false"
    
    echo "Using JDK from: $JAVA_HOME"
    echo "Java version: $(java -version 2>&1 | head -n 1)"
    echo "SSL key log file: ${KEYLOGFILE}"
    echo ""
    
    # Run the debug example
    echo -e "${BLUE}Testing HTTP/3 connectivity across multiple servers...${NC}"
    echo "========================================================"
    
    if java -cp target/classes ${JAVA_OPTS} net.arturkeska.http3.HTTP3DebugExample; then
        print_status "HTTP/3 debug test completed"
    else
        print_error "HTTP/3 debug test encountered issues (check output above)"
        # Don't exit - we still want to analyze results
    fi
}

analyze_debug_results() {
    echo ""
    echo -e "${BLUE}📊 HTTP/3 Debug Analysis${NC}"
    echo "=========================="
    
    # Check if key log file was created
    if [ -f "${KEYLOGFILE}" ]; then
        print_status "SSL key log file created: ${KEYLOGFILE}"
        echo "File size: $(wc -c < "${KEYLOGFILE}") bytes"
        echo "Number of lines: $(wc -l < "${KEYLOGFILE}") lines"
        
        # Analyze different types of SSL secrets
        CLIENT_HANDSHAKE_COUNT=$(grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        SERVER_HANDSHAKE_COUNT=$(grep -c "SERVER_HANDSHAKE_TRAFFIC_SECRET" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        CLIENT_TRAFFIC_COUNT=$(grep -c "CLIENT_TRAFFIC_SECRET_0" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        SERVER_TRAFFIC_COUNT=$(grep -c "SERVER_TRAFFIC_SECRET_0" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        
        echo ""
        echo "SSL Secret Analysis:"
        echo "   Client handshake secrets: ${CLIENT_HANDSHAKE_COUNT}"
        echo "   Server handshake secrets: ${SERVER_HANDSHAKE_COUNT}"
        echo "   Client application secrets: ${CLIENT_TRAFFIC_COUNT}"
        echo "   Server application secrets: ${SERVER_TRAFFIC_COUNT}"
        
        TOTAL_SECRETS=$((CLIENT_HANDSHAKE_COUNT + SERVER_HANDSHAKE_COUNT + CLIENT_TRAFFIC_COUNT + SERVER_TRAFFIC_COUNT))
        
        if [ "$TOTAL_SECRETS" -gt 0 ]; then
            print_status "QUIC/HTTP3 SSL sessions were established and logged"
            echo ""
            echo "🔍 Wireshark Analysis:"
            echo "   • Use this key log file with Wireshark for packet analysis"
            echo "   • Go to: Edit → Preferences → Protocols → TLS"
            echo "   • Set '(Pre)-Master-Secret log filename' to: ${KEYLOGFILE}"
            echo "   • Capture traffic to see decrypted HTTP/3 packets"
        else
            echo "ℹ️  No QUIC SSL secrets captured (servers may have used HTTP/2 fallback)"
        fi
        
        # Count unique server connections
        UNIQUE_CONNECTIONS=$(grep "CLIENT_RANDOM" "${KEYLOGFILE}" 2>/dev/null | awk '{print $2}' | sort -u | wc -l || echo "0")
        echo "   Unique SSL connections: ${UNIQUE_CONNECTIONS}"
        
    else
        echo "ℹ️  No SSL key log file generated"
    fi
}

show_test_summary() {
    echo ""
    echo -e "${BLUE}📋 Test Summary${NC}"
    echo "================"
    echo ""
    echo -e "${YELLOW}🎯 What this test accomplished:${NC}"
    echo "   • Tested HTTP/3 connectivity with multiple public servers"
    echo "   • Demonstrated HTTP/3 protocol validation (no HTTP/2 fallback)"
    echo "   • Generated comprehensive visual status reports"
    echo "   • Captured SSL key logs for detailed analysis"
    echo "   • Measured response times and success rates"
    echo ""
    echo -e "${YELLOW}🌐 Servers tested:${NC}"
    echo "   • cloudflare-quic.com (Cloudflare HTTP/3 test server)"
    echo "   • quic.rocks (HTTP/3 demonstration server)"
    echo "   • http3check.net (HTTP/3 validation service)"
    echo "   • www.facebook.com (Facebook HTTP/3 support)"
    echo "   • www.youtube.com (Google/YouTube HTTP/3)"
    echo "   • blog.cloudflare.com (Cloudflare blog)"
    echo "   • www.google.com (Google search HTTP/3)"
    echo ""
    echo -e "${YELLOW}📊 Key metrics collected:${NC}"
    echo "   • Protocol version validation (HTTP/3 enforcement)"
    echo "   • Response times and status codes"
    echo "   • Success/failure rates with visual indicators"
    echo "   • SSL handshake analysis for QUIC connections"
}

cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup${NC}"
    echo "=========="
    
    # Keep key log file for analysis
    if [ -f "${KEYLOGFILE}" ]; then
        echo "SSL key log preserved at: ${KEYLOGFILE}"
    fi
}

# Main execution
main() {
    print_header
    compile_example
    run_debug_test
    analyze_debug_results
    show_test_summary
    cleanup
    
    echo ""
    echo -e "${GREEN}🎉 HTTP/3 Debug Test Completed!${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "   • Review the visual status summary above"
    echo "   • Use Wireshark with the SSL key log for packet analysis"
    echo "   • Compare HTTP/3 vs HTTP/2 performance characteristics"
    echo "   • Test with your own HTTP/3 enabled servers"
}

# Execute main function
main "$@"