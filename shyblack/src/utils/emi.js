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

export const LOAN_TYPES = [
  { id: 'personal', label: 'Personal Loan' },
  { id: 'home', label: 'Home Loan' },
  { id: 'car', label: 'Car Loan' },
  { id: 'education', label: 'Education Loan' },
  { id: 'business', label: 'Business Loan' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'other', label: 'Other' },
]

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

export function calculateEMI(principal, annualRate, tenureMonths) {
  if (!principal || principal <= 0 || !tenureMonths || tenureMonths <= 0) {
    return { emi: 0, totalInterest: 0, totalPayment: 0 }
  }
  const rate = (annualRate || 0) / 100 / 12
  if (rate === 0) {
    const emi = principal / tenureMonths
    return { emi: Math.round(emi), totalInterest: 0, totalPayment: principal }
  }
  const factor = Math.pow(1 + rate, tenureMonths)
  const emi = principal * rate * factor / (factor - 1)
  const totalPayment = emi * tenureMonths
  const totalInterest = totalPayment - principal
  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
  }
}

export function migrateFromOldStorage() {
  const oldData = safeStorage.get(STORAGE_KEYS.EMIS, null)
  const newData = safeStorage.get(STORAGE_KEYS.EMI_TRACKER, null)
  if (newData !== null) return false
  if (oldData === null || !Array.isArray(oldData)) return false
  const migrated = oldData.map((item) => normalizeEmiItem(item))
  safeStorage.set(STORAGE_KEYS.EMI_TRACKER, migrated)
  return true
}

export function normalizeEmiItem(item) {
  const loanName = item.loanName || item.name || ''
  return {
    id: item.id || generateId(),
    name: loanName,
    loanName,
    lenderName: item.lenderName || item.lender || '',
    loanType: item.loanType || item.category || 'other',
    principalAmount: item.principalAmount || item.totalAmount || 0,
    interestRate: item.interestRate || 0,
    tenureMonths: item.tenureMonths || item.totalMonths || 0,
    emiAmount: item.emiAmount || item.amount || 0,
    startDate: item.startDate || new Date().toISOString().split('T')[0],
    nextDueDate: item.nextDueDate || calculateNextDueDate(
      item.startDate || new Date().toISOString().split('T')[0],
      item.totalPaidCount || 0,
      item.frequency || FREQUENCIES.MONTHLY
    ),
    remainingAmount: item.remainingAmount ?? (item.totalAmount || 0) - (item.totalPaid || 0),
    remainingMonths: item.remainingMonths ?? (item.tenureMonths || item.totalMonths || 0) - (item.totalPaidCount || 0),
    totalPaid: item.totalPaid || 0,
    totalInterestPaid: item.totalInterestPaid || item.interestPaid || 0,
    totalPaidCount: item.totalPaidCount || 0,
    frequency: item.frequency || FREQUENCIES.MONTHLY,
    payments: item.payments || item.paymentHistory || [],
    status: item.status || EMI_STATUS.ACTIVE,
    notes: item.notes || '',
    createdAt: item.createdAt || Date.now(),
    updatedAt: Date.now(),
  }
}

export function getEmis() {
  migrateFromOldStorage()
  return safeStorage.get(STORAGE_KEYS.EMI_TRACKER, [])
}

export function saveEmis(emis) {
  safeStorage.set(STORAGE_KEYS.EMI_TRACKER, emis)
  safeStorage.set(STORAGE_KEYS.EMIS, emis.map(normalizeEmiItem))
}

export function getFrequencyLabel(frequency) {
  const found = FREQUENCY_OPTIONS.find((f) => f.value === frequency)
  return found ? found.label : 'Monthly'
}

export function getLoanTypeLabel(loanType) {
  const found = LOAN_TYPES.find((t) => t.id === loanType)
  return found ? found.label : loanType || 'Other'
}

