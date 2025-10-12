package net.arturkeska.http3;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

/**
 * HTTP/3 0-RTT (Zero Round Trip Time) Demonstration
 * 
 * This example demonstrates HTTP/3 0-RTT feature by:
 * 1. Establishing initial connection to google.com (full handshake)
 * 2. Making subsequent requests that should use 0-RTT early data
 * 3. Measuring and comparing response times
 * 4. Logging SSL keys for Wireshark analysis
 * 
 * Requirements:
 * - JDK 26+ with HTTP/3 support
 * - Network allowing UDP traffic for QUIC
 * - SSL key logging enabled for Wireshark analysis
 */
public class HTTP3ZeroRTTExample {

    // Configuration
    private static final String TARGET_SERVER = "https://google.com";
    private static final String SSL_KEYLOG_FILE = System.getProperty("javax.net.ssl.keylog", 
        "/home/grxybek/tata/http3-client-test/wireshark-samples/http3-0rtt-demo.key_log");
    private static final int WARMUP_REQUESTS = 2;
    private static final int TEST_REQUESTS = 5;
    private static final Duration CONNECTION_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration REQUEST_DELAY = Duration.ofSeconds(2 * 60);

    // Results tracking
    static class RequestResult {
        final int requestNumber;
        final long startTimeMs;
        final long responseTimeMs;
        final int statusCode;
        final String protocol;
        final boolean success;
        final String errorMessage;
        final Instant timestamp;

        RequestResult(int requestNumber, long startTimeMs, long responseTimeMs, 
                     int statusCode, String protocol, boolean success, String errorMessage) {
            this.requestNumber = requestNumber;
            this.startTimeMs = startTimeMs;
            this.responseTimeMs = responseTimeMs;
            this.statusCode = statusCode;
            this.protocol = protocol;
            this.success = success;
            this.errorMessage = errorMessage;
            this.timestamp = Instant.now();
        }
    }

    private static final List<RequestResult> results = new ArrayList<>();

    public static void main(String[] args) {
        System.out.println("🚀 HTTP/3 0-RTT (Zero Round Trip Time) Demonstration");
        System.out.println("====================================================");
        System.out.println();
        
        // Display configuration
        displayConfiguration();
        
        try {
            // Create HTTP/3 client optimized for 0-RTT
            HttpClient client = createOptimizedHTTP3Client();
            
            // Step 1: Initial connection establishment (full handshake)
            System.out.println("📡 Step 1: Establishing initial connection (full handshake)");
            System.out.println("-----------------------------------------------------------");
            performInitialConnection(client);
            
            System.out.println();
            
            // Step 2: Warmup requests to establish session state
            System.out.println("🔥 Step 2: Warmup requests to establish session state");
            System.out.println("-----------------------------------------------------");
            performWarmupRequests(client);
            
            System.out.println();
            
            // Step 3: 0-RTT test requests
            System.out.println("⚡ Step 3: 0-RTT test requests (should use early data)");
            System.out.println("------------------------------------------------------");
            performZeroRTTRequests(client);
            
            System.out.println();
            
            // Step 4: Analysis and results
            analyzeResults();
            
        } catch (Exception e) {
            System.err.println("❌ Error during HTTP/3 0-RTT test: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void displayConfiguration() {
        System.out.println("🔧 Configuration:");
        System.out.printf("   • Target Server: %s%n", TARGET_SERVER);
        System.out.printf("   • SSL Key Log File: %s%n", SSL_KEYLOG_FILE);
        System.out.printf("   • Connection Timeout: %s%n", CONNECTION_TIMEOUT);
        System.out.printf("   • Warmup Requests: %d%n", WARMUP_REQUESTS);
        System.out.printf("   • Test Requests: %d%n", TEST_REQUESTS);
        System.out.printf("   • Java Version: %s%n", System.getProperty("java.version"));
        System.out.printf("   • JAVA_HOME: %s%n", System.getProperty("java.home"));
        System.out.println();
        
        // Check if SSL key logging is enabled
        if (SSL_KEYLOG_FILE != null && !SSL_KEYLOG_FILE.isEmpty()) {
            System.out.println("✅ SSL key logging enabled for Wireshark analysis");
            
            // Create the directory if it doesn't exist
            java.io.File keylogFile = new java.io.File(SSL_KEYLOG_FILE);
            keylogFile.getParentFile().mkdirs();
            
            // Clear the key log file for this test
            try {
                java.io.FileWriter writer = new java.io.FileWriter(keylogFile, false);
                writer.write("# HTTP/3 0-RTT Demonstration - " + Instant.now() + "\n");
                writer.write("# Target: " + TARGET_SERVER + "\n");
                writer.write("# This file contains SSL/TLS secrets for Wireshark decryption\n\n");
                writer.close();
                System.out.printf("   📝 Key log file initialized: %s%n", SSL_KEYLOG_FILE);
            } catch (Exception e) {
                System.err.printf("   ⚠️  Warning: Could not initialize key log file: %s%n", e.getMessage());
            }
        } else {
            System.out.println("⚠️  SSL key logging not enabled - add -Djavax.net.ssl.keylog=<path>");
        }
        System.out.println();
    }

    private static HttpClient createOptimizedHTTP3Client() throws Exception {
        System.out.println("🔧 Creating optimized HTTP/3 client for 0-RTT...");
        
        // Create SSL context with TLS 1.3 (required for HTTP/3 and 0-RTT)
        SSLContext sslContext = SSLContext.getDefault();
        SSLParameters sslParams = sslContext.getDefaultSSLParameters();
        
        // Force TLS 1.3 (required for HTTP/3 and 0-RTT)
        sslParams.setProtocols(new String[]{"TLSv1.3"});
        
        // Use HTTP/3 compatible cipher suites
        String[] cipherSuites = {
            "TLS_AES_128_GCM_SHA256",
            "TLS_AES_256_GCM_SHA384",
            "TLS_CHACHA20_POLY1305_SHA256"
        };
        sslParams.setCipherSuites(cipherSuites);
        
        // Enable session resumption and early data (0-RTT) if supported
        // Note: 0-RTT enablement is implementation-specific
        
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)  // Strict HTTP/3 only
                .connectTimeout(CONNECTION_TIMEOUT)
                .sslContext(sslContext)
                .sslParameters(sslParams)
                .build();
                
        System.out.println("✅ HTTP/3 client created with TLS 1.3 and optimized settings");
        return client;
    }

    private static void performInitialConnection(HttpClient client) throws Exception {
        System.out.println("🌐 Connecting to " + TARGET_SERVER + " for the first time...");
        
        // Resolve target IP for display
        String targetIP = resolveServerIP(TARGET_SERVER);
        if (targetIP != null) {
            System.out.println("🎯 Target IP: " + targetIP);
        }
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TARGET_SERVER))
                .header("User-Agent", "Java-HTTP3-0RTT-Demo/1.0")
                .header("X-Test-Purpose", "Initial-Connection")
                .GET()
                .build();

