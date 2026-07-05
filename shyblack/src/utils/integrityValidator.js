import { validateTransactions, validateDebts, validateGoals, validateAccounts, validateTransfers, validateEmis, detectOrphanedReferences } from './dataIntegrity'


function genericValidate(items, name, fieldDefs) {
  if (!Array.isArray(items)) return { valid: false, repaired: [], errors: [`${name} is not an array`] }
  const repaired = []
  const errors = []

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      errors.push(`Skipped null/undefined ${name}`)
      continue
    }
    let fixed = { ...item }
    let needsRepair = false

    for (const [field, def] of Object.entries(fieldDefs)) {
      const val = fixed[field]
      if (def.required && (val === undefined || val === null)) {
        fixed[field] = typeof def.default === 'function' ? def.default() : def.default
        needsRepair = true
      } else if (def.type && val !== undefined && typeof val !== def.type) {
        if (def.type === 'number' && !isNaN(Number(val))) {
          fixed[field] = Number(val)
        } else {
          fixed[field] = typeof def.default === 'function' ? def.default() : def.default
        }
        needsRepair = true
      }
      if (def.validate && !def.validate(val)) {
        fixed[field] = typeof def.default === 'function' ? def.default() : def.default
        needsRepair = true
      }
    }

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }

    if (needsRepair) {
      errors.push(`Repaired ${name} ${item?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function validateWealthAssets(raw) {
  return genericValidate(raw, 'wealth_assets', {
    assetType: { required: true, default: 'other', validate: (v) => typeof v === 'string' },
    assetName: { required: false, default: '' },
    currentValue: { required: true, default: 0, type: 'number' },
    investedAmount: { required: false, default: 0, type: 'number' },
  })
}

export function validateReceipts(raw) {
  return genericValidate(raw, 'receipts', {
    amount: { required: true, default: 0, type: 'number' },
    date: { required: false, default: () => new Date().toISOString().split('T')[0] },
    merchant: { required: false, default: 'Unknown' },
    category: { required: false, default: 'other' },
  })
}

export function validateRecurring(raw) {
  return genericValidate(raw, 'recurring', {
    type: { required: true, default: 'expense', validate: (v) => ['income', 'expense'].includes(v) },
    amount: { required: true, default: 0, type: 'number' },
    category: { required: false, default: 'other' },
    frequency: { required: false, default: 'monthly' },
    nextDate: { required: false, default: () => new Date().toISOString().split('T')[0] },
  })
}

export function validateBudgetsV2(raw) {
  return genericValidate(raw, 'budgets_v2', {
    category: { required: true, default: 'other' },
    limit: { required: true, default: 0, type: 'number' },
    period: { required: false, default: 'monthly' },
    spent: { required: false, default: 0, type: 'number' },
  })
}

export function validateBackups(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['backups is not an array'] }
  const repaired = []
  const errors = []

  for (const b of raw) {
    if (!b || typeof b !== 'object') {
      errors.push('Skipped null/undefined backup')
      continue
    }
    let fixed = { ...b }
    let needsRepair = false

    if (!fixed.id) { fixed.id = `bk_repair_${Date.now()}`; needsRepair = true }
    if (!fixed.version) { fixed.version = 1; needsRepair = true }
    if (typeof fixed.createdAt !== 'number') { fixed.createdAt = Date.now(); needsRepair = true }
    if (!fixed.type) { fixed.type = 'manual'; needsRepair = true }
    if (!Array.isArray(fixed.modules)) { fixed.modules = []; needsRepair = true }

    if (needsRepair) errors.push(`Repaired backup ${b?.id || 'unknown'}: missing/invalid fields`)
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function runFullIntegrityCheck(allData) {
  const checks = {
    transactions: validateTransactions(allData.transactions || []),
    debts: validateDebts(allData.debts || []),
    goals: validateGoals(allData.goals || []),
    accounts: validateAccounts(allData.accounts || []),
    transfers: validateTransfers(allData.transfers || []),
    emis: validateEmis(allData.emis || []),
    wealthAssets: validateWealthAssets(allData.wealthAssets || []),
    receipts: validateReceipts(allData.receipts || []),
    recurring: validateRecurring(allData.recurring || []),
    budgetsV2: validateBudgetsV2(allData.budgetsV2 || []),
    backups: validateBackups(allData.backups || []),
    orphans: detectOrphanedReferences(allData),
  }

  let hasIssues = false
  let totalErrors = 0
  let totalRepairs = 0

  for (const [, result] of Object.entries(checks)) {
    if (result && result.errors && result.errors.length > 0) {
      hasIssues = true
      totalErrors += result.errors.length
      totalRepairs += result.repaired ? result.repaired.length : 0
    }
    if (Array.isArray(result) && result.length > 0) {
      hasIssues = true
    }
  }

  return {
    ...checks,
    hasIssues,
    summary: { totalErrors, totalRepairs, totalOrphans: checks.orphans.length },
    timestamp: Date.now(),
  }
}

export function applyFullRepairs(integrityResult) {
  const repaired = {}
  const entityKeys = ['transactions', 'debts', 'goals', 'accounts', 'transfers', 'emis', 'wealthAssets', 'receipts', 'recurring', 'budgetsV2', 'backups']
  for (const key of entityKeys) {
    const r = integrityResult[key]
    if (r && r.repaired) {
      repaired[key] = r.repaired
    }
  }
  return repaired
}

export function validateImportFile(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Import file is not a valid JSON object'] }
  }

  if (!Array.isArray(data.transactions)) {
    errors.push('Missing or invalid transactions array')
  }
  if (!Array.isArray(data.debts)) {
    errors.push('Missing or invalid debts array')
  }
  if (!Array.isArray(data.goals)) {
    errors.push('Missing or invalid goals array')
  }

  for (const key of ['transactions', 'debts', 'goals', 'accounts', 'emis', 'wealthAssets', 'receipts', 'recurring']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      errors.push(`${key} must be an array if present`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    entityCounts: {
      transactions: data.transactions?.length || 0,
      debts: data.debts?.length || 0,
      goals: data.goals?.length || 0,
      accounts: data.accounts?.length || 0,
      emis: data.emis?.length || 0,
    },
  }
}
