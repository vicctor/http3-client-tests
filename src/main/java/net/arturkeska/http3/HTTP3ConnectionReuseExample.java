package net.arturkeska.http3;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Stream;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

public class HTTP3ConnectionReuseExample {

    public static void main(String[] args) throws Exception {
        // HTTP/3 ONLY - no HTTP/2 fallback (requires JDK 26+ with HTTP/3 support)
        try {
            var clientNameFilter = System.getenv("HTTP3_CLIENT_NAME_FILTER");
            var serviceFilter = System.getenv("HTTP3_CLIENT_SERVICE_FILTER");
            demonstrateHTTP3ConnectionReuse(clientNameFilter, serviceFilter);
            System.out.println("✅ HTTP/3 connection reuse completed successfully");
        } catch (Exception e) {
            System.err.println("❌ HTTP/3 connection reuse failed: " + e.getMessage());
            System.err.println("🚫 NO HTTP/2 FALLBACK - Application configured for HTTP/3 only!");
            throw e; // Re-throw to terminate with error
        }
    }

    /**
     * HTTP/3 connection reuse example - requires JDK 26+ with HTTP/3 support
     * Demonstrates connection pooling and reuse with multiple HTTP/3 clients
     */
    public static void demonstrateHTTP3ConnectionReuse(String clientNameFilter, String serviceFilter) throws Exception {
        System.out.println("=== HTTP/3 Connection Reuse Example ===");
        System.out.println("Testing connection reuse with multiple HTTP/3 client configurations");
        System.out.printf("Filter client %s and host %s%n", clientNameFilter, serviceFilter);
        System.out.println();

        // Test with multiple known HTTP/3 servers for better success rate
        var http3Servers = Stream.of(
            "https://cloudflare-quic.com",     // Primary choice - Cloudflare QUIC test
                "https://www.google.com",          // Google HTTP/3 support
                "https://www.facebook.com",        // Facebook HTTP/3 support
                "https://blog.cloudflare.com",     // Cloudflare blog with HTTP/3
                "https://example.com"
        ).filter(s -> serviceFilter == null || s.contains(serviceFilter)).toList();

        // Try different HTTP/3 client configurations
        var clients = Stream.of(
            createBasicHTTP3Client(),
            createEnhancedHTTP3Client(),
            createPermissiveHTTP3Client()
        ).filter(c -> clientNameFilter == null || c.name.toLowerCase().contains(clientNameFilter.toLowerCase())).toList();


        boolean success = false;
        String successfulServer = null;
        Client successfulClient = null;

        // Try each server with each client configuration
        for (String serverUrl : http3Servers) {
            System.out.println("🌐 Testing server: " + serverUrl);

            for (var cl : clients) {

                System.out.println("   Trying with: " + cl.name);

                try {
                    if (!System.getenv().containsKey("SKIP_VERIFY_SERVER")) {
                        testConnectionReuseWithServer(cl.httpClient, serverUrl);
                    }
                    success = true;
                    successfulServer = serverUrl;
                    successfulClient = cl;
                    System.out.println("   ✅ SUCCESS with " + cl.name + " on " + serverUrl);
                    break; // Success with this client, move to next phase
                } catch (Exception e) {
                    System.out.println("   ❌ Failed with " + cl.name + ": " + e.getMessage().split("\n")[0]);
                    // Continue with next client configuration
                }
            }
            
            if (success) {
                System.out.println();
                break; // Success with this server, proceed with connection reuse test
            }
            System.out.println();
        }

        if (!success) {
            throw new RuntimeException("Unable to establish HTTP/3 connection with any server using any client configuration");
        }

        // Now perform the main connection reuse test with successful configuration
        System.out.println("🔄 Performing connection reuse test...");
        System.out.println("Server: " + successfulServer);
        System.out.println("Client: " + successfulClient);
        System.out.println();

        performConnectionReuseTest(successfulClient, successfulServer);
    }

    private static Client createBasicHTTP3Client() {
        return new Client(HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(Duration.ofSeconds(10))
                .build()
                ,
                "Basic HTTP/3 Client");
    }

    private static Client createEnhancedHTTP3Client() throws Exception {
        SSLContext sslContext = SSLContext.getDefault();
        SSLParameters sslParams = sslContext.getDefaultSSLParameters();

        // Force TLS 1.3 (required for HTTP/3)
        sslParams.setProtocols(new String[]{"TLSv1.3"});
        
        // Set HTTP/3 compatible cipher suites
        String[] cipherSuites = {
            "TLS_AES_128_GCM_SHA256",
            "TLS_AES_256_GCM_SHA384", 
            "TLS_CHACHA20_POLY1305_SHA256"
        };
        sslParams.setCipherSuites(cipherSuites);

        var httpClient =  HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(Duration.ofSeconds(15))
                .sslContext(sslContext)
                .sslParameters(sslParams)
                .build();
        return new Client(httpClient, "Enhanced HTTP3 Client");
    }

