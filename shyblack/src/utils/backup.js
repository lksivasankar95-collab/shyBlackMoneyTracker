import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { APP_SCHEMA_VERSION } from './schema'
import { recordBackupEvent } from './backupHealth'
import { generateId } from './helpers'

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

function saveBackupGenerations(backups) {
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
    'budgetsV2', 'receipts', 'wealthAssets', 'emis',
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
  recordBackupEvent(type === BACKUP_TYPES.ENCRYPTED ? 'encrypted_export' : 'export', true)
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
  if (backup.appVersion > APP_SCHEMA_VERSION) errors.push('Backup was created by a newer app version')
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
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
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
      const mod = await import('node:crypto')
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
    app: 'shyblack-finance',
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

export async function exportEncryptedBackup(password) {
  const backup = collectBackupData()
  const encryptedObj = await encryptBackup(backup, password)
  const json = JSON.stringify(encryptedObj)
  const filename = `shyblack_encrypted_${new Date().toISOString().split('T')[0]}.enc.json`

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({
      path: `ShyBlackFinance/${filename}`,
      data: btoa(unescape(encodeURIComponent(json))),
      directory: Directory.Documents,
      recursive: true,
    })
  } catch {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  recordBackupEvent('encrypted_export', true)
}

export async function parseAndValidateEncryptedBackup(jsonString, password) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'Invalid JSON format. File may be corrupted.' }
  }

  if (!parsed.encrypted || parsed.app !== 'shyblack-finance') {
    return { success: false, error: 'Not a ShyBlack encrypted backup file.' }
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
  const rawSecurity = safeStorage.get(STORAGE_KEYS.SETTINGS, {})
  data.security = rawSecurity && typeof rawSecurity === 'object'
    ? { privacyMode: !!rawSecurity.privacyMode, hideBalance: !!rawSecurity.hideBalance, biometricEnabled: !!rawSecurity.biometricEnabled }
    : {}

  return {
    app: 'shyblack-finance',
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export async function exportBackup() {
  const backup = collectBackupData()
  const json = JSON.stringify(backup, null, 2)
  const filename = `shyblack_backup_${new Date().toISOString().split('T')[0]}.json`

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({
      path: `ShyBlackFinance/${filename}`,
      data: btoa(unescape(encodeURIComponent(json))),
      directory: Directory.Documents,
      recursive: true,
    })
    recordBackupEvent('export', true)
    return { success: true, method: 'filesystem', filename }
  } catch {
    try {
      fallbackDownload(json, filename)
      recordBackupEvent('export', true)
      return { success: true, method: 'download', filename }
    } catch {
      recordBackupEvent('export', false)
      return { success: false, filename }
    }
  }
}

function fallbackDownload(content, filename) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
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

  if (data.app !== 'shyblack-finance') {
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
