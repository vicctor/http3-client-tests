package net.arturkeska.http3;

import net.arturkeska.http3.recording.Recorder;
import net.arturkeska.http3.support.RateLimitedScope;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.StopWatch;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS
,classes = Http3Application.class)
@TestPropertySource("classpath:application-TEST.properties")
class Http3ClientTest {
    private static final int FILE_149KB_SIZE = 145390;
    private static final int PAGE_1KB_SIZE = 1256;
    private static final int PAGE_2KB_SIZE = 125905;
    private final static String FILE_149KB ="https://www.gstatic.com/webp/gallery3/3_webp_ll.webp";
    private final static String PAGE_1KB = "https://example.com/";
    private final static String CLOUDFLARE = "https://cloudflare-quic.com/";

    @Autowired
    @Qualifier("http3Client")
    private reactor.netty.http.client.HttpClient http3Client;
    @Autowired
    @Qualifier("http2Client")
    private reactor.netty.http.client.HttpClient http2Client;
    @Autowired
    private  Recorder recorder;

    private final HttpClient.Builder flupkeClientBuilder = new net.luminis.http3.Http3ClientBuilder();
    private final HttpClient flupkeClient = flupkeClientBuilder.build();

    private Map<HttpClientType, Function<String, Integer>> handlers;

    private static Stream<Arguments> httpComparisonCases() {
        var cases = Arrays.stream(HttpClientType.values())
                .sorted((a,b)-> new SecureRandom().nextInt())
                .flatMap(type ->
                        Stream.of(
                        Arguments.of(type, PAGE_1KB, PAGE_1KB_SIZE, 10, 1),
                        Arguments.of(type, PAGE_1KB, PAGE_1KB_SIZE, 100, 10),
                        Arguments.of(type, PAGE_1KB, PAGE_1KB_SIZE, 100, 100),
                        Arguments.of(type, CLOUDFLARE, PAGE_2KB_SIZE, 10, 1),
                        Arguments.of(type, CLOUDFLARE, PAGE_2KB_SIZE, 100, 10),
                        Arguments.of(type, CLOUDFLARE, PAGE_2KB_SIZE, 100, 100),
                        Arguments.of(type, FILE_149KB, FILE_149KB_SIZE, 10, 1),
                        Arguments.of(type, FILE_149KB, FILE_149KB_SIZE, 100, 10),
                        Arguments.of(type, FILE_149KB, FILE_149KB_SIZE, 100, 100))
                ).toList();
        return IntStream.range(0, 1).mapToObj(i -> cases.stream()).flatMap(o -> o);
    }

    @BeforeEach
    public void init() {
        handlers = new HashMap<>() {{
            put(HttpClientType.HTTP_CLIENT_HTTP_2, http2NettyClientCall);
            put(HttpClientType.HTTP_CLIENT_HTTP3, http3NettyClientCall);
            put(HttpClientType.FLUPKE, flupkeCall);
        }};
    }

    @AfterEach
    void done() {
        recorder.save();
    }

    @ParameterizedTest
    @MethodSource("httpComparisonCases")
    void callTest(HttpClientType protocol, String uri, long expectedResponseSize, int repeat, int parallel) throws InterruptedException {
        var stopwatch = new StopWatch();
        stopwatch.start();
        var handler = handlers.get(protocol);
        try {
            shouldGetFile(handler, uri, expectedResponseSize, repeat, parallel);
            stopwatch.stop();
            recorder.logExecutionRecord(protocol.toString(), uri, expectedResponseSize, repeat, parallel, true, stopwatch);
        } catch (Exception ex) {
            stopwatch.stop();
            recorder.logExecutionRecord(protocol.toString(), uri, expectedResponseSize, repeat, parallel, false, stopwatch);
            throw ex;
        }
    }

    @Test
    void call1KbPageUsingFlupke() throws InterruptedException {
        shouldGetFile(flupkeCall, PAGE_1KB, PAGE_1KB_SIZE, 1, 1);
    }

    @Test
    void callClaudflareUsingFlupke() throws InterruptedException {
        shouldGetFile(flupkeCall, CLOUDFLARE, PAGE_2KB_SIZE, 1, 1);
    }

    @Test
    void call1KbPageUsingHttp2NettyClient() throws InterruptedException {
        shouldGetFile(http2NettyClientCall, PAGE_1KB, PAGE_1KB_SIZE, 1, 1);
    }

    @Test
    void callUsingNettyHttp3Client() throws InterruptedException {
        shouldGetFile(http3NettyClientCall, PAGE_1KB, PAGE_1KB_SIZE, 1, 1);
    }

    @Test
    void callCloudflareNettyHttp2Client() throws InterruptedException {
        var response = http2Client.baseUrl(CLOUDFLARE).get().response().block();
        Assertions.assertThat(response).isNotNull();
        Assertions.assertThat(response.status().code()).isEqualTo(200);
        //shouldGetFile(http3NettyClientCall, CLOUDFLARE, PAGE_2KB_SIZE, 1, 1);
    }

    @Test
    void callCloudflareNettyHttp3Client() throws InterruptedException {
        var response = http3Client.baseUrl(CLOUDFLARE).get().response().block();
        Assertions.assertThat(response).isNotNull();
        Assertions.assertThat(response.status().code()).isEqualTo(200);
        shouldGetFile(http3NettyClientCall, CLOUDFLARE, PAGE_2KB_SIZE, 1, 1);
    }

    private void shouldGetFile(Function<String, Integer> getResourceCall, String uri, long expectedResponseSize, int repeat, int parallel) throws InterruptedException {
        try (var scope = new RateLimitedScope<Integer>(parallel)) {
            var executions = IntStream.range(0, repeat)
                    .mapToObj(n -> scope.fork(() -> getResourceCall.apply(uri)))
                    .toList();
            scope.join();
            var len = executions.stream().map(e -> e.get())
                    .mapToInt(i->i)
                    .sum();
            Assertions.assertThat(len).isEqualTo(expectedResponseSize * repeat);
        }
    }

    Function<String, Integer> http2NettyClientCall = uri -> Objects.requireNonNull(http2Client.baseUrl(uri)
                    .get()
                    .responseSingle((r, data) -> data.asString())
                    .block())
            .length();

    Function<String, Integer> http3NettyClientCall = uri -> Objects.requireNonNull(http3Client.baseUrl(uri)
                    .get()
                    .responseSingle((r, data) -> data.asString())
                    .block())
            .length();

    Function<String, Integer> flupkeCall = uri -> {
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(uri)).build();
        try {
            HttpResponse<String> httpResponse = flupkeClient.send(request, HttpResponse.BodyHandlers.ofString());
            return httpResponse.body().length();
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }
    };

    enum HttpClientType {
        HTTP_CLIENT_HTTP_2,
        HTTP_CLIENT_HTTP3,
        FLUPKE
    }
}