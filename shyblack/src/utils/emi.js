import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export const EMI_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DEFAULTED: 'defaulted',
  CLOSED: 'closed',
  PAUSED: 'paused',
}

export function getEmis() {
  return safeStorage.get(STORAGE_KEYS.EMIS, [])
}

export function saveEmis(emis) {
  safeStorage.set(STORAGE_KEYS.EMIS, emis)
}

export function createEmi({ name, totalAmount, amount, totalMonths, startDate, category, notes }) {
  const emis = getEmis()
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
    interestRate: 0,
    interestPaid: 0,
    principalPaid: 0,
    status: EMI_STATUS.ACTIVE,
    notes: (notes || '').trim(),
    payments: [],
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
  if (emi.status === EMI_STATUS.COMPLETED) {
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
  const start = new Date(emi.startDate)
  const paid = emi.totalPaidCount || 0
  const nextDue = new Date(start.getFullYear(), start.getMonth() + paid, start.getDate())
  if (nextDue.getDate() !== start.getDate()) {
    nextDue.setDate(0)
  }
  return nextDue.toISOString().split('T')[0]
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

export function getEmiAmortizationSchedule(emi) {
  const schedule = []
  const monthlyRate = emi.interestRate / 100 / 12
  let balance = emi.totalAmount
  let month = emi.totalPaidCount + 1

  for (let i = 0; i < emi.remainingMonths; i++) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0
    const principal = Math.min(emi.amount - interest, balance)
    balance -= principal

    schedule.push({
      month: month + i,
      payment: emi.amount,
      principal: Math.max(0, principal),
      interest,
      balance: Math.max(0, balance),
    })

    if (balance <= 0) break
  }

  return schedule
}
