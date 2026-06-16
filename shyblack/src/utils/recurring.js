import { safeStorage, STORAGE_KEYS } from './safeStorage'

export function getRecurringTransactions() {
  return safeStorage.get(STORAGE_KEYS.RECURRING, [])
}

export function saveRecurringTransactions(recurring) {
  safeStorage.set(STORAGE_KEYS.RECURRING, recurring)
}

export function addRecurringTransaction(item) {
  const recurring = getRecurringTransactions()
  const newItem = { ...item, id: Date.now().toString(36) + Math.random().toString(36).substring(2) }
  recurring.push(newItem)
  saveRecurringTransactions(recurring)
  return newItem
}

export function removeRecurringTransaction(id) {
  const recurring = getRecurringTransactions().filter((r) => r.id !== id)
  saveRecurringTransactions(recurring)
}

export function getDueRecurringTransactions(recurring) {
  const now = new Date()
  const due = []
  recurring.forEach((r) => {
    if (!r.nextDate || r.active === false) return
    const next = new Date(r.nextDate)
    if (next <= now) due.push(r)
  })
  return due
}

export function advanceNextDate(dateStr, frequency) {
  const d = new Date(dateStr)
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1) // monthly is default
  return d.toISOString().split('T')[0]
}

export function getSubscriptionSummary(recurring) {
  const subs = recurring.filter((r) => r.type === 'expense')
  const totalMonthly = subs.reduce((s, r) => {
    if (r.frequency === 'monthly') return s + r.amount
    if (r.frequency === 'yearly') return s + (r.amount / 12)
    if (r.frequency === 'weekly') return s + (r.amount * 4.33)
    return s
  }, 0)
  return {
    count: subs.length,
    totalMonthly: Math.round(totalMonthly),
    activeSubs: subs.filter((r) => r.active !== false).length,
  }
}
