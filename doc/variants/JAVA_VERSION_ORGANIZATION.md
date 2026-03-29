# Java Version-Specific Source Organization

## Directory Structure Changes

The HTTP/3 examples have been moved to version-specific directories to better organize the codebase:

```
src/
├── main/
│   ├── java/                          # Standard Java classes (compatible with older JDK versions)
│   │   └── net/arturkeska/http3/
│   │       ├── Http3Application.java          # Spring Boot application
│   │       ├── Http3Controller.java           # REST controller
│   │       ├── JettyConfiguration.java        # Jetty configuration
│   │       └── recording/                     # Recording framework
│   │
│   └── java26/                        # Java 26+ specific features (HTTP/3 client)
│       └── net/arturkeska/http3/
│           ├── HTTP3DebugExample.java          # HTTP/3 client testing
│           └── HTTP3ConnectionReuseExample.java # HTTP/3 connection reuse
└── test/
    └── java/
        └── net/arturkeska/http3/      # Unit tests
```

## Rationale

### Why Separate Java 26 Features?

1. **HTTP/3 Client Support**: The `HttpClient.Version.HTTP_3` enum is only available in custom Java builds and experimental JDK versions
2. **Version Compatibility**: Allows the project to maintain compatibility with standard JDK versions for non-HTTP/3 components
3. **Clear Separation**: Makes it obvious which code requires special JDK builds
4. **Future-Proofing**: Easy to move files as HTTP/3 support stabilizes in official JDK releases

### Files Moved to `java26/`:

- **`HTTP3DebugExample.java`**: Complete HTTP/3 client testing with multiple servers and visual status reporting
- **`HTTP3ConnectionReuseExample.java`**: HTTP/3 connection reuse and multiplexing examples

### Files Remaining in `java/`:

- **Server-side components**: Spring Boot application, controllers, and Jetty configuration
- **Recording framework**: Test result recording and analysis
- **Unit tests**: All test classes remain in standard location

## Build and Execution

### Scripts Updated:

- **`run-http3-example.sh`**: Now compiles from `src/main/java26/` 
- **Documentation**: Updated to reflect new paths

### Compilation Commands:

```bash
# HTTP/3 client examples (requires custom JDK with HTTP/3 support)
javac -d target/classes src/main/java26/net/arturkeska/http3/HTTP3DebugExample.java

# Standard Java components (works with any JDK 11+)
javac -d target/classes src/main/java/net/arturkeska/http3/Http3Application.java
```

### Running Examples:

```bash
# Run HTTP/3 client tests (requires custom JDK)
export JAVA_HOME=/home/grxybek/tata/jdk/build/linux-x86_64-server-release/images/jdk
./run-http3-example.sh

# Run standard Java components
java -cp target/classes net.arturkeska.http3.Http3Application
```

## Benefits

1. **Clear Dependency Requirements**: Immediate visibility of which components need custom JDK builds
2. **Gradual Migration**: Easy to move files between directories as JDK support evolves
3. **Build System Flexibility**: Can configure different compilation paths for different Java versions
4. **Developer Experience**: Clearer understanding of what requires special setup

## Future Considerations

- **When HTTP/3 stabilizes** in official JDK releases, files can be moved back to `src/main/java/`
- **Multiple JDK versions** could be supported with version-specific build profiles
- **Gradle/Maven configuration** could be enhanced to handle multi-version builds automatically

This organization provides a clean separation of concerns while maintaining backward compatibility and flexibility for future changes.