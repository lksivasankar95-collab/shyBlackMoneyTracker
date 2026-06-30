import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const BILL_TYPES = [
  { id: 'electricity', label: 'Electricity', icon: 'Zap' },
  { id: 'internet', label: 'Internet', icon: 'Wifi' },
  { id: 'mobile', label: 'Mobile Recharge', icon: 'Smartphone' },
  { id: 'water', label: 'Water', icon: 'Droplets' },
  { id: 'gas', label: 'Gas', icon: 'Flame' },
  { id: 'insurance', label: 'Insurance', icon: 'Shield' },
  { id: 'credit_card', label: 'Credit Card', icon: 'CreditCard' },
  { id: 'loan_emi', label: 'Loan EMI', icon: 'Banknote' },
  { id: 'custom', label: 'Custom Bill', icon: 'Receipt' },
]

const BILLS_KEY = 'shyblack_bills'

export function getBills() {
  return safeStorage.get(BILLS_KEY, [])
}

export function saveBills(bills) {
  safeStorage.set(BILLS_KEY, bills)
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function addBill(data) {
  const bills = getBills()
  const bill = {
    id: generateId(),
    type: data.type || 'custom',
    name: data.name || '',
    amount: Number(data.amount) || 0,
    dueDate: data.dueDate || todayStr(),
    recurring: data.recurring || false,
    reminderDays: data.reminderDays != null ? data.reminderDays : 3,
    notes: data.notes || '',
    paidDates: [],
    active: data.active !== false,
    createdAt: Date.now(),
  }
  bills.push(bill)
  saveBills(bills)
  return bill
}

export function updateBill(id, updates) {
  const bills = getBills()
  const idx = bills.findIndex((b) => b.id === id)
  if (idx === -1) return null
  bills[idx] = { ...bills[idx], ...updates, id: bills[idx].id }
  saveBills(bills)
  return bills[idx]
}

export function deleteBill(id) {
  const bills = getBills().filter((b) => b.id !== id)
  saveBills(bills)
}

export function markBillPaid(id, date) {
  const bills = getBills()
  const idx = bills.findIndex((b) => b.id === id)
  if (idx === -1) return null
  const paidDate = date || todayStr()
  if (!bills[idx].paidDates.includes(paidDate)) {
    bills[idx].paidDates.push(paidDate)
  }
  saveBills(bills)
  return bills[idx]
}

export function isBillPaidForDate(bill, dateStr) {
  return bill.paidDates.includes(dateStr || todayStr())
}

export function getUpcomingBills(bills, days = 30) {
  const now = new Date()
  const today = todayStr()
  const future = new Date(now)
  future.setDate(future.getDate() + days)
  const futureStr = future.toISOString().split('T')[0]

  return bills.filter((b) => {
    if (!b.active) return false
    if (isBillPaidForDate(b, b.dueDate)) return false
    const due = b.dueDate
    return due >= today && due <= futureStr
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getOverdueBills(bills) {
  const today = todayStr()
  return bills.filter((b) => {
    if (!b.active) return false
    if (isBillPaidForDate(b, b.dueDate)) return false
    return b.dueDate < today
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getBillsDueToday(bills) {
  const today = todayStr()
  return bills.filter((b) => {
    if (!b.active) return false
    if (isBillPaidForDate(b, today)) return false
    return b.dueDate === today
  })
}

export function getBillStats(bills) {
  const active = bills.filter((b) => b.active)
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const paidThisMonth = bills.filter((b) =>
    b.paidDates.some((d) => d.startsWith(thisMonth))
  )
  const overdue = getOverdueBills(bills)
  const upcoming = getUpcomingBills(bills, 30)
  const totalAmount = active.reduce((s, b) => s + b.amount, 0)

  return {
    total: active.length,
    paid: paidThisMonth.length,
    unpaid: active.length - paidThisMonth.length,
    overdue: overdue.length,
    upcoming: upcoming.length,
    upcomingAmount: upcoming.reduce((s, b) => s + b.amount, 0),
    totalAmount,
  }
}

export async function scheduleBillNotifications(bills) {
  const { sendNotification, checkNotificationPermission, NOTIF_TYPES } = await import('./notifications')
  const perm = await checkNotificationPermission()
  if (!perm.granted) return { scheduled: false, reason: 'permission-denied' }

  const overdue = getOverdueBills(bills)
  const dueToday = getBillsDueToday(bills)
  const upcoming = getUpcomingBills(bills, 3)

  let count = 0
  for (const bill of overdue) {
    const id = await sendNotification(NOTIF_TYPES.BILL_REMINDER, {
      id: 800000 + count,
      body: `Overdue: ${bill.name} - ₹${bill.amount.toLocaleString()}`,
      iconColor: '#DC2626',
      schedule: { at: new Date(Date.now() + 3000 + count * 1000), allowWhileIdle: true },
    })
    if (id) count++
  }

  for (const bill of dueToday) {
    const id = await sendNotification(NOTIF_TYPES.BILL_REMINDER, {
      id: 800100 + count,
      body: `Due Today: ${bill.name} - ₹${bill.amount.toLocaleString()}`,
      iconColor: '#F97316',
      schedule: { at: new Date(Date.now() + 3000 + count * 1000), allowWhileIdle: true },
    })
    if (id) count++
  }

  for (const bill of upcoming) {
    const id = await sendNotification(NOTIF_TYPES.BILL_REMINDER, {
      id: 800200 + count,
      body: `Due Soon: ${bill.name} - ₹${bill.amount.toLocaleString()} on ${new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      iconColor: '#39FF14',
      schedule: { at: new Date(Date.now() + 3000 + count * 1000), allowWhileIdle: true },
    })
    if (id) count++
  }

  return { scheduled: count > 0, count }
}
