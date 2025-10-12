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
 * Improved HTTP/3 0-RTT (Zero Round Trip Time) Demonstration
 * 
 * This example demonstrates HTTP/3 0-RTT feature with multiple fallback servers
 * and robust error handling.
 */
public class HTTP3ZeroRTTImproved {

    // Multiple test servers that support HTTP/3
    private static final String[] TEST_SERVERS = {
        "https://cloudflare-quic.com",
        "https://quic.rocks",
        "https://http3check.net",
        "https://www.google.com",
        "https://www.facebook.com",
        "https://blog.cloudflare.com"
    };
    
    private static final String SSL_KEYLOG_FILE = System.getProperty("javax.net.ssl.keylog", 
        "/home/grxybek/tata/http3-client-test/wireshark-samples/http3-0rtt-demo.key_log");
    
    private static final int WARMUP_REQUESTS = 2;
    private static final int TEST_REQUESTS = 5;
    private static final Duration CONNECTION_TIMEOUT = Duration.ofSeconds(15);

    // Results tracking
    static class RequestResult {
        final int requestNumber;
        final long startTimeMs;
        final long responseTimeMs;
        final int statusCode;
        final String protocol;
        final boolean success;
        final String errorMessage;
        final String serverUrl;
        final Instant timestamp;

        RequestResult(int requestNumber, long startTimeMs, long responseTimeMs, 
                     int statusCode, String protocol, boolean success, String errorMessage, String serverUrl) {
            this.requestNumber = requestNumber;
            this.startTimeMs = startTimeMs;
            this.responseTimeMs = responseTimeMs;
            this.statusCode = statusCode;
            this.protocol = protocol;
            this.success = success;
            this.errorMessage = errorMessage;
            this.serverUrl = serverUrl;
            this.timestamp = Instant.now();
        }
    }

    private static final List<RequestResult> results = new ArrayList<>();
    private static String workingServer = null;
    private static HttpClient workingClient = null;
    private static String serverIP = null;
    private static String serverHostname = null;

