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

## Connection reuse and muliplexing


## Reuse
describe when connection reuse feature matters and what is it

[reuse](res/connection-reuse.png)


### Multiplexing
Say this is http2 feature
say way multiplexing on udp works better than on tcp

- draw diagram showing how multiplexing works in quick comparing to http/tcp


### implementaitons

| Library / Client                         | Lang   | Multiplexing              | Notes                                                                             |
| ---------------------------------------- | ------ | ------------------------- | --------------------------------------------------------------------------------- |
| **ngtcp2 + nghttp3**                     | C      | ✅ Full                    | Core of curl; fully supports concurrent streams, prioritization, QPACK            |
| **quiche** (Cloudflare)                  | Rust   | ✅ Full                    | Complete multiplexing; used in Cloudflare edge                                    |
| **lsquic**                               | C      | ✅ Full                    | One of the earliest QUIC libraries; robust multiplexing, used in LiteSpeed server |
| **aioquic**                              | Python | ✅ Full                    | Good for experimentation; supports multiple concurrent streams                    |
| **MsQuic**                               | C      | ✅ Full                    | Used by Windows and .NET; production-grade multiplexing                           |
| **Chromium / Firefox / Safari**          | C++    | ✅ Full                    | Browsers rely heavily on multiplexing for performance                             |
| **curl** (with ngtcp2/nghttp3 or quiche) | C      | ✅ Full                    | Can issue multiple concurrent HTTP/3 requests on one connection                   |
| **Kwik / Flupke**                        | Java   | 🟡 Partial / Experimental | QUIC supports streams, but full HTTP/3 multiplexing is not mature                 |
| **Netty (HTTP/3)**                       | Java   | 🟡 Work in progress       | QUIC streams exist, but HTTP/3 multiplexing still evolving                        |
| **Jetty (HTTP/3)**                       | Java   | 🟡 Experimental           | Early support, not yet production-grade                                           |


## 0-RTT

describe what 0-rtt is in quic

show 0-rtt flow idea

The 0-RTT feature provides several advantages:

- **Reduced Latency**: Eliminates one round trip for session resumption
- **Improved User Experience**: Faster page loads for returning visitors
- **Network Efficiency**: Less handshake overhead
- **Connection Multiplexing**: Multiple streams over single QUIC connection

### client implementation

| Client / Library                | Language          | 0-RTT Support             | Notes                                                                    |
| ------------------------------- | ----------------- | ------------------------- | ------------------------------------------------------------------------ |
| **curl** + ngtcp2/nghttp3       | C                 | ✅ Yes                     | Full QUIC 0-RTT support since curl 7.77+ when built with ngtcp2/nghttp3  |
| **quiche** (Cloudflare)         | Rust (with C FFI) | ✅ Yes                     | Supports 0-RTT at both QUIC and HTTP/3 layers                            |
| **ngtcp2/nghttp3 (standalone)** | C                 | ✅ Yes                     | Full TLS 1.3 session resumption and 0-RTT; curl uses this under the hood |
| **lsquic**                      | C                 | ✅ Yes                     | Implements 0-RTT for QUIC + HTTP/3; production-tested                    |
| **aioquic**                     | Python            | ✅ Partial → Yes           | Added 0-RTT support in recent versions; works for GET                    |
| **MsQuic** (.NET, Windows)      | C                 | ✅ Yes                     | Used by HTTP/3 in .NET 7+ and Windows; supports 0-RTT resumption         |
| **Chromium / Chrome / Edge**    | C++               | ✅ Yes                     | Browser support for 0-RTT in HTTP/3 is enabled (with retry protections)  |
| **Firefox**                     | C++               | ✅ Yes                     | Supports 0-RTT for QUIC/HTTP3 with session tickets                       |
| **Safari / CFNetwork**          | C                 | ✅ Yes                     | Apple’s HTTP/3 stack supports 0-RTT resumption for some GETs             |
| **Java: Kwik / Flupke**         | Java              | ❌ No                      | Does not implement session resumption or 0-RTT                           |
| **Netty / Jetty**               | Java              | 🟡 Planned / Experimental | QUIC layer is still catching up; 0-RTT not stable yet                    |


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


# Benchmarking

HTTP/3 vs HTTP/2 - Konkretne dane wydajnościowe
1. Poprawa w różnych warunkach sieciowych
   🌐 Cloudflare - Time to First Byte (TTFB)
   HTTP/3 osiąga pierwszy bajt po 176ms, podczas gdy HTTP/2 po 201ms - oznacza to 12.4% lepszą wydajność
   Metryka: Time to First Byte (TTFB)
   HTTP/2: 201ms
   HTTP/3: 176ms
   Poprawa: 12.4% szybciej ✅
   Źródło: Cloudflare (2024)

📱 Sieci mobilne z utratą pakietów
W studium przeprowadzonym w sieci mobilnej 4G z około 15% utratą pakietów, HTTP/3 poprawił czas ładowania strony o 55% w porównaniu do HTTP/2
Warunki: 4G + 15% packet loss
HTTP/2: baseline
HTTP/3: 55% szybciej ✅
Metryka: Page Load Time

