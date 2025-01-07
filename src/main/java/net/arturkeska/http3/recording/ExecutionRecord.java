package net.arturkeska.http3.recording;

public record ExecutionRecord(
        java.time.ZonedDateTime time,
        EnvironmentDescription environment,
        String protocol,
        String uri,
        long responseSize,
        int repeat,
        int parallel,
        boolean success,
        long duration
) {
}
