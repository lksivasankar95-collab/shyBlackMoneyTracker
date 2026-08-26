package com.shyblack.finance;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Scoped-storage-compliant public Downloads saving.
 *
 * API 29+: inserts into MediaStore.Downloads using RELATIVE_PATH
 * "Download/<folder>". No storage permission required.
 * API < 29: writes to the public Downloads directory using the legacy
 * WRITE_EXTERNAL_STORAGE permission (declared in the manifest with
 * maxSdkVersion="28", runtime-requested only when actually needed).
 */
@CapacitorPlugin(name = "DownloadStorage", permissions = {
    @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage")
})
public class DownloadStoragePlugin extends Plugin {

    static final String DEFAULT_FOLDER = "Expenses Tracker ShyBlack";
    private static final String STORAGE_ALIAS = "storage";
    private static final String PERMISSION_DENIED_ERROR = "Storage permission denied";

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        if (!validateInput(call)) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            performSave(call);
            return;
        }

        // Legacy path (Android 9 and below)
        if (!isLegacyStorageGranted()) {
            requestAllPermissions(call, "permissionCallback");
            return;
        }
        performSave(call);
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("uri is required");
            return;
        }
        String mimeType = call.getString("mimeType");
        Logger.debug(getLogTag(), "openFile: uri=" + uriStr + " mimeType=" + mimeType);
        try {
            Context ctx = getContext();
            Uri uri = Uri.parse(uriStr);

            if ("file".equalsIgnoreCase(uri.getScheme()) && uri.getPath() != null) {
                uri = FileProvider.getUriForFile(ctx,
                    ctx.getPackageName() + ".fileprovider",
                    new File(uri.getPath()));
                Logger.debug(getLogTag(), "openFile: converted file:// to content:// via FileProvider: " + uri);
            }

            String type = mimeType;

            /* Resolve MIME type from the ContentResolver for content:// URIs.
             * MimeTypeMap.getFileExtensionFromUrl() cannot extract extensions
             * from opaque content URIs, so it would return null. Querying the
             * ContentResolver gives the correct MIME that was set during insert. */
            if (type == null || type.isEmpty()) {
                if ("content".equalsIgnoreCase(uri.getScheme())) {
                    try {
                        ContentResolver resolver = ctx.getContentResolver();
                        type = resolver.getType(uri);
                        Logger.debug(getLogTag(), "openFile: resolved MIME from ContentResolver: " + type);
                    } catch (Exception ignored) { }
                }
                if (type == null || type.isEmpty()) {
                    String ext = MimeTypeMap.getFileExtensionFromUrl(uriStr.toLowerCase(Locale.US));
                    type = ext != null ? MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) : null;
                }
            }

            if (type == null || type.isEmpty()) {
                type = "*/*";
            }

            Logger.debug(getLogTag(), "openFile: final MIME=" + type + " uri=" + uri);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, type);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Activity activity = getActivity();
            if (activity == null) {
                ctx.startActivity(intent);
            } else {
                activity.startActivity(intent);
            }
            Logger.debug(getLogTag(), "openFile: ACTION_VIEW launched successfully");
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("No installed app can open this file type");
        } catch (Exception e) {
            call.reject("Unable to open file: " + safeMessage(e));
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (!isLegacyStorageGranted()) {
            Logger.debug(getLogTag(), "User denied storage permission");
            call.reject(PERMISSION_DENIED_ERROR);
            return;
        }
        if (!validateInput(call)) return;
        try {
            call.resolve(saveLegacy(
                call.getString("fileName"),
                call.getString("mimeType"),
                folderOrDefault(call),
                Base64.decode(call.getString("data"), Base64.DEFAULT)));
        } catch (Exception e) {
            call.reject("Legacy save failed: " + safeMessage(e));
        }
    }

    /* ── Core save ── */

    private boolean validateInput(PluginCall call) {
        String fileName = call.getString("fileName");
        String data = call.getString("data");
        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("fileName is required");
            return false;
        }
        if (data == null || data.isEmpty()) {
            call.reject("data is required");
            return false;
        }
        return true;
    }

    private void performSave(PluginCall call) {
        byte[] bytes;
        try {
            bytes = Base64.decode(call.getString("data"), Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 data");
            return;
        }
        if (bytes == null || bytes.length == 0) {
            call.reject("Empty file data");
            return;
        }

        try {
            JSObject result;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                result = saveViaMediaStore(getContext(), call.getString("fileName"),
                    call.getString("mimeType"), folderOrDefault(call), bytes);
            } else {
                result = saveLegacy(call.getString("fileName"),
                    call.getString("mimeType"), folderOrDefault(call), bytes);
            }
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Save failed: " + safeMessage(e));
        }
    }

    private String folderOrDefault(PluginCall call) {
        String folder = call.getString("folder");
        return folder == null || folder.trim().isEmpty() ? DEFAULT_FOLDER : folder;
    }

    private boolean isLegacyStorageGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return true;
        String perm = Manifest.permission.WRITE_EXTERNAL_STORAGE;
        if (getPermissionState(STORAGE_ALIAS) == PermissionState.GRANTED) return true;
        Activity activity = getActivity();
        if (activity == null) {
            return androidx.core.content.ContextCompat.checkSelfPermission(getContext(), perm)
                == PackageManager.PERMISSION_GRANTED;
        }
        return androidx.core.content.ContextCompat.checkSelfPermission(activity, perm)
            == PackageManager.PERMISSION_GRANTED;
    }

    /* ── MediaStore implementation (API 29+) ── */

    private JSObject saveViaMediaStore(Context context, String fileName, String mimeType,
                                       String folder, byte[] bytes) throws Exception {
        ContentResolver resolver = context.getContentResolver();
        String relativePath = "Download/" + folder;

        Set<String> taken = queryExistingNames(resolver, relativePath);
        String displayName = pickAvailableName(taken, fileName);
        String type = normalizeMime(mimeType, displayName);

        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, displayName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, type);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (itemUri == null) {
            throw new IllegalStateException("MediaStore rejected the insert");
        }

        OutputStream os = null;
        try {
            os = resolver.openOutputStream(itemUri);
            if (os == null) throw new IllegalStateException("Could not open output stream");
            os.write(bytes);
            os.flush();
        } finally {
            if (os != null) {
                try { os.close(); } catch (Exception ignored) { }
            }
        }

        ContentValues done = new ContentValues();
        done.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(itemUri, done, null, null);

        JSObject result = new JSObject();
        result.put("uri", itemUri.toString());
        result.put("displayName", displayName);
        result.put("path", relativePath + "/" + displayName);
        result.put("size", bytes.length);
        return result;
    }

    private Set<String> queryExistingNames(ContentResolver resolver, String relativePath) {
        Set<String> names = new HashSet<>();
        Cursor cursor = null;
        try {
            cursor = resolver.query(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                new String[]{ MediaStore.MediaColumns.DISPLAY_NAME },
                MediaStore.MediaColumns.RELATIVE_PATH + "=?",
                new String[]{ relativePath },
                null);
            if (cursor != null) {
                int idx = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
                while (cursor.moveToNext()) {
                    String n = cursor.getString(idx);
                    if (n != null) names.add(n.toLowerCase(Locale.US));
                }
            }
        } catch (Exception ignored) {
            // If listing fails, MediaStore's own auto-renaming still prevents overwrites.
        } finally {
            if (cursor != null) cursor.close();
        }
        return names;
    }

    /* ── Legacy implementation (API < 29) ── */

    @SuppressWarnings("deprecation")
    private JSObject saveLegacy(String fileName, String mimeType, String folder, byte[] bytes) throws Exception {
        File downloadsRoot = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File dir = new File(downloadsRoot, folder);
        if (!dir.exists() && !dir.mkdirs() && !dir.isDirectory()) {
            throw new IllegalStateException("Could not create " + dir.getAbsolutePath());
        }

        Set<String> taken = new HashSet<>();
        File[] children = dir.listFiles();
        if (children != null) {
            for (File c : children) {
                if (c != null && c.getName() != null) taken.add(c.getName().toLowerCase(Locale.US));
            }
        }
        String displayName = pickAvailableName(taken, fileName);

        File dest = new File(dir, displayName);
        FileOutputStream fos = null;
        try {
            fos = new FileOutputStream(dest);
            fos.write(bytes);
            fos.flush();
        } finally {
            if (fos != null) {
                try { fos.close(); } catch (Exception ignored) { }
            }
        }

        JSObject result = new JSObject();
        result.put("uri", Uri.fromFile(dest).toString());
        result.put("displayName", displayName);
        result.put("path", "Download/" + folder + "/" + displayName);
        result.put("size", dest.length());
        return result;
    }

    /* ── Helpers ── */

    /** Collision-safe naming: name.ext -> "name (1).ext" -> "name (2).ext" ... */
    static String pickAvailableName(Set<String> takenLower, String desired) {
        String clean = sanitize(desired);
        int dot = clean.lastIndexOf('.');
        String base = dot > 0 ? clean.substring(0, dot) : clean;
        String ext = dot > 0 ? clean.substring(dot) : "";

        String candidate = clean;
        int n = 1;
        while (takenLower.contains(candidate.toLowerCase(Locale.US))) {
            candidate = base + " (" + n + ")" + ext;
            n++;
        }
        return candidate;
    }

    static String sanitize(String name) {
        if (name == null) return "report";
        String cleaned = name.replaceAll("[\\\\/:*?\"<>|\\x00-\\x1F]", " ");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        while (cleaned.endsWith(".") || cleaned.endsWith(" ")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        }
        if (cleaned.isEmpty()) return "report";
        if (cleaned.length() > 200) cleaned = cleaned.substring(0, 200);
        return cleaned;
    }

    private String normalizeMime(String mimeType, String fileName) {
        if (mimeType != null && !mimeType.trim().isEmpty()) return mimeType;
        String ext = "";
        int dot = fileName.lastIndexOf('.');
        if (dot >= 0 && dot < fileName.length() - 1) ext = fileName.substring(dot + 1);
        String mapped = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.US));
        return mapped != null ? mapped : "application/octet-stream";
    }

    private String safeMessage(Throwable t) {
        return t.getMessage() != null ? t.getMessage() : t.getClass().getSimpleName();
    }
}
