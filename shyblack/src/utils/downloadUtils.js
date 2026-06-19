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

export function downloadBlob(blob, filename) {
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

export function downloadDataUri(dataUri, filename) {
  const blob = dataUriToBlob(dataUri)
  return downloadBlob(blob, filename)
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
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' })
      await navigator.share({ files: [file], title: title || 'Document' })
      return { shared: true, method: 'share' }
    } catch (err) {
      return { shared: false, method: 'cancel', error: err.message }
    }
  }
  return { shared: false, method: 'unsupported' }
}

export function getSafeWindowOpen(url) {
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(`<iframe src="${url}" style="width:100%;height:100%;border:none;" onload="this.contentWindow.print()"></iframe>`)
    return win
  }
  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999'
  document.body.appendChild(iframe)
  const closeBtn = document.createElement('button')
  closeBtn.textContent = 'Close'
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:10000;padding:8px 16px;background:#000;color:#fff;border-radius:8px'
  closeBtn.onclick = () => { document.body.removeChild(iframe); document.body.removeChild(closeBtn) }
  document.body.appendChild(closeBtn)
  return null
}