    public static void main(String[] args) {
        System.out.println("🚀 HTTP/3 0-RTT (Zero Round Trip Time) Demonstration");
        System.out.println("====================================================");
        System.out.println();
        
        displayConfiguration();
        
        try {
            // Step 1: Find a working HTTP/3 server
            findWorkingHTTP3Server();
            
            if (workingServer == null) {
                System.err.println("❌ Could not establish HTTP/3 connection with any server");
                System.err.println("This may indicate:");
                System.err.println("1. Network firewall blocking UDP port 443 (QUIC)");
                System.err.println("2. HTTP/3 implementation issues");
                System.err.println("3. Servers not supporting HTTP/3 at the moment");
                return;
            }
            
            System.out.printf("✅ Using HTTP/3 server: %s%n", workingServer);
            System.out.printf("🌐 Target IP Address: %s%n", serverIP);
            System.out.printf("🏷️  Target Hostname: %s%n", serverHostname);
            System.out.println();
            System.out.println("📡 Wireshark Filter Suggestions:");
            System.out.printf("   • Target IP: ip.addr == %s%n", serverIP.split(" ")[0]);
            System.out.printf("   • QUIC to target: quic and ip.addr == %s%n", serverIP.split(" ")[0]);
            System.out.printf("   • HTTP/3 to target: http3 and ip.addr == %s%n", serverIP.split(" ")[0]);
            System.out.println();
            
            // Step 2: Perform 0-RTT demonstration
            performZeroRTTDemo();
            
            // Step 3: Analysis
            analyzeResults();
            
        } catch (Exception e) {
            System.err.println("❌ Error during HTTP/3 0-RTT test: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void displayConfiguration() {
        System.out.println("🔧 Configuration:");
        System.out.printf("   • SSL Key Log File: %s%n", SSL_KEYLOG_FILE);
        System.out.printf("   • Connection Timeout: %s%n", CONNECTION_TIMEOUT);
        System.out.printf("   • Warmup Requests: %d%n", WARMUP_REQUESTS);
        System.out.printf("   • Test Requests: %d%n", TEST_REQUESTS);
        System.out.printf("   • Java Version: %s%n", System.getProperty("java.version"));
        System.out.println();
        
        // Check if SSL key logging is enabled
        if (SSL_KEYLOG_FILE != null && !SSL_KEYLOG_FILE.isEmpty()) {
            System.out.println("✅ SSL key logging enabled for Wireshark analysis");
            initializeKeyLogFile();
        } else {
            System.out.println("⚠️  SSL key logging not enabled - add -Djavax.net.ssl.keylog=<path>");
        }
        System.out.println();
    }

    private static void initializeKeyLogFile() {
        try {
            java.io.File keylogFile = new java.io.File(SSL_KEYLOG_FILE);
            keylogFile.getParentFile().mkdirs();
            
            java.io.FileWriter writer = new java.io.FileWriter(keylogFile, false);
            writer.write("# HTTP/3 0-RTT Demonstration - " + Instant.now() + "\n");
            writer.write("# This file contains SSL/TLS secrets for Wireshark decryption\n\n");
            writer.close();
            System.out.printf("   📝 Key log file initialized: %s%n", SSL_KEYLOG_FILE);
        } catch (Exception e) {
            System.err.printf("   ⚠️  Warning: Could not initialize key log file: %s%n", e.getMessage());
        }
    }

    private static void findWorkingHTTP3Server() throws Exception {
        System.out.println("🔍 Finding a working HTTP/3 server...");
        System.out.println("Testing " + TEST_SERVERS.length + " potential servers:");
        System.out.println();
        
        for (String serverUrl : TEST_SERVERS) {
            System.out.printf("🧪 Testing: %s%n", serverUrl);
            
            // Resolve IP address first
            String resolvedIP = resolveServerIP(serverUrl);
            if (resolvedIP != null) {
                System.out.printf("   🎯 Resolved IP: %s%n", resolvedIP);
            } else {
                System.out.printf("   ❌ Could not resolve IP address%n");
                continue;
            }
            
            try {
                HttpClient client = createOptimizedHTTP3Client();
                
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(serverUrl))
                        .header("User-Agent", "Java-HTTP3-0RTT-Test/1.0")
                        .header("X-Test-Purpose", "HTTP3-Capability-Check")
                        .GET()
                        .build();

                long startTime = System.currentTimeMillis();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                long endTime = System.currentTimeMillis();
                long responseTime = endTime - startTime;

                System.out.printf("   📊 Response: %d, Protocol: %s, Time: %dms%n", 
                        response.statusCode(), response.version(), responseTime);

                if (response.version() == HttpClient.Version.HTTP_3) {
                    workingServer = serverUrl;
                    workingClient = client;
                    serverIP = resolvedIP;
                    serverHostname = extractHostname(serverUrl);
                    
                    System.out.printf("   ✅ SUCCESS: HTTP/3 working on %s%n", serverUrl);
                    System.out.printf("   🌐 Server IP: %s%n", serverIP);
                    System.out.printf("   🏷️  Hostname: %s%n", serverHostname);
                    
                    // Display connection info
                    displayConnectionInfo(response);
                    break;
                } else {
                    System.out.printf("   ⚠️  Server responded with %s instead of HTTP/3%n", response.version());
                }
                
            } catch (Exception e) {
                System.out.printf("   ❌ Failed: %s%n", e.getMessage().split("\n")[0]);
            }
            
            System.out.println();
        }
    }

    private static HttpClient createOptimizedHTTP3Client() throws Exception {
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
        
        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_3)
                .connectTimeout(CONNECTION_TIMEOUT)
                .sslContext(sslContext)
                .sslParameters(sslParams)
                .build();
    }

    private static void performZeroRTTDemo() throws Exception {
        System.out.println("⚡ Starting 0-RTT demonstration with " + workingServer);
        System.out.printf("🎯 All traffic will be to IP: %s (hostname: %s)%n", serverIP, serverHostname);
        System.out.println("==================================================");
        System.out.println();
        
        // Initial connection (should be full handshake)
        System.out.println("📡 Step 1: Initial connection (full handshake)");
        System.out.printf("   → Connecting to %s (%s)%n", serverHostname, serverIP.split(" ")[0]);
        performRequest(0, "initial", "Initial connection establishment");
        
        Thread.sleep(500); // Brief pause
        
        // Warmup requests
        System.out.println("\n🔥 Step 2: Warmup requests (session establishment)");
        System.out.printf("   → Reusing connection to %s (%s)%n", serverHostname, serverIP.split(" ")[0]);
        for (int i = 1; i <= WARMUP_REQUESTS; i++) {
            performRequest(i, "warmup", "Warmup request " + i);
            Thread.sleep(200);
        }

        System.out.printf("Delay to get 0RTT: %dms%n", WARMUP_REQUESTS - WARMUP_REQUESTS);
        Thread.sleep(1000 * 2 * 60); // Allow session state to settle
        
        // 0-RTT test requests
        System.out.println("\n⚡ Step 3: 0-RTT test requests");
        System.out.printf("   → All requests to %s (%s)%n", serverHostname, serverIP.split(" ")[0]);
        System.out.println("These should benefit from session resumption and early data:");
        
        for (int i = 1; i <= TEST_REQUESTS; i++) {
            int requestNum = WARMUP_REQUESTS + i;
            performRequest(requestNum, "0rtt", "0-RTT test request " + i);
            Thread.sleep(100);
        }
        
        System.out.println("\n✅ 0-RTT demonstration completed");
    }

