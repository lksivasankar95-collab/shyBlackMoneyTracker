import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { APP_SCHEMA_VERSION } from './schema'
import { recordBackupEvent } from './backupHealth'
import { generateId } from './helpers'
import { buildEnrichedBackupData } from './backupMetadata'
import { validateBeforeExport, computeRecordCounts } from './dataValidator'

export const BACKUP_SCHEMA_VERSION = 1
export const MAX_BACKUP_GENERATIONS = 10
const BACKUP_STORAGE_KEY = STORAGE_KEYS.BACKUPS

/* ── Backup Types ── */
export const BACKUP_TYPES = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  EMERGENCY: 'emergency',
  PRE_IMPORT: 'pre_import',
  PRE_MIGRATION: 'pre_migration',
}

/* ── Backup Generation Management ── */

export function getBackupGenerations() {
  const data = safeStorage.get(BACKUP_STORAGE_KEY, [])
  return Array.isArray(data) ? data : []
}

export function saveBackupGenerations(backups) {
  safeStorage.set(BACKUP_STORAGE_KEY, backups)
}

function rotateBackups(backups) {
  const sorted = [...backups].sort((a, b) => b.createdAt - a.createdAt)
  return sorted.slice(0, MAX_BACKUP_GENERATIONS)
}

/* ── Checksum ── */

export async function generateChecksum(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  try {
    const enc = new TextEncoder().encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return computeSimpleChecksum(str)
  }
}

