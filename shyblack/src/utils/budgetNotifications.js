import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { getCategoryBreakdown } from './analytics'
import { formatCurrency } from './currency'
import { LocalNotifications } from '@capacitor/local-notifications'

const NOTIF_IDS = { 80: 200, 100: 201 }

function getPlugin() {
  return LocalNotifications
}

function getNotifLog() {
  const now = new Date()
  const data = safeStorage.get(STORAGE_KEYS.BUDGET_NOTIF, {})
  const monthKey = `${now.getFullYear()}_${now.getMonth()}`
  return data[monthKey] || {}
}

function saveNotifLog(log) {
  const now = new Date()
  const monthKey = `${now.getFullYear()}_${now.getMonth()}`
  const data = safeStorage.get(STORAGE_KEYS.BUDGET_NOTIF, {})
  // Keep only last 2 months to prevent unbounded growth
  const keys = Object.keys(data).sort()
  if (keys.length >= 3) delete data[keys[0]]
  data[monthKey] = log
  safeStorage.set(STORAGE_KEYS.BUDGET_NOTIF, data)
}

function wasNotified(log, category, level) {
  return !!log[`${category}_${level}`]
}

function markNotified(log, category, level) {
  log[`${category}_${level}`] = Date.now()
  saveNotifLog(log)
}

export async function checkAndNotifyBudget(budgets, transactions, category) {
  const budget = budgets[category]
  if (!budget || !budget.limit || budget.limit <= 0) return

  const now = new Date()
  const breakdown = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  const spent = breakdown.find((c) => c.category === category)?.amount || 0
  const pct = Math.round((spent / budget.limit) * 100)

  const threshold = pct >= 100 ? 100 : pct >= 80 ? 80 : null
  if (!threshold) return

  const log = getNotifLog()
  if (wasNotified(log, category, threshold)) return

  const lp = getPlugin()
  if (!lp) return

  try {
    const perm = await lp.checkPermissions()
    if (perm.display !== 'granted') return

    const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const remaining = budget.limit - spent
    const body = threshold === 100
      ? `${label} budget exceeded — ₹${Math.abs(remaining).toLocaleString()} over limit`
      : `${label} budget at ${pct}% — ${formatCurrency(remaining)} remaining`

    await lp.schedule({
      notifications: [{
        id: NOTIF_IDS[threshold] + Object.keys(log).length % 50,
        title: threshold === 100 ? 'Budget Exceeded' : 'Budget Alert',
        body,
        schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
        iconColor: threshold === 100 ? '#ef4444' : '#f59e0b',
        channelId: 'shyblack-budget-alerts',
      }],
    })

    markNotified(log, category, threshold)
  } catch {}
}
