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
