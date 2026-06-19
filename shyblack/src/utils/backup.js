import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { APP_SCHEMA_VERSION } from './schema'
import { recordBackupEvent } from './backupHealth'

export const BACKUP_SCHEMA_VERSION = 1

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
  if (typeof global !== 'undefined' && global.crypto) {
    _crypto = global.crypto
    return true
  }
  if (typeof window !== 'undefined' && window.crypto) {
    _crypto = window.crypto
    return true
  }
  try {
    const mod = await import('node:crypto')
    _crypto = mod.webcrypto || mod.default
    return !!_crypto
  } catch {
    return false
  }
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
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shyblack_encrypted_${new Date().toISOString().split('T')[0]}.enc.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
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

export function exportBackup() {
  const backup = collectBackupData()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shyblack_backup_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  recordBackupEvent('export', true)
  return backup
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
