/**
 * Patches @capacitor/share v5.x SharePlugin.java to fix two Android 14+ crashes
 * that the plugin (built for targetSdk < 34) triggers on targetSdk 34/35 apps.
 *
 * 1. SecurityException at startup: a BroadcastReceiver registered without
 *    RECEIVER_EXPORTED / RECEIVER_NOT_EXPORTED crashes the app on launch.
 * 2. IllegalArgumentException on Share: a PendingIntent built with FLAG_MUTABLE
 *    and an implicit Intent is rejected by Android 14+ (targetSdk >= 34), killing
 *    the process (SIG 9) when the user taps Share.
 *
 * Both mirror the official fixes shipped in @capacitor/share v6.
 *
 * Wired as "postinstall" in package.json so the patch survives npm install.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'share',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'share',
  'SharePlugin.java'
)

if (!fs.existsSync(target)) {
  console.log('[patch-share] SharePlugin.java not found — skipping')
  process.exit(0)
}

let src = fs.readFileSync(target, 'utf8')

const importAnchor = 'import androidx.core.content.FileProvider;'
if (!src.includes(importAnchor)) {
  console.error('[patch-share] unexpected file layout — import anchor missing, aborting')
  process.exit(1)
}

let changed = false

// --- Fix 1: receiver registration must declare RECEIVER_NOT_EXPORTED ---
const oldReg =
  'getActivity().registerReceiver(broadcastReceiver, new IntentFilter(Intent.EXTRA_CHOSEN_COMPONENT));'
const newReg = [
  'getActivity()',
  '    .registerReceiver(',
  '        broadcastReceiver,',
  '        new IntentFilter(Intent.EXTRA_CHOSEN_COMPONENT),',
  '        ContextCompat.RECEIVER_NOT_EXPORTED',
  '    );',
].join('\n')
// Ensure ContextCompat is imported even when the receiver patch already exists.
if (
  src.includes('ContextCompat.RECEIVER_NOT_EXPORTED') &&
  !src.includes('import androidx.core.content.ContextCompat;')
) {
  if (!src.includes(importAnchor)) {
    console.error(
      '[patch-share] unexpected file layout — import anchor missing, aborting'
    );
    process.exit(1);
  }

  src = src.replace(
    importAnchor,
    'import androidx.core.content.ContextCompat;\n' + importAnchor
  );

  changed = true;
}

// --- Fix 2: allow unsafe implicit intent on Android 14+ (targetSdk >= 34) ---
// Android 14+ rejects a PendingIntent with FLAG_MUTABLE on an implicit Intent
// unless FLAG_ALLOW_UNSAFE_IMPLICIT_INTENT is set, killing the process on Share.
// Mirrors the official @capacitor/share v6 fix.
const flagsAnchor =
  '            if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {\n' +
  '                flags = flags | PendingIntent.FLAG_MUTABLE;\n' +
  '            }'
const safeFlags =
  '            if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {\n' +
  '                flags = flags | PendingIntent.FLAG_MUTABLE;\n' +
  '            }\n' +
  '            if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {\n' +
  '                flags = flags | PendingIntent.FLAG_ALLOW_UNSAFE_IMPLICIT_INTENT;\n' +
  '            }'

if (!src.includes('FLAG_ALLOW_UNSAFE_IMPLICIT_INTENT')) {
  if (!src.includes(flagsAnchor)) {
    console.error('[patch-share] unexpected file layout — flags block missing, aborting')
    process.exit(1)
  }
  src = src.replace(flagsAnchor, safeFlags)
  changed = true
}

if (changed) {
  fs.writeFileSync(target, src)
  console.log('[patch-share] patched SharePlugin.java')
} else {
  console.log('[patch-share] already patched')
}