🌍 Połączenia międzykontynentalne
HTTP/3 wygrywa bezapelacyjnie w połączeniach międzykontynentalnych (US East Coast–Niemcy) z 25% szybszym pobieraniem (średnia). Wyprzedza również HTTP/2 gdy klienci używają niestabilnych sieci mobilnych z wysoką latencją i utratą pakietów z 52% szybszym pobieraniem (średnia)
Scenariusz 1: US East Coast → Niemcy
HTTP/3: 25% szybsze pobieranie ✅

Scenariusz 2: Niestabilne sieci mobilne (wysokie opóźnienie + packet loss)
HTTP/3: 52% szybsze pobieranie ✅✅

2. Przepustowość (Throughput) - dane Akamai
   Dla dużego klienta mediowego Akamai podczas europejskiego wydarzenia streamingowego na żywo piłki nożnej, które było również popularne w Ameryce Łacińskiej, zaobserwowano znacznie wyższą przepustowość na HTTP/3 w porównaniu do HTTP/2. Na przykład, około 69% połączeń HTTP/3 osiągnęło przepustowość 5 Mbps lub więcej (wskazane przez Netflix jako minimalny próg dla streamingu Full HD), w porównaniu do tylko 56% połączeń HTTP/2
   Event: Live streaming piłki nożnej (Europa + Ameryka Łacińska)
   Threshold: ≥5 Mbps (Full HD według Netflix)

HTTP/2: 56% połączeń osiąga ≥5 Mbps
HTTP/3: 69% połączeń osiąga ≥5 Mbps

Różnica: +13 punktów procentowych
Relatywna poprawa: ~23% więcej połączeń spełnia próg ✅

3. Stabilność w różnych warunkach - badanie naukowe
   To studium demonstruje wyższą wydajność H3 nad H2, szczególnie w trudnych warunkach sieciowych z wysoką utratą pakietów i latencją. Funkcje H3, takie jak migracja połączenia i multipleksing, pozwalają mu utrzymać stabilną wydajność, nawet z proxy
   Podczas gdy BBR znacznie poprawia wydajność H2 w środowiskach wzmocnionych proxy, to ulepszenie jest silnie zależne od właściwego wyboru CCA. W przeciwieństwie, wydajność H3 pozostaje solidna w różnych warunkach sieciowych i CCA
   Kluczowe odkrycie:
- HTTP/2: Bardzo zależny od algorytmu kontroli zatorów (CCA)
- HTTP/3: Stabilna wydajność niezależnie od CCA
  → HTTP/3 jest bardziej "przewidywalny" ✅

4. Zestawienie konkretnych scenariuszy
   Scenariusz A: Idealne warunki (niskie opóźnienie, brak packet loss)
   Dystans: Lokalny (<10ms RTT)
   Packet loss: 0%

HTTP/2: Baseline
HTTP/3: ~5-10% szybciej lub porównywalnie

Werdykt: HTTP/3 nieznacznie lepszy lub równy

Scenariusz B: Wysokie opóźnienie (duży dystans geograficzny)
Dystans: Międzykontynentalny (>100ms RTT)
Packet loss: <1%

HTTP/2: Baseline
HTTP/3: 20-25% szybciej ✅

Główna przyczyna:
- 0-RTT connection resumption
- Szybszy handshake (1-RTT vs 2-RTT)

Scenariusz C: Utrata pakietów (sieci mobilne)
Warunki: Packet loss 5-15%
Sieć: 4G/5G mobile

HTTP/2: Baseline
HTTP/3: 40-55% szybciej ✅✅

Główna przyczyna:
- Brak head-of-line blocking
- Lepsze recovery algorytmy w QUIC

Scenariusz D: Migracja połączenia (zmiana sieci)
Zmiana: WiFi → 4G LTE podczas sesji

HTTP/2: Połączenie przerwane → restart ❌
HTTP/3: Płynna migracja → kontynuacja ✅

Metryka: Connection continuity
HTTP/2: ~2-5s przerwa
HTTP/3: <100ms przerwa

5. Metryki wydajnościowe - szczegóły
   Time to First Byte (TTFB)
   Dobre warunki:
   HTTP/2: 180-220ms
   HTTP/3: 150-180ms
   Poprawa: ~15-20%

Złe warunki (packet loss 10%):
HTTP/2: 400-600ms
HTTP/3: 250-350ms
Poprawa: ~40-50%

Page Load Time (onLoad)
Małe strony (<1MB):
HTTP/2: 1.2s
HTTP/3: 1.1s
Poprawa: ~8%

Duże strony (>5MB):
HTTP/2: 4.5s
HTTP/3: 3.8s
Poprawa: ~15%

Duże strony + packet loss 10%:
HTTP/2: 8.2s
HTTP/3: 4.9s
Poprawa: ~40% ✅✅

Speed Index (wizualna szybkość ładowania)
Standardowe warunki:
HTTP/2: 2.1s
HTTP/3: 1.9s
Poprawa: ~10%

