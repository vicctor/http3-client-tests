package net.arturkeska.http3.recording;

import java.util.List;
import java.util.stream.Collectors;

public class RecordingAnalyser {
    
    public static void main(String[] args) {
        RecordReader reader = new RecordReader();
        
        List<ExecutionRecord> records = reader.read();
        
        records.stream()
                .filter(ExecutionRecord::success)
                // .filter(record -> record.environment().provider().contains("bussinesslink"))
                // .filter(record -> record.environment().provider().contains("microtic"))
                // .filter(record -> record.environment().provider().contains("orange"))
                // .filter(record -> record.environment().provider().contains("poznan"))
                .collect(Collectors.groupingBy(record -> 
                    String.format("[ responseSize=%dKiB  parallel=%d repeat=%d]", 
                        record.responseSize() / 1024, 
                        record.parallel(), 
                        record.repeat())))
                .forEach((key, sizedRecords) -> {
                    System.out.println(key);
                    sizedRecords.stream()
                            .collect(Collectors.groupingBy(ExecutionRecord::protocol))
                            .entrySet().stream()
                            .map(entry -> new ProtocolAverageResult(
                                entry.getKey(),
                                entry.getValue().stream()
                                        .mapToLong(ExecutionRecord::duration)
                                        .average()
                                        .orElse(0.0)
                            ))
                            .forEach(result -> 
                                System.out.printf("| %-17s | %d%n", 
                                    result.protocol(), 
                                    (int) (result.averageDuration() / 100_000.0)));
                });
    }
    
    private record ProtocolAverageResult(String protocol, double averageDuration) {}
}