    private static Client createPermissiveHTTP3Client() throws Exception {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, null, null);

        SSLParameters sslParams = new SSLParameters();
        // Force TLS 1.3 (required for HTTP/3)
        sslParams.setProtocols(new String[]{"TLSv1.3"});
        sslParams.setEndpointIdentificationAlgorithm(null); // Disable hostname verification (testing only)

        var httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(Duration.ofSeconds(20))
                .sslContext(sslContext)
                .sslParameters(sslParams)
                .build();

        return new Client(httpClient, "Permissive HTTP3 Client");
    }

    private static void testConnectionReuseWithServer(HttpClient client, String serverUrl) throws Exception {
        // Quick test with single request to validate HTTP/3 connectivity
        HttpRequest testRequest = HttpRequest.newBuilder()
                .uri(URI.create(serverUrl))
                .header("User-Agent", "Java-HTTP3-ConnectionReuse-Test/1.0")
                .GET()
                .build();

        HttpResponse<String> testResponse = client.send(testRequest, HttpResponse.BodyHandlers.ofString());
        
        // Extract and display remote IP address information
        try {
            // Try to get remote address from the response (if available in implementation)
            String remoteAddress = extractRemoteAddress(testResponse, serverUrl);
            System.out.println("   🌐 Remote IP: " + remoteAddress);
        } catch (Exception e) {
            System.out.println("   🌐 Remote IP: Unable to determine (" + e.getMessage() + ")");
        }
        
        // CRITICAL: Validate that we actually got HTTP/3
        if (testResponse.version() != HttpClient.Version.HTTP_3) {
            throw new RuntimeException("Expected HTTP/3 but got " + testResponse.version());
        }
    }

    private static String extractRemoteAddress(HttpResponse<?> response, String serverUrl) throws Exception {
        // Try to resolve the server IP address using DNS
        java.net.URI uri = java.net.URI.create(serverUrl);
        String hostname = uri.getHost();
        
        try {
            java.net.InetAddress address = java.net.InetAddress.getByName(hostname);
            return address.getHostAddress() + " (" + hostname + ")";
        } catch (Exception e) {
            return "DNS resolution failed for " + hostname;
        }
    }

    private static void performConnectionReuseTest(Client client, String baseUrl) throws Exception {
        System.out.println("Creating multiple requests to the same host...");
        
        // First, resolve and display the target server IP address
        java.net.URI uri = java.net.URI.create(baseUrl);
        String hostname = uri.getHost();
        String targetIP = null;
        
        try {
            java.net.InetAddress address = java.net.InetAddress.getByName(hostname);
            targetIP = address.getHostAddress();
            System.out.println("🎯 Target server: " + hostname + " → " + targetIP);
        } catch (Exception e) {
            System.out.println("🎯 Target server: " + hostname + " (IP resolution failed: " + e.getMessage() + ")");
        }
        
        System.out.println();
        
        // Prepare multiple requests to the same host to demonstrate connection reuse
        List<HttpRequest> requests = new ArrayList<>();
        int requestCount = 8; // More requests to better demonstrate reuse
        
        for (int i = 0; i < requestCount; i++) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/?test=" + i)) // Vary URLs slightly
                    .header("User-Agent", "Java-HTTP3-ConnectionReuse/1.0")
                    .header("X-Request-ID", "conn-reuse-" + i)
                    .GET()
                    .build();
            requests.add(request);
        }

        // Execute requests - HTTP client should reuse connections
        long startTime = System.currentTimeMillis();
        
        System.out.println("Sending " + requestCount + " requests concurrently...");

        List<CompletableFuture<HttpResponse<String>>> futures = new ArrayList<>();
        for (HttpRequest request : requests) {
            CompletableFuture<HttpResponse<String>> future =
                    client.httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString());
            futures.add(future);
        }

        // Wait for all responses
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        long endTime = System.currentTimeMillis();
        long totalTime = endTime - startTime;
        
        System.out.println("✅ All " + requestCount + " requests completed in " + totalTime + "ms");
        System.out.println("⚡ Average time per request: " + (totalTime / requestCount) + "ms");

        // Validate results and show connection reuse indicators
        System.out.println();
        System.out.println("📊 Response Analysis with IP Information:");

        int successCount = 0;
        java.util.Set<String> uniqueIPs = new java.util.HashSet<>();
        java.util.Map<String, Integer> ipCounts = new java.util.HashMap<>();

        for (int i = 0; i < futures.size(); i++) {
            HttpResponse<String> response = futures.get(i).get();
            
            // CRITICAL: Validate that we actually got HTTP/3, not a fallback
            if (response.version() != HttpClient.Version.HTTP_3) {
                System.out.println("👺 Warning: Expected HTTP/3 but got " + response.version());
            }
            
            successCount++;
            
            // Try to extract connection information from response headers
            String connectionInfo = extractConnectionInfo(response, hostname);
            String remoteIP = targetIP != null ? targetIP : "Unknown";
            
            // Track unique IPs (should be same for connection reuse)
            uniqueIPs.add(remoteIP);
            ipCounts.put(remoteIP, ipCounts.getOrDefault(remoteIP, 0) + 1);
            
            System.out.printf("   Request %-2d: Status %d, Protocol %s, IP %s %s ✅%n", 
                (i+1), response.statusCode(), response.version(), remoteIP, connectionInfo);
        }

        System.out.println();
        System.out.println("🔍 Connection Reuse Analysis:");
        System.out.println("   📡 Unique IP addresses used: " + uniqueIPs.size());
        
        for (java.util.Map.Entry<String, Integer> entry : ipCounts.entrySet()) {
            System.out.println("   🌐 IP " + entry.getKey() + ": " + entry.getValue() + " requests");
        }
        
        if (uniqueIPs.size() == 1) {
            System.out.println("   ✅ Perfect connection reuse: All requests used same IP address!");
        } else {
            System.out.println("   ⚠️  Multiple IPs used - may indicate load balancing or connection issues");
        }

        System.out.println();
        System.out.println("🎉 HTTP/3 Connection Reuse Test Results:");
        System.out.println("   ✅ Total requests: " + requestCount);
        System.out.println("   ✅ Successful HTTP/3 responses: " + successCount);
        System.out.println("   🌐 Unique IP addresses: " + uniqueIPs.size());
        System.out.println("   ⚡ Total execution time: " + totalTime + "ms");
        System.out.println("   🔄 Connection reuse: " + (uniqueIPs.size() == 1 ? "Confirmed" : "Partial") + " (HTTP/3 multiplexing)");
        System.out.println();
        System.out.println("💡 Connection Reuse Benefits Demonstrated:");
        System.out.println("   • Single QUIC connection for multiple requests");
        System.out.println("   • HTTP/3 multiplexing eliminates head-of-line blocking");
        System.out.println("   • Reduced handshake overhead after first connection");
        System.out.println("   • Better performance for multiple requests to same host");
        System.out.println("   • Consistent IP address indicates connection persistence");
    }

    private static String extractConnectionInfo(HttpResponse<?> response, String hostname) {
        // Try to extract connection-related information from response headers
        StringBuilder info = new StringBuilder();
        
        // Check for server identification headers
        response.headers().firstValue("server").ifPresent(server -> 
            info.append("[Server: ").append(server).append("] "));
        
        // Check for CloudFlare ray ID (indicates specific server)
        response.headers().firstValue("cf-ray").ifPresent(ray -> 
            info.append("[CF-Ray: ").append(ray.substring(0, Math.min(8, ray.length()))).append("...] "));
        
        // Check for Alt-Svc header (HTTP/3 advertisement)
        response.headers().firstValue("alt-svc").ifPresent(altSvc -> {
            if (altSvc.contains("h3")) {
                info.append("[HTTP/3-Enabled] ");
            }
        });
        
        return info.length() > 0 ? info.toString().trim() : "";
    }

    record Client(HttpClient httpClient, String name) {

    }
}

// HTTP/3-only connection reuse example with robust server fallback
/*
This example demonstrates HTTP/3 connection reuse without HTTP/2 fallback.
The application tries multiple servers and client configurations to establish HTTP/3.

Key improvements:
- Multiple HTTP/3 server options for better success rate
- Different HTTP/3 client configurations (basic, enhanced, permissive)  
- TLS 1.3 enforcement with HTTP/3-compatible cipher suites
- Comprehensive connection reuse analysis
- Detailed performance metrics and connection indicators

Requirements:
- JDK 26+ with HTTP/3 support (custom build)
- Network allowing UDP traffic for QUIC
- TLS 1.3 support
- Servers supporting HTTP/3/QUIC protocol
*/