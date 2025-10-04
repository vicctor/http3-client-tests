#!/bin/bash

# Chrome HTTP/3 SSL Key Logging Script
# Starts Chrome with SSL key logging enabled for HTTP/3 traffic analysis

# Configuration
KEYLOG_FILE="/home/grxybek/tata/http3-client-test/wireshark-samples/chrome-http3-ssl.key_log"
CHROME_USER_DATA="/tmp/chrome-http3-profile"
TARGET_URL="https://localhost:8443/"

echo "🌐 Starting Chrome with HTTP/3 SSL Key Logging"
echo "=============================================="
echo ""

# Create directories if they don't exist
mkdir -p "$(dirname "$KEYLOG_FILE")"
mkdir -p "$CHROME_USER_DATA"

# Clear previous key log file
> "$KEYLOG_FILE"

echo "📋 Configuration:"
echo "• SSL Key Log File: $KEYLOG_FILE"
echo "• Chrome Profile: $CHROME_USER_DATA"
echo "• Target URL: $TARGET_URL"
echo "• Target Server: Spring Boot HTTP/3 with Jetty"
echo ""

# Check if target server is running
echo "🔍 Checking target server..."
if curl -k "$TARGET_URL" --max-time 5 >/dev/null 2>&1; then
    echo "✅ Server is responding at $TARGET_URL"
else
    echo "⚠️  Server might not be responding, but continuing anyway..."
fi

echo ""
echo "🚀 Starting Chrome with the following features:"
echo "• HTTP/3 and QUIC enabled"
echo "• SSL key logging to: $KEYLOG_FILE"
echo "• Developer tools for network inspection"
echo "• Experimental web features enabled"
echo ""

# Chrome flags for HTTP/3 and SSL key logging
CHROME_FLAGS=(
    # SSL Key Logging (essential for Wireshark)
    "--ssl-key-log-file=$KEYLOG_FILE"
    
    # HTTP/3 and QUIC settings
    "--enable-quic"
    "--quic-version=h3"
    "--enable-experimental-web-features"
    "--enable-features=ViaHeader"
    
    # Security and certificate handling
    "--ignore-certificate-errors"
    "--ignore-ssl-errors"
    "--ignore-certificate-errors-spki-list"
    "--ignore-certificate-errors-skip-list"
    "--allow-running-insecure-content"
    
    # User data directory (isolated profile)
    "--user-data-dir=$CHROME_USER_DATA"
    
    # Development and debugging
    "--auto-open-devtools-for-tabs"
    "--enable-logging"
    "--log-level=0"
    
    # Network debugging
    "--enable-network-service-logging"
    "--net-log-capture-mode=Everything"
    
    # Additional HTTP/3 optimizations
    "--force-quic-port=8443"
    "--no-first-run"
    "--no-default-browser-check"
)

# Find Chrome executable
CHROME_PATHS=(
    "/usr/bin/google-chrome"
    "/usr/bin/chromium-browser"
    "/usr/bin/chromium"
    "/opt/google/chrome/chrome"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)

CHROME_EXEC=""
for chrome_path in "${CHROME_PATHS[@]}"; do
    if [[ -x "$chrome_path" ]]; then
        CHROME_EXEC="$chrome_path"
        break
    fi
done

if [[ -z "$CHROME_EXEC" ]]; then
    echo "❌ Chrome/Chromium not found in standard locations"
    echo "Please install Chrome or Chromium, or specify the path manually"
    exit 1
fi

echo "✅ Found Chrome: $CHROME_EXEC"
echo ""

# Export SSLKEYLOGFILE environment variable (backup method)
export SSLKEYLOGFILE="$KEYLOG_FILE"

echo "🔧 Starting Chrome with SSL key logging..."
echo "Command: $CHROME_EXEC ${CHROME_FLAGS[*]} '$TARGET_URL'"
echo ""

# Start Chrome with all the flags
"$CHROME_EXEC" "${CHROME_FLAGS[@]}" "$TARGET_URL" &
CHROME_PID=$!

