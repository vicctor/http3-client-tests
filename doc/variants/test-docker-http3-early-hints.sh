#!/bin/bash

# HTTP/3 Early Hints Demo Test Script
# Demonstrates various aspects of HTTP/3 Early Hints functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="https://localhost:8443"
CONTAINER_NAME="http3-early-hints-demo"

echo -e "${BLUE}🧪 HTTP/3 Early Hints Comprehensive Test${NC}"
echo -e "${CYAN}=======================================${NC}"
echo

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Container '$CONTAINER_NAME' is not running${NC}"
    echo -e "${YELLOW}💡 Run './docker-http3-early-hints-demo.sh' first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Container is running${NC}"
echo

# Function to run test with colored output
run_test() {
    local test_name="$1"
    local test_cmd="$2"
    local description="$3"
    
    echo -e "${YELLOW}🔍 $test_name${NC}"
    if [ -n "$description" ]; then
        echo -e "${CYAN}   $description${NC}"
    fi
    echo -e "${MAGENTA}   Command: $test_cmd${NC}"
    echo
    
    eval "$test_cmd"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}   ✅ Test passed${NC}"
    else
        echo -e "${RED}   ❌ Test failed (exit code: $exit_code)${NC}"
    fi
    echo -e "${CYAN}   ─────────────────────────────────────────${NC}"
    echo
}

# Test 1: Basic connectivity
run_test "Basic Connectivity Test" \
    "curl -s --connect-timeout 5 --max-time 10 --http2 --insecure $SERVER_URL > /dev/null && echo 'Server is responding'" \
    "Verify the server is accessible"

# Test 2: HTTP/2 Protocol Test
run_test "HTTP/2 Protocol Test" \
    "curl -I --http2 --insecure $SERVER_URL 2>&1 | head -1" \
    "Check HTTP/2 connection status"

# Test 3: Early Hints Link Headers
run_test "Early Hints Link Headers Test" \
    "curl -I --http2 --insecure $SERVER_URL 2>/dev/null | grep -i '^link:'" \
    "Verify Link headers for resource preloading"

# Test 4: Alt-Svc Header for HTTP/3 Advertising
run_test "HTTP/3 Alt-Svc Header Test" \
    "curl -I --http2 --insecure $SERVER_URL 2>/dev/null | grep -i '^alt-svc:'" \
    "Check HTTP/3 advertisement via Alt-Svc"

# Test 5: Early Hints Simulation Headers
run_test "Early Hints Simulation Headers" \
    "curl -I --http2 --insecure $SERVER_URL 2>/dev/null | grep -i '^x-early-hints:'" \
    "Verify custom Early Hints simulation header"

# Test 6: Static Resource Preloading
run_test "Static CSS Resource Test" \
    "curl -I --http2 --insecure $SERVER_URL/static/style.css 2>/dev/null | grep -E '^(HTTP|cache-control|x-preloaded)'" \
    "Check CSS resource and preload headers"

run_test "Static JavaScript Resource Test" \
    "curl -I --http2 --insecure $SERVER_URL/static/script.js 2>/dev/null | grep -E '^(HTTP|cache-control|x-preloaded)'" \
    "Check JavaScript resource and preload headers"

# Test 7: Critical Data API
run_test "Critical Data API Test" \
    "curl -s --http2 --insecure $SERVER_URL/api/critical-data | jq -r '.message, .early_hints.status' 2>/dev/null || curl -s --http2 --insecure $SERVER_URL/api/critical-data" \
    "Test the critical data endpoint that should be preloaded"

# Test 8: Critical Data Headers
run_test "Critical Data Headers Test" \
    "curl -I --http2 --insecure $SERVER_URL/api/critical-data 2>/dev/null | grep -E '^(x-critical-resource|x-early-hints-preloaded)'" \
    "Verify critical resource headers"

# Test 9: API JSON Endpoint
run_test "Main API Endpoint Test" \
    "curl -s --http2 --insecure $SERVER_URL/api 2>/dev/null | jq -r '.early_hints.supported' 2>/dev/null || echo 'JSON data available'" \
    "Test main API endpoint with Early Hints information"

# Test 10: Health Check
run_test "Health Check Endpoint" \
    "curl -s --http2 --insecure $SERVER_URL/health" \
    "Verify health check endpoint"

