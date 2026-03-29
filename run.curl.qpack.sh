#!/usr/bin/env bash

# HTTP/3 QPACK Header Compression Demo with curl
# Demonstrates QPACK compression with 30 random headers

set -e

echo "🚀 HTTP/3 QPACK Demo with 30 Custom Headers"
echo "============================================="
echo "Target: https://http3check.net"
echo "Protocol: HTTP/3 with QPACK compression"
echo ""

SSLKEYLOG=./wireshark-samples/curl-http3-qpack.ssl.keylog curl  --http3 -v \
     --header "X-Custom-Header-1: RandomValue_A7B2C9D4E6F8" \
     --header "X-Session-ID: sess_9f8e7d6c5b4a3928" \
     --header "X-Request-ID: req_1a2b3c4d5e6f7890" \
     --header "X-Client-Version: 2.15.3-beta" \
     --header "X-Platform: Linux-x86_64" \
     --header "X-Browser-Engine: WebKit/537.36" \
     --header "X-Timestamp: 1704123456789" \
     --header "X-Correlation-ID: corr_abc123def456" \
     --header "X-Trace-ID: trace_987654321fed" \
     --header "X-User-Agent-Hash: sha256_a1b2c3d4e5f6" \
     --header "X-API-Version: v3.2.1" \
     --header "X-Device-Type: desktop" \
     --header "X-Screen-Resolution: 1920x1080" \
     --header "X-Color-Depth: 24bit" \
     --header "X-Timezone: UTC+01:00" \
     --header "X-Language-Preference: en-US,pl-PL" \
     --header "X-Feature-Flags: flag1,flag2,flag3" \
     --header "X-Experiment-Group: control_group_A" \
     --header "X-Cache-Control: max-age=3600" \
     --header "X-Content-Encoding: gzip,br" \
     --header "X-Security-Token: tok_9876543210abcdef" \
     --header "X-Rate-Limit-Client: client_12345" \
     --header "X-Geographic-Region: EU-West" \
     --header "X-Network-Type: ethernet" \
     --header "X-Connection-Speed: broadband" \
     --header "X-CPU-Architecture: x86_64" \
     --header "X-Memory-Available: 16GB" \
     --header "X-Protocol-Test: HTTP3-QPACK-Demo" \
     --header "X-Compression-Test: Huffman-Encoding" \
     --header "X-JDD-Conference: 2025-Krakow" \
     --header "X-Demo-Purpose: QPACK-Header-Compression" \
     "https://cloudflare-quic.com/"
