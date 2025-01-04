package net.arturkeska.http3;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class Http3Controller {
//	private Map<HttpProtocol, RestClient> clients;

//	Http3Controller(RestClient http3RestClient, RestClient http2RestClient) {
//		clients = new HashMap<>() {{
//			put(HttpProtocol.H2, http2RestClient);
//			put(HttpProtocol.HTTP3, http3RestClient);
//		}};
//
//    }
//
//	@GetMapping("/remote/{protocol}")
//	long remote(@PathVariable("protocol")HttpProtocol protocol,
//				@RequestParam("repeat") int repeat,
//				@RequestParam("parallelism") int parallel) throws InterruptedException, ExecutionException {
//
//
//
//
//		try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
//			var executions = IntStream.range(0, repeat)
//					.mapToObj(n -> scope.fork(() -> callHttp3(protocol)))
//					.collect(Collectors.toList());
//			scope
//					.join()
//					.throwIfFailed();
//			return executions.stream().map(e -> e.get())
//					.mapToInt(i->i)
//					.sum();
//		}
//
//	}
//
//	Integer callHttp3(HttpProtocol protocol) {
//		final RestClient client = clients.get(protocol);
//		return client.get()
//				.uri("https://example.com/")
//				.retrieve()
//				.body(String.class)
//				.length();
//	}

	@GetMapping("/foo")
	public String get() {
		return "blah";
	}

}
