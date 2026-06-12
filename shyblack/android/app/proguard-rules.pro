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
