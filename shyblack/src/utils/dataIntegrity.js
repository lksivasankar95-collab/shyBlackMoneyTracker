import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { ALL_CATEGORIES } from './constants'

export function validateTransactions(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['transactions is not an array'] }
  const repaired = []
  const errors = []

  for (const tx of raw) {
    if (!tx || typeof tx !== 'object') {
      errors.push('Skipped null/undefined transaction')
      continue
    }
    let fixed = { ...tx }
    let needsRepair = false

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }
    if (!fixed.type || (fixed.type !== 'income' && fixed.type !== 'expense')) {
      if (fixed.amount > 0) fixed.type = 'income'
      else fixed.type = 'expense'
      needsRepair = true
    }
    if (typeof fixed.amount !== 'number' || isNaN(fixed.amount)) {
      fixed.amount = 0
      needsRepair = true
    }
    if (!fixed.date || typeof fixed.date !== 'string') {
      fixed.date = new Date().toISOString().split('T')[0]
      needsRepair = true
    }
    if (needsRepair) {
      errors.push(`Repaired transaction ${tx?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function validateDebts(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['debts is not an array'] }
  const repaired = []
  const errors = []

  for (const d of raw) {
    if (!d || typeof d !== 'object') {
      errors.push('Skipped null/undefined debt')
      continue
    }
    let fixed = { ...d }
    let needsRepair = false

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }
    if (!fixed.personName || typeof fixed.personName !== 'string') {
      fixed.personName = 'Unknown'
      needsRepair = true
    }
    if (typeof fixed.amount !== 'number' || isNaN(fixed.amount) || fixed.amount <= 0) {
      fixed.amount = 0
      needsRepair = true
    }
    if (typeof fixed.remainingAmount !== 'number' || isNaN(fixed.remainingAmount)) {
      fixed.remainingAmount = fixed.amount
      needsRepair = true
    }
    if (needsRepair) {
      errors.push(`Repaired debt ${d?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function validateGoals(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['goals is not an array'] }
  const repaired = []
  const errors = []

  for (const g of raw) {
    if (!g || typeof g !== 'object') {
      errors.push('Skipped null/undefined goal')
      continue
    }
    let fixed = { ...g }
    let needsRepair = false

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }
    if (!fixed.name || typeof fixed.name !== 'string') {
      fixed.name = 'Unnamed Goal'
      needsRepair = true
    }
    if (typeof fixed.target !== 'number' || isNaN(fixed.target) || fixed.target <= 0) {
      fixed.target = 1
      needsRepair = true
    }
    if (typeof fixed.saved !== 'number' || isNaN(fixed.saved)) {
      fixed.saved = 0
      needsRepair = true
    }
    if (needsRepair) {
      errors.push(`Repaired goal ${g?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function validateAccounts(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['accounts is not an array'] }
  const repaired = []
  const errors = []

  for (const a of raw) {
    if (!a || typeof a !== 'object') {
      errors.push('Skipped null/undefined account')
      continue
    }
    let fixed = { ...a }
    let needsRepair = false

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }
    if (!fixed.name || typeof fixed.name !== 'string') {
      fixed.name = 'Unnamed Account'
      needsRepair = true
    }
    if (typeof fixed.balance !== 'number' || isNaN(fixed.balance)) {
      fixed.balance = 0
      needsRepair = true
    }
    if (!fixed.type || !['cash', 'bank', 'trading'].includes(fixed.type)) {
      fixed.type = 'bank'
      needsRepair = true
    }
    if (needsRepair) {
      errors.push(`Repaired account ${a?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function validateTransfers(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['transfers is not an array'] }
  const repaired = []
  const errors = []

  for (const t of raw) {
    if (!t || typeof t !== 'object') {
      errors.push('Skipped null/undefined transfer')
      continue
    }
    let fixed = { ...t }
    let needsRepair = false

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }
    if (!fixed.fromAccountId || !fixed.toAccountId) {
      errors.push(`Transfer ${fixed.id}: missing account references — removed`)
      continue
    }
    if (typeof fixed.amount !== 'number' || isNaN(fixed.amount) || fixed.amount <= 0) {
      fixed.amount = 0
      needsRepair = true
    }
    if (needsRepair) {
      errors.push(`Repaired transfer ${t?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function validateEmis(raw) {
  if (!Array.isArray(raw)) return { valid: false, repaired: [], errors: ['emis is not an array'] }
  const repaired = []
  const errors = []

  for (const e of raw) {
    if (!e || typeof e !== 'object') {
      errors.push('Skipped null/undefined emi')
      continue
    }
    let fixed = { ...e }
    let needsRepair = false

    if (!fixed.id || typeof fixed.id !== 'string') {
      fixed.id = `repair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      needsRepair = true
    }
    if (!fixed.name || typeof fixed.name !== 'string') {
      fixed.name = 'Unnamed EMI'
      needsRepair = true
    }
    if (typeof fixed.amount !== 'number' || isNaN(fixed.amount) || fixed.amount <= 0) {
      fixed.amount = 0
      needsRepair = true
    }
    if (typeof fixed.totalMonths !== 'number' || isNaN(fixed.totalMonths)) {
      fixed.totalMonths = 1
      needsRepair = true
    }
    if (needsRepair) {
      errors.push(`Repaired emi ${e?.id || 'unknown'}: missing/invalid fields`)
    }
    repaired.push(fixed)
  }

  return { valid: errors.length === 0, repaired, errors }
}

export function detectOrphanedReferences(data) {
  const issues = []

  const accountIds = new Set((data.accounts || []).filter(Boolean).map((a) => a.id))
  const transactionIds = new Set((data.transactions || []).filter(Boolean).map((t) => t.id))

  for (const tx of data.transfers || []) {
    if (tx.fromAccountId && !accountIds.has(tx.fromAccountId)) {
      issues.push({ type: 'orphan_transfer_from', id: tx.id, ref: tx.fromAccountId, detail: 'Transfer references deleted source account' })
    }
    if (tx.toAccountId && !accountIds.has(tx.toAccountId)) {
      issues.push({ type: 'orphan_transfer_to', id: tx.id, ref: tx.toAccountId, detail: 'Transfer references deleted destination account' })
    }
  }

  for (const emi of data.emis || []) {
    for (const pmt of emi.paymentHistory || []) {
      if (pmt.transactionId && !transactionIds.has(pmt.transactionId)) {
        issues.push({ type: 'orphan_emi_payment', id: emi.id, ref: pmt.transactionId, detail: 'EMI payment references deleted transaction' })
      }
    }
  }

  return issues
}

export function runIntegrityCheck(allData) {
  const results = {
    transactions: validateTransactions(allData.transactions),
    debts: validateDebts(allData.debts),
    goals: validateGoals(allData.goals),
    accounts: validateAccounts(allData.accounts),
    transfers: validateTransfers(allData.transfers),
    emis: validateEmis(allData.emis),
    orphans: detectOrphanedReferences(allData),
    timestamp: Date.now(),
  }

  results.hasIssues = Object.values(results).some((r) => {
    if (Array.isArray(r)) return r.length > 0
    if (r && typeof r === 'object') {
      if (r.errors && r.errors.length > 0) return true
      if (r.errors === undefined) return false
    }
    return false
  })

  results.summary = {
    totalErrors: 0,
    totalRepairs: 0,
  }
  for (const key of ['transactions', 'debts', 'goals', 'accounts', 'transfers', 'emis']) {
    const r = results[key]
    if (r && r.errors) results.summary.totalErrors += r.errors.length
    if (r && r.repaired) results.summary.totalRepairs += r.repaired.length
  }
  results.summary.totalOrphans = results.orphans.length

  return results
}

export function applyRepairs(integrityResult) {
  const repaired = {}
  for (const key of ['transactions', 'debts', 'goals', 'accounts', 'transfers', 'emis']) {
    const r = integrityResult[key]
    if (r && r.repaired) {
      repaired[key] = r.repaired
    }
  }
  return repaired
}
