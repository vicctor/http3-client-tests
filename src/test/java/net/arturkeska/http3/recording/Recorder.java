package net.arturkeska.http3.recording;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import org.springframework.stereotype.Service;
import org.springframework.util.StopWatch;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.UUID;

@Service
public class Recorder {
    private final String recordId = UUID.randomUUID().toString();
    private EnvironmentDescription environmentDescription;
    private final Collection<ExecutionRecord> records = new ArrayDeque<>();

    public Recorder(EnvironmentDescription environment) {
        this.environmentDescription = environment;
    }

    public void save() {
        try (var fileOut = new FileOutputStream("doc/records/%s.json".formatted(recordId), false)) {
            fileOut.write((gson().toJson(records) + "\n").getBytes(StandardCharsets.UTF_8));
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

    private Gson gson() {
        return new GsonBuilder()
                .registerTypeAdapter(ZonedDateTime.class, new TypeAdapter<ZonedDateTime>() {
                    @Override
                    public void write(JsonWriter out, ZonedDateTime value) throws IOException {
                        out.value(value.toString());
                    }

                    @Override
                    public ZonedDateTime read(JsonReader in) throws IOException {
                        return ZonedDateTime.parse(in.nextString());
                    }
                })
                .enableComplexMapKeySerialization()
                .create();
    }

}
