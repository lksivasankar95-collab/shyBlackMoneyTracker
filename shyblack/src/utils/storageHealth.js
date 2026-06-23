import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

const ALL_KEYS = Object.values(STORAGE_KEYS)

/* ── Storage analysis ── */

export function analyzeStorageSize() {
  const info = safeStorage.getStorageInfo()
  return {
    usedBytes: info.usedBytes,
    usedKB: info.usedKB,
    keyCount: info.keyCount,
    keys: ALL_KEYS,
  }
}

export function checkDuplicateIds(data, idField = 'id') {
  const seen = new Map()
  const duplicates = []
  for (const item of data) {
    if (!item) continue
    const id = item[idField]
    if (id === undefined || id === null) continue
    if (seen.has(id)) {
      duplicates.push({ id, firstIndex: seen.get(id), detail: `Duplicate ${idField}: ${id}` })
    } else {
      seen.set(id, data.indexOf(item))
    }
  }
  return duplicates
}

export function checkCorruptedRecords(data, requiredFields) {
  const corrupted = []
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (!item || typeof item !== 'object') {
      corrupted.push({ index: i, detail: 'Null or non-object entry' })
      continue
    }
    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === null) {
        corrupted.push({ index: i, id: item.id, detail: `Missing required field: ${field}` })
        break
      }
    }
  }
  return corrupted
}

export function checkOrphanedRecords(allData) {
  const orphans = []
  const accountIds = new Set((allData.accounts || []).map((a) => a.id))
  const transactionIds = new Set((allData.transactions || []).map((t) => t.id))
  const goalIds = new Set((allData.goals || []).map((g) => g.id))
  const emiIds = new Set((allData.emis || []).map((e) => e.id))

  for (const wa of allData.wealthAssets || []) {
    if (wa.goalId && !goalIds.has(wa.goalId)) {
      orphans.push({ type: 'wealth_asset', id: wa.id, ref: wa.goalId, detail: 'Wealth asset references deleted goal' })
    }
  }

  for (const emi of allData.emis || []) {
    for (const pmt of emi.payments || []) {
      if (pmt.transactionId && !transactionIds.has(pmt.transactionId)) {
        orphans.push({ type: 'emi_payment', id: emi.id, ref: pmt.transactionId, detail: 'EMI payment references deleted transaction' })
      }
    }
  }

  for (const tx of allData.transfers || []) {
    if (tx.fromAccountId && !accountIds.has(tx.fromAccountId)) {
      orphans.push({ type: 'transfer_from', id: tx.id, ref: tx.fromAccountId, detail: 'Transfer references deleted source account' })
    }
    if (tx.toAccountId && !accountIds.has(tx.toAccountId)) {
      orphans.push({ type: 'transfer_to', id: tx.id, ref: tx.toAccountId, detail: 'Transfer references deleted destination account' })
    }
  }

  for (const doc of allData.documents || []) {
    if (doc.linkedTransactionId && !transactionIds.has(doc.linkedTransactionId)) {
      orphans.push({ type: 'document', id: doc.id, ref: doc.linkedTransactionId, detail: 'Document references deleted transaction' })
    }
  }

  return orphans
}

/* ── Auto-repair ── */

export function autoRepairRecords(data, validators) {
  const repairs = []
  const repaired = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (!item || typeof item !== 'object') {
      repairs.push({ index: i, detail: 'Removed null/non-object entry' })
      continue
    }
    let fixed = { ...item }
    let needsRepair = false
    for (const [field, def] of Object.entries(validators)) {
      if (!def.validator(fixed[field])) {
        fixed[field] = typeof def.default === 'function' ? def.default() : def.default
        needsRepair = true
      }
    }
    if (needsRepair) {
      if (!fixed.id) fixed.id = generateId()
      repairs.push({ id: item.id || 'unknown', detail: `Auto-repaired: missing/invalid fields` })
    }
    repaired.push(fixed)
  }

  return { repaired, repairs }
}

export function generateHealthGrade(score) {
  if (score >= 90) return { grade: 'A+', label: 'Excellent' }
  if (score >= 80) return { grade: 'A', label: 'Great' }
  if (score >= 65) return { grade: 'B', label: 'Good' }
  if (score >= 45) return { grade: 'C', label: 'Fair' }
  if (score >= 25) return { grade: 'D', label: 'Poor' }
  return { grade: 'F', label: 'Critical' }
}

/* ── Main health check ── */

export function runStorageHealthCheck(allData) {
  const issues = []
  let totalRecords = 0
  let corruptedRecords = 0
  let duplicateRecords = 0
  let orphanedRecords = 0

  const checks = {
    transactions: { data: allData.transactions || [], fields: ['id', 'type', 'amount', 'date'] },
    debts: { data: allData.debts || [], fields: ['id', 'personName', 'amount'] },
    goals: { data: allData.goals || [], fields: ['id', 'name', 'target'] },
    accounts: { data: allData.accounts || [], fields: ['id', 'name', 'balance', 'type'] },
    emis: { data: allData.emis || [], fields: ['id', 'name', 'amount'] },
  }

  for (const [name, cfg] of Object.entries(checks)) {
    totalRecords += cfg.data.length

    const corrupted = checkCorruptedRecords(cfg.data, cfg.fields)
    corruptedRecords += corrupted.length
    if (corrupted.length > 0) {
      issues.push({ type: 'corrupted', entity: name, count: corrupted.length, detail: `${corrupted.length} corrupted ${name}` })
    }

    const dups = checkDuplicateIds(cfg.data)
    duplicateRecords += dups.length
    if (dups.length > 0) {
      issues.push({ type: 'duplicates', entity: name, count: dups.length, detail: `${dups.length} duplicate IDs in ${name}` })
    }
  }

  const orphans = checkOrphanedRecords(allData)
  orphanedRecords = orphans.length
  if (orphans.length > 0) {
    issues.push({ type: 'orphans', entity: 'cross', count: orphans.length, detail: `${orphans.length} orphaned references` })
  }

  const healthScore = Math.max(0, Math.min(100,
    100 - (corruptedRecords * 5) - (duplicateRecords * 3) - (orphanedRecords * 2)
  ))

  const healthGrade = generateHealthGrade(healthScore)

  return {
    healthScore,
    healthGrade,
    totalRecords,
    corruptedRecords,
    duplicateRecords,
    orphanedRecords,
    issues,
    timestamp: Date.now(),
  }
}

/* ── Safe repair attempt ── */

export function attemptAutoRepair(allData) {
  const repairs = []

  const txRepair = autoRepairRecords(allData.transactions || [], {
    id: { default: generateId, validator: (v) => typeof v === 'string' && v.length > 0 },
    type: { default: 'expense', validator: (v) => ['income', 'expense'].includes(v) },
    amount: { default: 0, validator: (v) => typeof v === 'number' && !isNaN(v) },
    date: { default: () => new Date().toISOString().split('T')[0], validator: (v) => typeof v === 'string' && v.length > 0 },
  })

  if (txRepair.repairs.length > 0) {
    repairs.push({ entity: 'transactions', count: txRepair.repairs.length, detail: txRepair.repairs[0].detail })
  }

  return {
    repaired: {
      transactions: txRepair.repaired,
    },
    repairs,
    timestamp: Date.now(),
  }
}