export function createEmi(data) {
  const emis = getEmis()
  const calc = calculateEMI(
    data.principalAmount || data.totalAmount || 0,
    data.interestRate || 0,
    data.tenureMonths || data.totalMonths || 0
  )
  const freq = data.frequency || FREQUENCIES.MONTHLY
  const principal = data.principalAmount || data.totalAmount || 0
  const emiAmt = data.emiAmount || data.amount || calc.emi || 0
  const tenure = data.tenureMonths || data.totalMonths || 0
  const startDate = data.startDate || new Date().toISOString().split('T')[0]
  const loanName = (data.loanName || data.name || '').trim()
  const lenderName = (data.lenderName || data.lender || '').trim()
  const emi = {
    id: generateId(),
    name: loanName,
    loanName,
    amount: Math.abs(emiAmt),
    totalAmount: Math.abs(principal),
    totalMonths: Math.abs(tenure),
    lender: lenderName,
    lenderName,
    loanType: data.loanType || data.category || 'other',
    principalAmount: Math.abs(principal),
    interestRate: Math.abs(data.interestRate || 0),
    tenureMonths: Math.abs(tenure),
    emiAmount: Math.abs(emiAmt),
    startDate,
    nextDueDate: calculateNextDueDate(startDate, 0, freq),
    remainingAmount: Math.abs(principal),
    remainingMonths: Math.abs(tenure),
    totalPaid: 0,
    totalInterestPaid: 0,
    totalPaidCount: 0,
    frequency: freq,
    payments: [],
    status: EMI_STATUS.ACTIVE,
    notes: (data.notes || '').trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  emis.push(emi)
  saveEmis(emis)
  return emi
}

export function updateEmi(id, updates) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === id)
  if (idx === -1) return null
  const updated = {
    ...emis[idx],
    ...updates,
    id: emis[idx].id,
    updatedAt: Date.now(),
  }
  if (updates.loanName) updated.loanName = updates.loanName
  if (updates.lenderName) updated.lenderName = updates.lenderName
  emis[idx] = updated
  saveEmis(emis)
  return updated
}

export function deleteEmi(id) {
  const emis = getEmis().filter((e) => e.id !== id)
  saveEmis(emis)
}

export function closeEmi(id) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === id)
  if (idx === -1) return null
  emis[idx] = { ...emis[idx], status: EMI_STATUS.CLOSED, remainingAmount: 0, remainingMonths: 0, updatedAt: Date.now() }
  saveEmis(emis)
  return emis[idx]
}

export function reopenEmi(id) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === id)
  if (idx === -1) return null
  if (emis[idx].status !== EMI_STATUS.CLOSED) return emis[idx]
  const originalRemaining = emis[idx].principalAmount - emis[idx].totalPaid
  const originalRemainingMonths = emis[idx].tenureMonths - emis[idx].totalPaidCount
  emis[idx] = {
    ...emis[idx],
    status: EMI_STATUS.ACTIVE,
    remainingAmount: Math.max(0, originalRemaining),
    remainingMonths: Math.max(0, originalRemainingMonths),
    updatedAt: Date.now(),
  }
  saveEmis(emis)
  return emis[idx]
}

export function recordEmiPayment(emiId, extraAmount = 0) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === emiId)
  if (idx === -1) return { success: false, error: 'EMI not found' }

  const emi = { ...emis[idx] }
  if (emi.status === EMI_STATUS.COMPLETED || emi.status === EMI_STATUS.CLOSED) {
    return { success: false, error: 'EMI already completed' }
  }

  const paymentAmount = emi.emiAmount + extraAmount
  const now = Date.now()
  const monthlyRate = emi.interestRate / 100 / 12
  const interest = monthlyRate > 0 ? Math.round(emi.remainingAmount * monthlyRate) : 0
  const principal = Math.min(paymentAmount - interest, emi.remainingAmount)

  const payment = {
    id: generateId(),
    paymentId: generateId(),
    emiId,
    amount: paymentAmount,
    principal: Math.max(0, principal),
    interest: Math.max(0, interest),
    extraAmount,
    date: new Date().toISOString().split('T')[0],
    paymentDate: new Date().toISOString().split('T')[0],
    timestamp: now,
    notes: `EMI payment for ${emi.loanName}`,
  }

  emi.totalPaid += paymentAmount
  emi.totalPaidCount += 1
  emi.remainingMonths = Math.max(0, emi.tenureMonths - emi.totalPaidCount)
  emi.remainingAmount = Math.max(0, emi.remainingAmount - principal)
  emi.totalInterestPaid += interest
  emi.payments.push(payment)
  emi.updatedAt = now

  if (emi.remainingAmount <= 0 || emi.remainingMonths <= 0) {
    emi.status = EMI_STATUS.COMPLETED
    emi.remainingAmount = 0
    emi.remainingMonths = 0
  }

  emi.nextDueDate = calculateNextDueDate(emi.startDate, emi.totalPaidCount, emi.frequency)

  emis[idx] = emi
  saveEmis(emis)
  return { success: true, emi, payment }
}