export function computeSimpleChecksum(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/* ── Collect Backup Data ── */

export function collectBackupInclude(includeModules) {
  const modules = includeModules || [
    'transactions', 'debts', 'savingsGoal', 'budgets', 'recurring',
    'tags', 'emis', 'accounts', 'transfers', 'goals', 'templates',
    'documents', 'documentFiles', 'relationships', 'archive',
    'budgetsV2', 'receipts', 'wealthAssets',
  ]
  const data = {}
  if (modules.includes('schemaVersion')) {
    const schema = safeStorage.get(STORAGE_KEYS.SCHEMA, { version: 0 })
    data.schemaVersion = schema && typeof schema.version === 'number' ? schema.version : 0
  }
  const keyMap = {
    transactions: STORAGE_KEYS.TRANSACTIONS,
    debts: STORAGE_KEYS.DEBTS,
    savingsGoal: STORAGE_KEYS.SAVINGS,
    budgets: STORAGE_KEYS.BUDGETS,
    recurring: STORAGE_KEYS.RECURRING,
    tags: STORAGE_KEYS.TAGS,
    emis: STORAGE_KEYS.EMIS,
    accounts: STORAGE_KEYS.NET_WORTH_ACCOUNTS,
    transfers: STORAGE_KEYS.TRANSFERS,
    goals: STORAGE_KEYS.GOALS,
    templates: STORAGE_KEYS.TEMPLATES,
    documents: STORAGE_KEYS.DOCUMENTS,
    documentFiles: STORAGE_KEYS.DOCUMENT_FILES,
    relationships: STORAGE_KEYS.RELATIONSHIPS,
    archive: STORAGE_KEYS.ARCHIVE,
    budgetsV2: STORAGE_KEYS.BUDGETS_V2,
    receipts: STORAGE_KEYS.RECEIPT_SCANS,
    wealthAssets: STORAGE_KEYS.WEALTH_ASSETS,
  }
  for (const mod of modules) {
    if (keyMap[mod]) {
      data[mod] = safeStorage.get(keyMap[mod], Array.isArray(safeStorage.get(keyMap[mod], [])) ? [] : {})
    }
  }
  const rawSecurity = safeStorage.get(STORAGE_KEYS.SETTINGS, {})
  data.security = rawSecurity && typeof rawSecurity === 'object'
    ? { privacyMode: !!rawSecurity.privacyMode, hideBalance: !!rawSecurity.hideBalance, biometricEnabled: !!rawSecurity.biometricEnabled }
    : {}
  return data
}

/* ── Create Backup Record ── */

export async function createBackupRecord(type = BACKUP_TYPES.MANUAL, includeModules) {
  const backupData = collectBackupInclude(includeModules)
  const checksum = await generateChecksum(backupData)
  const backupStr = JSON.stringify(backupData)
  const size = typeof Blob !== 'undefined' ? new Blob([backupStr]).size : backupStr.length
  const backups = getBackupGenerations()
  const record = {
    id: generateId(),
    type,
    version: BACKUP_SCHEMA_VERSION,
    createdAt: Date.now(),
    appVersion: APP_SCHEMA_VERSION,
    size,
    checksum,
    encrypted: false,
    modules: Object.keys(backupData),
    data: backupData,
  }
  backups.unshift(record)
  const rotated = rotateBackups(backups)
  saveBackupGenerations(rotated)
  recordBackupEvent('export', true)
  return record
}

export function getBackupById(id) {
  return getBackupGenerations().find((b) => b.id === id) || null
}

export function deleteBackup(id) {
  const backups = getBackupGenerations().filter((b) => b.id !== id)
  saveBackupGenerations(backups)
}

export function clearAllBackups() {
  saveBackupGenerations([])
}

/* ── Verify & Validate ── */

export async function verifyBackupIntegrity(backup) {
  if (!backup || !backup.data) return { valid: false, errors: ['Backup record missing data'] }
  if (!backup.checksum) return { valid: false, errors: ['Backup missing checksum'] }
  const computed = await generateChecksum(backup.data)
  if (computed !== backup.checksum) {
    return { valid: false, errors: [`Checksum mismatch: expected ${backup.checksum}, got ${computed}`] }
  }
  const errors = []
  if (!Array.isArray(backup.data.transactions)) errors.push('transactions must be an array')
  if (!Array.isArray(backup.data.debts)) errors.push('debts must be an array')
  return { valid: errors.length === 0, errors }
}

export function validateBackupForRestore(backup) {
  const errors = []
  if (!backup) return { valid: false, errors: ['No backup data'] }
  if (backup.version > BACKUP_SCHEMA_VERSION) errors.push('Backup version is newer than app version')
  if (typeof backup.appVersion === 'number' && backup.appVersion > APP_SCHEMA_VERSION) errors.push('Backup was created by a newer app version')
  if (!backup.modules || backup.modules.length === 0) errors.push('Backup has no data modules')
  return { valid: errors.length === 0, errors }
}

/* ── Selective Restore ── */

export function restoreSelectedModules(backupData, selectedModules) {
  const results = { restored: [], failed: [], skipped: [] }
  const keyMap = {
    transactions: STORAGE_KEYS.TRANSACTIONS,
    debts: STORAGE_KEYS.DEBTS,
    savingsGoal: STORAGE_KEYS.SAVINGS,
    budgets: STORAGE_KEYS.BUDGETS,
    recurring: STORAGE_KEYS.RECURRING,
    tags: STORAGE_KEYS.TAGS,
    emis: STORAGE_KEYS.EMIS,
    accounts: STORAGE_KEYS.NET_WORTH_ACCOUNTS,
    transfers: STORAGE_KEYS.TRANSFERS,
    goals: STORAGE_KEYS.GOALS,
    templates: STORAGE_KEYS.TEMPLATES,
    archive: STORAGE_KEYS.ARCHIVE,
    documents: STORAGE_KEYS.DOCUMENTS,
    documentFiles: STORAGE_KEYS.DOCUMENT_FILES,
    relationships: STORAGE_KEYS.RELATIONSHIPS,
    budgetsV2: STORAGE_KEYS.BUDGETS_V2,
    receipts: STORAGE_KEYS.RECEIPT_SCANS,
    wealthAssets: STORAGE_KEYS.WEALTH_ASSETS,
  }
  for (const mod of selectedModules) {
    if (mod in backupData) {
      const storageKey = keyMap[mod]
      if (storageKey) {
        const ok = safeStorage.set(storageKey, backupData[mod])
        if (ok) results.restored.push(mod)
        else results.failed.push(mod)
      } else {
        results.skipped.push(mod)
      }
    } else {
      results.skipped.push(mod)
    }
  }
  recordBackupEvent('restore', results.failed.length === 0)
  return results
}

/* ── Rollback ── */

export function getRollbackTarget(backups) {
  const sorted = [...backups].sort((a, b) => b.createdAt - a.createdAt)
  return sorted.length > 1 ? sorted[1] : null
}

export function rollbackToPrevious(backups) {
  const target = getRollbackTarget(backups)
  if (!target || !target.data) return { success: false, error: 'No rollback target available' }
  const validation = validateBackupForRestore(target)
  if (!validation.valid) return { success: false, error: `Rollback target invalid: ${validation.errors.join('; ')}` }
  const result = restoreSelectedModules(target.data, target.modules || Object.keys(target.data))
  return { success: result.failed.length === 0, result, backup: target }
}

/* ── Backup Health Score ── */

export function getBackupHealthScore(backups) {
  if (backups.length === 0) return { score: 0, grade: 'F', message: 'No backups exist', status: 'critical' }
  const now = Date.now()
  const sorted = [...backups].sort((a, b) => b.createdAt - a.createdAt)
  const latest = sorted[0]
  const daysSince = Math.floor((now - latest.createdAt) / 86400000)
  const count = backups.length
  const hasRecent = daysSince <= 7
  const hasMultiple = count >= 3
  const hasEncrypted = backups.some((b) => b.encrypted)
  const totalSize = backups.reduce((s, b) => s + (b.size || 0), 0)

  let score = 0
  if (hasRecent) score += 30
  else if (daysSince <= 14) score += 15
  else if (daysSince <= 30) score += 5
  if (count >= 10) score += 30
  else if (count >= 5) score += 25
  else if (count >= 3) score += 15
  else if (count >= 1) score += 5
  if (hasEncrypted) score += 20
  if (totalSize > 0) score += 10
  if (hasMultiple && hasRecent) score += 10

  let grade, status, message
  if (score >= 90) { grade = 'A+'; status = 'excellent'; message = 'Fully protected' }
  else if (score >= 75) { grade = 'A'; status = 'good'; message = 'Well protected' }
  else if (score >= 55) { grade = 'B'; status = 'adequate'; message = 'Adequate coverage' }
  else if (score >= 30) { grade = 'C'; status = 'weak'; message = 'Needs improvement' }
  else { grade = 'D'; status = 'critical'; message = 'Data at risk' }

  return { score: Math.min(100, score), grade, status, message, backupCount: count, daysSince, latestBackupAt: latest.createdAt }
}

// ── Encrypted backup helpers (AES-256-GCM + PBKDF2) ──────────────────────────

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await _crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return _crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function toBase64(bytes) {
  const uint8 = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
  return btoa(binary)
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

let _crypto = null

async function ensureCrypto() {
  if (_crypto) return true
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    _crypto = globalThis.crypto
    return true
  }
  if (typeof window !== 'undefined' && window.crypto) {
    _crypto = window.crypto
    return true
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const mod = await import(/* @vite-ignore */ 'node:crypto')
      _crypto = mod.webcrypto || mod.default
      return !!_crypto
    } catch {
      return false
    }
  }
  return false
}

