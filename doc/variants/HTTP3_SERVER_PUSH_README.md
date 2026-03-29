# HTTP/3 Server Push Example

This project demonstrates HTTP/3 server push functionality using Spring Boot, Jetty 12, and Reactor Netty.

## 🚀 Overview

HTTP/3 Server Push allows servers to proactively send resources to clients before they are explicitly requested, reducing round-trip times and improving page load performance. This implementation showcases:

- **Server-side push implementation** using Jetty 12 HTTP/3 support
- **Client-side push handling** using Reactor Netty HTTP/3 client
- **Performance comparison** between pushed and traditional requests
- **Real-world examples** with HTML, CSS, and JavaScript resources

## 📋 Features

### Server Push Capabilities
- **Proactive Resource Delivery**: CSS, JavaScript, and API data
- **Link Header Support**: Using `rel=preload` hints for push decisions
- **Multiple Resource Push**: Simultaneous push of related resources
- **Cache-Aware Pushing**: Respects cache headers and client cache state

### HTTP/3 Specific Features
- **QPACK Header Compression**: Efficient header encoding for pushed resources
- **Multiplexing**: Multiple streams without head-of-line blocking
- **0-RTT Connection Resumption**: Faster connection establishment
- **Improved Error Handling**: Better recovery from packet loss

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/3 QUIC    ┌─────────────────┐
│   HTTP/3 Client │◄─────────────────►│   HTTP/3 Server │
│                 │                   │                 │
│ • RestClient    │   1. Request      │ • Jetty 12      │
│ • Reactor Netty │   2. Push CSS     │ • Spring Boot   │
│ • Push Handler  │   3. Push JS      │ • Push Logic    │
│                 │   4. Push Data    │                 │
└─────────────────┘                   └─────────────────┘
```

## 🛠️ Implementation Details

### Server-Side Implementation (`Http3ServerPushController`)

The server uses Spring Boot controllers with HTTP/3-specific configurations:

```java
@GetMapping("/page")
public ResponseEntity<String> getMainPage() {
    // Set Link headers for server push
    HttpHeaders headers = new HttpHeaders();
    headers.add("Link", "</push-demo/styles.css>; rel=preload; as=style");
    headers.add("Link", "</push-demo/script.js>; rel=preload; as=script");
    
    return ResponseEntity.ok()
        .headers(headers)
        .body(htmlContent);
}
```

### Client-Side Implementation (`Http3ServerPushClientController`)

The client uses Reactor Netty's HTTP/3 client to handle pushed resources:

```java
@Autowired
@Qualifier("http3RestClientLocal")
private RestClient http3Client;

// Requests automatically benefit from pushed resources
String response = http3Client.get()
    .uri("https://localhost:8443/push-demo/page")
    .retrieve()
    .body(String.class);
```

### Configuration (`JettyConfiguration`)

HTTP/3 server configuration with QUIC support:

```java
HTTP3ServerConnector connector = new HTTP3ServerConnector(
    server, 
    sslContextFactory, 
    new HTTP3ServerConnectionFactory(httpConfig)
);
connector.getQuicConfiguration().setMaxBidirectionalRemoteStreams(128);
```

## 🚦 Getting Started

### Prerequisites

- **Java 21+** (with preview features enabled)
- **Gradle** 8.x
- **SSL Certificates** (for HTTPS/HTTP3)

### Build and Run

1. **Build the application:**
   ```bash
   ./gradlew build
   ```

2. **Start the HTTP/3 server:**
   ```bash
   ./gradlew bootRun
   ```

3. **Run the demonstration:**
   ```bash
   ./demo-http3-server-push.sh
   ```

### SSL Configuration

Ensure SSL certificates are configured in `application.yml`:

```yaml
server:
  port: 8443
  ssl:
    bundle: "service"

spring:
  ssl:
    bundle:
      jks:
        service:
          keystore:
            location: "classpath:keystore.p12"
            password: "secret"
            type: "PKCS12"
