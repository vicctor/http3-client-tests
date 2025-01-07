package net.arturkeska.http3.recording;

import com.google.gson.reflect.TypeToken;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class RecordReader {
    private static final Path RECORDS_PATH = Path.of("doc/records");
    List<ExecutionRecord> read() {
        final var serialzer = new JsonSerializer();
        final var token = new TypeToken<List<ExecutionRecord>>(){};
        try {
            return Files.list(RECORDS_PATH)
                    .flatMap(p -> {
                        try {
                            return serialzer.deserialize(Files.newBufferedReader(p), token).stream();
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    })
                    .toList();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
