import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { createScheduledBackup } from './backupManager'
import { getBackupGenerations, deleteBackup } from './backup'

/**
 * Scheduled / automated backup engine.
 * Runs a backup when the app opens and the configured interval has elapsed.
 * Retention prunes old scheduled backups beyond the configured keep count.
 */

export const AUTO_BACKUP_FREQUENCIES = [
  { id: 'daily', label: 'Daily', hours: 24 },
  { id: 'weekly', label: 'Weekly', hours: 24 * 7 },
  { id: 'monthly', label: 'Monthly', hours: 24 * 30 },
]

const DEFAULT_MAX_KEPT = 10

export function getAutoBackupSettings() {
  try {
    const saved = safeStorage.get(STORAGE_KEYS.AUTO_BACKUP, null)
    if (saved && typeof saved === 'object') {
      return {
        enabled: saved.enabled === true,
        frequency: AUTO_BACKUP_FREQUENCIES.find((f) => f.id === saved.frequency)?.id || 'weekly',
        lastRunAt: saved.lastRunAt || null,
        lastStatus: saved.lastStatus || null,
        maxKept: typeof saved.maxKept === 'number' ? saved.maxKept : DEFAULT_MAX_KEPT,
      }
    }
  } catch { /* fall through to defaults */ }
  return { enabled: false, frequency: 'weekly', lastRunAt: null, lastStatus: null, maxKept: DEFAULT_MAX_KEPT }
}

export function saveAutoBackupSettings(settings) {
  return safeStorage.set(STORAGE_KEYS.AUTO_BACKUP, settings)
}

export function isAutoBackupDue(settings, now = Date.now()) {
  if (!settings || !settings.enabled) return false
  if (!settings.lastRunAt) return true
  const freq = AUTO_BACKUP_FREQUENCIES.find((f) => f.id === settings.frequency) || AUTO_BACKUP_FREQUENCIES[1]
  return now - settings.lastRunAt >= freq.hours * 3600 * 1000
}

export function pruneScheduledBackups(maxKept) {
  try {
    const backups = getBackupGenerations()
    const keep = Math.max(1, Number(maxKept) || DEFAULT_MAX_KEPT)
    const scheduled = backups
      .filter((b) => b.type === 'scheduled')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    let removed = 0
    for (let i = keep; i < scheduled.length; i++) {
      deleteBackup(scheduled[i].id)
      removed++
    }
    return removed
  } catch {
    return 0
  }
}

export async function runAutoBackupIfDue(now = Date.now()) {
  const settings = getAutoBackupSettings()
  if (!isAutoBackupDue(settings, now)) return { ran: false, reason: 'not_due' }

  try {
    const result = await createScheduledBackup()
    if (result && result.id) {
      pruneScheduledBackups(settings.maxKept)
      const updated = {
        ...settings,
        lastRunAt: Date.now(),
        lastStatus: { ok: true, at: Date.now(), size: result.size || 0 },
      }
      saveAutoBackupSettings(updated)
      return { ran: true, backup: result }
    }
    const updated = { ...settings, lastRunAt: Date.now(), lastStatus: { ok: false, at: Date.now(), error: 'backup_failed' } }
    saveAutoBackupSettings(updated)
    return { ran: true, failed: true }
  } catch {
    const updated = { ...settings, lastRunAt: Date.now(), lastStatus: { ok: false, at: Date.now(), error: 'exception' } }
    saveAutoBackupSettings(updated)
    return { ran: true, failed: true }
  }
}