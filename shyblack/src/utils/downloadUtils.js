import { Filesystem, Directory } from '@capacitor/filesystem'
import * as privacy from './privacy'

/* ── Logger ── */

function log(method, details) {
  const msg = `[DOWNLOAD] ${method}${details ? ` — ${details}` : ''}`
  if (typeof console !== 'undefined') console.log(msg)
  return msg
}

/* ── Constants ── */

const EXPORT_DIR = 'FINORA'
const SHARE_DIR = `${EXPORT_DIR}/_share`

const MIME_MAP = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp',
  csv: 'text/csv',
  xlsx: 'application/vnd.ms-excel',
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
    const ok = stat && typeof stat.size === 'number' && stat.size >= 0
    log('VERIFY', `${path} — exists: ${ok}, size: ${ok ? stat.size : 'N/A'}`)
    return ok ? { exists: true, size: stat.size, uri: stat.uri } : { exists: false }
  } catch (err) {
    log('VERIFY_FAILED', `${path} — ${err.message}`)
    return { exists: false, error: err.message }
  }
}

async function cleanupOldShareFiles() {
  try {
    const { Filesystem } = await import('@capacitor/filesystem')
    const shareDirExists = await Filesystem.stat({
      path: `${EXPORT_DIR}/_share`,
      directory: Directory.External,
    }).then(() => true).catch(() => false)

    if (!shareDirExists) return

    const result = await Filesystem.readdir({
      path: `${EXPORT_DIR}/_share`,
      directory: Directory.External,
    })
    if (result?.files?.length > 0) {
      let removed = 0
      for (const file of result.files) {
        try {
          await Filesystem.deleteFile({
            path: `${EXPORT_DIR}/_share/${file.name || file}`,
            directory: Directory.External,
          })
          removed++
        } catch (e) { /* individual cleanup failure is non-fatal */ }
      }
      log('CLEANUP', `Removed ${removed} stale share files`)
    }
  } catch (e) { /* readdir may fail if directory doesn't exist */ }
}

