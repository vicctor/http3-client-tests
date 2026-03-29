# 🚀 HTTP/3 Execution Scripts - Complete Set

## Three Dedicated Scripts Created

I have created three separate, specialized scripts to run each HTTP/3 example with their specific configurations:

### 1. 🔄 `run-connection-reuse.sh` - HTTP3ConnectionReuseExample
**Purpose**: Tests HTTP/3 connection reuse and multiplexing with external servers
**Features**:
- ✅ Compiles from `src/main/java26/net/arturkeska/http3/HTTP3ConnectionReuseExample.java`
- ✅ Tests connection pooling across multiple requests
- ✅ Demonstrates HTTP/3 multiplexing capabilities  
- ✅ SSL key logging: `/tmp/http3_connection_reuse.key_log`
- ✅ Connection reuse analysis and performance metrics
- ✅ **No Docker dependency** - uses external servers only

**Usage**:
```bash
./run-connection-reuse.sh
```

### 2. 🔍 `run-debug-example.sh` - HTTP3DebugExample  
**Purpose**: Comprehensive HTTP/3 testing with multiple external servers and visual reporting
**Features**:
- ✅ Compiles from `src/main/java26/net/arturkeska/http3/HTTP3DebugExample.java`
- ✅ Tests 7+ public HTTP/3 servers with detailed analysis
- ✅ Visual status summary with success/failure glyphs
- ✅ SSL key logging: `/tmp/http3_debug.key_log`
- ✅ Comprehensive server compatibility testing
- ✅ **No Docker dependency** - external servers only

**Usage**:
```bash
./run-debug-example.sh
```

### 3. 🐳 `run-local-example.sh` - Http3LocalExample (Docker + Custom Keystore)
**Purpose**: Local Docker server testing with SSL certificate management  
**Features**:
- ✅ **Docker integration** - automatically starts/manages HTTP/3 nginx container
- ✅ **Custom SSL keystore** - handles self-signed certificate trust  
- ✅ Creates and compiles `Http3LocalExample.java` on-the-fly
- ✅ Tests local endpoints: `/`, `/status`, `/api`, `/health`
- ✅ SSL key logging: `/tmp/http3_local.key_log`
- ✅ Certificate extraction and Java keystore import
- ✅ Docker server management integration

**Usage**:
```bash
./run-local-example.sh
```

## Key Differentiators

### Connection Reuse Script:
- **Focus**: Connection pooling and reuse patterns
- **Servers**: External HTTP/3 servers  
- **Analysis**: Connection establishment vs reuse metrics
- **SSL Logging**: Connection-focused analysis

### Debug Example Script:
- **Focus**: Multi-server compatibility and debugging
- **Servers**: 7+ external HTTP/3 servers
- **Analysis**: Visual status reports with glyphs
- **SSL Logging**: Multi-server handshake analysis  

### Local Example Script (Docker + Keystore):
- **Focus**: Controlled local environment testing
- **Servers**: Local Docker nginx with HTTP/3
- **Analysis**: Local server performance and reliability
- **SSL Logging**: Self-signed certificate connections
- **Unique**: Docker management + SSL certificate trust

## Script Features

### Common Features (All Scripts):
- ✅ **Java 26 compatibility** - uses custom JDK with HTTP/3 support
- ✅ **Clean compilation** from `src/main/java26/` directory
- ✅ **SSL key logging** for Wireshark analysis  
- ✅ **Colored output** with status indicators
- ✅ **Error handling** and detailed diagnostics
- ✅ **Automatic cleanup** of temporary files

### Unique Features:

#### Connection Reuse Script:
- Connection pooling analysis
- Handshake vs reuse metrics
- Performance comparison indicators

#### Debug Example Script:  
- Multi-server testing matrix
- Visual status summaries with glyphs
- Comprehensive compatibility reporting

#### Local Example Script:
- Docker server lifecycle management
- SSL certificate extraction and import
- Custom Java keystore configuration
- Local endpoint testing (`/status`, `/api`, `/health`)
- Docker integration commands

## Usage Examples

### Quick Individual Tests:
```bash
# Test connection reuse patterns
./run-connection-reuse.sh

# Test multiple external servers  
./run-debug-example.sh

# Test with local Docker server
./run-local-example.sh
```

### Sequential Testing:
```bash
# Run all three tests in sequence
./run-connection-reuse.sh && \
./run-debug-example.sh && \
./run-local-example.sh
```

## Output Examples

### Connection Reuse Output:
```
🔄 HTTP/3 Connection Reuse Example
Connection Analysis:
   Client handshake secrets: 2
   Total SSL secrets logged: 8
💡 Connection Reuse Indicators:
   - Fewer handshake secrets than total requests = connection reuse
```

### Debug Example Output:
```
📊 SERVICE STATUS OVERVIEW:
✅   https://cloudflare-quic.com     HTTP/3 SUCCESS | 241ms | Status: 200
✅   https://www.google.com          HTTP/3 SUCCESS | 355ms | Status: 200  
❌   https://quic.rocks              HTTP/3 FAILED  | SSL certificate error
📈 Success rate: 71.4% (5/7 servers)
```

### Local Example Output:
```
📊 LOCAL SERVER STATUS OVERVIEW:
✅ https://http3-test.local/         HTTP/3 SUCCESS | 45ms | Status: 200
✅ https://localhost/status          HTTP/3 SUCCESS | 23ms | Status: 200
📈 Success rate: 100.0% | Average response time: 34.0ms
```

## Benefits of Separate Scripts

### 🎯 **Focused Testing**:
- Each script optimized for its specific use case
- Clear separation of concerns
- Targeted analysis and reporting

### 🔧 **Easy Maintenance**:
- Independent updates and modifications  
- Specific dependency management
- Clear documentation per script

### 📊 **Specialized Analysis**:
- Connection reuse: Pool analysis
- Debug example: Multi-server compatibility
- Local example: Docker + SSL certificate management

### 🚀 **User Experience**:
- Choose the right tool for the task
- Clear script names indicate purpose
- Comprehensive help and status reporting

All three scripts are **ready to use** and provide complementary HTTP/3 testing capabilities! 🎉