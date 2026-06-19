import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export const EMI_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DEFAULTED: 'defaulted',
  CLOSED: 'closed',
  PAUSED: 'paused',
}

export const FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALF_YEARLY: 'half-yearly',
  YEARLY: 'yearly',
}

export const FREQUENCY_OPTIONS = [
  { value: FREQUENCIES.DAILY, label: 'Daily' },
  { value: FREQUENCIES.WEEKLY, label: 'Weekly' },
  { value: FREQUENCIES.MONTHLY, label: 'Monthly' },
  { value: FREQUENCIES.QUARTERLY, label: 'Quarterly' },
  { value: FREQUENCIES.HALF_YEARLY, label: 'Half-Yearly' },
  { value: FREQUENCIES.YEARLY, label: 'Yearly' },
]

export function getFrequencyLabel(frequency) {
  const found = FREQUENCY_OPTIONS.find((f) => f.value === frequency)
  return found ? found.label : 'Monthly'
}

export function getEmis() {
  return safeStorage.get(STORAGE_KEYS.EMIS, [])
}

export function saveEmis(emis) {
  safeStorage.set(STORAGE_KEYS.EMIS, emis)
}

function addMonths(date, count) {
  const result = new Date(date)
  const day = result.getDate()
  result.setMonth(result.getMonth() + count)
  if (result.getDate() !== day) {
    result.setDate(0)
  }
  return result
}

function addDays(date, count) {
  const result = new Date(date)
  result.setDate(result.getDate() + count)
  return result
}

export function calculateNextDueDate(startDate, paidInstallments, frequency) {
  if (!startDate) return null
  const start = new Date(startDate)
  const paid = paidInstallments || 0

  switch (frequency) {
    case FREQUENCIES.DAILY:
      return addDays(start, paid).toISOString().split('T')[0]
    case FREQUENCIES.WEEKLY:
      return addDays(start, paid * 7).toISOString().split('T')[0]
    case FREQUENCIES.MONTHLY:
      return addMonths(start, paid).toISOString().split('T')[0]
    case FREQUENCIES.QUARTERLY:
      return addMonths(start, paid * 3).toISOString().split('T')[0]
    case FREQUENCIES.HALF_YEARLY:
      return addMonths(start, paid * 6).toISOString().split('T')[0]
    case FREQUENCIES.YEARLY:
      return addMonths(start, paid * 12).toISOString().split('T')[0]
    default:
      return addMonths(start, paid).toISOString().split('T')[0]
  }
}

export function createEmi({ name, totalAmount, amount, totalMonths, startDate, category, notes, frequency, lender }) {
  const emis = getEmis()
  const freq = frequency || FREQUENCIES.MONTHLY
  const emi = {
    id: generateId(),
    name: (name || '').trim(),
    totalAmount: Math.abs(totalAmount || 0),
    amount: Math.abs(amount || 0),
    totalMonths: Math.abs(totalMonths || 0),
    remainingMonths: Math.abs(totalMonths || 0),
    totalPaidCount: 0,
    totalPaid: 0,
    remainingAmount: Math.abs(totalAmount || 0),
    startDate: startDate || new Date().toISOString().split('T')[0],
    category: category || 'Other',
    frequency: freq,
    interestRate: 0,
    interestPaid: 0,
    principalPaid: 0,
    status: EMI_STATUS.ACTIVE,
    notes: (notes || '').trim(),
    payments: [],
    paymentHistory: [],
    lender: lender || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  emis.push(emi)
  saveEmis(emis)
  return emi
}

export function recordEmiPayment(emiId, extraAmount = 0) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === emiId)
  if (idx === -1) return { success: false, error: 'EMI not found' }

  const emi = { ...emis[idx] }
  if (emi.status === EMI_STATUS.COMPLETED || emi.status === EMI_STATUS.CLOSED) {
    return { success: false, error: 'EMI already completed' }
  }

  const paymentAmount = emi.amount + extraAmount
  const now = Date.now()
  const payment = {
    id: generateId(),
    amount: paymentAmount,
    principal: emi.amount - (emi.interestRate / 100 / 12) * emi.remainingAmount,
    interest: (emi.interestRate / 100 / 12) * emi.remainingAmount,
    extraAmount,
    date: new Date().toISOString().split('T')[0],
    timestamp: now,
  }

  emi.totalPaid += paymentAmount
  emi.totalPaidCount += 1
  emi.remainingMonths = Math.max(0, emi.totalMonths - emi.totalPaidCount)
  emi.remainingAmount = Math.max(0, emi.totalAmount - emi.totalPaid)
  emi.interestPaid += payment.interest
  emi.principalPaid += payment.principal
  emi.payments.push(payment)
  emi.updatedAt = now

  if (emi.remainingAmount <= 0 || emi.remainingMonths <= 0) {
    emi.status = EMI_STATUS.COMPLETED
    emi.remainingAmount = 0
    emi.remainingMonths = 0
  }

  emis[idx] = emi
  saveEmis(emis)
  return { success: true, emi: emi, payment }
}

