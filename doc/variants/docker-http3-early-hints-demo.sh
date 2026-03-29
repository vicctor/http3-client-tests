#!/bin/bash

# HTTP/3 Early Hints Docker Demo Script
# This script builds and runs the Docker container with HTTP/3 Early Hints support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 HTTP/3 Early Hints Docker Demo${NC}"
echo -e "${CYAN}================================${NC}"
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Navigate to docker directory
cd "$(dirname "$0")/docker" || {
    echo -e "${RED}❌ Could not find docker directory${NC}"
    exit 1
}

echo -e "${YELLOW}📦 Building HTTP/3 Early Hints Docker image...${NC}"
docker build -t http3-early-hints . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo

# Stop any existing container
echo -e "${YELLOW}🧹 Cleaning up any existing containers...${NC}"
docker stop http3-early-hints-demo 2>/dev/null || true
docker rm http3-early-hints-demo 2>/dev/null || true

echo -e "${YELLOW}🚀 Starting HTTP/3 Early Hints container...${NC}"
docker run -d \
    --name http3-early-hints-demo \
    -p 8080:80 \
    -p 8443:443/tcp \
    -p 8443:443/udp \
    http3-early-hints || {
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
}

echo -e "${GREEN}✅ Container started successfully${NC}"
echo

# Wait a moment for the server to start
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
sleep 3

# Test server availability
echo -e "${YELLOW}🔍 Testing server availability...${NC}"
if curl -k --connect-timeout 5 --max-time 10 https://localhost:8443/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Server might still be starting...${NC}"
fi

echo
echo -e "${CYAN}📡 HTTP/3 Early Hints Demo Server is running!${NC}"
echo -e "${CYAN}=============================================${NC}"
echo
echo -e "${GREEN}🌐 Access the demo:${NC}"
echo -e "   Browser: ${BLUE}https://localhost:8443/${NC}"
echo -e "   (Accept the self-signed certificate warning)"
echo
echo -e "${GREEN}🧪 Test commands:${NC}"
echo -e "${YELLOW}HTTP/2 with Early Hints simulation:${NC}"
echo -e "   curl -I --http2 --insecure https://localhost:8443/"
echo
echo -e "${YELLOW}HTTP/3 attempt (if supported):${NC}"
echo -e "   curl -I --http3-only --insecure https://localhost:8443/"
echo
echo -e "${YELLOW}Test specific endpoints:${NC}"
echo -e "   curl --http2 --insecure https://localhost:8443/api/critical-data"
echo -e "   curl --http2 --insecure https://localhost:8443/status"
echo -e "   curl --http2 --insecure https://localhost:8443/health"
echo
echo -e "${GREEN}📊 Check headers for Early Hints features:${NC}"
echo -e "   curl -I --http2 --insecure https://localhost:8443/ | grep -i 'link\\|alt-svc\\|x-'"
echo
echo -e "${GREEN}🔍 View container logs:${NC}"
echo -e "   docker logs -f http3-early-hints-demo"
echo
echo -e "${GREEN}🛑 Stop the demo:${NC}"
echo -e "   docker stop http3-early-hints-demo"
echo -e "   docker rm http3-early-hints-demo"
echo
echo -e "${CYAN}💡 Early Hints Features Demonstrated:${NC}"
echo -e "   ✨ Link headers for resource preloading"
echo -e "   📡 Alt-Svc headers advertising HTTP/3"
echo -e "   🚀 HTTP/3 (QUIC) protocol support"
echo -e "   ⚡ Performance optimization simulation"
echo -e "   🔧 Browser compatibility testing"
echo
echo -e "${BLUE}📖 Technical Details:${NC}"
echo -e "   • Early Hints simulated via Link headers (nginx limitation)"
echo -e "   • True 103 Early Hints require application-level implementation"
echo -e "   • HTTP/3 advertised via Alt-Svc for browser upgrade"
echo -e "   • Static resources preloaded: CSS, JS, API data"
echo -e "   • Modern browsers will attempt HTTP/3 on subsequent requests"
echo

# Show initial container logs
echo -e "${YELLOW}📋 Initial container logs:${NC}"
echo -e "${CYAN}=========================${NC}"
docker logs http3-early-hints-demo 2>/dev/null | tail -10 || echo "Container starting..."
echo