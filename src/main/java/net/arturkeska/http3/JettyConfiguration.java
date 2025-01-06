package net.arturkeska.http3;

import org.eclipse.jetty.http.HttpField;
import org.eclipse.jetty.http.HttpHeader;
import org.eclipse.jetty.http.PreEncodedHttpField;
import org.eclipse.jetty.http3.server.HTTP3ServerConnectionFactory;
import org.eclipse.jetty.io.ByteBufferPool;
import org.eclipse.jetty.quic.server.QuicServerConnector;
import org.eclipse.jetty.quic.server.ServerQuicConfiguration;
import org.eclipse.jetty.server.ConnectionFactory;
import org.eclipse.jetty.server.HttpConfiguration;
import org.eclipse.jetty.server.SecureRequestCustomizer;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.util.ssl.SslContextFactory;
import org.eclipse.jetty.util.thread.Scheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ssl.DefaultSslBundleRegistry;
import org.springframework.boot.web.embedded.jetty.JettyServerCustomizer;
import org.springframework.boot.web.embedded.jetty.JettyServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;
import java.nio.file.Paths;
import java.util.concurrent.Executor;

@Configuration
public class JettyConfiguration implements WebServerFactoryCustomizer<JettyServletWebServerFactory> {

    static class HTTP3ServerConnector extends QuicServerConnector
    {
        private static final Logger LOG = LoggerFactory.getLogger(org.eclipse.jetty.http3.server.HTTP3ServerConnector.class);

        private HttpField altSvcHttpField;

        public HTTP3ServerConnector(Server server, SslContextFactory.Server sslContextFactory, ConnectionFactory... factories)
        {
            this(server, null, null, null, sslContextFactory, factories);
        }

        public HTTP3ServerConnector(Server server, Executor executor, Scheduler scheduler, ByteBufferPool bufferPool, SslContextFactory.Server sslContextFactory, ConnectionFactory... factories)
        {
            super(server, executor, scheduler, bufferPool, new ServerQuicConfiguration(sslContextFactory, null), factories);
            // Max concurrent streams that a client can open.
            getQuicConfiguration().setMaxBidirectionalRemoteStreams(128);
            // HTTP/3 requires a few mandatory unidirectional streams.
            getQuicConfiguration().setMaxUnidirectionalRemoteStreams(8);
            getQuicConfiguration().setUnidirectionalStreamRecvWindow(1024 * 1024);
        }

        @Override
        protected void doStart() throws Exception
        {
            super.doStart();
            altSvcHttpField = new PreEncodedHttpField(HttpHeader.ALT_SVC, String.format("h3=\":%d\"", getLocalPort()));
        }

        public HttpField getAltSvcHttpField()
        {
            return altSvcHttpField;
        }
    }

    @Autowired
    private DefaultSslBundleRegistry defaultSslBundleRegistry;

    @Value("${server.port}")
    private Integer serverPort;

    @Value("${server.jetty.connection-idle-timeout}")
    private Integer idleTimeout;

    @Override
    public void customize(JettyServletWebServerFactory factory) {

        var jettyServerCustomizer = new JettyServerCustomizer() {
            @Override
            public void customize(Server server) {
                var keyStore = defaultSslBundleRegistry.getBundle("service").getStores().getKeyStore();

                SslContextFactory.Server sslContextFactory = new SslContextFactory.Server();
                sslContextFactory.setKeyStore(keyStore);
                sslContextFactory.setKeyStorePassword("secret"); // Must be set for Jetty

                HttpConfiguration httpConfig = new HttpConfiguration();
                httpConfig.addCustomizer(new SecureRequestCustomizer());
                httpConfig.setIdleTimeout(idleTimeout);

                HTTP3ServerConnector connector = new HTTP3ServerConnector(server, sslContextFactory, new HTTP3ServerConnectionFactory(httpConfig));
                connector.getQuicConfiguration().setPemWorkDirectory(
                        Paths.get(System.getProperty("java.io.tmpdir")));

                connector.setPort(serverPort);
                server.addConnector(connector);
            }
        };

        factory.addServerCustomizers(jettyServerCustomizer);
    }
}
