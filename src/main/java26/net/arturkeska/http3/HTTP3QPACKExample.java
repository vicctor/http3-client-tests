package net.arturkeska.http3;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

public class HTTP3QPACKExample {

    // Result tracking for summary display
    static class HTTP3TestResult {
        final String serverUrl;
        final boolean success;
        final String clientType;
        final String errorMessage;
        final long responseTimeMs;
        final int statusCode;
        
        HTTP3TestResult(String serverUrl, boolean success, String clientType, 
                       String errorMessage, long responseTimeMs, int statusCode) {
            this.serverUrl = serverUrl;
            this.success = success;
            this.clientType = clientType;
            this.errorMessage = errorMessage;
            this.responseTimeMs = responseTimeMs;
            this.statusCode = statusCode;
        }
    }
    
    private static final List<HTTP3TestResult> testResults = new ArrayList<>();

    public static void main(String[] args) {
        // Enable comprehensive debugging
        //enableDebugging();

        try {
            // Test only HTTP/3 - no fallback to HTTP/2
            testHTTP3Only();
        } catch (Exception e) {
            System.err.println("HTTP/3 test failed: " + e.getMessage());
            e.printStackTrace();
        } finally {
            // Always show the summary, regardless of success or failure
            displayHTTP3TestSummary();
            
            // Exit with error code if no HTTP/3 connections succeeded
            boolean anySuccess = testResults.stream().anyMatch(r -> r.success);
            if (!anySuccess) {
                System.exit(1);
            }
        }
    }

    private static void enableDebugging() {
        System.out.println("Enabling debug logging...");

        // SSL/TLS debugging
        System.setProperty("javax.net.debug", "ssl:handshake:verbose");

        // HTTP Client debugging (if available)
        System.setProperty("jdk.httpclient.debug", "true");
        System.setProperty("jdk.internal.httpclient.debug", "true");
        System.setProperty("jdk.internal.httpclient.quic.debug", "true");

        // QUIC specific debugging
        System.setProperty("jdk.net.quic.debug", "true");

        // JVM networking debugging
        System.setProperty("java.net.debug", "all");

        System.out.println("Debug properties set. Starting HTTP/3 test...\n");
    }

    private static void testHTTP3Only() throws Exception {
        String[] testServers = {
                "notenote",           // Cloudflare test server
                "https://quic.rocks",                    // HTTP/3 test server
                "https://http3check.net",                // HTTP/3 checker
                "https://www.facebook.com",              // Facebook supports HTTP/3
                "https://www.youtube.com",               // YouTube supports HTTP/3
                "https://blog.cloudflare.com",           // Cloudflare blog
                "https://www.google.com",                // Google (may support HTTP/3)
                "https://example.com"
        };

        System.out.println("🚀 Starting HTTP/3-only tests for " + testServers.length + " servers...\n");
        
        for (String serverUrl : testServers) {
            System.out.println("Testing server: " + serverUrl);
            System.out.println("=" + "=".repeat(serverUrl.length() + 15));

            testSingleServerWithTracking(serverUrl);
            System.out.println(); // Add spacing between server tests
        }

        // Check if we had any successes
        boolean http3Success = testResults.stream().anyMatch(r -> r.success);
        
        if (!http3Success) {
            System.err.println("\n❌ CRITICAL: All HTTP/3 servers failed!");
            System.err.println("HTTP/3 connection could not be established with any server.");
            System.err.println("This could indicate:");
            System.err.println("1. Network/firewall blocking UDP traffic (required for QUIC/HTTP3)");
            System.err.println("2. JVM HTTP/3 implementation issues");
            System.err.println("3. Server-side HTTP/3 support problems");
            System.err.println("\n🚫 NO HTTP/2 FALLBACK - Application configured for HTTP/3 only!");
        }
    }

    private static void testSingleServerWithTracking(String serverUrl) {
        try {
            HTTP3TestResult result = testSingleServer(serverUrl);
            testResults.add(result);
            
            if (result.success) {
                System.out.println("✅ HTTP/3 SUCCESS for: " + serverUrl);
            }
            
        } catch (Exception e) {
            // Track failed attempts
            testResults.add(new HTTP3TestResult(serverUrl, false, "Failed", 
                e.getMessage(), 0, 0));
            
            System.err.println("❌ HTTP/3 FAILED for: " + serverUrl);
            System.err.println("Error: " + e.getMessage());

            if (e.getCause() != null) {
                System.err.println("Cause: " + e.getCause().getMessage());
            }

            System.err.println("Stack trace preview:");
            StackTraceElement[] stack = e.getStackTrace();
            for (int i = 0; i < Math.min(3, stack.length); i++) {
                System.err.println("  at " + stack[i]);
            }
        }
    }