async function cleanupShareFile(filename) {
  try {
    const { Filesystem } = await import('@capacitor/filesystem')
    await Filesystem.deleteFile({
      path: `${SHARE_DIR}/${filename}`,
      directory: Directory.External,
    })
    log('SHARE_CLEANUP_OK', `Deleted ${filename}`)
  } catch (e) { /* cleanup failure is non-fatal */ }
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
  log('DOWNLOAD_START', filename)

  const ext = getExt(filename)
  const mimeType = getMimeType(ext)
  const base64 = await blobToBase64(blob)

  privacy.suppressLockForTransition(5000)

  try {
    const savedFile = await Filesystem.writeFile({
      path: `${EXPORT_DIR}/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    log('WRITE_OK', `uri: ${savedFile.uri}`)

    const verification = await verifyFile(`${EXPORT_DIR}/${filename}`, Directory.External)
    if (!verification.exists) {
      log('VERIFY_FAILED', 'File not found after write')

      const legacyOk = downloadBlobLegacy(blob, filename)
      if (legacyOk) {
        return { success: true, path: filename, filename, mimeType, method: 'legacy' }
      }
      return { success: false, error: 'File not found after write', stage: 'verification' }
    }

    if (verification.size === 0) {
      log('VERIFY_ZERO', 'File exists but is 0 bytes')
      return { success: false, error: 'Written file is empty (0 bytes)', stage: 'verification-size' }
    }

    log('DOWNLOAD_COMPLETE', `${filename} — ${verification.size} bytes`)
    return {
      success: true,
      uri: savedFile.uri,
      path: `Downloads/${EXPORT_DIR}/${filename}`,
      filename,
      mimeType,
      size: verification.size,
    }
  } catch (err) {
    log('DOWNLOAD_FAILED', err.message)
    const legacyOk = downloadBlobLegacy(blob, filename)
    if (legacyOk) {
      return { success: true, path: filename, filename, mimeType, method: 'legacy' }
    }
    return { success: false, error: err.message || 'File write failed', stage: 'filesystem-write' }
  }
}

export async function downloadDataUri(dataUri, filename) {
  if (!dataUri || !filename) return { success: false, error: 'Missing data' }
  log('DOWNLOAD_DATAURI_START', filename)

  const ext = getExt(filename)
  const mimeType = getMimeType(ext)
  const base64 = dataUriToBase64(dataUri)

  if (!base64) return { success: false, error: 'Invalid data URI' }

  privacy.suppressLockForTransition(5000)

  try {
    const savedFile = await Filesystem.writeFile({
      path: `${EXPORT_DIR}/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    log('WRITE_OK', `uri: ${savedFile.uri}`)

    const verification = await verifyFile(`${EXPORT_DIR}/${filename}`, Directory.External)
    if (!verification.exists || verification.size === 0) {
      log('VERIFY_FAILED', 'File invalid after write')
      const legacyOk = downloadDataUriLegacy(dataUri, filename)
      if (legacyOk) {
        return { success: true, path: filename, filename, mimeType, method: 'legacy' }
      }
      return { success: false, error: 'File verification failed', stage: 'verification' }
    }

    return {
      success: true,
      uri: savedFile.uri,
      path: `Downloads/${EXPORT_DIR}/${filename}`,
      filename,
      mimeType,
      size: verification.size,
    }
  } catch (err) {
    log('DOWNLOAD_DATAURI_FAILED', err.message)
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
    log('LEGACY_FAILED', err.message)
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
  log('SHARE_START', filename)

  const ext = getExt(filename)
  const mimeType = getMimeType(ext)

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: mimeType })
      await navigator.share({ files: [file], title: title || 'Document' })
      log('SHARE_OK', 'Web Share API')
      return { shared: true, method: 'web-share' }
    } catch (err) {
      if (err.name === 'AbortError') {
        log('SHARE_CANCELLED', 'User cancelled')
        return { shared: false, method: 'cancelled' }
      }
      log('SHARE_WEB_FAILED', err.message)
    }
  }

  try {
    const { Share: CapShare } = await import('@capacitor/share')
    privacy.suppressLockForTransition(5000)

    await cleanupOldShareFiles()

    const base64 = await blobToBase64(blob)
    const savedFile = await Filesystem.writeFile({
      path: `${SHARE_DIR}/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    log('SHARE_WRITE_OK', `uri: ${savedFile.uri}`)

    const verification = await verifyFile(`${SHARE_DIR}/${filename}`, Directory.External)
    if (!verification.exists || verification.size === 0) {
      log('SHARE_VERIFY_FAILED', 'Share file invalid')
      return { shared: false, method: 'error', error: 'Share file could not be verified' }
    }

    await CapShare.share({
      title: title || filename,
      text: title || filename,
      url: savedFile.uri,
      dialogTitle: 'Share via',
    })

    log('SHARE_OK', 'Capacitor Share')
    cleanupShareFile(filename)
    return { shared: true, method: 'capacitor' }
  } catch (err) {
    const msg = err?.message || ''
    if (msg.includes('canceled') || msg.includes('abort') || msg.includes('AbortError')) {
      log('SHARE_CANCELLED', 'User cancelled')
      return { shared: false, method: 'cancelled' }
    }
    log('SHARE_FAILED', msg)
    return { shared: false, method: 'error', error: msg }
  }
}

export async function openFileNative(blob, filename) {
  if (!blob || !filename) return { success: false, error: 'Missing blob or filename' }
  log('OPEN_START', filename)

  const result = await downloadBlob(blob, filename)
  if (!result.success) {
    log('OPEN_DOWNLOAD_FAILED', result.error)
    return result
  }

  privacy.suppressLockForTransition(5000)

  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: 'Open with',
    })
    log('OPEN_OK', result.uri)
    return { success: true, action: 'opened', uri: result.uri }
  } catch (err) {
    const msg = err?.message || ''
    if (msg.includes('canceled') || msg.includes('abort')) {
      log('OPEN_CANCELLED')
      return { success: true, action: 'cancelled', uri: result.uri }
    }
    log('OPEN_FAILED', msg)
    return { success: true, action: 'saved', uri: result.uri }
  }
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
    closeBtn.onclick = () => { try { document.body.removeChild(iframe) } catch (_) {}; try { document.body.removeChild(closeBtn) } catch (_) {} }
    document.body.appendChild(closeBtn)
    return iframe
  } catch {
    return null
  }
}
