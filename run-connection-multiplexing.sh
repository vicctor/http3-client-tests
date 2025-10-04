#!/usr/bin/env bash

# Run HTTP3ConnectionReuseExample - Connection reuse testing with external servers
# This script tests HTTP/3 connection reuse functionality with public servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use our custom-built JDK with QUIC SSL key logging support
export JAVA_HOME=/home/grxybek/tata/jdk/build/linux-x86_64-server-release/images/jdk
export PATH="${JAVA_HOME}/bin:$PATH"

#export JAVA_DEBUG_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=*:5005"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🔄 HTTP/3 Connection Reuse Example${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Testing HTTP/3 connection reuse with external servers${NC}"
    echo -e "${GREEN}Multiple requests to same host to demonstrate connection pooling${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

compile_example() {
    echo -e "${BLUE}📝 Compiling HTTP3ConnectionReuseExample...${NC}"
    
    # Create target directory if it doesn't exist
    mkdir -p target/classes
    
    # Compile the connection reuse example
    if javac -d target/classes src/main/java26/net/arturkeska/http3/HTTP3ConnectionReuseExample.java; then
        print_status "HTTP3ConnectionReuseExample compiled successfully"
    else
        print_error "Compilation failed"
        exit 1
    fi
}

run_connection_reuse_test() {
    echo -e "${BLUE}🚀 Running HTTP/3 Connection Reuse Test...${NC}"
    echo ""
    
    # Define key log file for connection analysis
    KEYLOGFILE=${SCRIPT_DIR}/wireshark-samples/ssl.key_log

    # Java options for HTTP/3 with SSL key logging
    JAVA_OPTS="-Djavax.net.ssl.keylog=${KEYLOGFILE} -Djdk.httpclient.debug=false -Djdk.internal.httpclient.quic.debug=false"
    
    echo "Using JDK from: $JAVA_HOME"
    echo "Java version: $(java -version 2>&1 | head -n 1)"
    echo "SSL key log file: ${KEYLOGFILE}"
    echo ""
    
    # Run the connection reuse example
    echo -e "${BLUE}Running connection reuse tests...${NC}"
    echo "=================================================="
    
    if java -cp target/classes ${JAVA_OPTS} ${JAVA_DEBUG_OPTS} net.arturkeska.http3.HTTP3ConnectionReuseExample; then
        print_status "Connection reuse test completed successfully"
    else
        print_error "Connection reuse test failed"
        exit 1
    fi
}


cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup${NC}"
    echo "=========="
    
    # Keep key log file for analysis
    if [ -f "${KEYLOGFILE}" ]; then
        echo "SSL key log preserved at: ${KEYLOGFILE}"
        echo "Use with Wireshark for detailed connection analysis"
    fi
}

# Main execution
main() {
    print_header
    compile_example
    run_connection_reuse_test
    cleanup
    
    echo ""
    echo -e "${GREEN}🎉 HTTP/3 Connection Reuse Test Completed!${NC}"
    echo ""
    echo -e "${YELLOW}📋 What this test demonstrated:${NC}"
    echo "   • HTTP/3 connection establishment with external servers"
    echo "   • Connection reuse across multiple requests to same host"
    echo "   • HTTP/3 multiplexing capabilities"
    echo "   • SSL session key logging for connection analysis"
    echo ""
    echo -e "${YELLOW}💡 Key Benefits of HTTP/3 Connection Reuse:${NC}"
    echo "   • Reduced latency for subsequent requests"
    echo "   • Lower CPU overhead (fewer handshakes)"
    echo "   • Better resource utilization"
    echo "   • Improved performance for multi-request scenarios"
}

# Execute main function
main "$@"