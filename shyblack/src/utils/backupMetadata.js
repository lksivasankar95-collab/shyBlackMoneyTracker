import { BACKUP_SCHEMA_VERSION } from './backup'
import { APP_SCHEMA_VERSION } from './schema'
import { generateId } from './helpers'

let _deviceInfo = null

function detectDevice() {
  if (_deviceInfo) return _deviceInfo
  const info = {}
  try {
    if (typeof navigator !== 'undefined') {
      info.userAgent = navigator.userAgent?.slice(0, 200)
      info.platform = navigator.platform || ''
      info.language = navigator.language || ''
    }
  } catch { /* safe */ }
  try {
    if (typeof window !== 'undefined' && window.device) {
      const d = window.device
      info.model = d.model || ''
      info.platform = d.platform || ''
      info.version = d.version || ''
      info.manufacturer = d.manufacturer || ''
    }
  } catch { /* safe */ }
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null
    if (cap && cap.isNativePlatform()) {
      info.capacitor = true
      info.nativePlatform = cap.getPlatform()
    }
  } catch { /* safe */ }
  _deviceInfo = info
  return info
}

export function resetDeviceInfoCache() {
  _deviceInfo = null
}

export function buildBackupMetadata(dataObj, recordCounts, options = {}) {
  const device = detectDevice()
  const backupId = options.backupId || generateId()
  const now = new Date()

  const metadata = {
    backupId,
    appName: 'finora-finance',
    appVersion: APP_SCHEMA_VERSION,
    backupSchemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    exportedAtMs: now.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    device: {
      platform: device.platform || '',
      model: device.model || '',
      version: device.version || '',
      manufacturer: device.manufacturer || '',
      language: device.language || '',
      capacitor: !!device.capacitor,
      nativePlatform: device.nativePlatform || '',
    },
    recordCounts: recordCounts || {},
    totalRecords: 0,
    encryption: options.encryption || 'none',
    compressed: !!options.compressed,
  }

  if (recordCounts) {
    metadata.totalRecords = Object.values(recordCounts).reduce((s, v) => {
      if (typeof v === 'number') return s + v
      if (typeof v === 'object' && v !== null) return s
      return s
    }, 0)
  }

  if (options.checksum) {
    metadata.checksum = options.checksum
  }

  return metadata
}

export function buildEnrichedBackupData(rawBackup, options = {}) {
  const counts = {}
  const data = rawBackup.data || rawBackup
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) counts[key] = val.length
    else if (typeof val === 'object' && val !== null) counts[key] = 1
    else counts[key] = 0
  }

  const metadata = buildBackupMetadata(data, counts, options)

  return {
    app: 'finora-finance',
    version: BACKUP_SCHEMA_VERSION,
    backupSchemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: metadata.exportedAt,
    exportedAtMs: metadata.exportedAtMs,
    backupId: metadata.backupId,
    timezone: metadata.timezone,
    device: metadata.device,
    recordCounts: counts,
    totalRecords: metadata.totalRecords,
    data,
    checksum: options.checksum || '',
  }
}

export function getBackupFileExtension(encrypted, compressed) {
  if (encrypted) return '.enc.json'
  if (compressed) return '.gz.json'
  return '.json'
}

export function formatBackupFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
