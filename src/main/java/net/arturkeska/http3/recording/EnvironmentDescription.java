package net.arturkeska.http3.recording;

public record EnvironmentDescription(
        String provider,
        int ping,
        int downloadSpeed,
        int uploadSpeed,
        int adapterSocket,
        int bitrate


) {
}
