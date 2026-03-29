# Docker HTTP/3 Test Server Setup

This directory contains a complete Docker-based HTTP/3 (QUIC) test server using nginx, along with management scripts and SSL certificate handling for Java HTTP/3 client testing.

## 📁 File Structure

```
docker/
├── Dockerfile              # nginx with HTTP/3 support
├── nginx.conf              # Main nginx configuration  
├── default.conf             # Server configuration with HTTP/3
├── generate-certs.sh        # SSL certificate generation script
├── index.html               # Test web page with HTTP/3 info
└── api.json                 # Sample API response

Root directory:
├── docker-compose.yml       # Docker Compose configuration
├── docker-http3-server.sh   # Server management script
└── run-http3-example.sh     # Java client test script
```

## 🚀 Quick Start

### 1. Start the HTTP/3 Server
```bash
# Start the Docker HTTP/3 server
./docker-http3-server.sh start

# This will:
# - Build the nginx HTTP/3 container
# - Generate self-signed SSL certificates
# - Start the server with HTTP/3 (QUIC) support
# - Add http3-test.local to /etc/hosts
```

### 2. Run Java HTTP/3 Client Tests
```bash
# Run the enhanced Java client tests
./run-http3-example.sh

# This will:
# - Start the Docker server (if not running)
# - Extract and trust SSL certificates
# - Run comprehensive HTTP/3 tests
# - Show detailed results with status glyphs
```

### 3. Access the Test Server
- **Web Interface**: https://http3-test.local/
- **API Endpoint**: https://http3-test.local/api
- **Status Endpoint**: https://http3-test.local/status
- **Health Check**: https://http3-test.local/health

## 🔧 Server Management

The `docker-http3-server.sh` script provides comprehensive server management:

```bash
# Available commands:
./docker-http3-server.sh start     # Build and start server
./docker-http3-server.sh stop      # Stop server
./docker-http3-server.sh restart   # Restart server
./docker-http3-server.sh status    # Show status and URLs
./docker-http3-server.sh logs      # Show container logs
./docker-http3-server.sh build     # Build container image
./docker-http3-server.sh certs     # Extract SSL certificates
./docker-http3-server.sh test      # Run connectivity tests
./docker-http3-server.sh cleanup   # Stop and clean up
./docker-http3-server.sh help      # Show help
```

## 🔐 SSL Certificate Handling

The setup automatically:

1. **Generates** self-signed SSL certificates during container build
2. **Extracts** certificates for Java client use
3. **Imports** certificates into Java truststore for seamless HTTPS/HTTP3 connections
4. **Configures** proper TLS 1.3 settings required for HTTP/3

### Certificate Details:
- **Domain**: `http3-test.local` 
- **SAN**: `localhost`, `127.0.0.1`, `::1`
- **Validity**: 365 days
- **Key Size**: 2048 bits RSA
- **Protocols**: TLS 1.2, TLS 1.3

## 🌐 Network Configuration

### Port Mapping:
- **80/tcp**: HTTP (redirects to HTTPS)
- **443/tcp**: HTTPS/HTTP2
- **443/udp**: HTTP/3 (QUIC)

### Host Entry:
The script automatically adds to `/etc/hosts`:
```
127.0.0.1 http3-test.local
```

## 🧪 Testing Features

### Java HTTP/3 Client Tests:
1. **Docker Server Tests**: Tests local nginx container
2. **External Server Tests**: Tests public HTTP/3 servers
3. **Protocol Validation**: Ensures HTTP/3 is actually used
4. **SSL Key Logging**: Captures QUIC secrets for Wireshark
5. **Performance Metrics**: Response times and statistics

