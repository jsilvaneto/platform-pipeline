# Fix Gradle Build Error on WSL (Incorrect function)

The error `java.io.IOException: Incorrect function` occurs when a Windows-side Gradle process (often triggered by Android Studio) attempts to use native file hashing or system calls on a WSL filesystem (`//wsl.localhost/`). This is a known compatibility issue between Windows-side Java/Gradle and the 9P filesystem used by WSL 2.

## User Review Required

> [!IMPORTANT]
> This plan involves modifying `gradle.properties` to disable some performance optimizations (Daemon and VFS watching) that cause issues on WSL.
>
> **Recommendation:** For the best experience, it is highly recommended to configure Android Studio to use a **JDK installed inside WSL** instead of the Windows JDK.
> 1. Open Android Studio Settings.
> 2. Go to **Build, Execution, Deployment > Build Tools > Gradle**.
> 3. Change **Gradle JDK** to point to a path inside WSL (e.g., `/usr/lib/jvm/...`).

## Proposed Changes

### [Component] Android Gradle Configuration

#### [MODIFY] [gradle.properties](file:///home/jsilvaneto/projetos/wallet/android/gradle.properties)
- Add `org.gradle.daemon=false` to avoid daemon-related file locking issues on WSL.
- Ensure `org.gradle.vfs.watch=false` is present.
- Comment out `org.gradle.java.home` if it points to a Windows path, as it can cause conflicts if you try to run Gradle from within WSL.

## Verification Plan

### Manual Verification
1. Run the build again from Android Studio or via `./gradlew assembleDebug` in the `android` directory.
2. If the error persists, try running `./gradlew clean` first.