export async function encryptBackup(backupObj, password) {
  await ensureCrypto()
  const salt = _crypto.getRandomValues(new Uint8Array(16))
  const iv = _crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(backupObj))
  const ciphertext = await _crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    app: 'finora-finance',
    encrypted: true,
    version: BACKUP_SCHEMA_VERSION,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertext),
  }
}

export async function decryptBackup(encryptedObj, password) {
  await ensureCrypto()
  const salt = fromBase64(encryptedObj.salt)
  const iv = fromBase64(encryptedObj.iv)
  const ciphertext = fromBase64(encryptedObj.data)
  const key = await deriveKey(password, salt)
  const plaintext = await _crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export async function parseAndValidateEncryptedBackup(jsonString, password) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'Invalid JSON format. File may be corrupted.' }
  }

  if (!parsed.encrypted || (parsed.app !== 'finora-finance' && parsed.app !== 'shyblack-finance')) {
    return { success: false, error: 'Not an Expense Tracker - ShyBlack encrypted backup file.' }
  }

  if (!parsed.salt || !parsed.iv || !parsed.data) {
    return { success: false, error: 'Encrypted backup is missing required fields.' }
  }

  try {
    const backup = await decryptBackup(parsed, password)
    const validation = validateBackupData(backup)
    if (!validation.valid) {
      return { success: false, error: `Backup validation failed: ${validation.errors.join('; ')}` }
    }
    return { success: true, data: backup.data }
  } catch {
    return { success: false, error: 'Incorrect password or corrupted backup.' }
  }
}

