#!/usr/bin/env bash

# HTTP/3 Docker Test Server Management Script
# This script manages the HTTP/3 nginx docker container for testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/docker"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
CONTAINER_NAME="http3-test-server"
HOST_ENTRY="127.0.0.1 http3-test.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}🚀 HTTP/3 Docker Test Server${NC}"
    echo -e "${BLUE}================================${NC}"
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

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
}

setup_hosts() {
    if ! grep -q "http3-test.local" /etc/hosts; then
        print_warning "Adding http3-test.local to /etc/hosts (requires sudo)"
        echo "$HOST_ENTRY" | sudo tee -a /etc/hosts > /dev/null
        print_status "Added http3-test.local to /etc/hosts"
    else
        print_status "http3-test.local already in /etc/hosts"
    fi
}

build_container() {
    echo -e "${BLUE}🔨 Building HTTP/3 nginx container...${NC}"
    cd "$SCRIPT_DIR"
    
    if docker compose version &> /dev/null; then
        docker compose build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    print_status "Container built successfully"
}

start_server() {
    echo -e "${BLUE}🚀 Starting HTTP/3 test server...${NC}"
    cd "$SCRIPT_DIR"
    
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    
    # Wait for container to be ready
    echo -e "${BLUE}⏳ Waiting for server to be ready...${NC}"
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q "$CONTAINER_NAME"; then
        print_status "HTTP/3 server is running!"
        show_status
    else
        print_error "Failed to start HTTP/3 server"
        show_logs
        exit 1
    fi
}

stop_server() {
    echo -e "${BLUE}🛑 Stopping HTTP/3 test server...${NC}"
    cd "$SCRIPT_DIR"
    
    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi
    
    print_status "HTTP/3 server stopped"
}

show_status() {
    echo ""
    echo -e "${BLUE}📊 SERVER STATUS${NC}"
    echo -e "${BLUE}=================${NC}"
    
    if docker ps | grep -q "$CONTAINER_NAME"; then
        print_status "Container is running"
        
        # Get container IP
        CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_NAME" 2>/dev/null || echo "N/A")
        
        echo -e "${BLUE}🌐 Access URLs:${NC}"
        echo "   • https://http3-test.local/ (HTTP/3 enabled)"
        echo "   • https://localhost/ (HTTP/3 enabled)"  
        echo "   • http://localhost/ (redirects to HTTPS)"
        echo ""
        echo -e "${BLUE}🧪 Test Endpoints:${NC}"
        echo "   • https://http3-test.local/status"
        echo "   • https://http3-test.local/api"
        echo "   • https://http3-test.local/health"
        echo ""
        echo -e "${BLUE}🔍 Container Details:${NC}"
        echo "   • Name: $CONTAINER_NAME"
        echo "   • IP: $CONTAINER_IP"
        echo "   • Ports: 80:80, 443:443/tcp, 443:443/udp"
        
        # Test connectivity
        echo ""
        echo -e "${BLUE}🔍 Testing connectivity...${NC}"
        if curl -k -s --max-time 5 https://localhost/health > /dev/null; then
            print_status "HTTPS health check passed"
        else
            print_warning "HTTPS health check failed"
        fi
        
    else
        print_error "Container is not running"
    fi
}

show_logs() {
    echo -e "${BLUE}📋 Container logs (last 50 lines):${NC}"
    docker logs --tail=50 "$CONTAINER_NAME" 2>/dev/null || print_error "Container not found"
}

extract_certificates() {
    echo -e "${BLUE}🔐 Extracting SSL certificates for Java client...${NC}"
    
    # Create local certs directory
    mkdir -p "$SCRIPT_DIR/certs"
    
    # Copy certificates from container
    if docker ps | grep -q "$CONTAINER_NAME"; then
        docker cp "$CONTAINER_NAME:/etc/nginx/certs/server.crt" "$SCRIPT_DIR/certs/"
        docker cp "$CONTAINER_NAME:/etc/nginx/certs/server.key" "$SCRIPT_DIR/certs/"
        
        print_status "Certificates extracted to ./certs/"
        echo "   • Certificate: ./certs/server.crt"
        echo "   • Private Key: ./certs/server.key"
        
        # Show certificate info
        echo ""
        echo -e "${BLUE}📋 Certificate Information:${NC}"
        openssl x509 -in "$SCRIPT_DIR/certs/server.crt" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before|Not After)"
        
    else
        print_error "Container is not running"
        exit 1
    fi
}

run_tests() {
    echo -e "${BLUE}🧪 Running HTTP/3 tests...${NC}"
    
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        print_error "HTTP/3 server is not running. Start it first with: $0 start"
        exit 1
    fi
    
    # Test basic connectivity
    echo ""
    echo -e "${BLUE}Testing HTTP redirects...${NC}"
    curl -I http://localhost/ 2>/dev/null | head -1 || print_warning "HTTP test failed"
    
    echo ""
    echo -e "${BLUE}Testing HTTPS/HTTP2...${NC}"
    curl -k -I https://localhost/ 2>/dev/null | head -1 || print_warning "HTTPS test failed"
    
    echo ""
    echo -e "${BLUE}Testing API endpoint...${NC}"
    curl -k -s https://localhost/api | jq '.status' 2>/dev/null || print_warning "API test failed (jq not installed?)"
    
    echo ""
    echo -e "${BLUE}Testing with Java HTTP client...${NC}"
    if [ -f "$SCRIPT_DIR/run-http3-example.sh" ]; then
        echo "Running Java HTTP/3 client test..."
        "$SCRIPT_DIR/run-http3-example.sh"
    else
        print_warning "Java test script not found: run-http3-example.sh"
    fi
}

cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    stop_server
    
    # Remove containers and images
    docker system prune -f --filter "label=com.docker.compose.project=http3-client-test" >/dev/null 2>&1 || true
    
    # Remove local certificates
    rm -rf "$SCRIPT_DIR/certs"
    
    print_status "Cleanup completed"
}

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|build|certs|test|cleanup|help}"
    echo ""
    echo "Commands:"
    echo "  start    - Build and start the HTTP/3 test server"
    echo "  stop     - Stop the HTTP/3 test server"
    echo "  restart  - Restart the HTTP/3 test server"
    echo "  status   - Show server status and connection info"
    echo "  logs     - Show container logs"
    echo "  build    - Build the container image"
    echo "  certs    - Extract SSL certificates from container"
    echo "  test     - Run connectivity and HTTP/3 tests"
    echo "  cleanup  - Stop server and clean up resources"
    echo "  help     - Show this help message"
}

# Main script logic
case "${1:-help}" in
    start)
        print_header
        check_docker
        setup_hosts
        build_container
        start_server
        ;;
    stop)
        print_header
        stop_server
        ;;
    restart)
        print_header
        stop_server
        sleep 2
        start_server
        ;;
    status)
        print_header
        show_status
        ;;
    logs)
        show_logs
        ;;
    build)
        print_header
        check_docker
        build_container
        ;;
    certs)
        extract_certificates
        ;;
    test)
        print_header
        run_tests
        ;;
    cleanup)
        print_header
        cleanup
        ;;
    help|--help|-h)
        print_header
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac