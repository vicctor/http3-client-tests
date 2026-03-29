# Wireshark HTTP/3 Server Push Analysis Guide

This guide explains how to use Wireshark to analyze HTTP/3 server push traffic captured from the demonstration.

## 🔧 Setup Wireshark for HTTP/3 Analysis

### 1. Configure TLS Decryption

1. **Open Wireshark**
2. **Go to Edit → Preferences → Protocols → TLS**
3. **Set the SSL Key Log File:**
   - Field: `(Pre)-Master-Secret log filename`
   - Value: `[path-to-project]/wireshark-samples/ssl.key_log`
   - Example: `/home/user/http3-client-test/wireshark-samples/ssl.key_log`

### 2. Start Packet Capture

1. **Select the loopback interface (lo)**
2. **Apply capture filter (optional):**
   ```
   udp port 8443 or tcp port 8443
   ```

### 3. Configure Display Filters

Use these filters to focus on HTTP/3 traffic:

```wireshark
# All QUIC traffic
quic

# HTTP/3 specific traffic
http3

# TLS handshake with QUIC
quic.frame_type == 6

# QUIC stream data (where HTTP/3 lives)
quic.frame_type == 8

# Server push streams (look for server-initiated stream IDs)
quic.stream_id % 4 == 1

# Combine for comprehensive view
quic or tls or http3
```

## 📊 What to Look For

### HTTP/3 Server Push Indicators

1. **Server-Initiated Streams:**
   - Stream IDs initiated by server (odd numbers when server starts)
   - Look for `PUSH_PROMISE` frames in HTTP/3 layer

2. **QPACK Headers:**
   - Compressed headers in HTTP/3 frames
   - Look for `:path`, `:method`, `:scheme` headers in push promises

3. **Timing Analysis:**
   - Server push should happen immediately after initial request
   - Pushed resources arrive before client requests them

### Key Frame Types

1. **QUIC Connection Setup:**
   - Initial packets with connection establishment
   - TLS handshake within QUIC

2. **HTTP/3 Frames:**
   - `HEADERS` frames with request/response headers
   - `DATA` frames with actual content
   - `PUSH_PROMISE` frames (server push indication)

3. **Stream Management:**
   - Multiple concurrent streams
   - Stream flow control

## 🔍 Analysis Steps

### Step 1: Identify the Connection
1. Filter by `quic.connection.number == 0` (first connection)
2. Look for the TLS handshake completion
3. Identify when HTTP/3 communication starts

### Step 2: Find the Initial Request
1. Look for the first HTTP/3 request to `/push-demo/page`
2. Check the request headers and timing

### Step 3: Identify Server Push
1. Look for server-initiated streams immediately after the initial request
2. Check for streams carrying CSS and JavaScript resources
3. Verify these streams start before client requests them

### Step 4: Analyze Performance
1. **Time to First Byte (TTFB):** Initial request response time
2. **Push Timing:** How quickly pushed resources are delivered
3. **Multiplexing:** Multiple streams active simultaneously

## 📈 Performance Metrics to Extract

### Connection Metrics
- **Connection establishment time**
- **TLS handshake duration**
- **First HTTP/3 frame timing**

### Push Effectiveness
- **Time between initial request and push start**
- **Number of resources pushed**
- **Push completion time vs. hypothetical request time**

### Stream Analysis
- **Concurrent stream count**
- **Stream ID patterns**
- **Flow control effectiveness**

## 🎯 Expected Observations

### Successful Server Push Shows:
1. **Immediate Push:** CSS/JS resources pushed right after main request
2. **No Client Request:** Pushed resources arrive without client requesting
3. **Parallel Streams:** Multiple resources delivered simultaneously
4. **Efficient Headers:** QPACK compression reduces header overhead

### Performance Benefits:
1. **Reduced Round Trips:** Fewer request/response cycles
2. **Better Multiplexing:** No head-of-line blocking
3. **Faster Page Load:** Resources available when needed

## 🐛 Troubleshooting

### SSL Key Log Issues
```bash
# Verify the key log file is being written
ls -la wireshark-samples/ssl.key_log
wc -l wireshark-samples/ssl.key_log

# Check if SSLKEYLOGFILE is set correctly
echo $SSLKEYLOGFILE
```

### Wireshark Not Showing Decrypted Traffic
1. **Check TLS preferences:** Ensure key log file path is correct
2. **Restart Wireshark:** After configuring the key log file
3. **Verify capture:** Make sure you're capturing the right interface

### No HTTP/3 Traffic Visible
1. **Check protocol support:** Ensure client/server negotiated HTTP/3
2. **Look for QUIC frames:** Even if HTTP/3 isn't decoded, QUIC should be visible
3. **Verify ports:** Ensure you're capturing UDP traffic on port 8443

## 📝 Analysis Checklist

- [ ] SSL key log file configured in Wireshark
- [ ] Capturing on correct interface (loopback)
- [ ] QUIC connection establishment visible
- [ ] TLS handshake successfully decrypted
- [ ] HTTP/3 frames decoded and readable
- [ ] Server push streams identified
- [ ] Performance timing measured
- [ ] Multiple concurrent streams observed

## 🔗 Useful Wireshark Columns

Add these columns for better analysis:
1. **Stream ID:** `quic.stream.stream_id`
2. **Frame Type:** `quic.frame_type`
3. **HTTP/3 Stream:** `http3.stream_id` 
4. **Delta Time:** Show time between packets

## 📚 Additional Resources

- [Wireshark QUIC Documentation](https://wiki.wireshark.org/QUIC)
- [HTTP/3 Analysis in Wireshark](https://wiki.wireshark.org/HTTP3)
- [QUIC Protocol Analysis](https://tools.ietf.org/html/rfc9000)

This analysis will help you understand exactly how HTTP/3 server push works at the protocol level and measure its performance benefits!