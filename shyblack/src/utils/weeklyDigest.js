import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { sendNotification, checkNotificationPermission, NOTIF_TYPES } from './notifications'

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getWeekKey(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const week = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function buildWeeklyDigest(transactions, budgets = []) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  const startStr = toDateStr(start)
  const endStr = toDateStr(end)

  const weekTx = (transactions || []).filter((t) => t.date >= startStr && t.date <= endStr)

  let income = 0
  let expense = 0
  const categoryMap = {}
  const categoryType = {}
  for (const tx of weekTx) {
    if (tx.type === 'income') income += tx.amount || 0
    else if (tx.type === 'expense') {
      expense += tx.amount || 0
      const cat = tx.category || 'other_expense'
      categoryMap[cat] = (categoryMap[cat] || 0) + (tx.amount || 0)
      categoryType[cat] = 'expense'
    }
  }

  const expenseCategories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  const overspentCategories = []
  const budgetMap = budgets || {}
  for (const [category, budget] of Object.entries(budgetMap)) {
    if (!budget || !budget.limit || budget.limit <= 0) continue
    const spent = categoryMap[category] || 0
    if (spent > budget.limit) {
      overspentCategories.push({ category, overspent: spent - budget.limit })
    }
  }
  overspentCategories.sort((a, b) => b.overspent - a.overspent)

  return {
    startDate: startStr,
    endDate: endStr,
    income: Math.round(income),
    expense: Math.round(expense),
    savings: Math.round(income - expense),
    txCount: weekTx.length,
    expenseCategories,
    overspentCategories,
    avgDaily: weekTx.length > 0 ? Math.round(expense / Math.max(1, weekTx.length)) : 0,
  }
}

export function formatDigestAmount(n) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

export function buildWeeklyDigestBody(digest) {
  const parts = []
  if (digest.income > 0) parts.push(`Earned ₹${formatDigestAmount(digest.income)}`)
  parts.push(`Spent ₹${formatDigestAmount(digest.expense)}`)
  if (digest.savings > 0) parts.push(`Saved ₹${formatDigestAmount(digest.savings)}`)
  if (digest.expenseCategories.length > 0) {
    const top = digest.expenseCategories.map((c) => c.category.replace(/_/g, ' ')).join(', ')
    parts.push(`Top: ${top}`)
  }
  if (digest.overspentCategories.length > 0) {
    parts.push(`${digest.overspentCategories.length} budget overspent`)
  }
  return parts.join(' · ')
}

function getDigestStore() {
  return safeStorage.get(STORAGE_KEYS.REMINDER, {})
}

export function wasWeeklyDigestSent(weekKey = getWeekKey()) {
  const data = getDigestStore()
  return !!data[`weeklyDigest_${weekKey}`]
}

export function markWeeklyDigestSent(weekKey = getWeekKey()) {
  const data = getDigestStore()
  data[`weeklyDigest_${weekKey}`] = Date.now()
  safeStorage.set(STORAGE_KEYS.REMINDER, data)
}

export async function scheduleWeeklyDigest(transactions, budgets = []) {
  const weekKey = getWeekKey()
  if (wasWeeklyDigestSent(weekKey)) return { skipped: true, reason: 'already-sent' }

  const digest = buildWeeklyDigest(transactions, budgets)
  if (digest.income === 0 && digest.expense === 0) return { skipped: true, reason: 'no-data' }

  const perm = await checkNotificationPermission()
  if (!perm.granted) return { skipped: true, reason: 'no-permission' }

  const id = await sendNotification(NOTIF_TYPES.WEEKLY_SUMMARY, {
    id: 51,
    body: buildWeeklyDigestBody(digest),
    schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
  })

  if (id) {
    markWeeklyDigestSent(weekKey)
    return { sent: true, weekKey }
  }
  return { skipped: true, reason: 'send-failed' }
}