import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

const EMI_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
}

export { EMI_STATUS }

export function getEmis() {
  return safeStorage.get(STORAGE_KEYS.EMI, [])
}

export function saveEmis(emis) {
  return safeStorage.set(STORAGE_KEYS.EMI, emis)
}

export function createEmi(data) {
  return {
    id: generateId(),
    name: data.name.trim(),
    amount: Math.abs(data.amount) || 0,
    dueDay: Math.min(31, Math.max(1, parseInt(data.dueDay, 10) || 1)),
    tenure: Math.abs(parseInt(data.tenure, 10) || 12),
    remainingMonths: Math.abs(parseInt(data.tenure, 10) || 12),
    lender: (data.lender || '').trim(),
    contactName: (data.contactName || '').trim(),
    phoneNumber: (data.phoneNumber || '').trim(),
    reminderTimes: Array.isArray(data.reminderTimes) ? data.reminderTimes : ['07:00', '08:00', '09:00'],
    notes: (data.notes || '').trim(),
    status: EMI_STATUS.ACTIVE,
    closedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastPaidDate: null,
    totalPaidCount: 0,
    paymentHistory: [],
  }
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getEmiDueDate(dueDay, referenceDate) {
  const now = referenceDate || new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const clampedDay = Math.min(dueDay, daysInMonth)
  return new Date(year, month, clampedDay)
}

export function getNextEmiDueDate(dueDay, referenceDate) {
  const now = referenceDate || new Date()
  const currentDue = getEmiDueDate(dueDay, now)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (currentDue >= today) return currentDue

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return getEmiDueDate(dueDay, nextMonth)
}

export function isPaidThisMonth(emi, year, month) {
  if (!emi.paymentHistory || emi.paymentHistory.length === 0) return false
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  return emi.paymentHistory.some((p) => p.date.startsWith(prefix))
}

export function getEmiSummary(emis) {
  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const todayStr = now.toISOString().split('T')[0]

  const upcomingEmis = active
    .map((emi) => {
      const dueDate = getNextEmiDueDate(emi.dueDay, now)
      const paidThisMonth = isPaidThisMonth(emi, currentYear, currentMonth)
      return { ...emi, dueDate, paidThisMonth }
    })
    .filter((e) => !e.paidThisMonth && e.dueDate)
    .sort((a, b) => {
      const aTime = a.dueDate instanceof Date ? a.dueDate.getTime() : new Date(a.dueDate).getTime()
      const bTime = b.dueDate instanceof Date ? b.dueDate.getTime() : new Date(b.dueDate).getTime()
      return aTime - bTime
    })

  const paidThisMonth = active.filter((e) => isPaidThisMonth(e, currentYear, currentMonth)).length

  const missedCount = active.filter((e) => {
    const dueDate = getEmiDueDate(e.dueDay, now)
    const paid = isPaidThisMonth(e, currentYear, currentMonth)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return dueDate < today && !paid
  }).length

  return {
    totalMonthly: active.reduce((sum, e) => sum + e.amount, 0),
    totalActive: active.length,
    highestEmi: active.length ? Math.max(...active.map((e) => e.amount)) : 0,
    upcomingEmis: upcomingEmis.slice(0, 10),
    upcomingCount: upcomingEmis.length,
    paidThisMonth,
    missedCount,
    remainingLiability: active.reduce((sum, e) => sum + e.amount * e.remainingMonths, 0),
    totalRemainingMonths: active.reduce((sum, e) => sum + e.remainingMonths, 0),
  }
}