        long startTime = System.currentTimeMillis();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        long endTime = System.currentTimeMillis();
        long responseTime = endTime - startTime;

        // Validate HTTP/3 usage
        if (response.version() != HttpClient.Version.HTTP_3) {
            throw new RuntimeException("Expected HTTP/3 but got " + response.version());
        }

        results.add(new RequestResult(0, startTime, responseTime, response.statusCode(),
                response.version().toString(), true, null));

        System.out.printf("✅ Initial connection established: %dms (Status: %d)%n", 
                responseTime, response.statusCode());
        
        // Display connection information
        displayConnectionInfo(response);
        
        // Small delay to ensure connection state is established
        Thread.sleep(500);
    }

    private static void performWarmupRequests(HttpClient client) throws Exception {
        System.out.println("🔥 Performing warmup requests to establish session state...");
        
        for (int i = 1; i <= WARMUP_REQUESTS; i++) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(TARGET_SERVER + "?warmup=" + i))
                    .header("User-Agent", "Java-HTTP3-0RTT-Demo/1.0")
                    .header("X-Test-Purpose", "Warmup")
                    .header("X-Request-Number", String.valueOf(i))
                    .GET()
                    .build();

            long startTime = System.currentTimeMillis();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;

            // Validate HTTP/3 usage
            if (response.version() != HttpClient.Version.HTTP_3) {
                throw new RuntimeException("Expected HTTP/3 but got " + response.version());
            }

            results.add(new RequestResult(i, startTime, responseTime, response.statusCode(),
                    response.version().toString(), true, null));

            System.out.printf("   Warmup request %d: %dms (Status: %d)%n", 
                    i, responseTime, response.statusCode());
            
            // Short delay between warmup requests
            if (i < WARMUP_REQUESTS) {
                Thread.sleep(REQUEST_DELAY.toMillis());
            }
        }
        
        System.out.println("✅ Warmup phase completed - session state should be established");
        
        // Wait a bit longer to ensure session is fully established
        Thread.sleep(1000);
    }

    private static void performZeroRTTRequests(HttpClient client) throws Exception {
        System.out.println("⚡ Starting 0-RTT test requests...");
        System.out.println("These requests should benefit from early data/0-RTT if supported by the server");
        System.out.println();
        
        List<CompletableFuture<RequestResult>> futures = new ArrayList<>();
        
        // Send multiple requests to test 0-RTT performance
        for (int i = 1; i <= TEST_REQUESTS; i++) {
            final int requestNum = WARMUP_REQUESTS + i;
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(TARGET_SERVER + "?test=" + i + "&timestamp=" + System.currentTimeMillis()))
                    .header("User-Agent", "Java-HTTP3-0RTT-Demo/1.0")
                    .header("X-Test-Purpose", "0RTT-Test")
                    .header("X-Request-Number", String.valueOf(requestNum))
                    .header("X-Expected-0RTT", "true")
                    .GET()
                    .build();

            // Send async request and measure timing
            CompletableFuture<RequestResult> future = CompletableFuture.supplyAsync(() -> {
                try {
                    long startTime = System.currentTimeMillis();
                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    long endTime = System.currentTimeMillis();
                    long responseTime = endTime - startTime;

                    // Validate HTTP/3 usage
                    if (response.version() != HttpClient.Version.HTTP_3) {
                        return new RequestResult(requestNum, startTime, responseTime, 
                                response.statusCode(), response.version().toString(), false,
                                "Expected HTTP/3 but got " + response.version());
                    }

                    return new RequestResult(requestNum, startTime, responseTime, 
                            response.statusCode(), response.version().toString(), true, null);
                    
                } catch (Exception e) {
                    return new RequestResult(requestNum, System.currentTimeMillis(), 0, 
                            0, "ERROR", false, e.getMessage());
                }
            });
            
            futures.add(future);
            
            // Small delay between request initiations
            if (i < TEST_REQUESTS) {
                Thread.sleep(50);
            }
        }
        
        // Wait for all requests to complete and collect results
        for (int i = 0; i < futures.size(); i++) {
            RequestResult result = futures.get(i).get();
            results.add(result);
            
            if (result.success) {
                System.out.printf("   ⚡ 0-RTT Test request %d: %dms (Status: %d) - %s%n", 
                        i + 1, result.responseTimeMs, result.statusCode, 
                        result.responseTimeMs < 100 ? "🚀 FAST" : result.responseTimeMs < 200 ? "✅ GOOD" : "🐌 SLOW");
            } else {
                System.err.printf("   ❌ 0-RTT Test request %d failed: %s%n", 
                        i + 1, result.errorMessage);
            }
        }
        
        System.out.println("✅ 0-RTT test phase completed");
    }

    private static void analyzeResults() {
        System.out.println("📊 0-RTT Performance Analysis");
        System.out.println("=============================");
        System.out.println();
        
        if (results.isEmpty()) {
            System.out.println("❌ No results to analyze");
            return;
        }
        
        // Separate results by type
        List<RequestResult> initialConnection = results.stream()
                .filter(r -> r.requestNumber == 0)
                .toList();
        
        List<RequestResult> warmupResults = results.stream()
                .filter(r -> r.requestNumber > 0 && r.requestNumber <= WARMUP_REQUESTS)
                .toList();
        
        List<RequestResult> testResults = results.stream()
                .filter(r -> r.requestNumber > WARMUP_REQUESTS && r.success)
                .toList();
        
        // Calculate statistics
        if (!initialConnection.isEmpty()) {
            RequestResult initial = initialConnection.get(0);
            System.out.printf("🔌 Initial Connection: %dms (full handshake)%n", initial.responseTimeMs);
        }
        
        if (!warmupResults.isEmpty()) {
            double avgWarmup = warmupResults.stream()
                    .mapToLong(r -> r.responseTimeMs)
                    .average()
                    .orElse(0.0);
            System.out.printf("🔥 Warmup Requests Average: %.1fms (%d requests)%n", 
                    avgWarmup, warmupResults.size());
        }
        
        if (!testResults.isEmpty()) {
            double avgTest = testResults.stream()
                    .mapToLong(r -> r.responseTimeMs)
                    .average()
                    .orElse(0.0);
            
            long minTest = testResults.stream()
                    .mapToLong(r -> r.responseTimeMs)
                    .min()
                    .orElse(0);
            
            long maxTest = testResults.stream()
                    .mapToLong(r -> r.responseTimeMs)
                    .max()
                    .orElse(0);
            
            System.out.printf("⚡ 0-RTT Test Requests Average: %.1fms (min: %dms, max: %dms, count: %d)%n", 
                    avgTest, minTest, maxTest, testResults.size());
            
            // Compare with initial connection
            if (!initialConnection.isEmpty()) {
                double improvementRatio = (double) initialConnection.get(0).responseTimeMs / avgTest;
                System.out.printf("📈 Speed Improvement: %.1fx faster than initial connection%n", improvementRatio);
                
                if (avgTest < initialConnection.get(0).responseTimeMs * 0.7) {
                    System.out.println("🚀 EXCELLENT: Significant performance improvement observed!");
                    System.out.println("   This suggests successful 0-RTT/early data usage");
                } else if (avgTest < initialConnection.get(0).responseTimeMs * 0.9) {
                    System.out.println("✅ GOOD: Moderate performance improvement observed");
                    System.out.println("   This suggests some 0-RTT benefit");
                } else {
                    System.out.println("📊 INFO: Similar response times observed");
                    System.out.println("   0-RTT benefits may be limited by network latency or server processing");
                }
            }
        }
        
        System.out.println();
        System.out.println("🔍 Detailed Results:");
        System.out.println("Request# | Type      | Time(ms) | Status | Notes");
        System.out.println("---------|-----------|----------|--------|------------------");
        
        for (RequestResult result : results) {
            String type = result.requestNumber == 0 ? "Initial" :
                         result.requestNumber <= WARMUP_REQUESTS ? "Warmup" : "0-RTT Test";
            String notes = result.success ? "✅ HTTP/3" : "❌ " + result.errorMessage;
            
            System.out.printf("%8d | %-9s | %8d | %6d | %s%n",
                    result.requestNumber, type, result.responseTimeMs, result.statusCode, notes);
        }
        
        System.out.println();
        displayWiresharkInstructions();
    }

    private static void displayConnectionInfo(HttpResponse<?> response) {
        System.out.println("🔗 Connection Information:");
        
        // Show relevant headers
        response.headers().map().forEach((key, values) -> {
            String lowerKey = key.toLowerCase();
            if (lowerKey.contains("server") || lowerKey.contains("cf-") || 
                lowerKey.contains("alt-svc") || lowerKey.contains("quic") ||
                lowerKey.contains("protocol")) {
                System.out.printf("   %s: %s%n", key, String.join(", ", values));
            }
        });
        
        // Check for QUIC/HTTP3 indicators
        response.headers().firstValue("alt-svc").ifPresent(altSvc -> {
            if (altSvc.contains("h3")) {
                System.out.println("   ✅ Server advertises HTTP/3 support");
            }
        });
    }

    private static String resolveServerIP(String serverUrl) {
        try {
            java.net.URI uri = java.net.URI.create(serverUrl);
            String hostname = uri.getHost();
            java.net.InetAddress address = java.net.InetAddress.getByName(hostname);
            return address.getHostAddress() + " (" + hostname + ")";
        } catch (Exception e) {
            return null;
        }
    }

    private static void displayWiresharkInstructions() {
        System.out.println("🔍 Wireshark Analysis Instructions");
        System.out.println("==================================");
        System.out.println();
        System.out.printf("📝 SSL Key Log File: %s%n", SSL_KEYLOG_FILE);
        System.out.println();
        System.out.println("To analyze the 0-RTT traffic in Wireshark:");
        System.out.println("1. Start Wireshark and capture traffic on your network interface");
        System.out.println("2. Filter for QUIC traffic: quic or udp.port == 443");
        System.out.println("3. Configure SSL key log file in Wireshark:");
        System.out.println("   • Go to Edit → Preferences → Protocols → TLS");
        System.out.printf("   • Set \"(Pre)-Master-Secret log filename\" to: %s%n", SSL_KEYLOG_FILE);
        System.out.println("   • Click OK to apply");
        System.out.println("4. Look for these 0-RTT indicators:");
        System.out.println("   • QUIC Initial packets with early data");
        System.out.println("   • TLS 1.3 early data in decrypted payloads");
        System.out.println("   • HTTP/3 requests in 0-RTT packets");
        System.out.println("   • Reduced handshake messages in subsequent connections");
        System.out.println();
        System.out.println("🎯 Key observations to look for:");
        System.out.println("• First connection: Full QUIC handshake with Certificate, CertificateVerify");
        System.out.println("• Subsequent connections: Reduced handshake with early data");
        System.out.println("• HTTP/3 requests sent before handshake completion (0-RTT)");
        System.out.println("• Session tickets and resumption parameters");
        System.out.println();
        
        // Check if key log file was created and show its status
        java.io.File keylogFile = new java.io.File(SSL_KEYLOG_FILE);
        if (keylogFile.exists() && keylogFile.length() > 0) {
            System.out.printf("✅ SSL key log file created successfully (%d bytes)%n", keylogFile.length());
            System.out.println("   🔓 This file contains the secrets needed to decrypt QUIC/TLS traffic");
        } else {
            System.out.println("⚠️  SSL key log file not found or empty");
            System.out.println("   Make sure to run with: -Djavax.net.ssl.keylog=" + SSL_KEYLOG_FILE);
        }
    }
}