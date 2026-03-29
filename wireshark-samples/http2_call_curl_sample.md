➜  wireshar-samples git:(main) ✗ SSLKEYLOGFILE=/tmp/curl_htt2_sample.ssl.key_log curl https://example.org/ -v --http2
* Host example.org:443 was resolved.
* IPv6: 2600:1406:bc00:17::6007:810d, 2600:1408:ec00:36::1736:7f2e, 2600:1406:bc00:17::6007:8128, 2600:1408:ec00:36::1736:7f2f
* IPv4: 23.215.0.132, 96.7.128.186, 23.215.0.133, 96.7.128.192
*   Trying [2600:1406:bc00:17::6007:810d]:443...
* Immediate connect fail for 2600:1406:bc00:17::6007:810d: Sieć jest niedostępna
*   Trying [2600:1408:ec00:36::1736:7f2e]:443...
* Immediate connect fail for 2600:1408:ec00:36::1736:7f2e: Sieć jest niedostępna
*   Trying [2600:1406:bc00:17::6007:8128]:443...
* Immediate connect fail for 2600:1406:bc00:17::6007:8128: Sieć jest niedostępna
*   Trying [2600:1408:ec00:36::1736:7f2f]:443...
* Immediate connect fail for 2600:1408:ec00:36::1736:7f2f: Sieć jest niedostępna
*   Trying 23.215.0.132:443...
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
*  CAfile: /etc/ssl/certs/ca-certificates.crt
*  CApath: none
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS change cipher, Change cipher spec (1):
* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS change cipher, Change cipher spec (1):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / x25519 / id-ecPublicKey
* ALPN: server accepted h2
* Server certificate:
*  subject: C=US; ST=California; L=Los Angeles; O=Internet Corporation for Assigned Names and Numbers; CN=*.example.org
*  start date: Jan 15 00:00:00 2025 GMT
*  expire date: Jan 15 23:59:59 2026 GMT
*  subjectAltName: host "example.org" matched cert's "example.org"
*  issuer: C=US; O=DigiCert Inc; CN=DigiCert Global G3 TLS ECC SHA384 2020 CA1
*  SSL certificate verify ok.
*   Certificate level 0: Public key type EC/prime256v1 (256/128 Bits/secBits), signed using ecdsa-with-SHA384
*   Certificate level 1: Public key type EC/secp384r1 (384/192 Bits/secBits), signed using ecdsa-with-SHA384
*   Certificate level 2: Public key type EC/secp384r1 (384/192 Bits/secBits), signed using ecdsa-with-SHA384
* Connected to example.org (23.215.0.132) port 443
* using HTTP/2
* [HTTP/2] [1] OPENED stream for https://example.org/
* [HTTP/2] [1] [:method: GET]
* [HTTP/2] [1] [:scheme: https]
* [HTTP/2] [1] [:authority: example.org]
* [HTTP/2] [1] [:path: /]
* [HTTP/2] [1] [user-agent: curl/8.11.1]
* [HTTP/2] [1] [accept: */*]
> GET / HTTP/2
> Host: example.org
> User-Agent: curl/8.11.1
> Accept: */*
>
* Request completely sent off
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
  < HTTP/2 200
  < accept-ranges: bytes
  < content-type: text/html
  < etag: "84238dfc8092e5d9c0dac8ef93371a07:1736799080.121134"
  < last-modified: Mon, 13 Jan 2025 20:11:20 GMT
  < content-length: 1256
  < cache-control: max-age=2653
  < date: Sun, 15 Jun 2025 08:12:05 GMT
  < alt-svc: h3=":443"; ma=93600,h3-29=":443"; ma=93600,quic=":443"; ma=93600; v="43"
  <
  <!doctype html>
<html>
<head>
    <title>Example Domain</title>

    <meta charset="utf-8" />
    <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type="text/css">
    body {
        background-color: #f0f0f2;
        margin: 0;
        padding: 0;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
        
    }
    div {
        width: 600px;
        margin: 5em auto;
        padding: 2em;
        background-color: #fdfdff;
        border-radius: 0.5em;
        box-shadow: 2px 3px 7px 2px rgba(0,0,0,0.02);
    }
    a:link, a:visited {
        color: #38488f;
        text-decoration: none;
    }
    @media (max-width: 700px) {
        div {
            margin: 0 auto;
            width: auto;
        }
    }
    </style>    
</head>

<body>
<div>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents. You may use this
    domain in literature without prior coordination or asking for permission.</p>
    <p><a href="https://www.iana.org/domains/example">More information...</a></p>
</div>
</body>
</html>