const REQUIRED_TOP_LEVEL = ['app', 'version', 'exportedAt', 'data']
const REQUIRED_DATA_KEYS = ['transactions', 'debts', 'savingsGoal']

const VALIDATORS = {
  transactions: (items) => Array.isArray(items) && items.every((t) => typeof t === 'object' && t !== null && typeof t.id === 'string' && typeof t.type === 'string' && typeof t.amount === 'number'),
  debts: (items) => Array.isArray(items) && items.every((d) => typeof d === 'object' && d !== null && typeof d.id === 'string' && typeof d.personName === 'string' && typeof d.amount === 'number'),
  savingsGoal: (val) => typeof val === 'object' && val !== null && typeof val.target === 'number' && typeof val.saved === 'number',
  budgets: (val) => typeof val === 'object' && val !== null,
  recurring: (items) => Array.isArray(items) && items.every((r) => typeof r === 'object' && r !== null),
  tags: (items) => Array.isArray(items) && items.every((t) => typeof t === 'object' && t !== null),
  security: (val) => typeof val === 'object' && val !== null,
  emis: (items) => Array.isArray(items) && items.every((e) => typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.amount === 'number'),
  accounts: (items) => Array.isArray(items) && items.every((a) => typeof a === 'object' && a !== null && typeof a.id === 'string'),
  transfers: (items) => Array.isArray(items) && items.every((t) => typeof t === 'object' && t !== null && typeof t.id === 'string'),
  goals: (items) => Array.isArray(items) && items.every((g) => typeof g === 'object' && g !== null && typeof g.id === 'string'),
  templates: (items) => Array.isArray(items) && items.every((t) => typeof t === 'object' && t !== null),
  archive: (val) => typeof val === 'object' && val !== null,
  documents: (items) => Array.isArray(items) && items.every((d) => typeof d === 'object' && d !== null && typeof d.id === 'string' && typeof d.title === 'string'),
  documentFiles: (val) => typeof val === 'object' && val !== null,
  relationships: (items) => Array.isArray(items) && items.every((r) => typeof r === 'object' && r !== null && typeof r.id === 'string'),
}