```

## 🧪 Testing

### Available Endpoints

#### Server Push Endpoints
- `GET /push-demo/page` - Main page with CSS/JS push
- `GET /push-demo/multi-push` - Multiple resource push demo
- `GET /push-demo/styles.css` - CSS resource (pushed)
- `GET /push-demo/script.js` - JavaScript resource (pushed)
- `GET /push-demo/api/data` - JSON API data (pushed)
- `GET /push-demo/info` - Server push information

#### Client Test Endpoints
- `GET /client-demo/basic-request` - Basic HTTP/3 request
- `GET /client-demo/concurrent-requests` - Multiple concurrent requests
- `GET /client-demo/reactive-request` - Reactive client example
- `GET /client-demo/performance-comparison` - Push vs traditional comparison

### Manual Testing

1. **Browser Testing:**
   ```
   https://localhost:8443/push-demo/page
   ```
   Open DevTools → Network tab to see pushed resources

2. **curl Testing (if HTTP/3 supported):**
   ```bash
   curl --http3 -k -I https://localhost:8443/push-demo/page
   ```

3. **Client API Testing:**
   ```bash
   curl http://localhost:8080/client-demo/performance-comparison
   ```

## 📊 Performance Analysis

### Metrics to Monitor

1. **Request Timing:**
   - Time to first byte (TTFB)
   - Resource load times
   - Total page load time

2. **Push Effectiveness:**
   - Cache hit rate for pushed resources
   - Bandwidth utilization
   - Connection reuse

3. **HTTP/3 Specific:**
   - QUIC connection establishment time
   - Stream multiplexing efficiency
   - Packet loss recovery

### Expected Benefits

- **20-50% reduction** in page load time for multi-resource pages
- **Improved perceived performance** due to proactive loading
- **Better performance under packet loss** compared to HTTP/2
- **Reduced server load** through efficient connection reuse

## 🔍 Network Analysis

### Using Wireshark

1. **Capture QUIC traffic:**
   ```
   Filter: quic or udp.port == 8443
   ```

2. **Look for:**
   - QUIC connection establishment
   - HTTP/3 server-initiated streams
   - QPACK header compression

### Using Browser DevTools

1. **Chrome DevTools:**
   - Network tab → Protocol column shows "h3"
   - Timing tab shows push timing
   - Security tab shows QUIC connection

2. **Firefox DevTools:**
   - Network Monitor → Protocol column
   - Check for "Push" indicator

## 🔧 Troubleshooting

### Common Issues

1. **"Connection refused" errors:**
   - Ensure SSL certificates are properly configured
   - Check that port 8443 is not blocked by firewall

2. **HTTP/3 not working:**
   - Verify client supports HTTP/3
   - Check QUIC UDP traffic isn't blocked
   - Ensure Java preview features are enabled

3. **Push not happening:**
   - Verify Link headers are present
   - Check client cache state
   - Monitor server logs for push decisions

### Debug Configuration

Enable debug logging in `application.yml`:

```yaml
logging:
  level:
    org.eclipse.jetty.http3: DEBUG
    org.eclipse.jetty.quic: DEBUG
    reactor.netty.http.client: DEBUG
```

## 📚 Additional Resources

- [HTTP/3 Specification (RFC 9114)](https://tools.ietf.org/html/rfc9114)
- [QUIC Protocol (RFC 9000)](https://tools.ietf.org/html/rfc9000)
- [Jetty HTTP/3 Documentation](https://jetty.org/docs/jetty/12/programming-guide/protocols/http3.html)
- [Reactor Netty HTTP/3 Guide](https://projectreactor.io/docs/netty/release/reference/index.html#http3)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🙏 Acknowledgments

- **Eclipse Jetty Team** for HTTP/3 server implementation
- **Project Reactor** for reactive HTTP/3 client
- **Spring Boot Team** for excellent framework integration
- **IETF QUIC Working Group** for the HTTP/3 and QUIC specifications