import { safeStorage, STORAGE_KEYS } from './safeStorage'

export function getRecurringTransactions() {
  return safeStorage.get(STORAGE_KEYS.RECURRING, [])
}

export function saveRecurringTransactions(recurring) {
  safeStorage.set(STORAGE_KEYS.RECURRING, recurring)
}

export function addRecurringTransaction(item) {
  const recurring = getRecurringTransactions()
  const now = Date.now()
  const newItem = {
    ...item,
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    createdAt: now,
    updatedAt: now,
    nextDate: item.nextRunDate || item.nextDate || item.startDate || new Date().toISOString().split('T')[0],
    frequency: item.recurrenceType || item.frequency || 'monthly',
    active: item.isActive !== undefined ? item.isActive : (item.active !== undefined ? item.active : true),
  }
  recurring.push(newItem)
  saveRecurringTransactions(recurring)
  return newItem
}

export function updateRecurringTransaction(id, updates) {
  const recurring = getRecurringTransactions()
  const idx = recurring.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const updated = {
    ...recurring[idx],
    ...updates,
    id: recurring[idx].id,
    updatedAt: Date.now(),
  }
  if (updates.recurrenceType) updated.frequency = updates.recurrenceType
  if (updates.isActive !== undefined) updated.active = updates.isActive
  if (updates.nextRunDate) updated.nextDate = updates.nextRunDate
  recurring[idx] = updated
  saveRecurringTransactions(recurring)
  return updated
}

export function removeRecurringTransaction(id) {
  const recurring = getRecurringTransactions().filter((r) => r.id !== id)
  saveRecurringTransactions(recurring)
}

export function toggleRecurringTransaction(id) {
  const recurring = getRecurringTransactions()
  const idx = recurring.findIndex((r) => r.id === id)
  if (idx === -1) return null
  recurring[idx] = {
    ...recurring[idx],
    active: !recurring[idx].active,
    isActive: !(recurring[idx].isActive ?? recurring[idx].active ?? true),
    updatedAt: Date.now(),
  }
  saveRecurringTransactions(recurring)
  return recurring[idx]
}

export function getDueRecurringTransactions(recurring) {
  const now = new Date()
  const due = []
  recurring.forEach((r) => {
    const isActive = r.isActive !== undefined ? r.isActive : (r.active !== false)
    if (!r.nextDate || !isActive) return
    const next = new Date(r.nextDate + 'T00:00:00')
    if (next <= now) due.push(r)
  })
  return due
}

export function getUpcomingRecurringTransactions(recurring, count = 5) {
  const now = new Date()
  const upcoming = recurring
    .filter((r) => {
      const isActive = r.isActive !== undefined ? r.isActive : (r.active !== false)
      if (!r.nextDate || !isActive) return false
      const next = new Date(r.nextDate + 'T00:00:00')
      return next > now
    })
    .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate))
    .slice(0, count)
  return upcoming
}

export function advanceNextDate(dateStr, frequency) {
  const d = new Date(dateStr)
  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1)
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (frequency === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    const origDay = d.getDate()
    d.setMonth(d.getMonth() + 1)
    if (d.getDate() !== origDay) {
      d.setDate(0)
    }
  }
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function autoExecuteDueRecurring(recurring, executeFn) {
  const due = getDueRecurringTransactions(recurring)
  let executedCount = 0

  const toLocalDate = (ts) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const today = toLocalDate(Date.now())

  due.forEach((item) => {
    if (item.lastExecutedAt) {
      const lastExecDate = toLocalDate(item.lastExecutedAt)
      if (lastExecDate === today) return
    }
    executeFn(item)
    executedCount++
  })

  return executedCount
}

export function normalizeRecurringItem(item) {
  return {
    ...item,
    nextDate: item.nextRunDate || item.nextDate,
    frequency: item.recurrenceType || item.frequency || 'monthly',
    active: item.isActive !== undefined ? item.isActive : (item.active !== false),
  }
}

export function getSubscriptionSummary(recurring) {
  const subs = recurring.filter((r) => r.type === 'expense')
  const totalMonthly = subs.reduce((s, r) => {
    if (r.frequency === 'monthly') return s + r.amount
    if (r.frequency === 'yearly') return s + (r.amount / 12)
    if (r.frequency === 'weekly') return s + (r.amount * 4.33)
    if (r.frequency === 'daily') return s + (r.amount * 30)
    return s
  }, 0)
  return {
    count: subs.length,
    totalMonthly: Math.round(totalMonthly),
    activeSubs: subs.filter((r) => (r.isActive !== undefined ? r.isActive : r.active !== false)).length,
  }
}

export function getRecurringStats(recurring) {
  const active = recurring.filter((r) => r.isActive !== undefined ? r.isActive : r.active !== false)
  const totalMonthly = active.reduce((s, r) => {
    const freq = r.frequency || r.recurrenceType || 'monthly'
    if (freq === 'monthly') return s + r.amount
    if (freq === 'yearly') return s + (r.amount / 12)
    if (freq === 'weekly') return s + (r.amount * 4.33)
    if (freq === 'daily') return s + (r.amount * 30)
    return s
  }, 0)
  return {
    total: recurring.length,
    active: active.length,
    totalMonthly: Math.round(totalMonthly),
    income: active.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0),
    expense: active.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
  }
}