export function undoPayment(emiId) {
  const emis = getEmis()
  const idx = emis.findIndex((e) => e.id === emiId)
  if (idx === -1) return { success: false, error: 'EMI not found' }

  const emi = { ...emis[idx] }
  const payments = emi.payments || []
  const lastPayment = payments[payments.length - 1]
  if (!lastPayment) return { success: false, error: 'No payments to undo' }

  const undoAmount = lastPayment.amount || emi.emiAmount
  emi.totalPaidCount = Math.max(0, emi.totalPaidCount - 1)
  emi.totalPaid = Math.max(0, emi.totalPaid - undoAmount)
  emi.remainingMonths = Math.min(emi.tenureMonths, emi.tenureMonths - emi.totalPaidCount)
  emi.remainingAmount = Math.max(0, emi.principalAmount - emi.totalPaid)
  emi.totalInterestPaid = Math.max(0, emi.totalInterestPaid - (lastPayment.interest || 0))
  emi.payments = payments.slice(0, -1)
  emi.status = EMI_STATUS.ACTIVE
  emi.nextDueDate = calculateNextDueDate(emi.startDate, emi.totalPaidCount, emi.frequency)
  emi.updatedAt = Date.now()

  emis[idx] = emi
  saveEmis(emis)
  return { success: true, emi }
}

export function getEmiSummary(emis) {
  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const completed = emis.filter((e) => e.status === EMI_STATUS.COMPLETED || e.status === EMI_STATUS.CLOSED)
  const totalMonthly = active.reduce((sum, e) => sum + (e.emiAmount || e.amount || 0), 0)
  const totalRemaining = active.reduce((sum, e) => sum + (e.remainingAmount || 0), 0)
  const totalPaid = emis.reduce((sum, e) => sum + (e.totalPaid || 0), 0)

  return {
    totalActive: active.length,
    totalCompleted: completed.length,
    totalMonthly,
    totalRemaining,
    totalPaid,
  }
}

export function getEmiDueDate(emi) {
  if (!emi) return null
  return emi.nextDueDate || calculateNextDueDate(
    emi.startDate,
    emi.totalPaidCount || 0,
    emi.frequency || FREQUENCIES.MONTHLY
  )
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
    const totalPrincipal = emi.principalAmount || 0
    const totalPrincipalPaid = emi.totalPaid - (emi.totalInterestPaid || 0)
    return {
      ...emi,
      nextDueDate: nextDue,
      dueInDays: diffDays,
      isOverdue: diffDays !== null && diffDays < 0,
      isDueToday: diffDays === 0,
      isDueTomorrow: diffDays === 1,
      isDueWithin7: diffDays !== null && diffDays >= 0 && diffDays <= 7,
      completionPercentage: totalPrincipal > 0
        ? Math.round((totalPrincipalPaid / totalPrincipal) * 100) : 0,
      remainingBalance: Math.max(0, emi.remainingAmount || 0),
      remainingInstallments: Math.max(0, emi.remainingMonths || 0),
    }
  })

  const dueToday = withDueInfo.filter((e) => e.isDueToday)
  const dueTomorrow = withDueInfo.filter((e) => e.isDueTomorrow)
  const dueWithin7 = withDueInfo.filter((e) => e.isDueWithin7)
  const overdue = withDueInfo.filter((e) => e.isOverdue)
  const upcoming = withDueInfo.filter((e) => !e.isOverdue && !e.isDueToday)

  const totalInstallmentAmount = active.reduce((sum, e) => sum + (e.emiAmount || e.amount || 0), 0)
  const totalRemaining = active.reduce((sum, e) => sum + Math.max(0, e.remainingAmount || 0), 0)
  const totalPaid = emis.reduce((sum, e) => sum + (e.totalPaid || 0), 0)

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
  let balance = emi.principalAmount || emi.totalAmount || 0
  let installment = (emi.totalPaidCount || 0) + 1
  const emiAmt = emi.emiAmount || emi.amount || 0
  const remaining = emi.remainingMonths || 0

  for (let i = 0; i < remaining; i++) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0
    const principal = Math.min(emiAmt - interest, balance)
    balance -= principal
    schedule.push({
      month: installment + i,
      payment: emiAmt,
      principal: Math.max(0, Math.round(principal)),
      interest: Math.round(interest),
      balance: Math.max(0, Math.round(balance)),
    })
    if (balance <= 0) break
  }
  return schedule
}

