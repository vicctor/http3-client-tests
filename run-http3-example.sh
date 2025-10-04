#!/usr/bin/env bash

# Run HTTP/3 example with Docker test server
# This script starts the Docker HTTP/3 server and runs the Java client tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_SCRIPT="$SCRIPT_DIR/docker-http3-server.sh"

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
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}🚀 HTTP/3 Client Test with Docker Server${NC}"
    echo -e "${BLUE}========================================${NC}"
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

setup_ssl_trust() {
    echo -e "${BLUE}🔐 Setting up SSL certificate trust...${NC}"
    
    # Extract certificates from Docker container
    "$DOCKER_SCRIPT" certs
    
    if [ -f "$SCRIPT_DIR/certs/server.crt" ]; then
        # Import certificate into Java keystore
        KEYSTORE_PATH="/tmp/http3-test-truststore.jks"
        KEYSTORE_PASSWORD="changeit"
        
        # Remove existing keystore
        rm -f "$KEYSTORE_PATH"
        
        # Create new keystore and import certificate
        keytool -importcert -noprompt \
            -keystore "$KEYSTORE_PATH" \
            -storepass "$KEYSTORE_PASSWORD" \
            -alias "http3-test-server" \
            -file "$SCRIPT_DIR/certs/server.crt"
        
        print_status "SSL certificate imported to Java keystore"
        
        # Export truststore settings
        export JAVA_SSL_OPTS="-Djavax.net.ssl.trustStore=$KEYSTORE_PATH -Djavax.net.ssl.trustStorePassword=$KEYSTORE_PASSWORD"
        
        return 0
    else
        print_error "Certificate not found. Is the Docker server running?"
        return 1
    fi
}

start_docker_server() {
    echo -e "${BLUE}🐳 Starting Docker HTTP/3 server...${NC}"
    
    if ! "$DOCKER_SCRIPT" status 2>/dev/null | grep -q "Container is running"; then
        "$DOCKER_SCRIPT" start
        
        # Wait for server to be ready
        echo -e "${BLUE}⏳ Waiting for server to be fully ready...${NC}"
        sleep 10
        
        # Verify server is responding
        if curl -k -s --max-time 10 https://localhost/health > /dev/null; then
            print_status "Docker HTTP/3 server is ready"
        else
            print_error "Docker server is not responding"
            return 1
        fi
    else
        print_status "Docker HTTP/3 server is already running"
    fi
}

run_java_tests() {
    echo -e "${BLUE}☕ Running Java HTTP/3 client tests...${NC}"
    
    # Define key log file
    KEYLOGFILE=${SCRIPT_DIR}/wireshark-samples/http-esmaple.key_log
    
    # Clean up any existing key log file
    rm -f "${KEYLOGFILE}"
    
    echo "Key log file will be written to: ${KEYLOGFILE}"
    echo "Initial key log file status:"
    ls -la "${KEYLOGFILE}" 2>/dev/null || echo "Key log file does not exist yet (expected)"
    echo
    
    # Java options for HTTP/3 with Docker server
    JAVA_OPTS="-Djavax.net.ssl.keylog=${KEYLOGFILE} -Djdk.httpclient.debug=false -Djdk.internal.httpclient.quic.debug=false ${JAVA_SSL_OPTS}"
    
    echo "Using JDK from: $JAVA_HOME"
    echo "Java version: $(java -version 2>&1 | head -n 1)"
    echo "Java options: ${JAVA_OPTS}"
    echo
    
    # Create target directory if it doesn't exist
    mkdir -p target/classes
    
    # Compile the examples
    echo "Compiling HTTP/3 examples from Java 26 sources..."
    javac -d target/classes src/main/java26/net/arturkeska/http3/HTTP3DebugExample.java
    echo "Compilation completed."
    echo
    
    # Modify the HTTP3DebugExample to include our Docker server
    echo "Adding Docker server to test list..."
    

    # Compile enhanced test
    javac -cp src/main/java26 net/arturkeska/http3/EnhancedHTTP3Test.java
    
    # Run the enhanced HTTP/3 test
    echo "Running Enhanced HTTP/3 test with Docker server..."
    echo "================================================="
    java -cp target/classes ${JAVA_OPTS} EnhancedHTTP3Test
}

analyze_results() {
    echo
    echo "📊 ANALYZING SSL KEY LOG RESULTS"
    echo "================================"
    
    # Check if key log file was created and show its contents
    if [ -f "${KEYLOGFILE}" ]; then
        echo "✅ SSL key log file was created successfully!"
        echo "File size: $(wc -c < "${KEYLOGFILE}") bytes"
        echo "Number of lines: $(wc -l < "${KEYLOGFILE}") lines"
        echo
        
        # Count different types of secrets
        CLIENT_HANDSHAKE_COUNT=$(grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        SERVER_HANDSHAKE_COUNT=$(grep -c "SERVER_HANDSHAKE_TRAFFIC_SECRET" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        CLIENT_TRAFFIC_COUNT=$(grep -c "CLIENT_TRAFFIC_SECRET_0" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        SERVER_TRAFFIC_COUNT=$(grep -c "SERVER_TRAFFIC_SECRET_0" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        
        echo "SSL Key Log Analysis:"
        echo "   Client handshake secrets: ${CLIENT_HANDSHAKE_COUNT}"
        echo "   Server handshake secrets: ${SERVER_HANDSHAKE_COUNT}"
        echo "   Client application secrets: ${CLIENT_TRAFFIC_COUNT}"
        echo "   Server application secrets: ${SERVER_TRAFFIC_COUNT}"
        
        if [ $((CLIENT_HANDSHAKE_COUNT + SERVER_HANDSHAKE_COUNT + CLIENT_TRAFFIC_COUNT + SERVER_TRAFFIC_COUNT)) -gt 0 ]; then
            echo "✅ SUCCESS: QUIC SSL session keys were logged successfully!"
        else
            echo "⚠️  WARNING: Key log file exists but contains no recognizable secrets"
        fi
    else
        echo "❌ No SSL key log file was created"
    fi
    
    echo
    echo "🐳 Docker Server Status:"
    "$DOCKER_SCRIPT" status 2>/dev/null | grep -E "(Container|Access URLs|Test Endpoints)" || echo "Docker server status unavailable"
}

cleanup() {
    echo
    echo "🧹 CLEANUP"
    echo "=========="
    
    # Clean up temporary files
    rm -f target/classes/EnhancedHTTP3Test.java target/classes/EnhancedHTTP3Test.class
    rm -f /tmp/http3-test-truststore.jks
    
    print_status "Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    print_header
    
    # Start Docker server
    start_docker_server || exit 1
    
    # Setup SSL trust
    setup_ssl_trust || exit 1
    
    # Run Java tests
    run_java_tests
    
    # Analyze results
    analyze_results
    
    echo
    echo "🎉 HTTP/3 Docker test completed!"
    echo "================================="
    echo
    echo "💡 The Docker HTTP/3 server is still running."
    echo "   Access it at: https://http3-test.local/"
    echo "   Stop it with: $DOCKER_SCRIPT stop"
    echo "   View status:  $DOCKER_SCRIPT status"
}

# Run main function
main "$@"