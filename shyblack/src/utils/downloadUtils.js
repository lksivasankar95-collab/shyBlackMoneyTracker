import { Filesystem, Directory } from '@capacitor/filesystem'
import * as privacy from './privacy'

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

function getMimeTypeFromExtension(ext) {
  const mimeMap = {
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
  return mimeMap[ext?.toLowerCase()] || 'application/octet-stream'
}

export async function downloadBlob(blob, filename) {
  if (!blob) return { success: false, error: 'No blob data' }

  const ext = filename?.split('.').pop()?.toLowerCase() || 'bin'
  const mimeType = getMimeTypeFromExtension(ext)
  const base64 = await blobToBase64(blob)

  privacy.suppressLockForTransition(5000)

  try {
    const savedFile = await Filesystem.writeFile({
      path: `FINORA/${filename}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    })

    return {
      success: true,
      uri: savedFile.uri,
      path: `Downloads/FINORA/${filename}`,
      filename,
      mimeType,
    }
  } catch (err) {
    console.error('[downloadUtils] Filesystem write failed, trying legacy fallback:', err)
    const ok = downloadBlobLegacy(blob, filename)
    if (ok) return { success: true, path: filename, filename, mimeType, method: 'legacy' }
    return { success: false, error: err.message || 'File write failed' }
  }
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function downloadDataUri(dataUri, filename) {
  if (!dataUri || !filename) return { success: false, error: 'Missing data' }

  const ext = filename?.split('.').pop()?.toLowerCase() || 'bin'
  const mimeType = getMimeTypeFromExtension(ext)
  const base64 = dataUriToBase64(dataUri)

  if (!base64) return { success: false, error: 'Invalid data URI' }

  privacy.suppressLockForTransition(5000)

  try {
    const savedFile = await Filesystem.writeFile({
      path: `FINORA/${filename}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    })

    return {
      success: true,
      uri: savedFile.uri,
      path: `Downloads/FINORA/${filename}`,
      filename,
      mimeType,
    }
  } catch (err) {
    console.error('[downloadUtils] downloadDataUri failed, trying legacy fallback:', err)
    const ok = downloadDataUriLegacy(dataUri, filename)
    if (ok) return { success: true, path: filename, filename, mimeType, method: 'legacy' }
    return { success: false, error: err.message || 'File write failed' }
  }
}

export function downloadBlobLegacy(blob, filename) {
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
  return true
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
  const ext = filename?.split('.').pop()?.toLowerCase() || 'bin'
  const mimeType = getMimeTypeFromExtension(ext)

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: mimeType })
      await navigator.share({ files: [file], title: title || 'Document' })
      return { shared: true, method: 'share' }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'cancelled' }
      }
    }
  }

  try {
    const { Share: CapShare } = await import('@capacitor/share')
    privacy.suppressLockForTransition(5000)

    const base64 = await blobToBase64(blob)
    const savedFile = await Filesystem.writeFile({
      path: `FINORA/_share/${filename}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    })

    await CapShare.share({
      title: title || filename,
      text: title || filename,
      url: savedFile.uri,
      dialogTitle: 'Share via',
    })

    return { shared: true, method: 'capacitor' }
  } catch (err) {
    if (err.message?.includes?.('canceled') || err.message?.includes?.('abort') || err.message?.includes?.('AbortError')) {
      return { shared: false, method: 'cancelled' }
    }
    return { shared: false, method: 'error', error: err.message }
  }
}

export async function openFileNative(blob, filename) {

  const result = await downloadBlob(blob, filename)
  if (!result.success) return result

  privacy.suppressLockForTransition(5000)

  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: 'Open with',
    })
    return { success: true, action: 'opened', uri: result.uri }
  } catch (err) {
    if (err.message?.includes?.('canceled') || err.message?.includes?.('abort')) {
      return { success: true, action: 'cancelled', uri: result.uri }
    }
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
