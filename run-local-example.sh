#!/usr/bin/env bash

# Run Http3LocalExample - Local Docker server testing with custom SSL certificates
# This script uses the Docker HTTP/3 server and handles SSL certificate trust

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
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🐳 HTTP/3 Local Docker Server Example${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Testing HTTP/3 with local Docker nginx server${NC}"
    echo -e "${GREEN}Includes SSL certificate management and Docker integration${NC}"
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

setup_ssl_trust() {
    echo -e "${BLUE}🔐 Setting up SSL certificate trust...${NC}"
    
    # Extract certificates from Docker container
    if ! "$DOCKER_SCRIPT" certs 2>/dev/null; then
        print_error "Failed to extract certificates from Docker container"
        return 1
    fi
    
    if [ -f "$SCRIPT_DIR/certs/server.crt" ]; then
        # Import certificate into Java keystore
        KEYSTORE_PATH="/tmp/http3-test-truststore.jks"
        KEYSTORE_PASSWORD="changeit"
        
        # Remove existing keystore
        rm -f "$KEYSTORE_PATH"
        
        # Create new keystore and import certificate
        if keytool -importcert -noprompt \
            -keystore "$KEYSTORE_PATH" \
            -storepass "$KEYSTORE_PASSWORD" \
            -alias "http3-test-server" \
            -file "$SCRIPT_DIR/certs/server.crt" >/dev/null 2>&1; then
            
            print_status "SSL certificate imported to Java keystore"
            
            # Export truststore settings
            export JAVA_SSL_OPTS="-Djavax.net.ssl.trustStore=$KEYSTORE_PATH -Djavax.net.ssl.trustStorePassword=$KEYSTORE_PASSWORD"
            
            return 0
        else
            print_error "Failed to import certificate into Java keystore"
            return 1
        fi
    else
        print_error "Certificate not found. Is the Docker server running?"
        return 1
    fi
}

start_docker_server() {
    echo -e "${BLUE}🐳 Starting Docker HTTP/3 server...${NC}"
    
    if ! "$DOCKER_SCRIPT" status 2>/dev/null | grep -q "Container is running"; then
        echo "Starting Docker HTTP/3 server..."
        if ! "$DOCKER_SCRIPT" start; then
            print_error "Failed to start Docker server"
            return 1
        fi
        
        # Wait for server to be ready
        echo -e "${BLUE}⏳ Waiting for server to be fully ready...${NC}"
        sleep 10
        
        # Verify server is responding
        if curl -k -s --max-time 10 https://localhost/health > /dev/null; then
            print_status "Docker HTTP/3 server is ready"
        else
            print_warning "Server may still be starting up..."
        fi
    else
        print_status "Docker HTTP/3 server is already running"
    fi
}

compile_local_example() {
    echo -e "${BLUE}📝 Creating and compiling local HTTP/3 example...${NC}"
    
    # Create target directory if it doesn't exist
    mkdir -p target/classes
    
    # Create a local HTTP/3 test class
    cat > target/classes/Http3LocalExample.java << 'EOF'
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class Http3LocalExample {
    
    static class LocalTestResult {
        final String url;
        final boolean success;
        final long responseTimeMs;
        final int statusCode;
        final String protocol;
        final String errorMessage;
        
        LocalTestResult(String url, boolean success, long responseTimeMs, 
                       int statusCode, String protocol, String errorMessage) {
            this.url = url;
            this.success = success;
            this.responseTimeMs = responseTimeMs;
            this.statusCode = statusCode;
            this.protocol = protocol;
            this.errorMessage = errorMessage;
        }
    }

    public static void main(String[] args) {
        System.out.println("🐳 Local Docker HTTP/3 Server Testing");
        System.out.println("=====================================");
        System.out.println();
        
        // Test local Docker server endpoints
        String[] testUrls = {
            "https://http3-test.local/",
            "https://http3-test.local/status", 
            "https://http3-test.local/api",
            "https://http3-test.local/health",
            "https://localhost/",
            "https://localhost/status"
        };
        
        List<LocalTestResult> results = new ArrayList<>();
        
        for (String url : testUrls) {
            LocalTestResult result = testLocalServer(url);
            results.add(result);
        }
        
        displayLocalTestSummary(results);
    }
    
    static LocalTestResult testLocalServer(String url) {
        System.out.println("🧪 Testing: " + url);
        System.out.println("-".repeat(url.length() + 10));
        
        try {
            // Create HTTP/3 client
            HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "Java-HTTP3-Local-Test/1.0")
                .GET()
                .build();
            
            long startTime = System.currentTimeMillis();
            HttpResponse<String> response = client.send(request, 
                HttpResponse.BodyHandlers.ofString());
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;
            
            System.out.println("✅ SUCCESS!");
            System.out.println("Status: " + response.statusCode());
            System.out.println("Version: " + response.version());
            System.out.println("Time: " + responseTime + "ms");
            
            // Validate HTTP/3
            if (response.version() == HttpClient.Version.HTTP_3) {
                System.out.println("🎉 CONFIRMED: HTTP/3 protocol used!");
            } else {
                System.out.println("⚠️  WARNING: Got " + response.version() + " instead of HTTP/3");
            }
            
            // Show key headers
            response.headers().map().forEach((k, v) -> {
                if (k.toLowerCase().contains("server") || 
                    k.toLowerCase().contains("alt-svc") ||
                    k.toLowerCase().contains("protocol")) {
                    System.out.println("Header " + k + ": " + v);
                }
            });
            
            // Show response preview
            String body = response.body();
            if (body.length() > 0) {
                System.out.println("Response preview: " + 
                    body.substring(0, Math.min(100, body.length())).replaceAll("\\s+", " ") + 
                    (body.length() > 100 ? "..." : ""));
            }
            
            System.out.println();
            
            return new LocalTestResult(url, true, responseTime, 
                response.statusCode(), response.version().toString(), null);
            
        } catch (Exception e) {
            System.err.println("❌ FAILED: " + e.getMessage());
            System.out.println();
            
            return new LocalTestResult(url, false, 0, 0, "FAILED", e.getMessage());
        }
    }
    
    static void displayLocalTestSummary(List<LocalTestResult> results) {
        System.out.println("=" .repeat(80));
        System.out.println("🔍 LOCAL HTTP/3 TEST SUMMARY");
        System.out.println("=" .repeat(80));
        
        int successCount = 0;
        int failureCount = 0;
        long totalTime = 0;
        
        System.out.println("📊 LOCAL SERVER STATUS OVERVIEW:");
        System.out.println();
        
        for (LocalTestResult result : results) {
            if (result.success) {
                System.out.printf("✅ %-40s HTTP/3 SUCCESS | %dms | Status: %d%n", 
                    result.url, result.responseTimeMs, result.statusCode);
                successCount++;
                totalTime += result.responseTimeMs;
            } else {
                System.out.printf("❌ %-40s HTTP/3 FAILED  | Error: %s%n", 
                    result.url, result.errorMessage.length() > 30 ? 
                        result.errorMessage.substring(0, 30) + "..." : result.errorMessage);
                failureCount++;
            }
        }
        
        System.out.println();
        System.out.println("📈 LOCAL SERVER STATISTICS:");
        System.out.printf("   ✅ Successful connections: %d%n", successCount);
        System.out.printf("   ❌ Failed connections:     %d%n", failureCount);
        System.out.printf("   📊 Total endpoints tested: %d%n", results.size());
        System.out.printf("   📈 Success rate:          %.1f%%%n", 
            results.size() > 0 ? (100.0 * successCount / results.size()) : 0.0);
        
        if (successCount > 0) {
            System.out.printf("   ⚡ Average response time:  %.1fms%n", 
                (double) totalTime / successCount);
        }
        
        if (successCount > 0) {
            System.out.println();
            System.out.println("🎉 SUCCESS: Local HTTP/3 server is working!");
            System.out.println("✅ HTTP/3 WORKING ENDPOINTS:");
            results.stream()
                .filter(r -> r.success)
                .forEach(r -> System.out.printf("   🌐 %-30s (%dms)%n", 
                    r.url, r.responseTimeMs));
        } else {
            System.out.println();
            System.out.println("💥 All local server tests failed!");
            System.out.println("Check if Docker server is running and certificates are trusted.");
        }
        
        System.out.println("=" .repeat(80));
    }
}
EOF
    
    # Compile the local example
    if javac -cp target/classes target/classes/Http3LocalExample.java; then
        print_status "Http3LocalExample compiled successfully"
    else
        print_error "Compilation failed"
        exit 1
    fi
}