### Test Results Display:
```
📊 SERVICE STATUS OVERVIEW:

✅   https://http3-test.local/                        HTTP/3 SUCCESS | 45ms | Status: 200
✅   https://http3-test.local/status                  HTTP/3 SUCCESS | 23ms | Status: 200  
✅   https://localhost/                               HTTP/3 SUCCESS | 34ms | Status: 200
✅   https://cloudflare-quic.com                      HTTP/3 SUCCESS | 241ms | Status: 200
✅   https://www.google.com                           HTTP/3 SUCCESS | 459ms | Status: 200

📈 SUMMARY STATISTICS:
   ✅ Successful HTTP/3 connections: 5
   ❌ Failed connections:            0
   📊 Total servers tested:          5
   📈 Success rate:                 100.0%
```

## 🐳 Docker Configuration

### Container Features:
- **Base Image**: `nginx:1.25-alpine` (with HTTP/3 support)
- **SSL**: TLS 1.3 with QUIC-compatible cipher suites
- **Logging**: Detailed access and error logging
- **Health Checks**: Built-in health monitoring
- **Security Headers**: Modern security headers included

### nginx HTTP/3 Configuration:
```nginx
server {
    listen 443 ssl http2;
    listen 443 quic reuseport;  # HTTP/3 QUIC
    
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Alt-Svc 'h3=":443"; ma=86400' always;
    
    # ... additional HTTP/3 optimized settings
}
```

## 📊 Monitoring and Debugging

### View Logs:
```bash
./docker-http3-server.sh logs
```

### Check Status:
```bash
./docker-http3-server.sh status
```

### SSL Key Log Analysis:
The Java client automatically generates `/tmp/ssl.key_log` compatible with:
- **Wireshark**: For packet analysis
- **tshark**: Command-line packet analysis  
- **curl**: HTTP/3 debugging
- **Other tools**: Supporting SSLKEYLOGFILE format

## 🔍 Troubleshooting

### Common Issues:

1. **Docker not available**:
   - Install Docker and Docker Compose
   - Ensure Docker daemon is running

2. **Permission denied for /etc/hosts**:
   - The script requires sudo to modify /etc/hosts
   - Or manually add: `127.0.0.1 http3-test.local`

3. **Port conflicts**:
   - Check if ports 80, 443 (TCP/UDP) are available
   - Stop conflicting services or change port mapping

4. **SSL certificate issues**:
   - Certificates are self-signed (browser warnings expected)
   - Java client automatically trusts certificates
   - Use `-k` flag with curl for testing

5. **HTTP/3 not working**:
   - Verify UDP port 443 is not blocked
   - Check if client supports HTTP/3
   - Ensure nginx container has QUIC support

### Debug Commands:
```bash
# Test HTTP/3 with curl (if supported)
curl --http3 -k https://http3-test.local/status

# Check container networking
docker inspect http3-test-server

# View nginx configuration
docker exec http3-test-server cat /etc/nginx/conf.d/default.conf

# Monitor traffic
sudo tcpdump -i lo -n port 443
```

## 🎯 Use Cases

This Docker HTTP/3 setup is perfect for:

- **Development**: Local HTTP/3 testing and development
- **Testing**: Automated HTTP/3 client testing
- **Education**: Learning HTTP/3 and QUIC protocols  
- **Debugging**: SSL key logging and packet analysis
- **Performance**: Benchmarking HTTP/3 vs HTTP/2
- **Integration**: CI/CD pipeline HTTP/3 validation

## 📝 Next Steps

1. **Run the setup**: `./docker-http3-server.sh start`
2. **Test with Java**: `./run-http3-example.sh`  
3. **Access web interface**: https://http3-test.local/
4. **Analyze traffic**: Use Wireshark with generated SSL key log
5. **Develop**: Use as local HTTP/3 server for your applications

## 🤝 Integration with Existing Code

The HTTP/3 test server seamlessly integrates with the existing `HTTP3DebugExample.java`:

- Tests both local Docker server and external HTTP/3 servers
- Provides controlled environment for consistent testing
- Generates SSL key logs for Wireshark analysis
- Shows clear status summary with success/failure indicators

This provides the best of both worlds: a reliable local test environment plus validation against real-world HTTP/3 servers.