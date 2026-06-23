import { safeStorage } from './safeStorage'

const BACKUP_HEALTH_KEY = 'backup_health'
const BACKUP_RECOMMEND_DAYS = 7
const BACKUP_WARN_DAYS = 14
const BACKUP_CRITICAL_DAYS = 30

function getBackupHealthRecord() {
  try {
    const raw = safeStorage.getRaw(BACKUP_HEALTH_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveBackupHealthRecord(record) {
  try {
    localStorage.setItem(BACKUP_HEALTH_KEY, JSON.stringify(record))
  } catch {}
}

export function recordBackupEvent(type, success) {
  const prev = getBackupHealthRecord() || {}
  const record = {
    ...prev,
    lastBackupAt: type === 'export' && success ? Date.now() : prev.lastBackupAt,
    lastEncryptedBackupAt: type === 'encrypted_export' && success ? Date.now() : prev.lastEncryptedBackupAt,
    lastRestoreAt: type === 'restore' && success ? Date.now() : prev.lastRestoreAt,
    totalExports: (prev.totalExports || 0) + (type === 'export' && success ? 1 : 0),
    totalEncryptedExports: (prev.totalEncryptedExports || 0) + (type === 'encrypted_export' && success ? 1 : 0),
    totalRestores: (prev.totalRestores || 0) + (type === 'restore' && success ? 1 : 0),
    lastEventType: type,
    lastEventSuccess: success,
    lastEventAt: Date.now(),
  }
  saveBackupHealthRecord(record)
  return record
}

export function getBackupHealth() {
  const record = getBackupHealthRecord()
  if (!record) {
    return { status: 'never', message: 'No backups yet', daysSinceLastBackup: null, record: null }
  }

  const now = Date.now()
  const lastBackupAt = record.lastEncryptedBackupAt || record.lastBackupAt
  const daysSince = lastBackupAt ? Math.floor((now - lastBackupAt) / 86400000) : null

  let status = 'unknown'
  let message = ''

  if (!lastBackupAt) {
    status = 'never'
    message = 'Backup recommended — protect your data'
  } else if (daysSince <= BACKUP_RECOMMEND_DAYS) {
    status = 'good'
    message = `Backup verified · ${daysSince}d ago`
  } else if (daysSince <= BACKUP_WARN_DAYS) {
    status = 'due'
    message = `Backup ${daysSince}d ago — consider backing up`
  } else if (daysSince <= BACKUP_CRITICAL_DAYS) {
    status = 'overdue'
    message = `Last backup ${daysSince}d ago — recommended soon`
  } else {
    status = 'critical'
    message = `Last backup ${daysSince}d ago — please backup now`
  }

  return { status, message, daysSinceLastBackup: daysSince, record }
}

export function hasRecentBackup() {
  const health = getBackupHealth()
  return health.status === 'good'
}

export function shouldShowBackupBanner() {
  const health = getBackupHealth()
  if (health.status === 'never') return true
  if (health.status === 'overdue' || health.status === 'critical') return true
  if (health.daysSinceLastBackup === null) return true
  return false
}

export function getBackupStats() {
  const record = getBackupHealthRecord()
  if (!record) {
    return { totalExports: 0, totalEncryptedExports: 0, totalRestores: 0, lastEventAt: null }
  }
  return {
    totalExports: record.totalExports || 0,
    totalEncryptedExports: record.totalEncryptedExports || 0,
    totalRestores: record.totalRestores || 0,
    lastEventAt: record.lastEventAt || null,
  }
}
