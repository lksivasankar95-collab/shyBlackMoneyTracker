/**
 * Patches @capacitor/share v5.x SharePlugin.java to specify RECEIVER_NOT_EXPORTED.
 *
 * Android 14+ (targetSdk >= 34) throws SecurityException at startup when a
 * BroadcastReceiver is registered without RECEIVER_EXPORTED / RECEIVER_NOT_EXPORTED.
 * The unpatched plugin crashes the app instantly on launch.
 * This mirrors the official fix shipped in @capacitor/share v6.
 *
 * Wired as "postinstall" in package.json so the patch survives npm install.
 */
const fs = require('fs')
const path = require('path')

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

if (src.includes('RECEIVER_NOT_EXPORTED')) {
  console.log('[patch-share] already patched')
  process.exit(0)
}

// 1. Add ContextCompat import
const importAnchor = 'import androidx.core.content.FileProvider;'
if (!src.includes(importAnchor)) {
  console.error('[patch-share] unexpected file layout — import anchor missing, aborting')
  process.exit(1)
}
src = src.replace(
  importAnchor,
  'import androidx.core.content.ContextCompat;\n' + importAnchor
)

// 2. Replace the unsafe receiver registration
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

if (!src.includes(oldReg)) {
  console.error('[patch-share] unexpected file layout — registration call missing, aborting')
  process.exit(1)
}
src = src.replace(oldReg, newReg)

fs.writeFileSync(target, src)
console.log('[patch-share] patched SharePlugin.java with RECEIVER_NOT_EXPORTED')
