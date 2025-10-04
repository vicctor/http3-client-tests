# Use nginx with HTTP/3 support
FROM nginx:1.25-alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl

# Create directories for certificates and content
RUN mkdir -p /etc/nginx/certs /var/www/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy sample content and static resources
COPY index.html /var/www/html/
COPY api.json /var/www/html/
COPY static/ /var/www/html/static/

# Copy certificate generation script
COPY generate-certs.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/generate-certs.sh

# Generate self-signed certificates
RUN /usr/local/bin/generate-certs.sh

# Expose ports for HTTP, HTTPS, and HTTP/3
EXPOSE 80 443 443/udp

# Start nginx
CMD ["nginx", "-g", "daemon off;"]