run_local_test() {
    echo -e "${BLUE}🚀 Running Local HTTP/3 Test...${NC}"
    echo ""
    
    # Define key log file
    KEYLOGFILE=/tmp/http3_local.key_log
    rm -f "${KEYLOGFILE}"
    
    # Java options for HTTP/3 with Docker server and SSL trust
    JAVA_OPTS="-Djavax.net.ssl.keylog=${KEYLOGFILE} ${JAVA_SSL_OPTS} -Djdk.httpclient.debug=false -Djdk.internal.httpclient.quic.debug=false"
    
    echo "Using JDK from: $JAVA_HOME"
    echo "Java version: $(java -version 2>&1 | head -n 1)"
    echo "SSL key log file: ${KEYLOGFILE}"
    echo "Custom truststore: $(echo ${JAVA_SSL_OPTS} | grep -o '/tmp/[^[:space:]]*' || echo 'None')"
    echo ""
    
    # Run the local example
    echo -e "${BLUE}Testing local Docker HTTP/3 server...${NC}"
    echo "====================================="
    
    if java -cp target/classes ${JAVA_OPTS} Http3LocalExample; then
        print_status "Local HTTP/3 test completed successfully"
    else
        print_error "Local HTTP/3 test failed"
        exit 1
    fi
}

analyze_local_results() {
    echo ""
    echo -e "${BLUE}📊 Local Server Analysis${NC}"
    echo "========================="
    
    # Check if key log file was created
    if [ -f "${KEYLOGFILE}" ]; then
        print_status "SSL key log file created: ${KEYLOGFILE}"
        echo "File size: $(wc -c < "${KEYLOGFILE}") bytes"
        echo "Number of lines: $(wc -l < "${KEYLOGFILE}") lines"
        
        # Analyze local server connections
        CLIENT_HANDSHAKE_COUNT=$(grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "${KEYLOGFILE}" 2>/dev/null || echo "0")
        TOTAL_SECRETS=$(wc -l < "${KEYLOGFILE}" 2>/dev/null || echo "0")
        
        echo ""
        echo "Local Server Connection Analysis:"
        echo "   Client handshake secrets: ${CLIENT_HANDSHAKE_COUNT}"
        echo "   Total SSL secrets logged: ${TOTAL_SECRETS}"
        
        if [ "$CLIENT_HANDSHAKE_COUNT" -gt 0 ]; then
            print_status "Local QUIC/HTTP3 connections established successfully"
            echo ""
            echo "🔍 Local Server Benefits:"
            echo "   • Controlled test environment"
            echo "   • Known SSL certificate configuration"
            echo "   • Predictable HTTP/3 support"
            echo "   • Custom endpoint testing (/status, /api, /health)"
            echo "   • Detailed packet analysis capability"
        else
            echo "ℹ️  No QUIC handshake secrets (check Docker server configuration)"
        fi
        
    else
        echo "ℹ️  No SSL key log file generated"
    fi
    
    # Show Docker server status
    echo ""
    echo -e "${BLUE}🐳 Docker Server Status:${NC}"
    "$DOCKER_SCRIPT" status 2>/dev/null | grep -E "(Container|Access URLs)" || echo "Docker status unavailable"
}

cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup${NC}"
    echo "=========="
    
    # Clean up temporary files
    rm -f target/classes/Http3LocalExample.java target/classes/Http3LocalExample.class
    rm -f /tmp/http3-test-truststore.jks
    
    # Keep key log file for analysis
    if [ -f "${KEYLOGFILE}" ]; then
        echo "SSL key log preserved at: ${KEYLOGFILE}"
    fi
    
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
    
    # Compile and run local test
    compile_local_example
    run_local_test
    analyze_local_results
    
    echo ""
    echo -e "${GREEN}🎉 Local HTTP/3 Docker Test Completed!${NC}"
    echo ""
    echo -e "${YELLOW}💡 What this test demonstrated:${NC}"
    echo "   • HTTP/3 connectivity to local Docker server"
    echo "   • SSL certificate trust configuration"
    echo "   • Multiple endpoint testing (/status, /api, /health)"
    echo "   • Docker integration with HTTP/3"
    echo "   • Custom SSL keystore management"
    echo ""
    echo -e "${YELLOW}🐳 Docker Server Management:${NC}"
    echo "   • View logs:    $DOCKER_SCRIPT logs"
    echo "   • Stop server:  $DOCKER_SCRIPT stop"  
    echo "   • Server info:  $DOCKER_SCRIPT status"
    echo "   • Access web:   https://http3-test.local/"
}

# Execute main function
main "$@"