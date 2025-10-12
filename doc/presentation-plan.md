# euler-lagrange equation - rule of optimisation
   \[
   \frac{d}{dt} \left( \frac{\partial L}{\partial \dot{q}_i} \right) - \frac{\partial L}{\partial q_i} = 0
   \] 
   
# Security against latency: [res](res/latency-vs-security.jpg)
# About latency Numbers that every programmer should know
   https://gist.github.com/jboner/2841832
   Data by Jeff Dean
# Demand on security
💰 Global Spending on Cybersecurity

According to industry analyses (e.g. Gartner, Statista, IDC):

Global cybersecurity spending has grown from roughly $80 billion in 2016 → over $200 billion in 2024, with double-digit annual growth rates.

Gartner forecasts over $215 billion in spending by the end of 2025, driven by cloud security, identity access management, and security services.

Average year-over-year growth in the sector is ~12–15%, faster than most IT segments.

# What business wants: 
## [hophophop](res/hophophop.jpeg)
## [accountant](res/accountant.jpeg)
## Two dim diagram showing on x axis latency demand on y security demand and put some sample applications on it where these demand has key factor

# What can we improve
## optimise algorithms
## optimise hardware

# How to optimise HTTP?
## History of http
## History of TLS

# Quick story about QUIC
## history of http
## quick story
The IETF formed a QUIC working group in 2016. Their charter was to take Google's web-specific implementation and adapt it to be a general-purpose transport protocol. The internals of Google QUIC looked very much like HTTP/2, but mixed in innovative ideas in transport and encryption. In creating "IETF QUIC," we've focused on teasing the functionality into separate components.
[QUIC stack](res/http-3-and-quic-past-present-and-future1.avif)


# Who uses quic
# Severs
## enginex since 1.25.0 May 2023
## netty since 4.2.1.Final 06-May-2025
## jetty since jetty-10.0.8 jetty-10.0.8
## Spring Boot 3.4 (netty) November 21, 2024
## AWS/GCP

# Clients
## curl August 2019, 2025 February 5: first 0RTT for QUIC, ssl session import/export
## jetty-client Jetty 10.0.8 64296f76f1 on November 29, 2021
## netty since 4.2.1.Final 06-May-2025
## Spring 3.4
## JEP 517
## [here we go](res/jest.png)
# JDK26
https://github.com/openjdk/jdk/pull/24751

Stan implementacji (Sep 2025)
   8.1 Co jest gotowe:


✅ Podstawowa implementacja QUIC
✅ Integracja z HttpClient API
✅ TLS 1.3 support
✅ Basic HTTP/3 functionality


8.2 Limitacje:


❌ Brak server-side implementation
❌ Tylko SunJSSE provider
❌ Experimental status
❌ Performance tuning w toku

# Does it work?

## Connection reuse

describe when connection reuse feature matters and what is it

[reuse](res/connection-reuse.png)


## Multiplexing
Say this is http2 feature
say way multiplexing on udp works better than on tcp

- draw diagram showing how multiplexing works in quick comparing to http/tcp


## 0-RTT

describe what 0-rtt is in quic

show 0-rtt flow idea

The 0-RTT feature provides several advantages:

- **Reduced Latency**: Eliminates one round trip for session resumption
- **Improved User Experience**: Faster page loads for returning visitors
- **Network Efficiency**: Less handshake overhead
- **Connection Multiplexing**: Multiple streams over single QUIC connection

## QPACK

QPACK (RFC 9204)

QPACK is the header compression mechanism designed specifically for HTTP/3.
It solves HPACK’s “head-of-line blocking” problem by separating:

The encoded header data (on request/response streams)

The dynamic table updates (on a separate unidirectional stream)

So headers can keep flowing without waiting for all updates to arrive in strict order.

📚 Static vs Dynamic Tables

Static Table

Fixed list of common headers (e.g., :method: GET, :scheme: https) with known indexes.

No state; easy to use and doesn’t change.

Dynamic Table

This is where dynamic QPACK comes in.

The encoder (usually the client) can insert custom headers into a shared table at runtime.

Later requests can reference these headers by index instead of resending the full string.

This is very useful for large or repeated headers like:

cookie

long authorization tokens

custom headers used repeatedly in the same connection

Dynamic table entries are sent over a special encoder stream, so the decoder (server) can build up its dynamic table gradually. This improves compression efficiency as the connection continues.

### Implementation
📝 Summary Table
Library	Lang	Dynamic QPACK	Maturity
nghttp3/ngtcp2	C	✅ Full	Production
quiche	Rust	✅ Full	Production (Cloudflare)
lsquic	C	✅ Full	Production
aioquic	Python	✅ Full	Good experimental
MsQuic	C	✅ Full	Production (.NET)
Kwik/Flupke	Java	❌ None	Experimental
Netty HTTP/3	Java	🟡 Partial	Experimental
Jetty HTTP/3	Java	🟡 Partial	Ongoing work

## 🔐 Security Considerations

0-RTT comes with some security trade-offs:

- **Replay Attacks**: Early data can be replayed by attackers
- **Forward Secrecy**: Limited forward secrecy for early data
- **Server Policies**: Servers may limit or disable 0-RTT for sensitive operations

