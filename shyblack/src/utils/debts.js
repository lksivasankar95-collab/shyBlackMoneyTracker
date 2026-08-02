import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export const DEBT_TYPES = {
  LENT: 'lent',
  BORROWED: 'borrowed',
}

export const DEBT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
}

export const LEDGER_STATUS = {
  ACTIVE: 'active',
  SETTLED: 'settled',
}

// Central predicate for "is this debt still outstanding?".
// Handles both legacy V1 debts (pending|paid) and V2 ledgers (active|settled)
// so all consumers agree regardless of stored shape.
const CLOSED_DEBT_STATUSES = new Set(['settled', 'paid', 'closed'])
export function isOpenDebt(debt) {
  return !!debt && !CLOSED_DEBT_STATUSES.has(debt.status)
}

export function getDebts() {
  return safeStorage.get(STORAGE_KEYS.DEBTS, [])
}

export function saveDebts(debts) {
  return safeStorage.set(STORAGE_KEYS.DEBTS, debts)
}

// — Backward compat wrappers —

export function createDebt({ personName, amount, type, dueDate, notes, personPhone }) {
  const ledger = createLedger({ personName, amount, type, notes, personPhone })
  return {
    id: ledger.id,
    personName: ledger.personName,
    personPhone: ledger.personPhone,
    amount: ledger.originalAmount,
    remainingAmount: ledger.currentBalance,
    originalAmount: ledger.originalAmount,
    currentBalance: ledger.currentBalance,
    payments: ledger.payments,
    createdDate: ledger.createdDate,
    type: ledger.type,
    status: ledger.status === LEDGER_STATUS.ACTIVE ? DEBT_STATUS.PENDING : DEBT_STATUS.PAID,
    dueDate: dueDate || '',
    notes: ledger.notes,
    createdAt: ledger.createdDate,
  }
}

export function applyRepayment(debt, repaymentAmount) {
  const newRemaining = Math.max(0, (debt.remainingAmount ?? debt.currentBalance ?? debt.originalAmount ?? 0) - Math.abs(repaymentAmount))
  return {
    ...debt,
    remainingAmount: newRemaining,
    status: newRemaining === 0 ? DEBT_STATUS.PAID : debt.status,
    updatedAt: Date.now(),
  }
}

// — V2 Ledger Engine —

export function createLedger({ personName, amount, type, notes, personPhone }) {
  const ledgers = getDebts()
  const ledger = {
    id: generateId(),
    personName: personName.trim(),
    personPhone: (personPhone || '').trim() || undefined,
    type,
    originalAmount: Math.abs(amount),
    currentBalance: Math.abs(amount),
    status: LEDGER_STATUS.ACTIVE,
    notes: (notes || '').trim(),
    createdDate: Date.now(),
    settlementDate: null,
    payments: [],
    dueDate: '',
  }
  ledgers.push(ledger)
  saveDebts(ledgers)
  return ledger
}

export function addPayment(ledgerId, amount, paymentNotes = '') {
  const ledgers = getDebts()
  const idx = ledgers.findIndex((l) => l.id === ledgerId)
  if (idx === -1) return { success: false, error: 'Ledger not found' }

  const ledger = { ...ledgers[idx] }
  if (!amount || amount <= 0) return { success: false, error: 'Amount must be positive' }
  const payAmount = Math.abs(amount)
  if (payAmount > ledger.currentBalance) return { success: false, error: 'Amount exceeds remaining balance' }

  const payment = {
    id: generateId(),
    amount: payAmount,
    date: new Date().toISOString().split('T')[0],
    notes: (paymentNotes || '').trim(),
    createdAt: Date.now(),
  }

  ledger.currentBalance = Math.max(0, ledger.currentBalance - payAmount)
  ledger.payments = [...(ledger.payments || []), payment]
  if (ledger.currentBalance === 0) {
    ledger.status = LEDGER_STATUS.SETTLED
    ledger.settlementDate = Date.now()
  }
  ledgers[idx] = ledger
  saveDebts(ledgers)
  return { success: true, ledger, payment }
}

export function undoLastPayment(ledgerId) {
  const ledgers = getDebts()
  const idx = ledgers.findIndex((l) => l.id === ledgerId)
  if (idx === -1) return { success: false, error: 'Ledger not found' }

  const ledger = { ...ledgers[idx] }
  const payments = ledger.payments || []
  const lastPayment = payments[payments.length - 1]
  if (!lastPayment) return { success: false, error: 'No payments to undo' }

  ledger.currentBalance = ledger.currentBalance + lastPayment.amount
  ledger.payments = payments.slice(0, -1)
  ledger.status = LEDGER_STATUS.ACTIVE
  ledger.settlementDate = null
  ledgers[idx] = ledger
  saveDebts(ledgers)
  return { success: true, ledger, removedPayment: lastPayment }
}

