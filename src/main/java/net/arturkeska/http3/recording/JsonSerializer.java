package net.arturkeska.http3.recording;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.TypeAdapter;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.Reader;
import java.time.ZonedDateTime;
import java.util.List;

@Component
public class JsonSerializer {

    private final Gson gson;

    public JsonSerializer() {
        gson = createGson();
    }

    public String serialize(Object object) {
        return gson.toJson(object);
    }

    public <T> List<T> deserialize(Reader reader, TypeToken<List<T>> clazz) {
        return gson.fromJson(reader, clazz);
    }

    private Gson createGson() {
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
