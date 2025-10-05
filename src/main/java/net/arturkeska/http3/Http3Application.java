package net.arturkeska.http3;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.ssl.DefaultSslBundleRegistry;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;
import reactor.netty.http.Http3SslContextSpec;
import reactor.netty.http.HttpProtocol;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;

@SpringBootApplication
@Configuration
public class Http3Application {

	public static void main(String[] args) {
		SpringApplication.run(Http3Application.class, args);
	}

	@Bean("http2Client")
	HttpClient http2Client(RestClient.Builder builder) {
		return createHTTP2Client();
	}


	@Bean("http3Client")
	HttpClient http3Client() {
		return createHTTP3Client();
	}


	private static HttpClient createHTTP2Client() {
		// Create HTTP/2 client with enhanced configuration
		ConnectionProvider connectionProvider = ConnectionProvider.builder("http2-pool")
				.maxConnections(50)
				.maxIdleTime(Duration.ofSeconds(30))
				.maxLifeTime(Duration.ofMinutes(5))
				.pendingAcquireTimeout(Duration.ofSeconds(60))
				.evictInBackground(Duration.ofSeconds(120))
				.build();

		return HttpClient.create(connectionProvider)
				// Use HTTP/2 protocol
				.protocol(HttpProtocol.H2)
				// Configure timeouts
				.responseTimeout(Duration.ofSeconds(30))
				// Enable HTTP/2 settings
				.http2Settings(settings ->
						settings.headerTableSize(4096)
								.initialWindowSize(65535)
								.maxConcurrentStreams(100)
								.maxFrameSize(16384)
								.maxHeaderListSize(8192)
				);
	}

	private static HttpClient createHTTP3Client() {


		// Create HTTP/2 client with enhanced configuration
		ConnectionProvider connectionProvider = ConnectionProvider.builder("http3-pool")
				.maxConnections(50)
				.maxIdleTime(Duration.ofSeconds(30))
				.maxLifeTime(Duration.ofMinutes(5))
				.pendingAcquireTimeout(Duration.ofSeconds(60))
				.evictInBackground(Duration.ofSeconds(120))
				.build();

		return HttpClient.create(connectionProvider)
				// Use HTTP/2 protocol
				.protocol(HttpProtocol.HTTP3)
				// Configure timeouts
				.responseTimeout(Duration.ofSeconds(30))
				// Enable HTTP/3 settings
				.http3Settings(settings ->
					settings.maxStreamsBidirectional(7)
				)
				.secure(sec -> createHTTP3Client().secure());
	}

	/**
	 * HTTP/3 client configuration - Note: reactor-netty doesn't fully support HTTP/3 yet
	 * This is a placeholder for future HTTP/3 support or can be used with Jetty HTTP/3 client
	 */
	@Bean
	public HttpClient futureHttp3Client() {
		// For now, return HTTP/2 client with comment about HTTP/3
		return createHTTP2Client()
				.headers(headers -> headers.add("X-Requested-Protocol", "HTTP/3-Ready"));
	}
}