export function undoPayment(emiId) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === emiId)
  if (idx === -1) return { success: false, error: 'EMI not found' }

  const emi = { ...emis[idx] }
  const paymentHistory = emi.paymentHistory || []
  const payments = emi.payments || []
  const lastFromHistory = paymentHistory[paymentHistory.length - 1]
  const lastFromPayments = payments[payments.length - 1]
  const lastPayment = lastFromHistory || lastFromPayments
  if (!lastPayment) return { success: false, error: 'No payments to undo' }

  const undoAmount = lastPayment.amount || emi.amount
  emi.totalPaidCount = Math.max(0, emi.totalPaidCount - 1)
  emi.totalPaid = Math.max(0, emi.totalPaid - undoAmount)
  emi.remainingMonths = Math.min(emi.totalMonths, emi.totalMonths - emi.totalPaidCount)
  emi.remainingAmount = Math.max(0, emi.totalAmount - emi.totalPaid)
  if (lastFromHistory) {
    emi.paymentHistory = paymentHistory.slice(0, -1)
  }
  if (lastFromPayments && !lastFromHistory) {
    emi.payments = payments.slice(0, -1)
  }
  emi.status = EMI_STATUS.ACTIVE
  emi.updatedAt = Date.now()

  emis[idx] = emi
  saveEmis(emis)
  return { success: true, emi }
}

export function getEmiSummary(emis) {
  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const completed = emis.filter((e) => e.status === EMI_STATUS.COMPLETED)
  const totalMonthly = active.reduce((sum, e) => sum + e.amount, 0)
  const totalRemaining = active.reduce((sum, e) => sum + e.remainingAmount, 0)
  const totalPaid = emis.reduce((sum, e) => sum + e.totalPaid, 0)

  return {
    totalActive: active.length,
    totalCompleted: completed.length,
    totalMonthly,
    totalRemaining,
    totalPaid,
  }
}

export function getEmiDueDate(emi) {
  if (!emi || !emi.startDate) return null
  return calculateNextDueDate(emi.startDate, emi.totalPaidCount || 0, emi.frequency || FREQUENCIES.MONTHLY)
}

export function getNextEmiDueDate(dueDay, referenceDate) {
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const candidate = new Date(year, month, dueDay)
  if (candidate <= ref) {
    candidate.setMonth(candidate.getMonth() + 1)
  }
  return candidate.toISOString().split('T')[0]
}

export function getEnhancedEmiSummary(emis) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const completed = emis.filter((e) => e.status === EMI_STATUS.COMPLETED || e.status === EMI_STATUS.CLOSED)
  const paused = emis.filter((e) => e.status === EMI_STATUS.PAUSED)

  const withDueInfo = active.map((emi) => {
    const nextDue = getEmiDueDate(emi)
    const dueDate = nextDue ? new Date(nextDue + 'T00:00:00') : null
    const diffDays = dueDate ? Math.ceil((dueDate - today) / 86400000) : null

    return {
      ...emi,
      nextDueDate: nextDue,
      dueInDays: diffDays,
      isOverdue: diffDays !== null && diffDays < 0,
      isDueToday: diffDays === 0,
      isDueTomorrow: diffDays === 1,
      isDueWithin7: diffDays !== null && diffDays >= 0 && diffDays <= 7,
      completionPercentage: emi.totalAmount > 0
        ? Math.round((emi.totalPaid / emi.totalAmount) * 100) : 0,
      remainingBalance: Math.max(0, emi.totalAmount - emi.totalPaid),
      remainingInstallments: Math.max(0, emi.totalMonths - emi.totalPaidCount),
    }
  })

  const dueToday = withDueInfo.filter((e) => e.isDueToday)
  const dueTomorrow = withDueInfo.filter((e) => e.isDueTomorrow)
  const dueWithin7 = withDueInfo.filter((e) => e.isDueWithin7)
  const overdue = withDueInfo.filter((e) => e.isOverdue)
  const upcoming = withDueInfo.filter((e) => !e.isOverdue && !e.isDueToday)

  const totalInstallmentAmount = active.reduce((sum, e) => sum + e.amount, 0)
  const totalRemaining = active.reduce((sum, e) => sum + Math.max(0, e.totalAmount - e.totalPaid), 0)
  const totalPaid = emis.reduce((sum, e) => sum + e.totalPaid, 0)

  return {
    totalActive: active.length,
    totalCompleted: completed.length,
    totalPaused: paused.length,
    totalInstallmentAmount,
    totalRemaining,
    totalPaid,
    dueToday,
    dueTomorrow,
    dueWithin7,
    overdue,
    upcoming,
    activeWithDue: withDueInfo,
  }
}

export function getEmiAmortizationSchedule(emi) {
  const schedule = []
  const monthlyRate = emi.interestRate / 100 / 12
  let balance = emi.totalAmount
  let installment = emi.totalPaidCount + 1

  for (let i = 0; i < emi.remainingMonths; i++) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0
    const principal = Math.min(emi.amount - interest, balance)
    balance -= principal

    schedule.push({
      month: installment + i,
      payment: emi.amount,
      principal: Math.max(0, principal),
      interest,
      balance: Math.max(0, balance),
    })

    if (balance <= 0) break
  }

  return schedule
}
