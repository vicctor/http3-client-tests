#!/bin/bash

# Node.js HTTP Early Hints Client Setup and Demo Script

set -e

echo "🚀 Node.js HTTP Early Hints Client Demo"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if Node.js is installed
check_nodejs() {
    print_step "Checking Node.js installation"
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        print_success "Node.js found: $node_version"
        
        # Check if version is >= 18
        local major_version=$(echo $node_version | cut -d'.' -f1 | cut -d'v' -f2)
        if [ "$major_version" -ge 18 ]; then
            print_success "Node.js version is compatible (>= 18.x)"
        else
            print_error "Node.js version is too old. Please upgrade to >= 18.x"
            exit 1
        fi
    else
        print_error "Node.js is not installed"
        echo "Please install Node.js 18.x or later:"
        echo "  - Visit: https://nodejs.org/"
        echo "  - Or use a version manager like nvm"
        exit 1
    fi
    
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        print_success "npm found: v$npm_version"
    else
        print_error "npm is not installed"
        exit 1
    fi
    
    echo
}

# Setup Node.js project
setup_nodejs() {
    print_step "Setting up Node.js client"
    
    cd src/main/nodejs
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi
    
    print_step "Installing dependencies..."
    npm install
    
    print_success "Node.js client setup completed"
    
    cd - > /dev/null
    echo
}

# Test basic functionality
test_basic_functionality() {
    print_step "Testing basic functionality"
    
    cd src/main/nodejs
    
    echo "Running basic Early Hints test..."
    if timeout 30s node test-early-hints.js; then
        print_success "Basic test completed successfully"
    else
        print_warning "Basic test failed or timed out"
        echo "This might be due to:"
        echo "  - Server not running"
        echo "  - Network connectivity issues"
        echo "  - Early Hints not properly configured"
    fi
    
    cd - > /dev/null
    echo
}

# Run demo scenarios
run_demo_scenarios() {
    print_step "Running demo scenarios"
    
    cd src/main/nodejs
    
    echo "1. Basic Early Hints demo:"
    if timeout 20s node demo-client.js basic; then
        print_success "Basic demo completed"
    else
        print_warning "Basic demo failed"
    fi
    echo
    
    echo "2. Advanced Early Hints demo:"
    if timeout 20s node demo-client.js advanced; then
        print_success "Advanced demo completed"
    else
        print_warning "Advanced demo failed"
    fi
    echo
    
    echo "3. Performance comparison:"
    if timeout 30s node demo-client.js performance; then
        print_success "Performance demo completed"
    else
        print_warning "Performance demo failed"
    fi
    echo
    
    cd - > /dev/null
}

# Run performance benchmark
run_benchmark() {
    print_step "Running performance benchmark"
    
    cd src/main/nodejs
    
    echo "Starting comprehensive benchmark..."
    if timeout 60s node benchmark.js; then
        print_success "Benchmark completed successfully"
    else
        print_warning "Benchmark failed or timed out"
    fi
    
    cd - > /dev/null
    echo
}

# Display usage information
show_usage() {
    print_step "Usage Information"
    
    echo "Available commands:"
    echo "  cd src/main/nodejs"
    echo
    echo "Basic usage:"
    echo "  node index.js              - Run main client"
    echo "  node test-early-hints.js   - Run quick test"
    echo "  npm test                   - Same as above"
    echo "  npm run demo               - Run demo client"
    echo "  npm run benchmark          - Run benchmark"
    echo
    echo "Demo scenarios:"
    echo "  node demo-client.js basic     - Basic Early Hints test"
    echo "  node demo-client.js advanced  - Advanced test with multiple resources"
    echo "  node demo-client.js performance - Performance comparison"
    echo "  node demo-client.js analysis  - Resource type analysis"
    echo "  node demo-client.js monitor   - Real-time monitoring"
    echo "  node demo-client.js all       - Run all demos"
    echo
    echo "Custom server:"
    echo "  node demo-client.js basic --url https://your-server:8443"
    echo
}

# Check server status
check_server() {
    print_step "Checking Java server status"
    
    if curl -k -s --max-time 5 "https://localhost:8443/early-hints-demo/info" > /dev/null 2>&1; then
        print_success "Java HTTP/3 server is running at https://localhost:8443"
        
        # Test if Early Hints endpoint is working
        if curl -k -s --max-time 5 "https://localhost:8443/early-hints-demo/page" > /dev/null 2>&1; then
            print_success "Early Hints endpoints are accessible"
        else
            print_warning "Early Hints endpoints may not be working properly"
        fi
    else
        print_warning "Java HTTP/3 server is not running"
        echo "Please start the server first:"
        echo "  ./gradlew bootRun"
        echo
        echo "Or run this script to start both server and client:"
        echo "  ./run-full-demo.sh"
        return 1
    fi
    echo
}

# Main execution
main() {
    echo "Starting Node.js HTTP Early Hints client demo..."
    echo
    
    # Check prerequisites
    check_nodejs
    
    # Check if server is running
    if ! check_server; then
        echo "Continuing with setup, but some tests may fail..."
        echo
    fi
    
    # Setup Node.js environment
    setup_nodejs
    
    # Run tests and demos
    test_basic_functionality
    run_demo_scenarios
    run_benchmark
    
    # Show usage information
    show_usage
    
    echo
    print_success "Node.js HTTP Early Hints client demo completed!"
    echo
    echo "🎯 Key Features Demonstrated:"
    echo "• HTTP Early Hints detection (103 status code)"
    echo "• Automatic resource preloading"
    echo "• Performance measurement and analysis"
    echo "• Support for HTTP/1.1, HTTP/2, and HTTP/3"
    echo "• Real-time monitoring capabilities"
    echo "• Comprehensive testing and benchmarking"
    echo
    echo "🔗 Next Steps:"
    echo "• Explore different demo scenarios"
    echo "• Test with your own server endpoints"
    echo "• Integrate the client into your applications"
    echo "• Monitor Early Hints effectiveness in production"
    echo
    echo "📁 Files created in src/main/nodejs/:"
    echo "• index.js          - Core Early Hints client library"
    echo "• demo-client.js    - Interactive demo with multiple scenarios"
    echo "• test-early-hints.js - Simple test script"
    echo "• benchmark.js      - Performance benchmark suite"
    echo "• package.json      - Node.js project configuration"
    echo "• README.md         - Comprehensive documentation"
}

# Execute main function
main "$@"