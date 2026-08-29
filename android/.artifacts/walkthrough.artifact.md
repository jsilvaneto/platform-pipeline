# Fix for Gradle Sync Error (JavaVersion.parse: 25.0.2)

The Gradle sync error was caused by a combination of JDK version mismatch (JDK 8 vs JDK 17 required), syntax errors in the build script's Version Catalog usage, and potentially misconfigured build tools.

## Changes Made

### Environment and JDK
- Updated [gradle.properties](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/gradle.properties) to explicitly use the Android Studio Embedded JDK (JBR) for Gradle operations.
- Added `android.buildToolsVersion=35.0.0` to [gradle.properties](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/gradle.properties) to ensure a modern, compatible version is used.

### Build Scripts
- Fixed syntax errors in [app/build.gradle.kts](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/build.gradle.kts) where library references with hyphens (e.g., `libs.androidx.work.runtime-ktx`) were causing compilation failures. These were changed to use dots (`libs.androidx.work.runtime.ktx`).
- Updated Kotlin and KSP versions in [libs.versions.toml](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/gradle/libs.versions.toml) to `2.0.21` and `2.0.21-1.0.25` respectively for better stability and compatibility.

## Verification Results

### Automated Verification
- Successfully executed `:app:help` via Gradle, which confirms that the build scripts are syntactically correct and the Gradle environment is properly configured.
```bash
./gradlew :app:help
# Result: Build finished successfully.
```

### Manual Verification Required
- Please run a **Gradle Sync** in Android Studio to confirm that the `JavaVersion.parse` error is fully resolved in the IDE's internal state.
