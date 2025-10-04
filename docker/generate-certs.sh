#!/bin/sh
# Generate self-signed SSL certificates for HTTP/3 testing

CERT_DIR="/etc/nginx/certs"
DOMAIN="http3-test.local"

echo "🔐 Generating SSL certificates for HTTP/3..."

# Create certificate directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/server.key" 2048

# Create certificate extensions for SAN
cat > "$CERT_DIR/server.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
DNS.3 = *.http3-test.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate self-signed certificate directly (skip CSR step)
openssl req -new -x509 -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" -days 365 \
    -subj "/C=US/ST=Test/L=Test/O=HTTP3-Test/OU=IT/CN=$DOMAIN/emailAddress=test@http3-test.local" \
    -extensions v3_req -config <(
        echo '[v3_req]'
        echo 'keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment'
        echo 'subjectAltName = @alt_names'
        echo '[alt_names]'
        echo "DNS.1 = $DOMAIN"
        echo 'DNS.2 = localhost'
        echo 'DNS.3 = *.http3-test.local'
        echo 'IP.1 = 127.0.0.1'
        echo 'IP.2 = ::1'
    )

# Set proper permissions
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

# Clean up temporary files
rm -f "$CERT_DIR/server.ext"

echo "✅ SSL certificates generated successfully!"
echo "   Certificate: $CERT_DIR/server.crt"
echo "   Private Key: $CERT_DIR/server.key"
echo "   Domain: $DOMAIN"

# Display certificate info (only if certificate exists)
if [ -f "$CERT_DIR/server.crt" ]; then
    echo ""
    echo "📋 Certificate Information:"
    openssl x509 -in "$CERT_DIR/server.crt" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before|Not After)" || echo "Certificate info extraction failed (non-critical)"
fi