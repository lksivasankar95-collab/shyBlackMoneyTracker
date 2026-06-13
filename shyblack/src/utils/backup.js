import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { APP_SCHEMA_VERSION } from './schema'

export const BACKUP_SCHEMA_VERSION = 1

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
  data.security = safeStorage.get(STORAGE_KEYS.SETTINGS, {})

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
    security: STORAGE_KEYS.SETTINGS,
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

  return results
}
