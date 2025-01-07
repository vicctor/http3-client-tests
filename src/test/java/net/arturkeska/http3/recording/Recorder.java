package net.arturkeska.http3.recording;

import org.springframework.stereotype.Service;
import org.springframework.util.StopWatch;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.UUID;

@Service
public class Recorder {
    private final String recordId = UUID.randomUUID().toString();
    private final JsonSerializer jsonSerializer;
    private final EnvironmentDescription environmentDescription;
    private final Collection<ExecutionRecord> records = new ArrayList<>();

    public Recorder(EnvironmentDescription environment, JsonSerializer jsonSerializer) {
        this.environmentDescription = environment;
        this.jsonSerializer = jsonSerializer;
    }

    public void save() {
        try (var fileOut = new FileOutputStream("doc/records/%s.json".formatted(recordId), false)) {
            fileOut.write((jsonSerializer.serialize(records) + "\n").getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void logExecutionRecord(String protocol, String uri, long responseSize, int repeat, int parallel, boolean success, StopWatch stopwatch) {
        var event = new ExecutionRecord(
                LocalDateTime.now().atZone(ZoneId.of("UTC")),
                environmentDescription,
                protocol,
                uri,
                responseSize,
                repeat,
                parallel,
                success,
                stopwatch.getTotalTimeNanos()
        );
        records.add(event);
    }

}