    private static HTTP3TestResult testSingleServer(String baseUrl) throws Exception {
        // Test with different SSL configurations
        HttpClient[] clients = {
                createBasicHTTP3Client(),
                createCustomSSLHTTP3Client(),
                createPermissiveHTTP3Client()
        };

        String[] clientNames = {
                "Basic HTTP/3 Client",
                "Custom SSL HTTP/3 Client",
                "Permissive HTTP/3 Client"
        };

        // Resolve and display target IP address
        String targetIP = resolveServerIP(baseUrl);

        for (int i = 0; i < clients.length; i++) {
            System.out.println("Trying with: " + clientNames[i]);

            try {
                HttpClient client = clients[i];

                var requestBuilder = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl))
                        .header("User-Agent", "Java-HTTP3-Test/1.0")
                        .header("x-conference", "jdd")
                        .header("x-conference-year", "2025")
                        .header("x-conference-text", "kto nie ryzykuje ten nie je ziemiakow");


                for (int k  = 0; k < 300; k++) {
                    requestBuilder = requestBuilder.header("x-sample-" + k, baseUrl + "/" + k + "/" + java.util.UUID.randomUUID().toString());
                }

                HttpRequest request = requestBuilder.GET()
                        .build();


                System.out.println("Sending request to: " + baseUrl);
                if (targetIP != null) {
                    System.out.println("🎯 Target IP: " + targetIP);
                }

                long startTime = System.currentTimeMillis();
                HttpResponse<String> response = client.send(request,
                        HttpResponse.BodyHandlers.ofString());
                long endTime = System.currentTimeMillis();
                long responseTime = endTime - startTime;

                System.out.println("Response received!");
                System.out.println("Status: " + response.statusCode());
                System.out.println("Version: " + response.version());
                
                // CRITICAL: Validate that we actually got HTTP/3, not a fallback
                if (response.version() != HttpClient.Version.HTTP_3) {
                    throw new RuntimeException("FAILED: Expected HTTP/3 but got " + response.version() + 
                        " - No fallback allowed!");
                }
                
                System.out.println("✅ CONFIRMED: Using HTTP/3 protocol");
                System.out.println("Time: " + responseTime + "ms");
                
                // Show IP and connection information
                String connectionInfo = extractConnectionInfo(response);
                System.out.println("🌐 Remote IP: " + (targetIP != null ? targetIP : "Unknown"));
                if (!connectionInfo.isEmpty()) {
                    System.out.println("🔗 Connection: " + connectionInfo);
                }
                
                System.out.println("Headers:");
                response.headers().map().forEach((k, v) ->
                        System.out.println("  " + k + ": " + v));

                String body = response.body();
                System.out.println("Body length: " + body.length() + " chars");
                System.out.println("Body preview: " +
                        body.substring(0, Math.min(200, body.length())) + "...");

                // Return successful result with IP information
                return new HTTP3TestResult(baseUrl, true, clientNames[i], null, 
                    responseTime, response.statusCode());

            } catch (Exception e) {
                System.err.println("Failed with " + clientNames[i] + ": " + e.getMessage());
                if (i == clients.length - 1) {
                    throw e; // Rethrow if last attempt
                }
            }
        }
        
        // This shouldn't be reached due to the exception throwing above
        throw new RuntimeException("All client configurations failed");
    }

    private static String resolveServerIP(String serverUrl) {
        try {
            java.net.URI uri = java.net.URI.create(serverUrl);
            String hostname = uri.getHost();
            java.net.InetAddress address = java.net.InetAddress.getByName(hostname);
            return address.getHostAddress() + " (" + hostname + ")";
        } catch (Exception e) {
            System.out.println("⚠️  DNS resolution failed for " + serverUrl + ": " + e.getMessage());
            return null;
        }
    }

    private static String extractConnectionInfo(HttpResponse<?> response) {
        StringBuilder info = new StringBuilder();
        
        // Check for server identification headers
        response.headers().firstValue("server").ifPresent(server -> 
            info.append("Server: ").append(server).append(" | "));
        
        // Check for CloudFlare ray ID (indicates specific server instance)
        response.headers().firstValue("cf-ray").ifPresent(ray -> 
            info.append("CF-Ray: ").append(ray.substring(0, Math.min(8, ray.length()))).append("... | "));
        
        // Check for Alt-Svc header (HTTP/3 advertisement)
        response.headers().firstValue("alt-svc").ifPresent(altSvc -> {
            if (altSvc.contains("h3")) {
                info.append("HTTP/3-Enabled | ");
            }
        });

        // Check for other interesting headers
        response.headers().firstValue("x-served-by").ifPresent(servedBy -> 
            info.append("Served-By: ").append(servedBy).append(" | "));

        response.headers().firstValue("x-cache").ifPresent(cache -> 
            info.append("Cache: ").append(cache).append(" | "));
        
        String result = info.toString();
        return result.endsWith(" | ") ? result.substring(0, result.length() - 3) : result;
    }

    private static HttpClient createBasicHTTP3Client() {
        System.out.println("  Creating basic HTTP/3-only client (no fallback)");
        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    private static HttpClient createCustomSSLHTTP3Client() throws Exception {
        System.out.println("  Creating HTTP/3 client with TLS 1.3 enforcement");
        SSLContext sslContext = SSLContext.getDefault();
        SSLParameters sslParams = sslContext.getDefaultSSLParameters();

        // Force TLS 1.3 (required for HTTP/3)
        sslParams.setProtocols(new String[]{"TLSv1.3"});
        
        // Add QUIC/HTTP3 specific ciphers
        String[] cipherSuites = {
            "TLS_AES_128_GCM_SHA256",
            "TLS_AES_256_GCM_SHA384", 
            "TLS_CHACHA20_POLY1305_SHA256"
        };
        sslParams.setCipherSuites(cipherSuites);

        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(Duration.ofSeconds(15))
                .sslContext(sslContext)
                .sslParameters(sslParams)
                .build();
    }

    private static HttpClient createPermissiveHTTP3Client() throws Exception {
        System.out.println("  Creating permissive HTTP/3 client (testing only)");
        // Create a more permissive SSL context (for testing only!)
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, null, null);

        SSLParameters sslParams = new SSLParameters();
        // Force TLS 1.3 (required for HTTP/3)
        sslParams.setProtocols(new String[]{"TLSv1.3"});
        sslParams.setEndpointIdentificationAlgorithm(null); // Disable hostname verification

        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(Duration.ofSeconds(20))
                .sslContext(sslContext)
                .sslParameters(sslParams)
                .build();
    }



    // Method to check system HTTP/3 support
    public static void checkHTTP3Support() {
        System.out.println("Checking HTTP/3 support...");
        System.out.println("Java Version: " + System.getProperty("java.version"));
        System.out.println("Java Vendor: " + System.getProperty("java.vendor"));

        try {
            // Try to access HTTP/3 version enum
            HttpClient.Version http3 = HttpClient.Version.HTTP_3;
            System.out.println("✅ HTTP/3 enum available: " + http3);
        } catch (Exception e) {
            System.err.println("❌ HTTP/3 not available in this JVM: " + e.getMessage());
        }

        // Check TLS 1.3 support
        try {
            SSLContext sslContext = SSLContext.getDefault();
            SSLParameters params = sslContext.getDefaultSSLParameters();
            String[] protocols = params.getProtocols();
            boolean hasTLS13 = false;

            System.out.println("Available TLS protocols:");
            for (String protocol : protocols) {
                System.out.println("  - " + protocol);
                if ("TLSv1.3".equals(protocol)) {
                    hasTLS13 = true;
                }
            }

            if (hasTLS13) {
                System.out.println("✅ TLS 1.3 is available");
            } else {
                System.err.println("❌ TLS 1.3 not available - required for HTTP/3");
            }

        } catch (Exception e) {
            System.err.println("❌ Error checking TLS support: " + e.getMessage());
        }

        System.out.println();
    }

    private static void displayHTTP3TestSummary() {
        System.out.println("\n" + "=".repeat(80));
        System.out.println("🔍 HTTP/3 TEST RESULTS SUMMARY");
        System.out.println("=".repeat(80));
        
        if (testResults.isEmpty()) {
            System.out.println("❌ No test results to display");
            return;
        }
        
        int successCount = 0;
        int failureCount = 0;
        java.util.Set<String> uniqueIPs = new java.util.HashSet<>();
        java.util.Map<String, java.util.List<String>> ipToServers = new java.util.HashMap<>();
        
        System.out.println("📊 SERVICE STATUS OVERVIEW:");
        System.out.println();
        
        for (HTTP3TestResult result : testResults) {
            String statusGlyph;
            String statusText;
            String details = "";
            String serverIP = resolveServerIP(result.serverUrl);
            String displayIP = serverIP != null ? serverIP.split(" ")[0] : "Unknown";
            
            if (result.success) {
                statusGlyph = "✅";
                statusText = "HTTP/3 SUCCESS";
                details = String.format(" | %dms | Status: %d | Client: %s | IP: %s", 
                    result.responseTimeMs, result.statusCode, result.clientType, displayIP);
                successCount++;
                
                if (serverIP != null) {
                    uniqueIPs.add(displayIP);
                    ipToServers.computeIfAbsent(displayIP, k -> new java.util.ArrayList<>())
                              .add(result.serverUrl);
                }
            } else {
                statusGlyph = "❌";
                statusText = "HTTP/3 FAILED ";
                String errorMsg = result.errorMessage != null ? 
                    (result.errorMessage.length() > 40 ? 
                        result.errorMessage.substring(0, 40) + "..." : 
                        result.errorMessage) : "Unknown error";
                details = " | Error: " + errorMsg + " | IP: " + displayIP;
                failureCount++;
                
                if (serverIP != null) {
                    uniqueIPs.add(displayIP);
                }
            }
            
            System.out.printf("%-3s %-50s %s%s%n", 
                statusGlyph, result.serverUrl, statusText, details);
        }
        
        System.out.println();
        System.out.println("📈 SUMMARY STATISTICS:");
        System.out.printf("   ✅ Successful HTTP/3 connections: %d%n", successCount);
        System.out.printf("   ❌ Failed connections:            %d%n", failureCount);
        System.out.printf("   📊 Total servers tested:          %d%n", testResults.size());
        System.out.printf("   🌐 Unique IP addresses:           %d%n", uniqueIPs.size());
        System.out.printf("   📈 Success rate:                 %.1f%%%n", 
            testResults.size() > 0 ? (100.0 * successCount / testResults.size()) : 0.0);
        
        System.out.println();
        
        if (successCount > 0) {
            System.out.println("🎉 SUCCESS: HTTP/3 connections established!");
            
            // Show successful servers with IP information
            System.out.println("✅ HTTP/3 WORKING SERVERS:");
            testResults.stream()
                .filter(r -> r.success)
                .forEach(r -> {
                    String serverIP = resolveServerIP(r.serverUrl);
                    String displayIP = serverIP != null ? serverIP.split(" ")[0] : "Unknown";
                    System.out.printf("   🌐 %-40s (%dms) → %s%n", 
                        r.serverUrl, r.responseTimeMs, displayIP);
                });
                
            // Show IP address distribution
            if (!ipToServers.isEmpty()) {
                System.out.println();
                System.out.println("📡 IP ADDRESS DISTRIBUTION:");
                ipToServers.forEach((ip, servers) -> {
                    System.out.printf("   🔗 %s: %d server(s)%n", ip, servers.size());
                    servers.forEach(server -> System.out.printf("      └─ %s%n", server));
                });
            }
                    
        } else {
            System.out.println("💥 FAILURE: No HTTP/3 connections succeeded!");
            System.out.println("🚫 All servers failed to establish HTTP/3 connections.");
            System.out.println();
            System.out.println("🔧 TROUBLESHOOTING SUGGESTIONS:");
            System.out.println("   1. Check if UDP port 443 is blocked by firewall");
            System.out.println("   2. Verify JDK has HTTP/3/QUIC support enabled");
            System.out.println("   3. Confirm network allows QUIC protocol traffic");
            System.out.println("   4. Test with a known HTTP/3 server like cloudflare-quic.com");
            System.out.println("   5. Check if servers actually support HTTP/3/QUIC");
        }
        
        System.out.println("=".repeat(80));
        
        // Additional detailed failure analysis if needed
        if (failureCount > 0 && successCount == 0) {
            System.out.println("🔍 DETAILED FAILURE ANALYSIS:");
            testResults.stream()
                .filter(r -> !r.success)
                .forEach(r -> {
                    String serverIP = resolveServerIP(r.serverUrl);
                    String displayIP = serverIP != null ? serverIP.split(" ")[0] : "Unknown";
                    System.out.printf("❌ %s → %s%n", r.serverUrl, displayIP);
                    System.out.printf("   └─ %s%n", r.errorMessage);
                });
            System.out.println("=".repeat(80));
        }
    }
}

// HTTP/3-only approach - no fallback to HTTP/2
/*
This example is configured for HTTP/3 ONLY - no HTTP/2 fallback.
If HTTP/3 connection fails, the application will terminate with an error.

Run with these JVM arguments for maximum debugging:

java -Djavax.net.debug=ssl:handshake:verbose \
     -Djdk.httpclient.debug=true \
     -Djdk.internal.httpclient.debug=true \
     -Djdk.internal.httpclient.quic.debug=true \
     -Djdk.net.quic.debug=true \
     -Djava.net.debug=all \
     HTTP3DebugExample

Requirements for HTTP/3:
- JDK 21+ with HTTP/3 support
- TLS 1.3 support
- QUIC protocol support
- UDP traffic not blocked by firewall
- Server must support HTTP/3/QUIC protocol

Or create a shell script:
#!/bin/bash
export JAVA_OPTS="-Djavax.net.debug=ssl:handshake:verbose -Djdk.httpclient.debug=true"
java $JAVA_OPTS HTTP3DebugExample
*/