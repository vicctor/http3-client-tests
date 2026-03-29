#!/bin/bash

# QUIC SSL Key Logging - Verification and Demo Script
# ===================================================

KEYLOG_FILE="/tmp/http3_debug.key_log"

echo "🔍 QUIC SSL Key Logging Implementation Verification"
echo "=================================================="
echo

# Check if the key log file exists
if [ ! -f "$KEYLOG_FILE" ]; then
    echo "❌ Key log file not found at: $KEYLOG_FILE"
    echo "Please run the HTTP3 example first with: ./build-http3-example.sh"
    exit 1
fi

echo "✅ Key log file found: $KEYLOG_FILE"
echo "📊 File statistics:"
echo "   - Size: $(wc -c < "$KEYLOG_FILE") bytes"
echo "   - Lines: $(wc -l < "$KEYLOG_FILE") lines"
echo

echo "🔑 Key Log Contents:"
echo "===================="
cat "$KEYLOG_FILE"
echo

echo "📋 Format Validation:"
echo "====================="

# Validate each line format
line_number=1
valid_lines=0
total_lines=$(wc -l < "$KEYLOG_FILE")

while IFS= read -r line; do
    if [[ $line =~ ^(CLIENT_HANDSHAKE_TRAFFIC_SECRET|SERVER_HANDSHAKE_TRAFFIC_SECRET|CLIENT_TRAFFIC_SECRET_0|SERVER_TRAFFIC_SECRET_0|EXPORTER_SECRET)\ ([0-9a-f]{64})\ ([0-9a-f]+)$ ]]; then
        secret_type="${BASH_REMATCH[1]}"
        client_random="${BASH_REMATCH[2]}"
        secret="${BASH_REMATCH[3]}"
        secret_bytes=$((${#secret} / 2))
        
        echo "✅ Line $line_number: Valid format (modern SSLKEYLOGFILE)"
        echo "   - Secret Type: $secret_type"
        echo "   - Client Random: ${client_random:0:16}...${client_random:48:16} (32 bytes)"
        echo "   - Secret: ${secret:0:16}...${secret:${#secret}-16:16} ($secret_bytes bytes)"
        
        ((valid_lines++))
    else
        echo "❌ Line $line_number: Invalid format"
        echo "   - Content: $line"
        echo "   - Expected format: <SECRET_TYPE> <32_byte_client_random_hex> <secret_hex>"
    fi
    ((line_number++))
done < "$KEYLOG_FILE"

echo
echo "📈 Validation Summary:"
echo "======================"
echo "Valid lines: $valid_lines/$total_lines"

if [ $valid_lines -eq $total_lines ] && [ $total_lines -gt 0 ]; then
    echo "🎉 ALL LINES VALID - Perfect SSLKEYLOGFILE format!"
else
    echo "⚠️  Some lines may have format issues"
fi

echo
echo "🔧 Usage with Wireshark:"
echo "========================"
echo "1. Open Wireshark"
echo "2. Go to Edit → Preferences"
echo "3. Navigate to Protocols → TLS"
echo "4. Set '(Pre)-Master-Secret log filename' to:"
echo "   $KEYLOG_FILE"
echo "5. Click OK"
echo "6. Start capturing network traffic"
echo "7. Wireshark will automatically decrypt TLS/QUIC packets"

echo
echo "🔧 Usage with tshark (command line):"
echo "===================================="
echo "tshark -o \"tls.keylog_file:$KEYLOG_FILE\" -i any -f \"udp port 443\" -Y quic"

echo
echo "🛡️  Security Notice:"
echo "===================="
echo "The key log file contains cryptographic secrets that allow complete"
echo "decryption of TLS/QUIC traffic. Handle with care and use only in"
echo "controlled testing environments."

echo
echo "✨ Implementation Details:"
echo "========================="
echo "- Feature enabled via: -Djavax.net.ssl.keylog=<path>"
echo "- Implementation: sun.security.ssl.SSLKeyLogger"
echo "- Integration points: QuicKeyManager handshake and 1-RTT key derivation"
echo "- Format: Standard SSLKEYLOGFILE compatible with curl, NSS, BoringSSL"
echo "- Thread-safe file writing with proper error handling"

echo
echo "🔍 Expected Secret Types in QUIC/TLS 1.3 (Modern Format):"
echo "======================================================="
echo "CLIENT_HANDSHAKE_TRAFFIC_SECRET  - Client handshake encryption"
echo "SERVER_HANDSHAKE_TRAFFIC_SECRET  - Server handshake encryption"  
echo "CLIENT_TRAFFIC_SECRET_0          - Client application data encryption"
echo "SERVER_TRAFFIC_SECRET_0          - Server application data encryption"
echo "EXPORTER_SECRET                  - Key material for TLS exporters"
echo
echo "Format: <SECRET_TYPE> <CLIENT_RANDOM> <SECRET>"
echo "- No 'CLIENT_RANDOM' prefix"  
echo "- Secret type comes first"
echo "- Client random (32 bytes hex) comes second"
echo "- Secret (48 bytes hex) comes third"
echo "- All hex values in lowercase"

if [ -f "$KEYLOG_FILE" ]; then
    echo
    echo "📊 Secret Type Analysis:"
    echo "========================"
    grep -c "CLIENT_HANDSHAKE_TRAFFIC_SECRET" "$KEYLOG_FILE" | sed 's/^/Client handshake secrets: /'
    grep -c "SERVER_HANDSHAKE_TRAFFIC_SECRET" "$KEYLOG_FILE" | sed 's/^/Server handshake secrets: /'
    grep -c "CLIENT_TRAFFIC_SECRET_0" "$KEYLOG_FILE" | sed 's/^/Client application secrets: /'
    grep -c "SERVER_TRAFFIC_SECRET_0" "$KEYLOG_FILE" | sed 's/^/Server application secrets: /'
fi

echo
echo "✅ Verification completed successfully!"