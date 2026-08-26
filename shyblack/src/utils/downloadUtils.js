import { Filesystem, Directory } from '@capacitor/filesystem'
import * as privacy from './privacy'
import { isAndroidNative, saveToDownloads, openSavedFile } from './downloadService'

/* ── Logger ── */

function log(tag, method, details) {
  const prefix = tag ? `[REPORT][${tag}]` : '[DOWNLOAD]'
  const msg = `${prefix} ${method}${details ? ` — ${details}` : ''}`
  if (typeof console !== 'undefined') console.log(msg)
  return msg
}

/* ── Constants ── */

const SHARE_DIR = 'ExpenseTracker/_share'

/** Delay before cleaning up share temp files (ms).
 *  The Android share intent is async — the receiving app reads the file
 *  AFTER the Share plugin resolves. 60 s gives ample time. */
const SHARE_CLEANUP_DELAY_MS = 60_000

const MIME_MAP = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  html: 'text/html',
  json: 'application/json',
  txt: 'text/plain',
}

/* ── Helpers ── */

function getMimeType(ext) {
  return MIME_MAP[ext?.toLowerCase()] || 'application/octet-stream'
}

function getExt(filename) {
  return filename?.split('.').pop()?.toLowerCase() || 'bin'
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (!reader.result) {
        reject(new Error('FileReader returned no result'))
        return
      }
      resolve(reader.result.split(',')[1] || reader.result)
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.onabort = () => reject(new Error('FileReader aborted'))
    reader.readAsDataURL(blob)
  })
}

async function verifyFile(path, directory) {
  try {
    const stat = await Filesystem.stat({ path, directory })
    const ok = stat && typeof stat.size === 'number' && stat.size > 0
    log('LIFECYCLE', 'VERIFY', `${path} — exists: ${ok}, size: ${ok ? stat.size : 'N/A'}`)
    return ok ? { exists: true, size: stat.size, uri: stat.uri } : { exists: false }
  } catch (err) {
    log('LIFECYCLE', 'VERIFY_FAILED', `${path} — ${err.message}`)
    return { exists: false, error: err.message }
  }
}

async function cleanupOldShareFiles() {
  try {
    const shareDirExists = await Filesystem.stat({
      path: SHARE_DIR,
      directory: Directory.External,
    }).then(() => true).catch(() => false)

    if (!shareDirExists) return

    const result = await Filesystem.readdir({
      path: SHARE_DIR,
      directory: Directory.External,
    })
    if (result?.files?.length > 0) {
      let removed = 0
      for (const file of result.files) {
        try {
          await Filesystem.deleteFile({
            path: `${SHARE_DIR}/${file.name || file}`,
            directory: Directory.External,
          })
          removed++
        } catch (e) { /* individual cleanup failure is non-fatal */ }
      }
      log('LIFECYCLE', 'CLEANUP', `Removed ${removed} stale share files`)
    }
  } catch (e) { /* readdir may fail if directory doesn't exist */ }
}

/** Schedule deletion of a share temp file after a delay.
 *  The share intent is async — the receiving app reads the file AFTER the
 *  Share plugin resolves, so immediate deletion caused the receiver to get
 *  an empty / missing attachment. */
function scheduleShareCleanup(filename) {
  setTimeout(() => {
    Filesystem.deleteFile({
      path: `${SHARE_DIR}/${filename}`,
      directory: Directory.External,
    }).then(() => log('LIFECYCLE', 'SHARE_CLEANUP_OK', `Deleted ${filename}`))
      .catch(() => { /* non-fatal */ })
  }, SHARE_CLEANUP_DELAY_MS)
}

/* ── Public API ── */