export function collectBackupData() {
  const data = {}

  const schema = safeStorage.get(STORAGE_KEYS.SCHEMA, { version: 0 })
  if (schema && typeof schema === 'object' && typeof schema.version === 'number') {
    data.schemaVersion = schema.version
  }

  data.transactions = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
  data.debts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
  data.savingsGoal = safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })
  data.budgets = safeStorage.get(STORAGE_KEYS.BUDGETS, {})
  data.recurring = safeStorage.get(STORAGE_KEYS.RECURRING, [])
  data.tags = safeStorage.get(STORAGE_KEYS.TAGS, [])
  data.emis = safeStorage.get(STORAGE_KEYS.EMIS, [])
  data.accounts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
  data.transfers = safeStorage.get(STORAGE_KEYS.TRANSFERS, [])
  data.goals = safeStorage.get(STORAGE_KEYS.GOALS, [])
  data.templates = safeStorage.get(STORAGE_KEYS.TEMPLATES, [])
  data.documents = safeStorage.get(STORAGE_KEYS.DOCUMENTS, [])
  data.documentFiles = safeStorage.get(STORAGE_KEYS.DOCUMENT_FILES, {})
  data.relationships = safeStorage.get(STORAGE_KEYS.RELATIONSHIPS, [])
  data.archive = safeStorage.get(STORAGE_KEYS.ARCHIVE, { version: 1, transactions: [] })
  data.budgetsV2 = safeStorage.get(STORAGE_KEYS.BUDGETS_V2, [])
  data.receipts = safeStorage.get(STORAGE_KEYS.RECEIPT_SCANS, [])
  data.wealthAssets = safeStorage.get(STORAGE_KEYS.WEALTH_ASSETS, [])
  const rawSecurity = safeStorage.get(STORAGE_KEYS.SETTINGS, {})
  data.security = rawSecurity && typeof rawSecurity === 'object'
    ? { privacyMode: !!rawSecurity.privacyMode, hideBalance: !!rawSecurity.hideBalance, biometricEnabled: !!rawSecurity.biometricEnabled }
    : {}

  return {
    app: 'finora-finance',
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/* ── Structured Logger ── */

function logExport(stage, details = '') {
  const msg = `[BACKUP] ${stage}${details ? ` — ${details}` : ''}`
  if (typeof console !== 'undefined') {
    console.log(msg)
  }
  return msg
}

/* ── Base64 Encoding (UTF-8 safe, no deprecated APIs) ── */

function utf8ToBase64(str) {
  const uint8 = new TextEncoder().encode(str)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length))
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

