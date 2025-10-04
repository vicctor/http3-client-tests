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

public class Http3LocalExample {

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
            System.out.println("🚀 Enhanced HTTP/3 Test with Docker Server");
            System.out.println("==========================================");

            // Test servers including our local Docker server
            String[] testServers = {
                    "https://http3-test.local/status",   // Docker server status endpoint
                    "https://localhost/",                // Docker server via localhost
                    "https://cloudflare-quic.com",       // External servers
                    "https://www.google.com",
                    "https://www.facebook.com",
            };

            for (String serverUrl : testServers) {
                testSingleServerWithTracking(serverUrl);
            }

            displayHTTP3TestSummary();
        }

        private static void testSingleServerWithTracking(String serverUrl) {
            System.out.println("\n🧪 Testing server: " + serverUrl);
            System.out.println("=" + "=".repeat(serverUrl.length() + 16));

            try {
                HTTP3TestResult result = testSingleServer(serverUrl);
                testResults.add(result);

                if (result.success) {
                    System.out.println("✅ HTTP/3 SUCCESS for: " + serverUrl);
                }

            } catch (Exception e) {
                testResults.add(new HTTP3TestResult(serverUrl, false, "Failed",
                        e.getMessage(), 0, 0));

                System.err.println("❌ HTTP/3 FAILED for: " + serverUrl);
                System.err.println("Error: " + e.getMessage());
            }
        }

        private static HTTP3TestResult testSingleServer(String baseUrl) throws Exception {
            HttpClient client = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_3)
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl))
                    .header("User-Agent", "Java-HTTP3-Enhanced-Test/1.0")
                    .GET()
                    .build();

            long startTime = System.currentTimeMillis();
            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;

            System.out.println("Response received!");
            System.out.println("Status: " + response.statusCode());
            System.out.println("Version: " + response.version());

            // CRITICAL: Validate that we actually got HTTP/3
            if (response.version() != HttpClient.Version.HTTP_3) {
                throw new RuntimeException("Expected HTTP/3 but got " + response.version());
            }

            System.out.println("✅ CONFIRMED: Using HTTP/3 protocol");
            System.out.println("Time: " + responseTime + "ms");

            // Show relevant headers
            response.headers().map().forEach((k, v) -> {
                if (k.toLowerCase().contains("protocol") ||
                        k.toLowerCase().contains("quic") ||
                        k.toLowerCase().contains("alt-svc") ||
                        k.toLowerCase().contains("server")) {
                    System.out.println("Header " + k + ": " + v);
                }
            });

            String body = response.body();
            System.out.println("Body length: " + body.length() + " chars");
            if (body.length() > 0) {
                System.out.println("Body preview: " +
                        body.substring(0, Math.min(150, body.length())) + "...");
            }

            return new HTTP3TestResult(baseUrl, true, "HTTP/3 Client", null,
                    responseTime, response.statusCode());
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

            System.out.println("📊 SERVICE STATUS OVERVIEW:");
            System.out.println();

            for (HTTP3TestResult result : testResults) {
                String statusGlyph;
                String statusText;
                String details = "";

                if (result.success) {
                    statusGlyph = "✅";
                    statusText = "HTTP/3 SUCCESS";
                    details = String.format(" | %dms | Status: %d",
                            result.responseTimeMs, result.statusCode);
                    successCount++;
                } else {
                    statusGlyph = "❌";
                    statusText = "HTTP/3 FAILED ";
                    details = " | Error: " + (result.errorMessage != null ?
                            (result.errorMessage.length() > 50 ?
                                    result.errorMessage.substring(0, 50) + "..." :
                                    result.errorMessage) : "Unknown error");
                    failureCount++;
                }

                System.out.printf("%-3s %-50s %s%s%n",
                        statusGlyph, result.serverUrl, statusText, details);
            }

            System.out.println();
            System.out.println("📈 SUMMARY STATISTICS:");
            System.out.printf("   ✅ Successful HTTP/3 connections: %d%n", successCount);
            System.out.printf("   ❌ Failed connections:            %d%n", failureCount);
            System.out.printf("   📊 Total servers tested:          %d%n", testResults.size());
            System.out.printf("   📈 Success rate:                 %.1f%%%n",
                    testResults.size() > 0 ? (100.0 * successCount / testResults.size()) : 0.0);

            if (successCount > 0) {
                System.out.println("\n🎉 SUCCESS: HTTP/3 connections established!");
                System.out.println("✅ HTTP/3 WORKING SERVERS:");
                testResults.stream()
                        .filter(r -> r.success)
                        .forEach(r -> System.out.printf("   🌐 %-40s (%dms)%n",
                                r.serverUrl, r.responseTimeMs));
            }

            System.out.println("=".repeat(80));
        }

}