echo "✅ Chrome started with PID: $CHROME_PID"
echo ""

# Wait a moment for Chrome to start
sleep 3

echo "📊 Monitoring SSL key log file..."
echo "File: $KEYLOG_FILE"
echo ""

# Monitor the key log file for a few seconds
for i in {1..10}; do
    if [[ -f "$KEYLOG_FILE" ]] && [[ -s "$KEYLOG_FILE" ]]; then
        LINES=$(wc -l < "$KEYLOG_FILE")
        SIZE=$(wc -c < "$KEYLOG_FILE")
        echo "📈 Key log activity: $LINES lines, $SIZE bytes"
        break
    else
        echo "⏳ Waiting for SSL key logging to start... ($i/10)"
        sleep 2
    fi
done

echo ""
if [[ -f "$KEYLOG_FILE" ]] && [[ -s "$KEYLOG_FILE" ]]; then
    echo "✅ SSL Key Logging Active!"
    echo "📄 Key log file contents:"
    echo "========================="
    head -5 "$KEYLOG_FILE"
    if [[ $(wc -l < "$KEYLOG_FILE") -gt 5 ]]; then
        echo "... ($(wc -l < "$KEYLOG_FILE") total lines)"
    fi
else
    echo "⚠️  SSL key logging may not be active yet"
    echo "This could be normal if no TLS connections have been made"
fi

echo ""
echo "🔧 Chrome HTTP/3 Testing Instructions:"
echo "======================================"
echo "1. Chrome should open with DevTools"
echo "2. Go to Network tab in DevTools"
echo "3. Navigate to: $TARGET_URL"
echo "4. Look for 'h3' in the Protocol column"
echo "5. Check Response Headers for Alt-Svc"
echo "6. Refresh page to trigger HTTP/3 upgrade"
echo ""

echo "📊 Wireshark Analysis:"
echo "======================"
echo "1. Open Wireshark"
echo "2. Start capturing on 'any' interface"
echo "3. Apply filter: quic or udp.port==8443"
echo "4. Go to Edit → Preferences → Protocols → TLS"
echo "5. Set '(Pre)-Master-Secret log filename' to:"
echo "   $KEYLOG_FILE"
echo "6. Click OK and watch decrypted HTTP/3 traffic!"
echo ""

echo "🏃 Background Process Management:"
echo "================================"
echo "• Chrome PID: $CHROME_PID"
echo "• Kill Chrome: kill $CHROME_PID"
echo "• Monitor key log: tail -f '$KEYLOG_FILE'"
echo "• Check server: curl -k $TARGET_URL"
echo ""

echo "📝 Next Steps:"
echo "=============="
echo "1. Use Chrome to browse $TARGET_URL"
echo "2. Monitor key log file for SSL secrets"
echo "3. Capture traffic with Wireshark/tshark"
echo "4. Analyze decrypted HTTP/3 traffic"
echo ""

# Keep script running to show monitoring
echo "Press Ctrl+C to stop monitoring (Chrome will keep running)"
echo ""

# Monitor the key log file in real-time
if command -v inotifywait >/dev/null 2>&1; then
    echo "🔍 Real-time monitoring (using inotify):"
    inotifywait -m -e modify "$KEYLOG_FILE" 2>/dev/null | while read -r line; do
        LINES=$(wc -l < "$KEYLOG_FILE" 2>/dev/null || echo "0")
        SIZE=$(wc -c < "$KEYLOG_FILE" 2>/dev/null || echo "0")
        echo "$(date '+%H:%M:%S') - Key log updated: $LINES lines, $SIZE bytes"
    done
else
    echo "🔍 Periodic monitoring (install inotify-tools for real-time):"
    while true; do
        if [[ -f "$KEYLOG_FILE" ]]; then
            LINES=$(wc -l < "$KEYLOG_FILE")
            SIZE=$(wc -c < "$KEYLOG_FILE")
            echo "$(date '+%H:%M:%S') - Key log status: $LINES lines, $SIZE bytes"
        fi
        sleep 5
    done
fi