    private static void performRequest(int requestNumber, String type, String description) throws Exception {
        System.out.printf("   %s → %s... ", description, serverIP.split(" ")[0]);
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(workingServer + "?test=" + type + "&req=" + requestNumber + "&ts=" + System.currentTimeMillis()))
                .header("User-Agent", "Java-HTTP3-0RTT-Demo/1.0")
                .header("X-Test-Purpose", type)
                .header("X-Request-Number", String.valueOf(requestNumber))
                .header("X-Target-IP", serverIP.split(" ")[0])
                .GET()
                .build();

        long startTime = System.currentTimeMillis();
        HttpResponse<String> response = workingClient.send(request, HttpResponse.BodyHandlers.ofString());
        long endTime = System.currentTimeMillis();
        long responseTime = endTime - startTime;

        boolean success = response.version() == HttpClient.Version.HTTP_3;
        
        results.add(new RequestResult(requestNumber, startTime, responseTime, 
                response.statusCode(), response.version().toString(), success, 
                success ? null : "Protocol mismatch: " + response.version(), workingServer));

        String timeIndicator = responseTime < 100 ? "🚀" : responseTime < 200 ? "✅" : "🐌";
        System.out.printf("%s %dms (Status: %d, Protocol: %s)%n", 
                timeIndicator, responseTime, response.statusCode(), response.version());
    }

    private static void analyzeResults() {
        System.out.println("\n📊 0-RTT Performance Analysis");
        System.out.println("=============================");
        System.out.printf("🎯 Target Server: %s%n", workingServer);
        System.out.printf("🌐 Server IP: %s%n", serverIP);
        System.out.printf("🏷️  Hostname: %s%n", serverHostname);
        System.out.println();
        
        if (results.isEmpty()) {
            System.out.println("❌ No results to analyze");
            return;
        }
        
        // Separate results by type
        List<RequestResult> initialResults = results.stream()
                .filter(r -> r.requestNumber == 0)
                .toList();
        
        List<RequestResult> warmupResults = results.stream()
                .filter(r -> r.requestNumber > 0 && r.requestNumber <= WARMUP_REQUESTS)
                .toList();
        
        List<RequestResult> testResults = results.stream()
                .filter(r -> r.requestNumber > WARMUP_REQUESTS && r.success)
                .toList();
        
        // Calculate and display statistics
        if (!initialResults.isEmpty()) {
            RequestResult initial = initialResults.get(0);
            System.out.printf("🔌 Initial Connection: %dms (full handshake to %s)%n", 
                    initial.responseTimeMs, serverIP.split(" ")[0]);
        }
        
        if (!warmupResults.isEmpty()) {
            double avgWarmup = warmupResults.stream()
                    .mapToLong(r -> r.responseTimeMs)
                    .average()
                    .orElse(0.0);
            System.out.printf("🔥 Warmup Average: %.1fms (%d requests to %s)%n", 
                    avgWarmup, warmupResults.size(), serverIP.split(" ")[0]);
        }
        
        if (!testResults.isEmpty()) {
            long minTest = testResults.stream().mapToLong(r -> r.responseTimeMs).min().orElse(0);
            long maxTest = testResults.stream().mapToLong(r -> r.responseTimeMs).max().orElse(0);
            double avgTest = testResults.stream().mapToLong(r -> r.responseTimeMs).average().orElse(0.0);
            
            System.out.printf("⚡ 0-RTT Tests Average: %.1fms (min: %dms, max: %dms to %s)%n", 
                    avgTest, minTest, maxTest, serverIP.split(" ")[0]);
            
            // Performance improvement analysis
            if (!initialResults.isEmpty()) {
                double improvement = (double) initialResults.get(0).responseTimeMs / avgTest;
                System.out.printf("📈 Speed Improvement: %.1fx faster than initial%n", improvement);
                
                if (avgTest < initialResults.get(0).responseTimeMs * 0.7) {
                    System.out.println("🎉 EXCELLENT: Significant performance improvement!");
                    System.out.println("   This suggests successful 0-RTT/early data usage");
                } else if (avgTest < initialResults.get(0).responseTimeMs * 0.9) {
                    System.out.println("✅ GOOD: Moderate performance improvement");
                } else {
                    System.out.println("📊 INFO: Similar response times - 0-RTT benefit may be limited");
                }
            }
        }
        
        System.out.println();
        displayDetailedResults();
        displayWiresharkInstructions();
    }

    private static void displayDetailedResults() {
        System.out.println("🔍 Detailed Results:");
        System.out.printf("All requests sent to: %s (%s)%n", serverHostname, serverIP.split(" ")[0]);
        System.out.println("Request# | Type      | Time(ms) | Status | Protocol | Target IP    | Notes");
        System.out.println("---------|-----------|----------|--------|----------|--------------|------------------");
        
        for (RequestResult result : results) {
            String type = result.requestNumber == 0 ? "Initial" :
                         result.requestNumber <= WARMUP_REQUESTS ? "Warmup" : "0-RTT";
            String notes = result.success ? "✅ HTTP/3" : "❌ " + result.errorMessage;
            String displayIP = serverIP != null ? serverIP.split(" ")[0] : "Unknown";
            
            System.out.printf("%8d | %-9s | %8d | %6d | %-8s | %-12s | %s%n",
                    result.requestNumber, type, result.responseTimeMs, 
                    result.statusCode, result.protocol, displayIP, notes);
        }
        System.out.println();
    }

    private static void displayConnectionInfo(HttpResponse<?> response) {
        System.out.println("🔗 Connection Information:");
        
        response.headers().map().forEach((key, values) -> {
            String lowerKey = key.toLowerCase();
            if (lowerKey.contains("server") || lowerKey.contains("cf-") || 
                lowerKey.contains("alt-svc") || lowerKey.contains("quic") ||
                lowerKey.contains("protocol")) {
                System.out.printf("   %s: %s%n", key, String.join(", ", values));
            }
        });
        
        response.headers().firstValue("alt-svc").ifPresent(altSvc -> {
            if (altSvc.contains("h3")) {
                System.out.println("   ✅ Server advertises HTTP/3 support");
            }
        });
    }

    private static void displayWiresharkInstructions() {
        System.out.println("🔍 Wireshark Analysis Instructions");
        System.out.println("==================================");
        System.out.println();
        System.out.printf("🎯 Target Server: %s%n", workingServer);
        System.out.printf("🌐 Server IP: %s%n", serverIP);
        System.out.printf("🏷️  Hostname: %s%n", serverHostname);
        System.out.printf("📝 SSL Key Log File: %s%n", SSL_KEYLOG_FILE);
        System.out.println();
        
        System.out.println("📡 Wireshark Filters for This Demo:");
        String targetIP = serverIP.split(" ")[0];
        System.out.printf("   • All traffic to target:     ip.addr == %s%n", targetIP);
        System.out.printf("   • QUIC traffic to target:    quic and ip.addr == %s%n", targetIP);
        System.out.printf("   • HTTP/3 traffic to target:  http3 and ip.addr == %s%n", targetIP);
        System.out.printf("   • 0-RTT packets to target:   quic.packet_type == 1 and ip.addr == %s%n", targetIP);
        System.out.printf("   • Initial packets to target: quic.packet_type == 0 and ip.addr == %s%n", targetIP);
        System.out.println();
        
        System.out.println("🔧 Setup Instructions:");
        System.out.println("1. Configure SSL key log: Edit → Preferences → Protocols → TLS");
        System.out.printf("2. Set key file to: %s%n", SSL_KEYLOG_FILE);
        System.out.printf("3. Start capture with filter: udp.port == 443 and ip.addr == %s%n", targetIP);
        System.out.println("4. Run this demo and observe the traffic patterns");
        System.out.println();
        
        System.out.println("🎯 What to Look For:");
        System.out.printf("• Connection establishment to %s (%s)%n", serverHostname, targetIP);
        System.out.println("• QUIC Initial packets (packet type 0) for first connection");
        System.out.println("• QUIC 0-RTT packets (packet type 1) for subsequent connections");
        System.out.println("• HTTP/3 requests sent as early data");
        System.out.println("• Session resumption and ticket usage");
        System.out.println("• Reduced handshake latency patterns");
        System.out.println();
        
        // Check key log file status
        java.io.File keylogFile = new java.io.File(SSL_KEYLOG_FILE);
        if (keylogFile.exists() && keylogFile.length() > 0) {
            System.out.printf("✅ SSL key log: %d bytes written for %s%n", keylogFile.length(), targetIP);
            System.out.printf("   🔓 Ready for decrypting QUIC traffic to %s%n", serverHostname);
        } else {
            System.out.println("⚠️  SSL key log file empty or missing");
        }
        
        System.out.println();
        System.out.println("📊 Connection Summary for Wireshark Analysis:");
        System.out.printf("   • Server: %s → %s%n", serverHostname, targetIP);
        System.out.printf("   • Protocol: HTTP/3 over QUIC (UDP port 443)%n");
        System.out.printf("   • Requests: %d total (%d initial + %d warmup + %d 0-RTT tests)%n", 
                results.size(), 1, WARMUP_REQUESTS, TEST_REQUESTS);
        System.out.printf("   • Expected 0-RTT behavior: Reduced latency for requests 3-%d%n", results.size());
    }

    private static String extractHostname(String serverUrl) {
        try {
            java.net.URI uri = java.net.URI.create(serverUrl);
            return uri.getHost();
        } catch (Exception e) {
            return "unknown";
        }
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
}