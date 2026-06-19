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
if (typeof globalThis.Blob === 'undefined') {
  try {
    const { Blob } = require('buffer')
    globalThis.Blob = Blob
  } catch {
    globalThis.Blob = class Blob {
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
  if (typeof Blob === 'undefined') { global.Blob = globalThis.Blob }
}
