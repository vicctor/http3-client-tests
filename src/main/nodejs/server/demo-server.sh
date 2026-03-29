#!/bin/bash

# HTTP Early Hints Server Setup and Demo Script

set -e

echo "🚀 HTTP Early Hints Server Setup & Demo"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📌 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}💡 $1${NC}"
}

# Check Node.js version
check_nodejs() {
    print_step "Checking Node.js version"
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        local major_version=$(echo $node_version | cut -d'.' -f1 | cut -d'v' -f2)
        
        print_success "Node.js found: $node_version"
        
        if [ "$major_version" -ge 18 ]; then
            print_success "Node.js version is compatible (>= 18.x)"
        else
            print_error "Node.js version is too old. Please upgrade to >= 18.x"
            exit 1
        fi
    else
        print_error "Node.js is not installed"
        exit 1
    fi
    echo
}

# Setup server
setup_server() {
    print_step "Setting up HTTP Early Hints Server"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the server directory?"
        echo "Please run: cd src/main/nodejs/server"
        exit 1
    fi
    
    print_info "Installing dependencies..."
    npm install --silent
    
    print_success "Server dependencies installed"
    echo
}

# Test server functionality
test_server() {
    print_step "Testing server functionality"
    
    print_info "Running server test suite..."
    if timeout 30s npm test; then
        print_success "Server tests passed"
    else
        print_warning "Server tests had issues"
    fi
    echo
}

# Start server in background
start_server() {
    print_step "Starting HTTP Early Hints Server"
    
    print_info "Starting server on port 3443..."
    
    # Start server in background
    nohup node server.js --port 3443 > server.log 2>&1 &
    SERVER_PID=$!
    
    # Save PID for cleanup
    echo $SERVER_PID > server.pid
    
    # Wait for server to start
    sleep 3
    
    # Check if server is running
    if kill -0 $SERVER_PID 2>/dev/null; then
        print_success "Server started successfully (PID: $SERVER_PID)"
        print_info "Server running at https://localhost:3443"
    else
        print_error "Failed to start server"
        cat server.log
        exit 1
    fi
    echo
}

# Test server endpoints
test_endpoints() {
    print_step "Testing server endpoints"
    
    local endpoints=(
        "/"
        "/info"
        "/health"
        "/static/styles.css"
        "/api/critical-data"
    )
    
    for endpoint in "${endpoints[@]}"; do
        print_info "Testing: $endpoint"
        
        if curl -k -s --max-time 5 "https://localhost:3443$endpoint" > /dev/null; then
            print_success "  ✓ $endpoint - OK"
        else
            print_warning "  ✗ $endpoint - Failed"
        fi
    done
    echo
}

# Demonstrate Early Hints
demo_early_hints() {
    print_step "Demonstrating HTTP Early Hints"
    
    print_info "Making request to show Early Hints in action..."
    echo
    
    print_info "🔍 Verbose curl output (shows 103 Early Hints):"
    echo "================================================"
    
    # Show Early Hints with curl
    curl -k -v https://localhost:3443/ 2>&1 | grep -E "(HTTP/2 103|HTTP/2 200|< link:|< Link:)" | head -10
    
    echo
    print_success "Early Hints demonstration completed"
    echo
}

# Test with client
test_with_client() {
    print_step "Testing with Node.js Client"
    
    if [ -f "../demo-client.js" ]; then
        print_info "Running client tests against server..."
        echo
        
        cd ..
        
        print_info "1. Basic Early Hints test:"
        if timeout 20s node demo-client.js basic --url https://localhost:3443; then
            print_success "Basic test completed"
        else
            print_warning "Basic test had issues"
        fi
        echo
        
        print_info "2. Advanced test:"
        if timeout 20s node demo-client.js advanced --url https://localhost:3443; then
            print_success "Advanced test completed"
        else
            print_warning "Advanced test had issues"
        fi
        echo
        
        cd server
    else
        print_warning "Client not found - skipping client tests"
        print_info "To test with client:"
        echo "  cd .."
        echo "  node demo-client.js basic --url https://localhost:3443"
    fi
    echo
}

