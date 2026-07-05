# Keep Capacitor WebView JavaScript interface
-keepclassmembers class * extends com.getcapacitor.BridgeActivity {
    public *;
}
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep WebView JavaScript bridge methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep R8 from stripping WebView functionality
-keepclassmembers class * extends android.webkit.WebView {
    public *;
}
-keep class android.webkit.** { *; }

# Keep Gson serialization
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep JS interfaces for Capacitor plugins
-keep class * implements com.getcapacitor.JSExport { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep ViewBinding
-keep class * implements androidx.viewbinding.ViewBinding { *; }

# ── Capacitor Filesystem Plugin ──
-keep class com.capacitorjs.plugins.filesystem.** { *; }
-keepclassmembers class com.capacitorjs.plugins.filesystem.FilesystemPlugin {
    @com.getcapacitor.annotation.CapacitorMethod <methods>;
}

# ── Capacitor Share Plugin ──
-keep class com.capacitorjs.plugins.share.** { *; }
-keepclassmembers class com.capacitorjs.plugins.share.SharePlugin {
    @com.getcapacitor.annotation.CapacitorMethod <methods>;
}

# ── Capacitor App Plugin ──
-keep class com.capacitorjs.plugins.app.** { *; }
-keepclassmembers class com.capacitorjs.plugins.app.AppPlugin {
    @com.getcapacitor.annotation.CapacitorMethod <methods>;
}

# ── Capacitor Local Notifications Plugin ──
-keep class com.capacitorjs.plugins.localnotifications.** { *; }
-keepclassmembers class com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin {
    @com.getcapacitor.annotation.CapacitorMethod <methods>;
}

# ── Keep all @CapacitorMethod annotations (critical for release builds) ──
-keepattributes *Annotation*
-keep @interface com.getcapacitor.annotation.CapacitorMethod
-keep @interface com.getcapacitor.annotation.PermissionCallback
-keep @interface com.getcapacitor.annotation.Permission

# ── Prevent stripping of plugin callback types ──
-keepclassmembers class * extends com.getcapacitor.PluginCall {
    public *;
}
-keepclassmembers class com.getcapacitor.JSObject {
    public *;
}
