# Regras ProGuard para Kotlinx Serialization
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}

-keepclassmembers class * {
    @kotlinx.serialization.Serializable <init>(...);
}

# Regras ProGuard para Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Regras Retrofit & OkHttp
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-dontwarn okio.**
