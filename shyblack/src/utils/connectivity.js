/**
 * Connectivity helpers.
 * Used to gate features (e.g. OCR) that load assets from a CDN and would
 * fail silently when the device is offline.
 */
export function isOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}