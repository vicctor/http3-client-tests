#!/bin/bash

# Script to move Gradle files to sandbox after successful Maven conversion

echo "🔄 Moving Gradle Files to Sandbox"
echo "=================================="
echo ""

PROJECT_DIR="/home/grxybek/tata/http3-client-test"
cd "$PROJECT_DIR"

# Create sandbox gradle directory
mkdir -p sandbox/gradle-legacy

echo "📦 Moving Gradle files to sandbox/gradle-legacy/:"
echo ""

# Move Gradle files
GRADLE_FILES=(
    "build.gradle"
    "settings.gradle" 
    "gradlew"
    "gradlew.bat"
    "gradle/"
    ".gradle/"
)

for file in "${GRADLE_FILES[@]}"; do
    if [[ -e "$file" ]]; then
        echo "• Moving $file"
        mv "$file" sandbox/gradle-legacy/ 2>/dev/null || true
    fi
done

# Move build directory (Gradle output)
if [[ -d "build" ]]; then
    echo "• Moving build/ directory"
    mv build sandbox/gradle-legacy/ 2>/dev/null || true
fi

# Create a README in the gradle-legacy directory
cat > sandbox/gradle-legacy/README.md << 'EOF'
# Gradle Legacy Files

This directory contains the original Gradle build files from the HTTP/3 Client Test project before conversion to Maven.

## Original Gradle Configuration

- **build.gradle**: Main Gradle build script
- **settings.gradle**: Gradle settings
- **gradlew/gradlew.bat**: Gradle wrapper scripts
- **gradle/**: Gradle wrapper directory
- **.gradle/**: Gradle cache directory
- **build/**: Gradle build output directory

## Conversion Notes

The project has been successfully converted to Maven. The new Maven configuration in `pom.xml` includes all the same dependencies and features:

- Spring Boot 3.3.5
- Jetty HTTP/3 support
- Java 23 with preview features
- All original dependencies

## Usage

These files are kept for reference. To use Gradle again (not recommended), copy these files back to the project root.

To build with Maven instead:
```bash
mvn clean compile
mvn spring-boot:run
```

EOF

echo ""
echo "✅ Gradle files moved to sandbox/gradle-legacy/"
echo ""
echo "📋 Sandbox structure:"
ls -la sandbox/gradle-legacy/ 2>/dev/null || echo "No files moved (may already be in sandbox)"

echo ""
echo "🎯 Project is now Maven-only!"
echo ""
echo "Verify with:"
echo "• mvn clean compile"
echo "• mvn dependency:tree"
echo "• mvn spring-boot:run"