import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const MODULE_DEFS = [
  { key: 'transactions', storageKey: STORAGE_KEYS.TRANSACTIONS, kind: 'array' },
  { key: 'debts', storageKey: STORAGE_KEYS.DEBTS, kind: 'array' },
  { key: 'savingsGoal', storageKey: STORAGE_KEYS.SAVINGS, kind: 'object' },
  { key: 'budgets', storageKey: STORAGE_KEYS.BUDGETS, kind: 'object' },
  { key: 'recurring', storageKey: STORAGE_KEYS.RECURRING, kind: 'array' },
  { key: 'tags', storageKey: STORAGE_KEYS.TAGS, kind: 'array' },
  { key: 'emis', storageKey: STORAGE_KEYS.EMIS, kind: 'array' },
  { key: 'accounts', storageKey: STORAGE_KEYS.NET_WORTH_ACCOUNTS, kind: 'array' },
  { key: 'transfers', storageKey: STORAGE_KEYS.TRANSFERS, kind: 'array' },
  { key: 'goals', storageKey: STORAGE_KEYS.GOALS, kind: 'array' },
  { key: 'templates', storageKey: STORAGE_KEYS.TEMPLATES, kind: 'array' },
  { key: 'documents', storageKey: STORAGE_KEYS.DOCUMENTS, kind: 'array' },
  { key: 'documentFiles', storageKey: STORAGE_KEYS.DOCUMENT_FILES, kind: 'object' },
  { key: 'relationships', storageKey: STORAGE_KEYS.RELATIONSHIPS, kind: 'array' },
  { key: 'archive', storageKey: STORAGE_KEYS.ARCHIVE, kind: 'object' },
  { key: 'budgetsV2', storageKey: STORAGE_KEYS.BUDGETS_V2, kind: 'array' },
  { key: 'receipts', storageKey: STORAGE_KEYS.RECEIPT_SCANS, kind: 'array' },
  { key: 'wealthAssets', storageKey: STORAGE_KEYS.WEALTH_ASSETS, kind: 'array' },
  { key: 'bills', storageKey: STORAGE_KEYS.BILLS, kind: 'array' },
  { key: 'investments', storageKey: STORAGE_KEYS.INVESTMENTS, kind: 'object' },
  { key: 'capitalGains', storageKey: STORAGE_KEYS.CAPITAL_GAINS, kind: 'object' },
  { key: 'customCategories', storageKey: STORAGE_KEYS.CUSTOM_CATEGORIES, kind: 'array' },
  { key: 'rules', storageKey: STORAGE_KEYS.RULES, kind: 'array' },
  { key: 'currencySettings', storageKey: STORAGE_KEYS.CURRENCY_SETTINGS, kind: 'object' },
  { key: 'forecastConfig', storageKey: STORAGE_KEYS.FORECAST_CONFIG, kind: 'object' },
  { key: 'autoBackup', storageKey: STORAGE_KEYS.AUTO_BACKUP, kind: 'object' },
  { key: 'security', storageKey: STORAGE_KEYS.SETTINGS, kind: 'object' },
]

function validateModule(modDef) {
  const issues = []
  try {
    const raw = safeStorage.getRaw(modDef.storageKey)
    if (raw === null) {
      issues.push({ severity: 'info', message: `"${modDef.key}" no data stored (ok if unset)`, code: 'NO_DATA' })
      return issues
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      issues.push({ severity: 'error', message: `"${modDef.key}" corrupted JSON`, code: 'CORRUPT_JSON' })
      return issues
    }
    if (modDef.kind === 'array' && !Array.isArray(parsed)) {
      issues.push({ severity: 'error', message: `"${modDef.key}" expected array, got ${typeof parsed}`, code: 'TYPE_MISMATCH' })
    } else if (modDef.kind === 'object' && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
      // Archive may be stored as a plain array in older app versions.
      // Auto-migrate to the expected object format so export is not blocked.
      if (modDef.key === 'archive' && Array.isArray(parsed)) {
        const migrated = { version: 1, transactions: parsed, archivedAt: null }
        safeStorage.set(modDef.storageKey, migrated)
        issues.push({ severity: 'info', message: '"archive" auto-migrated from legacy array to object format', code: 'MIGRATED' })
      } else {
        issues.push({ severity: 'error', message: `"${modDef.key}" expected object`, code: 'TYPE_MISMATCH' })
      }
    }
    if (modDef.key === 'transactions' && Array.isArray(parsed)) {
      const invalid = parsed.filter(t => !t || typeof t.id !== 'string' || typeof t.amount !== 'number')
      if (invalid.length > 0) {
        issues.push({ severity: 'warning', message: `"transactions" ${invalid.length} items missing id/amount`, code: 'INVALID_ITEMS' })
      }
    }
    if (modDef.key === 'accounts' && Array.isArray(parsed)) {
      const invalid = parsed.filter(a => !a || typeof a.id !== 'string')
      if (invalid.length > 0) {
        issues.push({ severity: 'warning', message: `"accounts" ${invalid.length} items missing id`, code: 'INVALID_ITEMS' })
      }
    }
  } catch (err) {
    issues.push({ severity: 'error', message: `"${modDef.key}" validation error: ${err.message}`, code: 'VALIDATION_ERR' })
  }
  return issues
}

export function validateAllModules() {
  const results = { valid: true, issues: [], errors: 0, warnings: 0 }
  for (const modDef of MODULE_DEFS) {
    const modIssues = validateModule(modDef)
    for (const issue of modIssues) {
      results.issues.push(issue)
      if (issue.severity === 'error') results.errors++
      else if (issue.severity === 'warning') results.warnings++
    }
  }
  results.valid = results.errors === 0
  return results
}

export function validateBeforeExport() {
  const result = validateAllModules()
  if (!result.valid) {
    return {
      canExport: false,
      errors: result.issues.filter(i => i.severity === 'error').map(i => i.message),
      warnings: result.issues.filter(i => i.severity === 'warning').map(i => i.message),
    }
  }
  return {
    canExport: true,
    errors: [],
    warnings: result.issues.filter(i => i.severity === 'warning').map(i => i.message),
  }
}

export function computeRecordCounts() {
  const counts = {}
  for (const modDef of MODULE_DEFS) {
    try {
      const data = safeStorage.get(modDef.storageKey, modDef.kind === 'array' ? [] : {})
      if (Array.isArray(data)) counts[modDef.key] = data.length
      else if (typeof data === 'object' && data !== null) counts[modDef.key] = Object.keys(data).length
      else counts[modDef.key] = 0
    } catch {
      counts[modDef.key] = 0
    }
  }
  return counts
}
