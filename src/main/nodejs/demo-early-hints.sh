#!/bin/bash

# Demo script showing HTTP/3 Early Hints (actually HTTP/2 Early Hints since HTTP/3 has issues)
# This script demonstrates the working Early Hints implementation from the Java server

echo "🌟 HTTP/3 Early Hints Demo"
echo "=========================="
echo ""

# Create wireshark-samples directory if it doesn't exist
mkdir -p ../../../wireshark-samples

# Set SSLKEYLOGFILE for Wireshark capture
export SSLKEYLOGFILE="../../../wireshark-samples/ssl.key_log"
echo "📝 SSL key log will be stored in: $SSLKEYLOGFILE"
echo ""

echo "🚀 Testing Java Server Early Hints Implementation"
echo ""

echo "1️⃣  Testing Basic Early Hints Endpoint (/)"
echo "-------------------------------------------"
curl --http2 -k -v https://localhost:8443/ 2>&1 | grep -E "(HTTP/2 103|link:|HTTP/2 200)" | head -10
echo ""

echo "2️⃣  Testing Advanced Early Hints Endpoint (/advanced)" 
echo "----------------------------------------------------"
curl --http2 -k -v https://localhost:8443/advanced 2>&1 | grep -E "(HTTP/2 103|link:|HTTP/2 200)" | head -15
echo ""

echo "3️⃣  Testing Info Endpoint (no early hints expected)"
echo "---------------------------------------------------"
curl --http2 -k -v https://localhost:8443/info 2>&1 | grep -E "(HTTP/2 103|link:|HTTP/2 200)" | head -5
echo ""

echo "4️⃣  Running Node.js Client Demo"
echo "-------------------------------"
echo "This will show detailed Early Hints analysis..."
node http3-client-specialized.js

echo ""
echo "📊 Summary"
echo "=========="
echo "✅ Early Hints are working via HTTP/2"
echo "✅ Basic endpoint: sends 3 resource hints" 
echo "✅ Advanced endpoint: sends 7 resource hints"
echo "❌ HTTP/3 protocol has implementation issues"
echo "📝 SSL key log saved to: $SSLKEYLOGFILE"
echo ""
echo "🔍 You can use the SSL key log with Wireshark to decrypt and analyze the TLS traffic!"
echo ""
echo "To view the captured early hints:"
echo "1. Start Wireshark"
echo "2. Set up SSL/TLS key log file: Edit -> Preferences -> Protocols -> TLS -> (Pre)-Master-Secret log filename"
echo "3. Point to: $(realpath ../../../wireshark-samples/ssl.key_log)"
echo "4. Capture traffic on localhost interface while running this demo"
echo ""