export function getEmiInsights(emis) {
  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const allPayments = emis.flatMap((e) => (e.payments || []).map((p) => ({ ...p, loanName: e.loanName })))
  const totalOutstanding = active.reduce((s, e) => s + (e.remainingAmount || 0), 0)
  const totalPrincipal = emis.reduce((s, e) => s + (e.principalAmount || 0), 0)
  const totalPaidAll = emis.reduce((s, e) => s + (e.totalPaid || 0), 0)
  const totalInterestPaidAll = emis.reduce((s, e) => s + (e.totalInterestPaid || 0), 0)
  const avgInterestRate = active.length > 0
    ? active.reduce((s, e) => s + (e.interestRate || 0), 0) / active.length
    : 0

  const closureForecasts = active.map((e) => {
    const monthly = e.emiAmount || 0
    const remaining = e.remainingAmount || 0
    const monthsLeft = e.remainingMonths || 0
    const today = new Date()
    const estimatedClosure = new Date(today)
    estimatedClosure.setMonth(estimatedClosure.getMonth() + monthsLeft)
    return {
      loanName: e.loanName,
      remainingAmount: remaining,
      remainingMonths: monthsLeft,
      estimatedClosureDate: estimatedClosure.toISOString().split('T')[0],
      monthlyEMI: monthly,
    }
  })

  return {
    totalActiveLoans: active.length,
    totalOutstanding,
    totalPrincipalAll: totalPrincipal,
    totalPaidAll,
    totalInterestPaidAll,
    avgInterestRate: Math.round(avgInterestRate * 100) / 100,
    debtReductionProgress: totalPrincipal > 0
      ? Math.round(((totalPrincipal - totalOutstanding) / totalPrincipal) * 100)
      : 0,
    totalPaymentsCount: allPayments.length,
    closureForecasts,
  }
}

export function getEmiPaymentHistory(emiId) {
  const emis = getEmis()
  const emi = emis.find((e) => e.id === emiId)
  if (!emi) return []
  return (emi.payments || []).slice().reverse()
}

export function getEmiStatsForDashboard(emis) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const totalOutstanding = active.reduce((s, e) => s + (e.remainingAmount || 0), 0)
  const totalActiveLoans = active.length

  const dueThisMonth = active.filter((e) => {
    const due = getEmiDueDate(e)
    if (!due) return false
    const d = new Date(due + 'T00:00:00')
    return d >= today && d <= thisMonthEnd
  }).length

  const nextDueItems = active
    .map((e) => ({
      ...e,
      nextDueDate: getEmiDueDate(e),
    }))
    .filter((e) => e.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))

  const totalEMIThisMonth = active.reduce((s, e) => s + (e.emiAmount || 0), 0)

  return {
    totalActiveLoans,
    totalOutstanding,
    dueThisMonth,
    totalEMIThisMonth,
    nextDue: nextDueItems.slice(0, 5),
  }
}