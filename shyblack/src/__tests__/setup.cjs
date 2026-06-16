// Node 16 polyfill — global.crypto not available until Node 19
if (!global.crypto) {
  global.crypto = require('crypto').webcrypto
}