function base64ToUtf8(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/* ── Share Helper ── */

async function shareExportedFile(blob, filename) {
  try {
    const { shareBlob } = await import('./downloadUtils')
    const result = await shareBlob(blob, filename, 'Expense Tracker Backup')
    if (result.shared) {
      logExport('SHARE_OK', `method: ${result.method}`)
      return { shared: true, method: result.method }
    }
    if (result.method !== 'cancelled') {
      logExport('SHARE_FAILED', result.error || 'unknown')
    }
    return { shared: false, reason: result.method }
  } catch (err) {
    logExport('SHARE_ERROR', err.message)
    return { shared: false, reason: 'error', error: err.message }
  }
}

/* ── Capacitor Filesystem Helpers ── */

let _filesystemModule = null

async function getFilesystem() {
  if (!_filesystemModule) {
    try {
      _filesystemModule = await import('@capacitor/filesystem')
    } catch (err) {
      logExport('FILESYSTEM_IMPORT_FAILED', err.message)
      throw new Error('Capacitor Filesystem not available: ' + (err.message || 'import failed'))
    }
  }
  return _filesystemModule
}

async function verifyFileExists(path, directory) {
  try {
    const { Filesystem } = await getFilesystem()
    const stat = await Filesystem.stat({ path, directory })
    const exists = stat && typeof stat.size === 'number'
    if (exists) {
      logExport('VERIFY_SUCCESS', `${path} — size: ${stat.size} bytes`)
    }
    return exists ? { exists: true, size: stat.size, uri: stat.uri, mtime: stat.mtime } : { exists: false }
  } catch (err) {
    logExport('VERIFY_FAILED', `${path} — ${err.message}`)
    return { exists: false, error: err.message }
  }
}

/* ── Export Configuration ── */

const EXPORT_DIRECTORY = 'ExpenseTracker'

function getExportFilename(prefix = 'etracker_backup') {
  const date = new Date().toISOString().split('T')[0]
  const timestamp = Date.now()
  return `${prefix}_${date}_${timestamp}.json`
}

/* ── Production Export — with full verification ── */

export async function exportBackup() {
  logExport('EXPORT_STARTED')
  const startTime = Date.now()

  const validation = validateBeforeExport()
  if (!validation.canExport) {
    const msg = 'Pre-export validation failed: ' + validation.errors.join('; ')
    logExport('VALIDATION_FAILED', msg)
    return { success: false, error: msg, stage: 'validation' }
  }
  logExport('VALIDATION_PASSED', validation.warnings.length ? `warnings: ${validation.warnings.join(', ')}` : 'clean')

  const rawBackup = collectBackupData()
  logExport('DATA_COLLECTED', `modules: ${Object.keys(rawBackup.data).length}`)

  const checksum = await generateChecksum(rawBackup.data)
  const recordCounts = computeRecordCounts()
  const enriched = buildEnrichedBackupData(rawBackup, { checksum, recordCounts })
  logExport('METADATA_ADDED', `backupId: ${enriched.backupId}, records: ${enriched.totalRecords}`)

  const json = JSON.stringify(enriched, null, 2)
  const jsonSize = typeof Blob !== 'undefined'
    ? new Blob([json]).size
    : new TextEncoder().encode(json).length
  logExport('JSON_GENERATED', `size: ${jsonSize} bytes`)

  if (jsonSize === 0) {
    const msg = 'Generated backup JSON is empty'
    logExport('EXPORT_FAILED', msg)
    return { success: false, error: msg, stage: 'serialization' }
  }

  const filename = getExportFilename('etracker_backup')
  const fullPath = `${EXPORT_DIRECTORY}/${filename}`
  const base64 = utf8ToBase64(json)
  logExport('BASE64_ENCODED', `length: ${base64.length}`)

  let filesystem = null
  try {
    filesystem = await getFilesystem()
  } catch (err) {
    logExport('FILESYSTEM_UNAVAILABLE', err.message)
    const fallbackOk = fallbackDownload(json, filename)
    if (fallbackOk) {
      logExport('FALLBACK_DOWNLOAD_OK')
      recordBackupEvent('export', true)
      return { success: true, method: 'web-fallback', filename, path: filename }
    }
    recordBackupEvent('export', false)
    return { success: false, error: err.message, stage: 'filesystem-init' }
  }

  try {
    const { Filesystem, Directory } = filesystem

    const savedFile = await Filesystem.writeFile({
      path: fullPath,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    logExport('WRITE_SUCCESS', `uri: ${savedFile.uri}`)

    const verification = await verifyFileExists(fullPath, Directory.External)
    if (!verification.exists) {
      const msg = 'File write reported success but file not found on disk'
      logExport('VERIFICATION_FAILED', msg)
      recordBackupEvent('export', false)
      return { success: false, error: msg, stage: 'verification', filename }
    }

    if (verification.size === 0) {
      const msg = 'File exists but is empty (0 bytes)'
      logExport('VERIFICATION_EMPTY', msg)
      recordBackupEvent('export', false)
      return { success: false, error: msg, stage: 'verification-size', filename }
    }

    const elapsed = Date.now() - startTime
    logExport('EXPORT_COMPLETED', `file: ${filename}, size: ${verification.size}, time: ${elapsed}ms`)
    recordBackupEvent('export', true)

    const blob = new Blob([json], { type: 'application/json' })
    const share = await shareExportedFile(blob, filename)

    return {
      success: true,
      method: 'filesystem',
      filename,
      path: `External/${fullPath}`,
      uri: savedFile.uri,
      size: verification.size,
      elapsed,
      shared: share.shared,
      shareMethod: share.method,
      shareError: share.shared ? null : (share.error || null),
      backupId: enriched.backupId,
      recordCounts,
      checksum,
    }
  } catch (err) {
    logExport('WRITE_FAILED', err.message || 'Unknown error')

    const fallbackOk = fallbackDownload(json, filename)
    if (fallbackOk) {
      logExport('FALLBACK_DOWNLOAD_OK')
      recordBackupEvent('export', true)
      return { success: true, method: 'web-fallback', filename, path: filename }
    }

    recordBackupEvent('export', false)
    return { success: false, error: err.message || 'File write failed', stage: 'filesystem-write', filename }
  }
}

function fallbackDownload(content, filename) {
  try {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      try { document.body.removeChild(a) } catch (e) { /* already removed */ }
      try { URL.revokeObjectURL(url) } catch (e) { /* already revoked */ }
    }, 30000)
    return true
  } catch (err) {
    logExport('FALLBACK_FAILED', err.message || 'Unknown error')
    return false
  }
}

/* ── Encrypted Export — with full verification ── */

export async function exportEncryptedBackup(password) {
  logExport('ENCRYPTED_EXPORT_STARTED')
  const startTime = Date.now()

  const validation = validateBeforeExport()
  if (!validation.canExport) {
    const msg = 'Pre-export validation failed: ' + validation.errors.join('; ')
    logExport('ENCRYPTED_VALIDATION_FAILED', msg)
    throw new Error(msg)
  }
  logExport('VALIDATION_PASSED', validation.warnings.length ? `warnings: ${validation.warnings.join(', ')}` : 'clean')

  const rawBackup = collectBackupData()
  logExport('DATA_COLLECTED', `modules: ${Object.keys(rawBackup.data).length}`)

  const checksum = await generateChecksum(rawBackup.data)
  const recordCounts = computeRecordCounts()
  const enriched = buildEnrichedBackupData(rawBackup, { checksum, recordCounts, encryption: 'aes-256-gcm' })
  logExport('METADATA_ADDED', `backupId: ${enriched.backupId}, records: ${enriched.totalRecords}`)

  let encryptedObj
  try {
    encryptedObj = await encryptBackup(enriched, password)
    logExport('ENCRYPTION_OK')
  } catch (err) {
    logExport('ENCRYPTION_FAILED', err.message || 'Unknown error')
    throw new Error('Encryption failed: ' + (err.message || 'unknown error'))
  }

  const json = JSON.stringify(encryptedObj)
  const jsonSize = typeof Blob !== 'undefined'
    ? new Blob([json]).size
    : new TextEncoder().encode(json).length
  logExport('JSON_GENERATED', `size: ${jsonSize} bytes`)

  const filename = getExportFilename('etracker_encrypted')
  const fullPath = `${EXPORT_DIRECTORY}/${filename}`
  const base64 = utf8ToBase64(json)

  let filesystem
  try {
    filesystem = await getFilesystem()
  } catch (err) {
    logExport('FILESYSTEM_UNAVAILABLE', err.message)
    const fallbackOk = fallbackDownload(json, filename)
    if (fallbackOk) {
      logExport('ENCRYPTED_FALLBACK_OK')
      recordBackupEvent('encrypted_export', true)
      return { success: true, method: 'web-fallback', filename }
    }
    recordBackupEvent('encrypted_export', false)
    throw new Error('Filesystem not available and fallback failed: ' + err.message)
  }

  try {
    const { Filesystem, Directory } = filesystem

    const savedFile = await Filesystem.writeFile({
      path: fullPath,
      data: base64,
      directory: Directory.External,
      recursive: true,
    })
    logExport('ENCRYPTED_WRITE_SUCCESS', `uri: ${savedFile.uri}`)

    const verification = await verifyFileExists(fullPath, Directory.External)
    if (!verification.exists || verification.size === 0) {
      const msg = verification.size === 0 ? 'File is empty' : 'File not found after write'
      logExport('ENCRYPTED_VERIFICATION_FAILED', msg)
      recordBackupEvent('encrypted_export', false)
      throw new Error(msg)
    }

    const elapsed = Date.now() - startTime
    logExport('ENCRYPTED_EXPORT_COMPLETED', `size: ${verification.size}, time: ${elapsed}ms`)
    recordBackupEvent('encrypted_export', true)

    const blob = new Blob([json], { type: 'application/json' })
    const share = await shareExportedFile(blob, filename)

    return {
      success: true,
      method: 'filesystem',
      filename,
      path: `External/${fullPath}`,
      uri: savedFile.uri,
      size: verification.size,
      elapsed,
      shared: share.shared,
      shareMethod: share.method,
      shareError: share.shared ? null : (share.error || null),
      backupId: enriched.backupId,
      recordCounts,
      checksum,
    }
  } catch (err) {
    logExport('ENCRYPTED_WRITE_FAILED', err.message || 'Unknown error')

    const fallbackOk = fallbackDownload(json, filename)
    if (fallbackOk) {
      logExport('ENCRYPTED_FALLBACK_OK')
      recordBackupEvent('encrypted_export', true)
      return { success: true, method: 'web-fallback', filename }
    }

    recordBackupEvent('encrypted_export', false)
    throw new Error(err.message || 'Encrypted export failed')
  }
}

export function validateBackupData(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Backup data must be a valid object'] }
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in data)) {
      errors.push(`Missing required field: "${key}"`)
    }
  }

  if (errors.length > 0) return { valid: false, errors }

  if (data.app !== 'finora-finance' && data.app !== 'shyblack-finance') {
    errors.push(`Invalid app identifier: "${data.app}"`)
  }

  if (typeof data.version !== 'number' || data.version < 1) {
    errors.push('Invalid or missing backup version')
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push('Backup data payload is missing or invalid')
    return { valid: false, errors }
  }

  for (const key of REQUIRED_DATA_KEYS) {
    if (!(key in data.data)) {
      errors.push(`Missing required data section: "${key}"`)
    }
  }

  if (errors.length > 0) return { valid: false, errors }

  for (const key of Object.keys(data.data)) {
    const validator = VALIDATORS[key]
    if (validator && !validator(data.data[key])) {
      errors.push(`Invalid data structure for "${key}"`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function parseAndValidateBackup(jsonString) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'Invalid JSON format. File may be corrupted.' }
  }

  const validation = validateBackupData(parsed)
  if (!validation.valid) {
    return { success: false, error: `Backup validation failed: ${validation.errors.join('; ')}` }
  }

  return { success: true, data: parsed.data }
}

