# HTTP/3 0-RTT (Zero Round Trip Time) Demonstration

This example demonstrates HTTP/3 0-RTT functionality by connecting to `https://cloudflare-quic.com` and performing a series of requests to show the performance benefits of early data transmission.

## 🎯 What is 0-RTT?

0-RTT (Zero Round Trip Time) is a feature of QUIC/HTTP3 that allows clients to send application data immediately with the first packet when resuming a previous session, without waiting for the handshake to complete. This can significantly reduce latency for subsequent connections.

## 🚀 Quick Start

### Basic Demo (No Packet Capture)
```bash
./run-http3-0rtt-demo.sh
```

### With Wireshark Packet Capture
```bash
./run-http3-0rtt-demo.sh --capture
```

### With Custom Network Interface
```bash
./run-http3-0rtt-demo.sh --capture --interface eth0
```

## 📋 Requirements

- Custom JDK with HTTP/3 support (located at `/home/grxybek/tata/jdk/build/linux-x86_64-server-release/images/jdk`)
- Network connectivity to `https://cloudflare-quic.com`
- UDP traffic allowed on port 443 (for QUIC)
- Wireshark/tshark (optional, for packet capture)

## 🔬 What the Demo Does

1. **Initial Connection**: Establishes the first HTTP/3 connection with full handshake
2. **Warmup Requests**: Sends several requests to establish session state
3. **0-RTT Test Requests**: Sends multiple requests that should benefit from early data
4. **Performance Analysis**: Compares timing between initial and subsequent requests

## 📊 Expected Results

- **Initial Connection**: ~200-500ms (full QUIC handshake)
- **Warmup Requests**: ~100-300ms (session establishment)
- **0-RTT Requests**: ~50-150ms (should be fastest due to early data)

## 🔍 Wireshark Analysis

The script generates two key files for analysis:

### SSL Key Log File
- **Location**: `wireshark-samples/http3-0rtt-demo.key_log`
- **Purpose**: Contains SSL/TLS secrets for decrypting QUIC traffic
- **Usage**: Configure in Wireshark: Edit → Preferences → Protocols → TLS

### Packet Capture File
- **Location**: `wireshark-samples/http3-0rtt-demo.pcapng`
- **Purpose**: Contains captured network traffic
- **Usage**: Open directly in Wireshark

### Key Filters for Analysis

```
# All QUIC traffic
quic

# HTTP/3 traffic (decrypted)
http3

# 0-RTT packets
quic.packet_type == 1

# Initial packets (full handshake)
quic.packet_type == 0

# Cloudflare server traffic
ip.dst == 104.16.132.229 or ip.src == 104.16.132.229
```

## 🎯 What to Look For

### In the Console Output
- Decreasing response times from initial to 0-RTT requests
- "Speed improvement" ratio showing performance gains
- SSL key logging confirmation

### In Wireshark
- **First Connection**: Multiple QUIC Initial packets, Certificate exchange
- **Subsequent Connections**: 0-RTT packets with HTTP/3 requests
- **Early Data**: HTTP/3 requests sent before handshake completion
- **Session Resumption**: Session tickets and resumption parameters

## 🔧 Troubleshooting

### No 0-RTT Packets in Capture
- 0-RTT may not always be used depending on server policy
- Network conditions or server load may affect 0-RTT usage
- The timing benefits may still be visible even without explicit 0-RTT packets

### SSL Key Logging Not Working
- Ensure the JDK supports SSL key logging
- Check that `-Djavax.net.ssl.keylog` parameter is set correctly
- Verify the key log file is being written to and has proper permissions

### Connection Failures
- Check if UDP port 443 is blocked by firewall
- Verify network connectivity to cloudflare-quic.com
- Ensure HTTP/3 support is enabled in the JDK

## 📚 Technical Details

### HTTP/3 and QUIC Protocol Stack
```
Application Data (HTTP/3)
        ↓
QUIC Transport Protocol
        ↓
UDP (Port 443)
        ↓
TLS 1.3 (Integrated into QUIC)
```

### 0-RTT Process
1. **Session Establishment**: Initial connection creates session state
2. **Session Ticket**: Server provides resumption ticket
3. **0-RTT Connection**: Client sends early data with resumption ticket
4. **Server Validation**: Server validates ticket and processes early data

## 🎯 Demo Architecture

```
[Java HTTP/3 Client] --QUIC/UDP--> [cloudflare-quic.com]
         |                                    |
         v                                    v
   [SSL Key Log]                      [HTTP/3 Responses]
         |
         v
   [Wireshark Analysis]
```

## 📈 Performance Benefits

The 0-RTT feature provides several advantages:

- **Reduced Latency**: Eliminates one round trip for session resumption
- **Improved User Experience**: Faster page loads for returning visitors
- **Network Efficiency**: Less handshake overhead
- **Connection Multiplexing**: Multiple streams over single QUIC connection

## 🔐 Security Considerations

0-RTT comes with some security trade-offs:

- **Replay Attacks**: Early data can be replayed by attackers
- **Forward Secrecy**: Limited forward secrecy for early data
- **Server Policies**: Servers may limit or disable 0-RTT for sensitive operations

## 📄 Files Generated

- `src/main/java26/net/arturkeska/http3/HTTP3ZeroRTTExample.java` - Main demo code
- `run-http3-0rtt-demo.sh` - Demo execution script
- `wireshark-samples/http3-0rtt-demo.key_log` - SSL secrets for decryption
- `wireshark-samples/http3-0rtt-demo.pcapng` - Network traffic capture

## 🤝 Usage Examples

### Development and Testing
```bash
# Run basic demo to test HTTP/3 connectivity
./run-http3-0rtt-demo.sh

# Capture traffic for detailed analysis
./run-http3-0rtt-demo.sh --capture

# Analyze with custom tools
tshark -r wireshark-samples/http3-0rtt-demo.pcapng -Y "quic.packet_type == 1"
```

### Performance Benchmarking
```bash
# Multiple runs to average performance
for i in {1..5}; do
    echo "Run $i:"
    ./run-http3-0rtt-demo.sh | grep "0-RTT Test Requests Average"
done
```

This demonstration provides a comprehensive view of HTTP/3 0-RTT functionality, complete with Wireshark analysis capabilities for deep protocol inspection.