export function editPayment(ledgerId, paymentId, updates) {
  const ledgers = getDebts()
  const idx = ledgers.findIndex((l) => l.id === ledgerId)
  if (idx === -1) return { success: false, error: 'Ledger not found' }

  const ledger = { ...ledgers[idx] }
  const payments = (ledger.payments || []).map((p) => {
    if (p.id !== paymentId) return p
    const updated = { ...p, ...updates, createdAt: p.createdAt }
    return updated
  })
  ledger.payments = payments
  ledger.currentBalance = Math.max(0, ledger.originalAmount - payments.reduce((s, p) => s + p.amount, 0))
  ledger.status = ledger.currentBalance === 0 ? LEDGER_STATUS.SETTLED : LEDGER_STATUS.ACTIVE
  ledger.settlementDate = ledger.currentBalance === 0 ? Date.now() : null
  ledgers[idx] = ledger
  saveDebts(ledgers)
  return { success: true, ledger }
}

export function deletePayment(ledgerId, paymentId) {
  const ledgers = getDebts()
  const idx = ledgers.findIndex((l) => l.id === ledgerId)
  if (idx === -1) return { success: false, error: 'Ledger not found' }

  const ledger = { ...ledgers[idx] }
  const removedPayment = (ledger.payments || []).find((p) => p.id === paymentId)
  if (!removedPayment) return { success: false, error: 'Payment not found' }

  ledger.payments = (ledger.payments || []).filter((p) => p.id !== paymentId)
  ledger.currentBalance = Math.min(ledger.originalAmount, ledger.currentBalance + removedPayment.amount)
  ledger.status = LEDGER_STATUS.ACTIVE
  ledger.settlementDate = null
  ledgers[idx] = ledger
  saveDebts(ledgers)
  return { success: true, ledger, removedPayment }
}

export function settleLedger(ledgerId) {
  const ledgers = getDebts()
  const idx = ledgers.findIndex((l) => l.id === ledgerId)
  if (idx === -1) return { success: false, error: 'Ledger not found' }

  const ledger = { ...ledgers[idx] }
  if (ledger.currentBalance !== 0) return { success: false, error: 'Cannot settle: balance is not zero' }
  if (ledger.status === LEDGER_STATUS.SETTLED) return { success: false, error: 'Already settled' }

  ledger.status = LEDGER_STATUS.SETTLED
  ledger.settlementDate = Date.now()
  ledgers[idx] = ledger
  saveDebts(ledgers)
  return { success: true, ledger }
}

export function getLedgerSummary(ledgers) {
  const active = ledgers.filter((l) => l.status === LEDGER_STATUS.ACTIVE)
  const settled = ledgers.filter((l) => l.status === LEDGER_STATUS.SETTLED)

  const totalLent = ledgers.filter((l) => l.type === 'lent').reduce((s, l) => s + l.originalAmount, 0)
  const totalBorrowed = ledgers.filter((l) => l.type === 'borrowed').reduce((s, l) => s + l.originalAmount, 0)
  const lentActive = active.filter((l) => l.type === 'lent')
  const borrowedActive = active.filter((l) => l.type === 'borrowed')

  const totalReceivable = lentActive.reduce((s, l) => s + l.currentBalance, 0)
  const totalPayable = borrowedActive.reduce((s, l) => s + l.currentBalance, 0)

  return {
    totalLent,
    totalBorrowed,
    totalReceivable,
    totalPayable,
    totalActive: active.length,
    totalSettled: settled.length,
    activeLedgers: active,
    settledLedgers: settled,
  }
}

export function getLedgerStatement(ledger) {
  if (!ledger) return null
  const payments = ledger.payments || []
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  return {
    id: ledger.id,
    personName: ledger.personName,
    type: ledger.type,
    originalAmount: ledger.originalAmount,
    totalPaid,
    currentBalance: ledger.currentBalance,
    progress: ledger.originalAmount > 0 ? Math.round((totalPaid / ledger.originalAmount) * 100) : 0,
    status: ledger.status,
    settlementDate: ledger.settlementDate,
    createdDate: ledger.createdDate,
    notes: ledger.notes,
    payments: payments.sort((a, b) => b.createdAt - a.createdAt),
    paymentCount: payments.length,
  }
}

