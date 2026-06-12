import { storage, keys } from './storage'

export function getRecurringTransactions() {
  return storage.get(keys.RECURRING, [])
}

export function saveRecurringTransactions(recurring) {
  storage.set(keys.RECURRING, recurring)
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
    if (!r.nextDate) return
    const next = new Date(r.nextDate)
    if (next <= now) {
      due.push(r)
    }
  })
  return due
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
