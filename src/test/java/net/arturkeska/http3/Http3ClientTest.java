package net.arturkeska.http3;

import net.luminis.http3.Http3ClientBuilder;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import java.util.concurrent.StructuredTaskScope;
import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS
,classes = Http3Application.class)
class Http3ClientTest {

    private static final int FILE_SIZE = 145390;
    private static final int PAGE_SIZE = 1256;

    @Autowired
    RestClient http3RestClient;
    @Autowired
    RestClient http2RestClient;
    @Autowired
    RestClient http3RestClientLocal;

    HttpClient.Builder flupkeClientBuilder = new Http3ClientBuilder();
    HttpClient flupkeClient = flupkeClientBuilder.build();


    private final static String FILE_149KB ="https://www.gstatic.com/webp/gallery3/3_webp_ll.webp";
    private final static String PAGE = "https://example.com/";

    enum HttpClientType {
        REST_CLIENT_HTTP2,
        REST_CLIENT_HTTP3,
        FLUPKE;
    }

    private Map<HttpClientType, Function<String, Integer>> handers;


    private static Stream<Arguments> httpComparisonCases() {
        return Arrays.stream(HttpClientType.values())
                .flatMap(type -> Stream.of(
                        Arguments.of(type, PAGE, PAGE_SIZE, 10, 1),
                        Arguments.of(type, PAGE, PAGE_SIZE, 100, 10),
                        Arguments.of(type, PAGE, PAGE_SIZE, 100, 100),
                        Arguments.of(type, FILE_149KB, FILE_SIZE, 10, 1),
                        Arguments.of(type, FILE_149KB, FILE_SIZE, 100, 10),
                        Arguments.of(type, FILE_149KB, FILE_SIZE, 100, 100))
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

    @ParameterizedTest
    @MethodSource("httpComparisonCases")
    void callTest(HttpClientType protocol, String uri, long expectedResponseSize, int repeat, int parallel) throws InterruptedException {
        var handler = handers.get(protocol);
        shouldGetFile(handler, uri, expectedResponseSize, repeat, parallel);
    }

    @Test
    void callLocal() throws InterruptedException {
        shouldGetFile(restClientHttp3LocalCall, "https://localhost:8443/foo", 4, 1000, 1);
    }

    @Test
    void callusingFlupke() throws InterruptedException {
        shouldGetFile(flupkeCall, PAGE, PAGE_SIZE, 1, 1);
    }


    private void shouldGetFile(Function<String, Integer> getResourceCall, String uri, long expectedResponseSize, int repeat, int parallel) throws InterruptedException {
        try (var scope = new OrderedSuccessfulScope<Integer>(parallel)) {
            var executions = IntStream.range(0, repeat)
                    .mapToObj(n -> scope.fork(() -> getResourceCall.apply(uri)))
                    .toList();
            scope
                    .join();
            var len = executions.stream().map(e -> e.get())
                    .mapToInt(i->i)
                    .sum();
            Assertions.assertThat(len).isEqualTo(expectedResponseSize * repeat);
        }
    }

    Integer callHttp3(RestClient client, String uri) {
        var body = client.get()
                .uri(uri)
                .retrieve()
                .body(String.class);

        return body.length();
    }

    Function<String, Integer> restClientHttp2Call = uri -> callHttp3(http2RestClient, uri);

    Function<String, Integer> restClientHttp3Call = uri -> callHttp3(http3RestClient, uri);

    Function<String, Integer> restClientHttp3LocalCall = uri -> callHttp3(http3RestClientLocal, uri);

    Function<String, Integer> flupkeCall = uri -> {
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(uri)).build();
        try {
            HttpResponse<String> httpResponse = flupkeClient.send(request, HttpResponse.BodyHandlers.ofString());
            return httpResponse.body().length();
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }
    };

    public static class OrderedSuccessfulScope<T> extends StructuredTaskScope<T> {

        private final Semaphore pool;

        public OrderedSuccessfulScope(int limit) {
            pool = new Semaphore(limit);
        }

        @Override
        protected void handleComplete(Subtask<? extends T> subtask) {
            pool.release();
            // System.out.println("RELEASE: " + subtask + " on " + Thread.currentThread().getName());
        }

        @Override
        public <U extends T> Subtask<U> fork(Callable<? extends U> task) {
            try {
                // System.out.println("WAIT: semPermits = " + pool.availablePermits());
                pool.acquire();
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }

            var subTask = super.fork(task);
            // System.out.println("FORK: subtask = " + subTask);
            return (Subtask<U>) subTask;
        }
    }
}