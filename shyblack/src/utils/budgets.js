import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { getMonthlyData, getCategoryBreakdown } from './analytics'

export function createDefaultBudgets() {
  return {
    food: { limit: 5000, spent: 0, rollover: 0 },
    fuel: { limit: 3000, spent: 0, rollover: 0 },
    bills: { limit: 8000, spent: 0, rollover: 0 },
    subscription: { limit: 2000, spent: 0, rollover: 0 },
    shopping: { limit: 5000, spent: 0, rollover: 0 },
  }
}

export function getBudgets() {
  return safeStorage.get(STORAGE_KEYS.BUDGETS, createDefaultBudgets())
}

export function saveBudgets(budgets) {
  safeStorage.set(STORAGE_KEYS.BUDGETS, budgets)
}

export function updateBudgetLimit(category, limit) {
  const budgets = getBudgets()
  if (!budgets[category]) budgets[category] = { limit: 0, spent: 0, rollover: 0 }
  budgets[category].limit = limit
  saveBudgets(budgets)
  return budgets
}

export function calculateBudgetSpending(transactions, budgets) {
  const now = new Date()
  const updated = { ...budgets }
  for (const [cat, budget] of Object.entries(updated)) {
    const spent = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
      .find((c) => c.category === cat)
    updated[cat] = {
      ...budget,
      spent: spent ? spent.amount : 0,
    }
  }
  return updated
}

export function getAIBudgetSuggestions(transactions) {
  const monthly = getMonthlyData(transactions, 3)
  const suggestions = []
  const categories = {}

  for (const m of monthly) {
    const now = new Date()
    const catData = getCategoryBreakdown(transactions, 'expense',
      now.getFullYear(),
      MONTHS.indexOf(m.month) > -1 ? MONTHS.indexOf(m.month) : now.getMonth()
    )
    catData.forEach((c) => {
      if (!categories[c.category]) categories[c.category] = []
      categories[c.category].push(c.amount)
    })
  }

  for (const [cat, amounts] of Object.entries(categories)) {
    if (amounts.length > 0) {
      const avg = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length)
      const suggested = Math.round(avg * 1.1)
      suggestions.push({ category: cat, suggestedBudget: suggested, avgSpending: avg })
    }
  }

  return suggestions
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function rolloverBudgets(transactions, budgets) {
  const updated = { ...budgets }
  for (const [cat, budget] of Object.entries(updated)) {
    const remaining = budget.limit - budget.spent
    updated[cat] = {
      ...budget,
      rollover: remaining > 0 ? Math.round(remaining * 0.5) : 0,
      spent: 0,
    }
  }
  return updated
}

export function getBudgetHealth(budgets) {
  let overBudget = 0
  let total = 0
  for (const [, budget] of Object.entries(budgets)) {
    if (budget.limit > 0) {
      total++
      if (budget.spent > budget.limit) overBudget++
    }
  }
  return {
    overBudget,
    total,
    health: total > 0 ? Math.round(((total - overBudget) / total) * 100) : 100,
  }
}
