const { Blob } = require('buffer')
global.Blob = Blob

// Node 16 polyfill — global.crypto and crypto.getRandomValues not available until Node 19
const nodeCrypto = require('crypto')
if (typeof nodeCrypto.getRandomValues !== 'function') {
  const { webcrypto } = nodeCrypto
  nodeCrypto.getRandomValues = (...args) => webcrypto.getRandomValues(...args)
}
if (!global.crypto) {
  global.crypto = nodeCrypto.webcrypto
}
// Also set on globalThis for ESM modules that check globalThis.crypto
if (!globalThis.crypto) {
  globalThis.crypto = nodeCrypto.webcrypto
}

// Node 16 polyfill — Blob not global until Node 18
// jsPDF v4 requires Blob as a global, so we must set it on globalThis BEFORE jsPDF is loaded.
// We use Object.defineProperty on the global object to ensure it's visible as a free variable
function _polyfillBlob() {
  if (typeof Blob !== 'undefined') return
  let BlobImpl
  try {
    BlobImpl = require('buffer').Blob
  } catch {
    BlobImpl = class Blob {
      constructor(parts, opts) {
        this.type = (opts && opts.type) || ''
        this.size = (parts || []).reduce((s, p) => {
          if (typeof p === 'string') return s + Buffer.byteLength(p)
          if (p instanceof Uint8Array) return s + p.byteLength
          if (Buffer.isBuffer(p)) return s + p.length
          return s
        }, 0)
      }
    }
  }
  global.Blob = BlobImpl
  globalThis.Blob = BlobImpl
}
_polyfillBlob()
