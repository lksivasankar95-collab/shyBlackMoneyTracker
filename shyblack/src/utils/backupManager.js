import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'
import { getBackupGenerations, createBackupRecord, getBackupById, verifyBackupIntegrity, validateBackupForRestore, restoreSelectedModules, rollbackToPrevious, getBackupHealthScore, BACKUP_TYPES } from './backup'
import { saveSnapshot } from './snapshotRecovery'
import { recordBackupEvent } from './backupHealth'

const SNAPSHOTS_BACKUP_KEY = `${STORAGE_KEYS.SNAPSHOT}_before_op`

/* ── Auto-Snapshots ── */

function takeAutoSnapshot(label) {
  try {
    const chain = safeStorage.get(SNAPSHOTS_BACKUP_KEY, [])
    const snapshot = {
      id: generateId(),
      label,
      ts: Date.now(),
      data: collectSnapshotData(),
    }
    chain.unshift(snapshot)
    const pruned = chain.slice(0, 20)
    safeStorage.set(SNAPSHOTS_BACKUP_KEY, pruned)
    return snapshot
  } catch { return null }
}

function collectSnapshotData() {
  const keys = [
    STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.DEBTS, STORAGE_KEYS.SAVINGS,
    STORAGE_KEYS.BUDGETS, STORAGE_KEYS.RECURRING, STORAGE_KEYS.TAGS,
    STORAGE_KEYS.EMIS, STORAGE_KEYS.NET_WORTH_ACCOUNTS, STORAGE_KEYS.TRANSFERS,
    STORAGE_KEYS.GOALS, STORAGE_KEYS.TEMPLATES, STORAGE_KEYS.DOCUMENTS,
    STORAGE_KEYS.DOCUMENT_FILES, STORAGE_KEYS.RELATIONSHIPS, STORAGE_KEYS.ARCHIVE,
    STORAGE_KEYS.BUDGETS_V2, STORAGE_KEYS.RECEIPT_SCANS, STORAGE_KEYS.WEALTH_ASSETS,
  ]
  const data = {}
  for (const key of keys) {
    try { data[key] = safeStorage.get(key, null) } catch { /* silent */ }
  }
  return data
}

function restoreSnapshotData(data) {
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      safeStorage.set(key, value)
    }
  }
}

export function getAutoSnapshots() {
  try { return safeStorage.get(SNAPSHOTS_BACKUP_KEY, []) || [] } catch { return [] }
}

export function deleteAutoSnapshot(id) {
  try {
    const chain = getAutoSnapshots()
    safeStorage.set(SNAPSHOTS_BACKUP_KEY, chain.filter((s) => s.id !== id))
  } catch { /* silent */ }
}

export function restoreAutoSnapshot(id) {
  try {
    const chain = getAutoSnapshots()
    const snap = chain.find((s) => s.id === id)
    if (!snap || !snap.data) return { success: false, error: 'Snapshot not found' }
    restoreSnapshotData(snap.data)
    return { success: true, snapshot: snap }
  } catch (e) { return { success: false, error: e.message } }
}

export function clearAutoSnapshots() {
  safeStorage.remove(SNAPSHOTS_BACKUP_KEY)
}

/* ── Safety Snapshots ── */

export function snapshotBeforeImport() {
  takeAutoSnapshot('Before Import')
  recordBackupEvent('pre_import_snapshot', true)
}

export function snapshotBeforeMigration() {
  takeAutoSnapshot('Before Migration')
  recordBackupEvent('pre_migration_snapshot', true)
}

export function snapshotBeforeClearAll() {
  takeAutoSnapshot('Before Clear All')
  recordBackupEvent('pre_clear_snapshot', true)
}

export function snapshotBeforeBulkDelete(description) {
  takeAutoSnapshot(`Before Bulk Delete${description ? ': ' + description : ''}`)
  recordBackupEvent('pre_bulk_delete_snapshot', true)
}

/* ── Backup Orchestration ── */

export async function createManualBackup() {
  return createBackupRecord(BACKUP_TYPES.MANUAL)
}

export async function createEmergencyBackup() {
  const record = await createBackupRecord(BACKUP_TYPES.EMERGENCY)
  saveSnapshot(record.data?.transactions || [], record.data?.savingsGoal)
  return record
}

export async function createScheduledBackup() {
  return createBackupRecord(BACKUP_TYPES.SCHEDULED)
}

export async function createPreImportBackup() {
  const record = await createBackupRecord(BACKUP_TYPES.PRE_IMPORT)
  takeAutoSnapshot('Before Import')
  return record
}

export async function createPreMigrationBackup() {
  const record = await createBackupRecord(BACKUP_TYPES.PRE_MIGRATION)
  takeAutoSnapshot('Before Migration')
  return record
}

export async function createBackupWithType(type) {
  switch (type) {
    case BACKUP_TYPES.EMERGENCY: return createEmergencyBackup()
    case BACKUP_TYPES.PRE_IMPORT: return createPreImportBackup()
    case BACKUP_TYPES.PRE_MIGRATION: return createPreMigrationBackup()
    case BACKUP_TYPES.SCHEDULED: return createScheduledBackup()
    default: return createManualBackup()
  }
}

/* ── Restore & Verify ── */

export async function verifyBackup(id) {
  const backup = getBackupById(id)
  if (!backup) return { valid: false, errors: ['Backup not found'] }
  const integrity = await verifyBackupIntegrity(backup)
  const validation = validateBackupForRestore(backup)
  return {
    valid: integrity.valid && validation.valid,
    integrity,
    validation,
    backup,
  }
}

export function restoreBackup(id, selectedModules) {
  const backup = getBackupById(id)
  if (!backup) return { success: false, error: 'Backup not found' }
  if (!backup.data) return { success: false, error: 'Backup data is missing' }
  takeAutoSnapshot(`Before Restore: ${backup.id}`)
  const modules = selectedModules || backup.modules || Object.keys(backup.data)
  const result = restoreSelectedModules(backup.data, modules)
  if (result.failed.length === 0 && result.restored.length > 0) {
    recordBackupEvent('restore', true)
  }
  return { success: result.failed.length === 0, result, backup }
}

export function performRollback() {
  const backups = getBackupGenerations()
  return rollbackToPrevious(backups)
}

/* ── Health Score ── */

export function getBackupHealth() {
  const backups = getBackupGenerations()
  return getBackupHealthScore(backups)
}

/* ── Dashboard Stats ── */

export function getBackupDashboardStats() {
  const backups = getBackupGenerations()
  const health = getBackupHealthScore(backups)
  const latest = backups.length > 0 ? [...backups].sort((a, b) => b.createdAt - a.createdAt)[0] : null
  return {
    backupCount: backups.length,
    latestBackupAt: latest?.createdAt || null,
    healthScore: health.score,
    healthGrade: health.grade,
    healthStatus: health.status,
    totalSize: backups.reduce((s, b) => s + (b.size || 0), 0),
  }
}