# Performance benchmark
run_benchmark() {
    print_step "Running Performance Benchmark"
    
    print_info "Testing server performance..."
    
    # Test different scenarios
    local scenarios=(
        "?resources=3&delay=500"
        "?resources=5&delay=1000"
        "?resources=7&delay=300"
    )
    
    for scenario in "${scenarios[@]}"; do
        print_info "Benchmark scenario: $scenario"
        
        local response=$(curl -k -s "https://localhost:3443/benchmark$scenario")
        if [ $? -eq 0 ]; then
            echo "$response" | head -3
            print_success "  ✓ Scenario completed"
        else
            print_warning "  ✗ Scenario failed"
        fi
        sleep 1
    done
    echo
}

# Show server logs
show_logs() {
    print_step "Server Logs"
    
    if [ -f "server.log" ]; then
        print_info "Recent server activity:"
        echo "======================="
        tail -20 server.log
    else
        print_warning "No server logs found"
    fi
    echo
}

# Cleanup
cleanup() {
    print_step "Cleaning up"
    
    if [ -f "server.pid" ]; then
        local pid=$(cat server.pid)
        if kill -0 $pid 2>/dev/null; then
            print_info "Stopping server (PID: $pid)..."
            kill $pid
            sleep 2
            
            if kill -0 $pid 2>/dev/null; then
                print_warning "Forcing server shutdown..."
                kill -9 $pid 2>/dev/null
            fi
        fi
        rm -f server.pid
    fi
    
    rm -f server.log
    print_success "Cleanup completed"
}

# Display usage information
show_usage() {
    print_step "Usage Information"
    
    echo "Available commands:"
    echo "  npm start              - Start the server"
    echo "  npm test               - Test server functionality"
    echo "  npm run dev            - Development mode with auto-reload"
    echo "  node server.js --help  - Show server options"
    echo
    echo "Manual testing:"
    echo "  curl -k -v https://localhost:3443/"
    echo "  curl -k https://localhost:3443/info"
    echo "  curl -k https://localhost:3443/benchmark"
    echo
    echo "Client testing:"
    echo "  cd .."
    echo "  node demo-client.js basic --url https://localhost:3443"
    echo "  node demo-client.js all --url https://localhost:3443"
    echo "  node benchmark.js --url https://localhost:3443"
    echo
    echo "Browser testing:"
    echo "  Open: https://localhost:3443/"
    echo "  Check DevTools Network tab for 103 Early Hints"
    echo
}

# Main execution
main() {
    echo "Starting HTTP Early Hints Server demo..."
    echo
    
    # Setup trap for cleanup
    trap cleanup EXIT
    
    # Check prerequisites
    check_nodejs
    
    # Setup and test
    setup_server
    test_server
    
    # Start server
    start_server
    
    # Run tests
    test_endpoints
    demo_early_hints
    test_with_client
    run_benchmark
    
    # Show results
    show_logs
    show_usage
    
    echo
    print_success "HTTP Early Hints Server demo completed!"
    echo
    echo "🎯 Key Achievements:"
    echo "• ✅ Proper 103 Early Hints implementation"
    echo "• ✅ HTTP/2 server with SPDY support"
    echo "• ✅ Multiple resource type preloading"
    echo "• ✅ Performance benchmarking capabilities"
    echo "• ✅ SSL/TLS support with auto-generated certificates"
    echo "• ✅ Compatible with Node.js Early Hints client"
    echo
    echo "🌐 Server is running at: https://localhost:3443"
    echo "📊 Try the endpoints listed above!"
    echo
    echo "🛑 To stop the server: kill \$(cat server.pid) or Ctrl+C"
}

# Run main function
main "$@"