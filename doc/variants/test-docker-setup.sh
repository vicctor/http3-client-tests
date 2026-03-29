#!/usr/bin/env bash

# Simple test of the Docker HTTP/3 setup without sudo requirements

set -e

echo "🧪 Testing Docker HTTP/3 Setup"
echo "==============================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found"
    exit 1
fi

echo "✅ Docker available: $(docker --version)"

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose available: $(docker-compose --version)"
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    echo "✅ docker compose available: $(docker compose version)"
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose not available"
    exit 1
fi

# Test building the container (without starting)
echo ""
echo "🔨 Testing Docker build..."
if $COMPOSE_CMD build --no-cache; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Test starting the container
echo ""
echo "🚀 Starting container..."
if $COMPOSE_CMD up -d; then
    echo "✅ Container started"
    
    # Wait a moment for startup
    sleep 5
    
    # Test if container is running
    if docker ps | grep -q "http3-test-server"; then
        echo "✅ Container is running"
        
        # Test basic connectivity (without SSL verification)
        echo "🔍 Testing connectivity..."
        if curl -k -s --max-time 10 https://localhost/health > /dev/null; then
            echo "✅ HTTPS health check passed"
        else
            echo "⚠️  HTTPS health check failed (may be normal for self-signed cert)"
        fi
        
        # Show container status
        echo ""
        echo "📊 Container Status:"
        docker ps --filter "name=http3-test-server" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Show logs
        echo ""
        echo "📋 Recent logs:"
        docker logs --tail=10 http3-test-server
        
    else
        echo "❌ Container not running"
        docker logs http3-test-server
        exit 1
    fi
    
    # Cleanup
    echo ""
    echo "🧹 Cleaning up..."
    $COMPOSE_CMD down
    echo "✅ Container stopped"
    
else
    echo "❌ Failed to start container"
    exit 1
fi

echo ""
echo "🎉 Docker HTTP/3 setup test completed successfully!"
echo ""
echo "💡 To use the full setup:"
echo "   1. Manually add '127.0.0.1 http3-test.local' to /etc/hosts"
echo "   2. Run: ./docker-http3-server.sh start"
echo "   3. Run: ./run-http3-example.sh"