export function dataUriToBlob(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return null
  try {
    const parts = dataUri.split(',')
    const mimeMatch = parts[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
    const byteStr = atob(parts[1])
    const bytes = new Uint8Array(byteStr.length)
    for (let i = 0; i < byteStr.length; i++) {
      bytes[i] = byteStr.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

export function dataUriToBase64(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return null
  const parts = dataUri.split(',')
  return parts.length === 2 ? parts[1] : null
}

export async function downloadBlob(blob, filename) {
  if (!blob) return { success: false, error: 'No blob data' }
  log('PIPELINE', 'DOWNLOAD_START', `${filename} — ${blob.size} bytes`)

  const ext = getExt(filename)
  const mimeType = getMimeType(ext)
  log('PIPELINE', 'MIME', `${filename} → ext=${ext} → ${mimeType}`)
  privacy.suppressLockForTransition(5000)

  if (isAndroidNative()) {
    try {
      const result = await saveToDownloads(blob, filename, mimeType)
      if (!result.uri) {
        log('PIPELINE', 'DOWNLOAD_FAILED', 'Native save returned no URI')
        return { success: false, error: 'Native save returned no URI', stage: 'mediastore-no-uri' }
      }
      if (!(result.size > 0)) {
        log('PIPELINE', 'DOWNLOAD_FAILED', 'Native save returned 0 bytes')
        return { success: false, error: 'Written file is empty (0 bytes)', stage: 'mediastore-empty' }
      }
      log('PIPELINE', 'DOWNLOAD_OK', `${result.filename} — ${result.size} bytes — URI: ${result.uri} — path: ${result.path}`)
      return {
        success: true,
        uri: result.uri,
        path: result.path,
        filename: result.filename,
        mimeType,
        size: result.size,
      }
    } catch (err) {
      log('PIPELINE', 'DOWNLOAD_FAILED', err?.message)
      return {
        success: false,
        error: err?.message || 'File write failed',
        stage: 'mediastore-write',
      }
    }
  }

  /* ── Web / Capacitor fallback (non-Android-native) ── */
  const base64 = await blobToBase64(blob)
  try {
    const savedFile = await Filesystem.writeFile({
      path: `ExpenseTracker/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    log('PIPELINE', 'WRITE_OK', `uri: ${savedFile.uri}`)

    const verification = await verifyFile(`ExpenseTracker/${filename}`, Directory.External)
    if (!verification.exists) {
      log('PIPELINE', 'VERIFY_FAILED', 'File not found after write')
      const legacyOk = downloadBlobLegacy(blob, filename)
      if (legacyOk) {
        return { success: true, path: filename, filename, mimeType, method: 'legacy' }
      }
      return { success: false, error: 'File not found after write', stage: 'verification' }
    }

    if (verification.size === 0) {
      log('PIPELINE', 'VERIFY_ZERO', 'File exists but is 0 bytes')
      return { success: false, error: 'Written file is empty (0 bytes)', stage: 'verification-size' }
    }

    log('PIPELINE', 'DOWNLOAD_OK', `${filename} — ${verification.size} bytes`)
    return {
      success: true,
      uri: savedFile.uri,
      path: `Downloads/ExpenseTracker/${filename}`,
      filename,
      mimeType,
      size: verification.size,
    }
  } catch (err) {
    log('PIPELINE', 'DOWNLOAD_FAILED', err.message)
    const legacyOk = downloadBlobLegacy(blob, filename)
    if (legacyOk) {
      return { success: true, path: filename, filename, mimeType, method: 'legacy' }
    }
    return { success: false, error: err.message || 'File write failed', stage: 'filesystem-write' }
  }
}

export async function downloadDataUri(dataUri, filename) {
  if (!dataUri || !filename) return { success: false, error: 'Missing data' }
  log('PIPELINE', 'DOWNLOAD_DATAURI_START', filename)

  const ext = getExt(filename)
  const mimeType = getMimeType(ext)
  const base64 = dataUriToBase64(dataUri)

  if (!base64) return { success: false, error: 'Invalid data URI' }

  privacy.suppressLockForTransition(5000)

  if (isAndroidNative()) {
    try {
      const result = await saveToDownloads(base64, filename, mimeType)
      log('PIPELINE', 'DOWNLOAD_OK', `${result.filename} — ${result.size} bytes — ${result.path}`)
      return {
        success: true,
        uri: result.uri,
        path: result.path,
        filename: result.filename,
        mimeType,
        size: result.size,
      }
    } catch (err) {
      log('PIPELINE', 'DOWNLOAD_DATAURI_FAILED', err?.message)
      return {
        success: false,
        error: err?.message || 'File write failed',
        stage: 'mediastore-write',
      }
    }
  }

  try {
    const savedFile = await Filesystem.writeFile({
      path: `ExpenseTracker/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    log('PIPELINE', 'WRITE_OK', `uri: ${savedFile.uri}`)

    const verification = await verifyFile(`ExpenseTracker/${filename}`, Directory.External)
    if (!verification.exists || verification.size === 0) {
      log('PIPELINE', 'VERIFY_FAILED', 'File invalid after write')
      const legacyOk = downloadDataUriLegacy(dataUri, filename)
      if (legacyOk) {
        return { success: true, path: filename, filename, mimeType, method: 'legacy' }
      }
      return { success: false, error: 'File verification failed', stage: 'verification' }
    }

    return {
      success: true,
      uri: savedFile.uri,
      path: `Downloads/ExpenseTracker/${filename}`,
      filename,
      mimeType,
      size: verification.size,
    }
  } catch (err) {
    log('PIPELINE', 'DOWNLOAD_DATAURI_FAILED', err.message)
    const legacyOk = downloadDataUriLegacy(dataUri, filename)
    if (legacyOk) {
      return { success: true, path: filename, filename, mimeType, method: 'legacy' }
    }
    return { success: false, error: err.message || 'File write failed', stage: 'filesystem-write' }
  }
}

export function downloadBlobLegacy(blob, filename) {
  if (!blob) return false
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      try { document.body.removeChild(a) } catch (e) { /* already removed */ }
      try { URL.revokeObjectURL(url) } catch (e) { /* already revoked */ }
    }, 30000)
    return true
  } catch (err) {
    log('LEGACY', 'FAILED', err.message)
    return false
  }
}

export function downloadDataUriLegacy(dataUri, filename) {
  const blob = dataUriToBlob(dataUri)
  return downloadBlobLegacy(blob, filename)
}

export function createPreviewUrl(dataUri) {
  const blob = dataUriToBlob(dataUri)
  if (!blob) return { url: dataUri, revoke: () => {} }
  const url = URL.createObjectURL(blob)
  let revoked = false
  return {
    url,
    revoke: () => {
      if (!revoked) {
        URL.revokeObjectURL(url)
        revoked = true
      }
    }
  }
}

export async function shareBlob(blob, filename, title) {
  if (!blob || !filename) return { shared: false, method: 'error', error: 'Missing blob or filename' }
  if (blob.size === 0) return { shared: false, method: 'error', error: 'File is empty (0 bytes)' }
  log('SHARE', 'START', `${filename} — ${blob.size} bytes — title: ${title || '(none)'}`)

  const ext = getExt(filename)
  const mimeType = getMimeType(ext)
  log('SHARE', 'MIME', `${ext} → ${mimeType}`)

  /* ── Path 1: Web Share API (browser / PWA) ── */
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: mimeType })
      await navigator.share({ files: [file], title: title || 'Document' })
      log('SHARE', 'OK_WEB_SHARE', 'Web Share API succeeded')
      return { shared: true, method: 'web-share' }
    } catch (err) {
      if (err.name === 'AbortError') {
        log('SHARE', 'CANCELLED', 'User cancelled via Web Share API')
        return { shared: false, method: 'cancelled' }
      }
      log('SHARE', 'WEB_SHARE_FAILED', err.message)
      /* Fall through to Capacitor Share */
    }
  }

  /* ── Path 2: Capacitor Share (Android / iOS native) ── */
  try {
    const { Share: CapShare } = await import('@capacitor/share')
    privacy.suppressLockForTransition(5000)

    /* Clean stale files from previous shares BEFORE writing the new one. */
    await cleanupOldShareFiles()

    const base64 = await blobToBase64(blob)
    log('SHARE', 'WRITE_START', `Writing to ${SHARE_DIR}/${filename}`)
    const savedFile = await Filesystem.writeFile({
      path: `${SHARE_DIR}/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    log('SHARE', 'WRITE_OK', `uri: ${savedFile.uri}`)

    /* Verify the file was written correctly before sharing. */
    const verification = await verifyFile(`${SHARE_DIR}/${filename}`, Directory.External)
    if (!verification.exists || verification.size === 0) {
      log('SHARE', 'VERIFY_FAILED', 'Share file invalid after write')
      return { shared: false, method: 'error', error: 'Share file could not be verified' }
    }
    log('SHARE', 'VERIFY_OK', `${verification.size} bytes`)

    /* Capacitor Share plugin requires file:// URIs.
     * Filesystem.writeFile with Directory.External returns file:// URIs,
     * which the plugin converts to content:// via FileProvider. */
    log('SHARE', 'CAPACITOR_SHARE', `Passing URI to Share plugin: ${savedFile.uri}`)
    await CapShare.share({
      title: title || filename,
      text: title || filename,
      files: [savedFile.uri],
      dialogTitle: 'Share via',
    })

    log('SHARE', 'OK_CAPACITOR', 'Share plugin resolved successfully')

    /* CRITICAL FIX: Schedule cleanup AFTER a delay.
     * The Android share intent is async — the receiving app (WhatsApp, Gmail, etc.)
     * reads the file AFTER the Share plugin resolves. Immediate deletion caused
     * the receiver to get a missing / empty attachment. */
    scheduleShareCleanup(filename)

    return { shared: true, method: 'capacitor' }
  } catch (err) {
    const msg = err?.message || ''
    if (msg.includes('canceled') || msg.includes('abort') || msg.includes('AbortError') || msg.includes('Cancel')) {
      log('SHARE', 'CANCELLED', 'User cancelled via Capacitor Share')
      return { shared: false, method: 'cancelled' }
    }
    log('SHARE', 'FAILED', msg)
    return { shared: false, method: 'error', error: msg }
  }
}

/**
 * Open a file on the device.
 *
 * On Android this does TWO things:
 *   1. Persists the blob to Downloads via MediaStore (so the file is accessible
 *      from the system Files app and survives app restarts).
 *   2. Launches ACTION_VIEW with the MediaStore content:// URI so the user can
 *      pick a viewer.
 *
 * IMPORTANT: We use DownloadStorage.openFile() (ACTION_VIEW) instead of the
 * Capacitor Share plugin for opening.  The Share plugin only accepts file://
 * URIs but MediaStore returns content:// URIs, so passing them to the Share
 * plugin causes "only file urls are supported" rejection.
 */
export async function openFileNative(blob, filename) {
  if (!blob || !filename) return { success: false, error: 'Missing blob or filename' }
  if (blob.size === 0) return { success: false, error: 'File is empty (0 bytes)' }
  log('OPEN', 'START', `${filename} — ${blob.size} bytes`)

  /* Step 1: Persist the file to Downloads (MediaStore on Android). */
  const saved = await downloadBlob(blob, filename)
  if (!saved.success) {
    log('OPEN', 'SAVE_FAILED', saved.error)
    return { success: false, error: saved.error || 'Failed to save file' }
  }
  log('OPEN', 'SAVED', `URI: ${saved.uri} — path: ${saved.path}`)

  privacy.suppressLockForTransition(5000)

  /* Step 2: Open via ACTION_VIEW (works with content:// URIs from MediaStore). */
  if (isAndroidNative()) {
    try {
      const opened = await openSavedFile(saved.uri, saved.mimeType)
      if (opened.opened) {
        log('OPEN', 'OK', `Opened via ACTION_VIEW: ${saved.uri}`)
        return { success: true, action: 'opened', uri: saved.uri }
      }
      log('OPEN', 'VIEW_FAILED', opened.error)
      /* File was saved successfully but no viewer found — still report success
       * for the save, with a note that open failed. */
      return { success: true, action: 'saved', uri: saved.uri, openError: opened.error }
    } catch (err) {
      log('OPEN', 'ERROR', err.message)
      return { success: true, action: 'saved', uri: saved.uri, openError: err.message }
    }
  }

  /* ── Non-Android fallback: browser download ── */
  downloadBlobLegacy(blob, filename)
  return { success: true, action: 'downloaded', method: 'legacy' }
}

export function getSafeWindowOpen(url) {
  try {
    const iframe = document.createElement('iframe')
    iframe.src = url
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999'
    document.body.appendChild(iframe)
    const closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close'
    closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:10000;padding:8px 16px;background:#000;color:#fff;border-radius:8px'
    closeBtn.onclick = () => { try { document.body.removeChild(iframe) } catch (_) {} try { document.body.removeChild(closeBtn) } catch (_) {} }
    document.body.appendChild(closeBtn)
    return iframe
  } catch {
    return null
  }
}
