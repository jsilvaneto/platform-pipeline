# Fix for Incompatible Gradle JVM version (JDK 25)

The project's Gradle version (8.14.5) was incompatible with the Android Studio Embedded JBR (JDK 25), as Gradle 8.14.5 only supports up to Java 24.

## Changes Made

### Environment and JDK
- Updated [gradle.properties](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/gradle.properties) to use **JDK 21** (found in a local update folder) instead of the incompatible JDK 25.
- Maintained `android.buildToolsVersion=35.0.0` for stability.

### Previous Fixes (Maintained)
- Syntax errors in [app/build.gradle.kts](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/build.gradle.kts) for hyphenated library references remain fixed.
- Kotlin and KSP version upgrades in [libs.versions.toml](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/gradle/libs.versions.toml) remain applied.

## Verification Results

### Automated Verification
- Successfully executed `:app:help` via Gradle using JDK 21.
```bash
./gradlew :app:help
# Result: Build finished successfully.
```

### Manual Verification Required
- Please run a **Gradle Sync** in Android Studio. The "Incompatible Gradle JVM version" error should now be resolved.
