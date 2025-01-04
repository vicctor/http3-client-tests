package net.arturkeska.http3;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.ssl.DefaultSslBundleRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ReactorNettyClientRequestFactory;
import org.springframework.web.client.RestClient;
import reactor.netty.http.Http3SslContextSpec;
import reactor.netty.http.HttpProtocol;
import reactor.netty.http.client.HttpClient;

import javax.net.ssl.SSLContext;
import java.time.Duration;
import java.util.ResourceBundle;

@SpringBootApplication
@Configuration
public class Http3Application {


	public static void main(String[] args) {
		SpringApplication.run(Http3Application.class, args);
	}


	@Bean
	RestClient http3RestClient(RestClient.Builder builder, DefaultSslBundleRegistry defaultSslBundleRegistry) {

		HttpClient client =
				HttpClient.create()
						// Configure HTTP/3 protocol
						.protocol(HttpProtocol.HTTP3)
						// Configure HTTP/3 settings
						.http3Settings(spec ->
								spec.idleTimeout(Duration.ofSeconds(5))
								.maxData(10_000_000)
								.maxStreamDataBidirectionalLocal(1_000_000));

		return builder.requestFactory(new ReactorNettyClientRequestFactory(client)).build();
	}

	@Bean
	RestClient http3RestClientLocal(RestClient.Builder builder, DefaultSslBundleRegistry defaultSslBundleRegistry) {
		var bundle = defaultSslBundleRegistry.getBundle("client");

		Http3SslContextSpec sslContextSpec = Http3SslContextSpec.forClient()
				.configure(spec -> spec.trustManager(bundle.getManagers().getTrustManagerFactory()));
		HttpClient client =
				HttpClient.create()
						// Configure HTTP/3 protocol
						.protocol(HttpProtocol.HTTP3)
						// Configure HTTP/3 settings
						.http3Settings(spec ->
								spec.idleTimeout(Duration.ofSeconds(5))
										.maxData(10_000_000)
										.maxStreamDataBidirectionalLocal(1_000_000))
						.secure(spec -> spec.sslContext(sslContextSpec));

		return builder.requestFactory(new ReactorNettyClientRequestFactory(client)).build();
	}

	@Bean
	RestClient http2RestClient(RestClient.Builder builder) {
		HttpClient client =
				HttpClient.create()
						// Configure HTTP/3 protocol
						.protocol(HttpProtocol.H2)
						// Configure HTTP/3 settings
						.http3Settings(spec -> spec.idleTimeout(Duration.ofSeconds(5))
								.maxData(10_000_000)
								.maxStreamDataBidirectionalLocal(1_000_000));

		return builder.requestFactory(new ReactorNettyClientRequestFactory(client)).build();
	}

}