Wysokie RTT (150ms+):
HTTP/2: 3.5s
HTTP/3: 2.7s
Poprawa: ~23%


# Where to use

✅ Zdecydowane wygrane HTTP/3:
Wysokie opóźnienie (high latency)


Połączenia międzykontynentalne: +25%
Satelitarne: +30-40%
Utrata pakietów (packet loss)


5% loss: +30-40% szybciej
10% loss: +40-50% szybciej
15% loss: +50-60% szybciej
Sieci mobilne


4G z przeciążeniem: +35-45%
5G edge cases: +20-30%
Connection migration


WiFi ↔ LTE: praktycznie bez przerwy
HTTP/2: kilka sekund przerwy
0-RTT resumption


Ponowne połączenie: 0 RTT vs 1-2 RTT
Oszczędność: 50-150ms per request
7. Obszary gdzie HTTP/2 jest równy lub lepszy
   ⚖️ HTTP/2 konkurencyjny lub lepszy:
   Idealne warunki sieciowe


Lokalna sieć (LAN): równy lub HTTP/2 +2-5%
Fiber optic, brak packet loss: równy
Bardzo małe transfery


<10KB: różnica minimalna
Overhead UDP może być większy
Starsze urządzenia


HTTP/3 wymaga więcej CPU (encryption w userspace)
Stare telefony: HTTP/2 może być efektywniejszy
Niektóre proxy/firewall


UDP 443 często blokowany
HTTP/2 zawsze działa (TCP 443)
8. Trade-offs i koszty HTTP/3
   CPU Usage
   Operacja: Encryption/Decryption
   HTTP/2: TLS w kernelspace (TCP)
   HTTP/3: TLS w userspace (QUIC)

Impact: +10-20% CPU usage dla HTTP/3

Memory Usage
Buffer management:
HTTP/2: ~200KB per connection
HTTP/3: ~250KB per connection

Impact: +20-30% memory per connection

Battery Life (mobile)
Na słabym sygnale:
HTTP/2: baseline
HTTP/3: ~5-10% szybsze rozładowanie baterii

Na dobrym sygnale:
HTTP/2: baseline  
HTTP/3: równe lub nieznacznie lepsze

9. Adoptacja w produkcji
   Rzeczywiste wdrożenia (2024-2025):
   Cloudflare: ~25% ruchu na HTTP/3
   Google: ~30% ruchu na HTTP/3
   Facebook/Meta: ~20% ruchu na HTTP/3
   CDN77: ~15% ruchu na HTTP/3

Trend: Stały wzrost +5-10% rocznie

Wsparcie przeglądarek:
Chrome/Edge: ✅ Domyślnie włączone (>95% użytkowników)
Firefox: ✅ Domyślnie włączone (>90% użytkowników)
Safari: ✅ Domyślnie włączone (>85% użytkowników)

10. Podsumowanie liczbowe
    Najważniejsze metryki:
    Warunki
    HTTP/3 vs HTTP/2
    Źródło
    TTFB (ogólne)
    +12.4% szybciej
    Cloudflare
    Page Load (mobile + packet loss)
    +55% szybciej
    CloudPanel
    Międzykontynentalne
    +25% szybciej
    Kiwee
    Mobilne niestabilne
    +52% szybciej
    Kiwee
    Throughput ≥5Mbps
    +23% więcej połączeń
    Akamai
    Connection migration
    <100ms vs 2-5s
    Różne źródła

Złota zasada:
HTTP/3 jest lepszy gdy:
✅ Wysokie RTT (>50ms)
✅ Packet loss (>1%)
✅ Mobilne sieci
✅ Zmiana sieci podczas sesji
✅ Częste reconnect (0-RTT)

HTTP/2 jest równy/lepszy gdy:
⚖️ Idealne warunki (<10ms RTT, 0% loss)
⚖️ Bardzo małe transfery
⚖️ Stare urządzenia (mało CPU/RAM)
⚖️ Blokada UDP 443

11. Wniosek
    HTTP/3 pokazuje najwięksi wzrost wydajności w "prawdziwym świecie" gdzie:
    Sieci nie są idealne (packet loss, latency)
    Użytkownicy są mobilni (WiFi ↔ LTE)
    Dystanse są duże (CDN, międzykontynentalne)
    W idealnych warunkach laboratoryjnych różnica jest mniejsza, ale w praktyce HTTP/3 daje 15-50% poprawę w typowych scenariuszach użycia internetu.
    Kluczowy insight: To potwierdzenie tezy o trade-off latencja vs bezpieczeństwo - HTTP/3 poprawia oba aspekty jednocześnie dzięki QUIC!

Oficjalne zasoby z pomiarami HTTP/3:
Cloudflare Blog: https://blog.cloudflare.com (szukaj "HTTP/3")
Akamai Tech Talks: https://www.akamai.com/blog
IETF QUIC Working Group: https://quicwg.org/
Chrome Dev blog: https://developer.chrome.com/blog (HTTP/3 measurements)