export function getLedgerInsights(ledgers) {
  const insights = []
  const active = ledgers.filter((l) => l.status === LEDGER_STATUS.ACTIVE)

  const totalPayable = active.filter((l) => l.type === 'borrowed').reduce((s, l) => s + l.currentBalance, 0)
  if (totalPayable > 0) {
    insights.push(`You still owe ${formatAmount(totalPayable)}.`)
  }

  const totalReceivable = active.filter((l) => l.type === 'lent').reduce((s, l) => s + l.currentBalance, 0)
  if (totalReceivable > 0) {
    insights.push(`You are owed ${formatAmount(totalReceivable)}.`)
  }

  active.forEach((l) => {
    const paid = l.originalAmount - l.currentBalance
    const pct = l.originalAmount > 0 ? Math.round((paid / l.originalAmount) * 100) : 0
    if (pct > 0 && pct < 100) {
      insights.push(`${l.personName} has repaid ${pct}%.`)
    } else if (pct === 0) {
      insights.push(`${l.personName} has not started repaying yet.`)
    }
  })

  const borrowedCount = active.filter((l) => l.type === 'borrowed').length
  if (borrowedCount > 0) {
    insights.push(`${borrowedCount} active borrow record${borrowedCount > 1 ? 's' : ''} remain.`)
  }

  return insights
}

function formatAmount(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`
  return `₹${Math.round(n)}`
}

export function searchLedgers(ledgers, query) {
  if (!query || !query.trim()) return ledgers
  const q = query.toLowerCase().trim()
  return ledgers.filter((l) => l.personName.toLowerCase().includes(q))
}

export function filterLedgers(ledgers, filters) {
  let result = [...ledgers]
  if (filters.type && filters.type !== 'all') {
    result = result.filter((l) => l.type === filters.type)
  }
  if (filters.status && filters.status !== 'all') {
    result = result.filter((l) => l.status === filters.status)
  }
  return result
}

export const SORT_OPTIONS = {
  NAME_ASC: 'name-asc',
  NAME_DESC: 'name-desc',
  AMOUNT_ASC: 'amount-asc',
  AMOUNT_DESC: 'amount-desc',
  DATE_ASC: 'date-asc',
  DATE_DESC: 'date-desc',
  BALANCE_ASC: 'balance-asc',
  BALANCE_DESC: 'balance-desc',
}

export function sortLedgers(ledgers, sortKey) {
  const result = [...ledgers]
  switch (sortKey) {
    case SORT_OPTIONS.NAME_ASC:
      return result.sort((a, b) => a.personName.localeCompare(b.personName))
    case SORT_OPTIONS.NAME_DESC:
      return result.sort((a, b) => b.personName.localeCompare(a.personName))
    case SORT_OPTIONS.AMOUNT_ASC:
      return result.sort((a, b) => a.originalAmount - b.originalAmount)
    case SORT_OPTIONS.AMOUNT_DESC:
      return result.sort((a, b) => b.originalAmount - a.originalAmount)
    case SORT_OPTIONS.DATE_ASC:
      return result.sort((a, b) => a.createdDate - b.createdDate)
    case SORT_OPTIONS.DATE_DESC:
      return result.sort((a, b) => b.createdDate - a.createdDate)
    case SORT_OPTIONS.BALANCE_ASC:
      return result.sort((a, b) => a.currentBalance - b.currentBalance)
    case SORT_OPTIONS.BALANCE_DESC:
      return result.sort((a, b) => b.currentBalance - a.currentBalance)
    default:
      return result.sort((a, b) => b.createdDate - a.createdDate)
  }
}

export function generateLedgerExportData(ledger) {
  const statement = getLedgerStatement(ledger)
  if (!statement) return null
  return {
    personName: statement.personName,
    type: statement.type === 'lent' ? 'Lent' : 'Borrowed',
    originalAmount: statement.originalAmount,
    totalPaid: statement.totalPaid,
    currentBalance: statement.currentBalance,
    progress: statement.progress,
    status: statement.status === 'settled' ? 'Settled' : 'Active',
    paymentCount: statement.paymentCount,
    payments: statement.payments,
    createdDate: new Date(statement.createdDate).toISOString().split('T')[0],
    settlementDate: statement.settlementDate ? new Date(statement.settlementDate).toISOString().split('T')[0] : null,
  }
}

function isLegacyDebt(debt) {
  return debt && debt.originalAmount === undefined
}

export function isLedger(debt) {
  if (!debt) return false
  return debt.originalAmount !== undefined
}
