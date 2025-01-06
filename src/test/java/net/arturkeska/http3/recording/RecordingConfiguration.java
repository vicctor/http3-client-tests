package net.arturkeska.http3.recording;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RecordingConfiguration {

    @Value("${test.environment.network.provider}")
    private String networkProvider;
    @Value("${test.environment.network.speed.ping}")
    private Integer networkPingTime;
    @Value("${test.environment.network.speed.download}")
    private Integer networkDownloadSpeed;
    @Value("${test.environment.network.speed.upload}")
    private Integer networkUploadSpeed;
    @Value("${test.environment.adapter.socket}")
    private Integer adapterSocket;
    @Value("${test.environment.adapter.bitrate}")
    private Integer adapterBitrate;

    @Bean
    EnvironmentDescription environmentDescription() {
        return new EnvironmentDescription(
                networkProvider,
                networkPingTime,
                networkDownloadSpeed,
                networkUploadSpeed,
                adapterSocket,
                adapterBitrate);
    }
}
