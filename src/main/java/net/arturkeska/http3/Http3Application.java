package net.arturkeska.http3;

import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
		// Create a more conservative HTTP/3 client configuration
		ConnectionProvider connectionProvider = ConnectionProvider.builder("alt-http3-pool")
				.maxConnections(10)
				.maxIdleTime(Duration.ofSeconds(60))
				.maxLifeTime(Duration.ofMinutes(10))
				.pendingAcquireTimeout(Duration.ofSeconds(30))
				.evictInBackground(Duration.ofSeconds(60))
				.build();

		Http3SslContextSpec clientCtx =
				Http3SslContextSpec.forClient()
						.configure(builder -> builder.trustManager(InsecureTrustManagerFactory.INSTANCE));

		return HttpClient.create(connectionProvider)
				.wiretap(true)
				// Use HTTP/3 protocol
				.protocol(HttpProtocol.HTTP3)
				.http3Settings(spec -> spec.idleTimeout(Duration.ofSeconds(5))
						.maxData(10000000)
						.maxStreamDataBidirectionalLocal(1000000))
				// Simple SSL configuration
				.secure(sslContextSpec -> sslContextSpec
						.sslContext(clientCtx)
				);
	}
}
