package net.arturkeska.http3;

import net.arturkeska.http3.recording.Recorder;
import net.arturkeska.http3.support.RateLimittedScope;
import net.luminis.http3.Http3ClientBuilder;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.StopWatch;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS
,classes = Http3Application.class)
@TestPropertySource("classpath:application-TEST.properties")
class Http3ClientTest {
    private static final int FILE_149KB_SIZE = 145390;
    private static final int PAGE_1KB_SIZE = 1256;
    private final static String FILE_149KB ="https://www.gstatic.com/webp/gallery3/3_webp_ll.webp";
    private final static String PAGE_1KB = "https://example.com/";

    @Autowired
    private RestClient http3RestClient;
    @Autowired
    private RestClient http2RestClient;
    @Autowired
    private RestClient http3RestClientLocal;
    @Autowired
    private  Recorder recorder;

    private HttpClient.Builder flupkeClientBuilder = new Http3ClientBuilder();
    private HttpClient flupkeClient = flupkeClientBuilder.build();

    private Map<HttpClientType, Function<String, Integer>> handers;

    private static Stream<Arguments> httpComparisonCases() {
        return Arrays.stream(HttpClientType.values())
                .flatMap(type -> Stream.of(
                        Arguments.of(type, PAGE_1KB, PAGE_1KB_SIZE, 10, 1),
                        Arguments.of(type, PAGE_1KB, PAGE_1KB_SIZE, 100, 10),
                        Arguments.of(type, PAGE_1KB, PAGE_1KB_SIZE, 100, 100),
                        Arguments.of(type, FILE_149KB, FILE_149KB_SIZE, 10, 1),
                        Arguments.of(type, FILE_149KB, FILE_149KB_SIZE, 100, 10),
                        Arguments.of(type, FILE_149KB, FILE_149KB_SIZE, 100, 100))
                );
    }

    @BeforeEach
    public void init() {
        handers = new HashMap<>() {{
            put(HttpClientType.REST_CLIENT_HTTP2, restClientHttp2Call);
            put(HttpClientType.REST_CLIENT_HTTP3, restClientHttp3Call);
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
        var handler = handers.get(protocol);
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
    void callLocal() throws InterruptedException {
        shouldGetFile(restClientHttp3LocalCall, "https://localhost:8443/foo", 4, 50, 1);
    }

    @Test
    void callusingFlupke() throws InterruptedException {
        shouldGetFile(flupkeCall, PAGE_1KB, PAGE_1KB_SIZE, 1, 1);
    }


    private void shouldGetFile(Function<String, Integer> getResourceCall, String uri, long expectedResponseSize, int repeat, int parallel) throws InterruptedException {
        try (var scope = new RateLimittedScope<Integer>(parallel)) {
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

    Integer requestUsingRestClient(RestClient client, String uri) {
        var body = client.get()
                .uri(uri)
                .retrieve()
                .body(String.class);

        return body != null ? body.length() : 0;
    }

    Function<String, Integer> restClientHttp2Call = uri -> requestUsingRestClient(http2RestClient, uri);

    Function<String, Integer> restClientHttp3Call = uri -> requestUsingRestClient(http3RestClient, uri);

    Function<String, Integer> restClientHttp3LocalCall = uri -> requestUsingRestClient(http3RestClientLocal, uri);

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
        REST_CLIENT_HTTP2,
        REST_CLIENT_HTTP3,
        FLUPKE;
    }
}