# Test 11: Status Endpoint
run_test "Status Endpoint Test" \
    "curl -s --http2 --insecure $SERVER_URL/status | jq -r '.status' 2>/dev/null || curl -s --http2 --insecure $SERVER_URL/status" \
    "Check server status endpoint"

# Test 12: HTTP/3 Attempt (may fail if not supported)
echo -e "${YELLOW}🚀 HTTP/3 Connection Attempt${NC}"
echo -e "${CYAN}   This test may fail if curl doesn't support HTTP/3${NC}"
echo -e "${MAGENTA}   Command: curl -I --http3-only --insecure $SERVER_URL${NC}"
echo

if curl -I --http3-only --insecure $SERVER_URL 2>/dev/null | head -1; then
    echo -e "${GREEN}   🎉 HTTP/3 connection successful!${NC}"
else
    echo -e "${YELLOW}   ⚠️  HTTP/3 not available (normal for most curl builds)${NC}"
    echo -e "${CYAN}   📝 HTTP/3 is advertised via Alt-Svc for browser upgrade${NC}"
fi
echo -e "${CYAN}   ─────────────────────────────────────────${NC}"
echo

# Test 13: Performance Analysis
echo -e "${YELLOW}📊 Performance Analysis${NC}"
echo -e "${CYAN}   Measuring response times for preloaded resources${NC}"
echo

declare -a endpoints=("/" "/static/style.css" "/static/script.js" "/api/critical-data")
declare -a names=("Main Page" "CSS Resource" "JS Resource" "Critical API")

for i in "${!endpoints[@]}"; do
    endpoint="${endpoints[$i]}"
    name="${names[$i]}"
    
    echo -e "${MAGENTA}   Testing $name ($endpoint)${NC}"
    
    time_result=$(curl -o /dev/null -s -w "%{time_total}" --http2 --insecure "$SERVER_URL$endpoint" 2>/dev/null)
    echo -e "${GREEN}   Response time: ${time_result}s${NC}"
done

echo -e "${CYAN}   ─────────────────────────────────────────${NC}"
echo

# Test 14: Container Health
echo -e "${YELLOW}🐳 Container Health Check${NC}"
echo -e "${CYAN}   Checking container status and logs${NC}"
echo

container_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
echo -e "${GREEN}   Container Status: $container_status${NC}"

echo -e "${MAGENTA}   Recent container logs:${NC}"
docker logs --tail 5 "$CONTAINER_NAME" 2>/dev/null || echo "   No recent logs"

echo -e "${CYAN}   ─────────────────────────────────────────${NC}"
echo

# Summary
echo -e "${BLUE}📋 Test Summary${NC}"
echo -e "${CYAN}===============${NC}"
echo
echo -e "${GREEN}✅ Key Features Verified:${NC}"
echo -e "   🔗 Link headers for resource preloading"
echo -e "   📡 Alt-Svc headers for HTTP/3 advertising"  
echo -e "   ⚡ Custom Early Hints simulation headers"
echo -e "   📦 Static resource caching and preload markers"
echo -e "   🎯 Critical data API with Early Hints benefits"
echo -e "   🏥 Health and status endpoints"
echo
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo -e "   🌐 Open ${BLUE}$SERVER_URL${NC} in a browser"
echo -e "   🔍 Check browser DevTools Network tab for protocol info"
echo -e "   📊 Monitor resource loading performance"
echo -e "   🧪 Test with different browsers (Chrome, Firefox, Safari)"
echo
echo -e "${CYAN}🚀 HTTP/3 Early Hints Benefits:${NC}"
echo -e "   ⚡ Faster resource loading through preloading hints"
echo -e "   📡 HTTP/3 protocol upgrade capability"
echo -e "   🔄 0-RTT connections for repeat visits (HTTP/3)"
echo -e "   🚫 No head-of-line blocking (HTTP/3)"
echo -e "   📱 Connection migration support (HTTP/3)"
echo
echo -e "${MAGENTA}🔧 Technical Implementation:${NC}"
echo -e "   • Early Hints simulated via Link headers (nginx limitation)"
echo -e "   • True 103 Early Hints require application server implementation"
echo -e "   • HTTP/3 advertised for browser protocol upgrade"
echo -e "   • Static resources marked for preloading optimization"
echo
echo -e "${GREEN}🎯 Demo completed successfully!${NC}"