export function restoreFromBackup(backupData) {
  const results = { restored: [], failed: [], skipped: [] }

  const keyMap = {
    transactions: STORAGE_KEYS.TRANSACTIONS,
    debts: STORAGE_KEYS.DEBTS,
    savingsGoal: STORAGE_KEYS.SAVINGS,
    budgets: STORAGE_KEYS.BUDGETS,
    recurring: STORAGE_KEYS.RECURRING,
    tags: STORAGE_KEYS.TAGS,
    emis: STORAGE_KEYS.EMIS,
    accounts: STORAGE_KEYS.NET_WORTH_ACCOUNTS,
    transfers: STORAGE_KEYS.TRANSFERS,
    goals: STORAGE_KEYS.GOALS,
    templates: STORAGE_KEYS.TEMPLATES,
    archive: STORAGE_KEYS.ARCHIVE,
    documents: STORAGE_KEYS.DOCUMENTS,
    documentFiles: STORAGE_KEYS.DOCUMENT_FILES,
    relationships: STORAGE_KEYS.RELATIONSHIPS,
  }

  for (const [section, storageKey] of Object.entries(keyMap)) {
    if (section in backupData) {
      const ok = safeStorage.set(storageKey, backupData[section])
      if (ok) {
        results.restored.push(section)
      } else {
        results.failed.push(section)
      }
    } else {
      results.skipped.push(section)
    }
  }

  recordBackupEvent('restore', results.failed.length === 0)
  return results
}
