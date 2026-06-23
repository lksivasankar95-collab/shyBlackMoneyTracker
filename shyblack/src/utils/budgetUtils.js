import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'
import { getCategoryBreakdown } from './analytics'

export const BUDGET_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}

export const BUDGET_HEALTH = {
  SAFE: 'safe',
  WARNING: 'warning',
  EXCEEDED: 'exceeded',
}

export function getBudgetsV2() {
  const data = safeStorage.get(STORAGE_KEYS.BUDGETS_V2, [])
  if (!Array.isArray(data)) return []
  return data.map(normalizeBudget)
}

export function saveBudgetsV2(budgets) {
  safeStorage.set(STORAGE_KEYS.BUDGETS_V2, budgets)
}

function normalizeBudget(b) {
  return {
    id: b.id,
    name: b.name || '',
    category: b.category || 'other_expense',
    amount: b.amount || 0,
    spent: b.spent || 0,
    remaining: (b.amount || 0) - (b.spent || 0),
    period: b.period || BUDGET_PERIODS.MONTHLY,
    alert80: b.alert80 !== false,
    alert100: b.alert100 !== false,
    rollover: b.rollover || false,
    active: b.active !== false,
    createdAt: b.createdAt || Date.now(),
    updatedAt: b.updatedAt || Date.now(),
  }
}

export function createBudget(data) {
  const budgets = getBudgetsV2()
  const budget = {
    ...normalizeBudget(data),
    id: generateId(),
    spent: 0,
    remaining: data.amount || 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  budgets.push(budget)
  saveBudgetsV2(budgets)
  return budget
}

export function updateBudget(id, updates) {
  const budgets = getBudgetsV2()
  const idx = budgets.findIndex((b) => b.id === id)
  if (idx === -1) return null
  budgets[idx] = {
    ...budgets[idx],
    ...updates,
    id: budgets[idx].id,
    remaining: (updates.amount ?? budgets[idx].amount) - (updates.spent ?? budgets[idx].spent),
    updatedAt: Date.now(),
  }
  saveBudgetsV2(budgets)
  return budgets[idx]
}

export function deleteBudget(id) {
  const budgets = getBudgetsV2().filter((b) => b.id !== id)
  saveBudgetsV2(budgets)
}

export function archiveBudget(id) {
  return updateBudget(id, { active: false })
}

export function reactivateBudget(id) {
  return updateBudget(id, { active: true })
}

export function recalculateBudgetSpending(transactions) {
  const budgets = getBudgetsV2()
  const now = new Date()
  for (const b of budgets) {
    let spent = 0
    if (b.period === BUDGET_PERIODS.MONTHLY) {
      const catSpent = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
        .find((c) => c.category === b.category)
      spent = catSpent ? catSpent.amount : 0
    } else if (b.period === BUDGET_PERIODS.WEEKLY) {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      spent = transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && new Date(t.date) >= startOfWeek)
        .reduce((s, t) => s + t.amount, 0)
    } else if (b.period === BUDGET_PERIODS.YEARLY) {
      const catSpent = getCategoryBreakdown(transactions, 'expense', now.getFullYear())
        .find((c) => c.category === b.category)
      spent = catSpent ? catSpent.amount : 0
    }
    b.spent = spent
    b.remaining = Math.max(0, b.amount - spent)
  }
  saveBudgetsV2(budgets)
  return budgets
}

export function getBudgetHealthV2(budgets) {
  const active = budgets.filter((b) => b.active)
  if (active.length === 0) return { safe: 0, warning: 0, exceeded: 0, health: 100, totalActive: 0 }
  let safe = 0, warning = 0, exceeded = 0
  for (const b of active) {
    const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0
    if (pct >= 100) exceeded++
    else if (pct >= 80) warning++
    else safe++
  }
  const healthScore = active.length > 0 ? Math.round((safe / active.length) * 100) : 100
  return { safe, warning, exceeded, health: healthScore, totalActive: active.length }
}

export function getOverspentCategories(budgets) {
  return budgets
    .filter((b) => b.active && b.amount > 0 && b.spent > b.amount)
    .sort((a, b) => (b.spent - b.amount) - (a.spent - a.amount))
}

export function getBudgetAlerts(budgets) {
  const alerts = []
  for (const b of budgets) {
    if (!b.active || b.amount <= 0) continue
    const pct = (b.spent / b.amount) * 100
    if (pct >= 100 && b.alert100) {
      alerts.push({
        type: 'exceeded',
        budgetId: b.id,
        name: b.name,
        category: b.category,
        overspentBy: b.spent - b.amount,
        message: `${b.name} exceeded by ₹${Math.round(b.spent - b.amount)}.`,
      })
    } else if (pct >= 80 && b.alert80) {
      alerts.push({
        type: 'warning',
        budgetId: b.id,
        name: b.name,
        category: b.category,
        percent: Math.round(pct),
        message: `${b.name} budget has reached ${Math.round(pct)}%.`,
      })
    }
  }
  return alerts
}

export function getBudgetDashboardStats(budgets) {
  const active = budgets.filter((b) => b.active)
  const totalBudgeted = active.reduce((s, b) => s + b.amount, 0)
  const totalSpent = active.reduce((s, b) => s + b.spent, 0)
  const overBudgetCount = active.filter((b) => b.amount > 0 && b.spent > b.amount).length
  const utilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0
  return {
    totalBudgets: budgets.length,
    activeBudgets: active.length,
    overBudgetCount,
    totalBudgeted,
    totalSpent,
    utilization,
  }
}

export function calculatePeriodRange(period) {
  const now = new Date()
  let start, end
  if (period === BUDGET_PERIODS.WEEKLY) {
    const dayOfWeek = now.getDay()
    start = new Date(now)
    start.setDate(now.getDate() - dayOfWeek)
    start.setHours(0, 0, 0, 0)
    end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (period === BUDGET_PERIODS.MONTHLY) {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  } else if (period === BUDGET_PERIODS.YEARLY) {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  }
  return { start, end }
}
