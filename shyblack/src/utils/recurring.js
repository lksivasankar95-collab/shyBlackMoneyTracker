import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const RECURRING_TYPES = ['daily', 'weekly', 'monthly', 'yearly']

export const RECURRING_CATEGORIES = ['salary', 'rent', 'emi', 'sip', 'subscription', 'insurance', 'utility_bills']

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
    if (r.paused) return
    const next = new Date(r.nextDate + 'T00:00:00')
    if (next <= now) due.push(r)
  })
  return due
}

export function getUpcomingRecurringTransactions(recurring, count = 5) {
  const todayStr = new Date().toISOString().split('T')[0]
  const upcoming = recurring
    .filter((r) => {
      const isActive = r.isActive !== undefined ? r.isActive : (r.active !== false)
      if (!r.nextDate || !isActive) return false
      if (r.paused) return false
      return r.nextDate > todayStr
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

  const today = new Date().toISOString().split('T')[0]

  due.forEach((item) => {
    if (item.lastExecutedAt) {
      const lastExecDate = typeof item.lastExecutedAt === 'number'
        ? new Date(item.lastExecutedAt).toISOString().split('T')[0]
        : String(item.lastExecutedAt).slice(0, 10)
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

export function pauseRecurring(id) {
  const recurring = getRecurringTransactions()
  const idx = recurring.findIndex((r) => r.id === id)
  if (idx === -1) return null
  recurring[idx] = {
    ...recurring[idx],
    paused: true,
    pausedAt: Date.now(),
    updatedAt: Date.now(),
  }
  saveRecurringTransactions(recurring)
  return recurring[idx]
}

export function resumeRecurring(id) {
  const recurring = getRecurringTransactions()
  const idx = recurring.findIndex((r) => r.id === id)
  if (idx === -1) return null
  recurring[idx] = {
    ...recurring[idx],
    paused: false,
    pausedAt: undefined,
    nextDate: getNextDueDate(recurring[idx], new Date().toISOString().split('T')[0]),
    updatedAt: Date.now(),
  }
  saveRecurringTransactions(recurring)
  return recurring[idx]
}

export function editFutureOccurrences(id, updates, transactions) {
  const recurring = getRecurringTransactions()
  const idx = recurring.findIndex((r) => r.id === id)
  if (idx === -1) return { recurring: null, updatedTransactions: transactions }
  const today = new Date().toISOString().split('T')[0]
  const updatedTransactions = (transactions || []).map((tx) => {
    if (tx.source === 'recurring' && tx.date >= today) {
      const txUpdates = {}
      if (updates.amount !== undefined) txUpdates.amount = updates.amount
      if (updates.category !== undefined) txUpdates.category = updates.category
      if (updates.note !== undefined) txUpdates.note = updates.note
      return Object.keys(txUpdates).length ? { ...tx, ...txUpdates } : tx
    }
    return tx
  })
  const updated = {
    ...recurring[idx],
    ...updates,
    id: recurring[idx].id,
    updatedAt: Date.now(),
  }
  if (updates.recurrenceType) updated.frequency = updates.recurrenceType
  if (updates.isActive !== undefined) updated.active = updates.isActive
  recurring[idx] = updated
  saveRecurringTransactions(recurring)
  return { recurring: updated, updatedTransactions }
}

export function skipNextOccurrence(id) {
  const recurring = getRecurringTransactions()
  const idx = recurring.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const item = recurring[idx]
  const nextDate = advanceNextDate(item.nextDate, item.frequency || 'monthly')
  recurring[idx] = {
    ...item,
    nextDate,
    lastSkippedAt: Date.now(),
    updatedAt: Date.now(),
  }
  saveRecurringTransactions(recurring)
  return recurring[idx]
}

export function getNextDueDate(item, fromDate) {
  if (!item.nextDate) return fromDate
  const from = fromDate || new Date().toISOString().split('T')[0]
  let candidate = item.nextDate
  const freq = item.frequency || 'monthly'
  let iterations = 0
  while (candidate < from && iterations < 60) {
    candidate = advanceNextDate(candidate, freq)
    iterations++
  }
  return candidate
}

export function getRecurringCalendarData(recurring, year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const result = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
    const items = recurring.filter((r) => {
      const isActive = r.isActive !== undefined ? r.isActive : (r.active !== false)
      if (!isActive) return false
      if (r.paused) return false
      if (r.endDate && dateStr > r.endDate) return false
      if (r.startDate && dateStr < r.startDate) return false
      const next = r.nextDate || r.startDate
      if (!next) return false
      if (dateStr < next) return false
      const freq = r.frequency || 'monthly'
      let cursor = next
      let found = false
      let iter = 0
      while (cursor <= dateStr && iter < 60) {
        if (cursor === dateStr) { found = true; break }
        cursor = advanceNextDate(cursor, freq)
        iter++
      }
      return found
    })
    if (items.length > 0) {
      result.push({ date: dateStr, items })
    }
  }
  return result
}

export function detectDuplicateGeneration(recurring, transactions) {
  const today = new Date().toISOString().split('T')[0]
  const results = []
  const active = recurring.filter((r) => {
    const isActive = r.isActive !== undefined ? r.isActive : (r.active !== false)
    return isActive && !r.paused
  })
  active.forEach((r) => {
    const alreadyGenerated = transactions.some((tx) => {
      if (tx.source !== 'recurring') return false
      if (tx.date !== today) return false
      if (tx.category !== r.category) return false
      if (tx.amount !== r.amount) return false
      return true
    })
    results.push({
      recurring: r,
      alreadyGenerated,
      generatedToday: alreadyGenerated,
    })
  })
  return results
}
