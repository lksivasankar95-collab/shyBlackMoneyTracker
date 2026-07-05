import { getMonthlyData, getCategoryBreakdown, compareSpending } from './analytics'
import { formatCurrency } from './currency'
import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { ALL_CATEGORIES } from './constants'
import { sendNotification } from './notifications'

export function calculateFinancialScore(transactions) {
  if (transactions.length === 0) return { score: 0, level: 'N/A', factors: [] }
  const factors = []
  let score = 500

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = income - expense

  if (savings > 0) {
    const savingsRate = income > 0 ? (savings / income) * 100 : 0
    score += Math.min(savingsRate * 5, 200)
    factors.push({ type: 'positive', text: `${Math.round(savingsRate)}% savings rate`, impact: '+positive' })
  } else {
    score -= 100
    factors.push({ type: 'negative', text: 'Spending exceeds income', impact: '-negative' })
  }

  if (transactions.length >= 10) {
    score += 50
    factors.push({ type: 'positive', text: 'Consistent transaction tracking', impact: '+positive' })
  }

  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (thisMonth.length >= 5) {
    score += 30
    factors.push({ type: 'positive', text: 'Active monthly tracking', impact: '+positive' })
  }

  const comparison = compareSpending(transactions)
  if (comparison && comparison.direction === 'down') {
    score += 70
    factors.push({ type: 'positive', text: `Spending down ${Math.abs(comparison.change)}% vs last month`, impact: '+positive' })
  } else if (comparison && comparison.direction === 'up' && comparison.change > 20) {
    score -= 50
    factors.push({ type: 'warning', text: `Spending up ${comparison.change}% vs last month`, impact: '-warning' })
  }

  const categories = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  if (categories.length > 0) {
    const topCategory = categories[0]
    if (topCategory) {
      const monthTotal = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      if (monthTotal > 0 && (topCategory.amount / monthTotal) > 0.5) {
        score -= 30
        factors.push({ type: 'warning', text: `${Math.round((topCategory.amount / monthTotal) * 100)}% spending in one category`, impact: '-warning' })
      }
    }
  }

  const daysSinceFirst = transactions.length > 0
    ? Math.max(1, Math.floor((Date.now() - new Date(transactions[transactions.length - 1].date).getTime()) / (1000 * 86400)))
    : 1
  if (daysSinceFirst >= 30) {
    score += 40
    factors.push({ type: 'positive', text: `${Math.floor(daysSinceFirst / 30)} month${Math.floor(daysSinceFirst / 30) > 1 ? 's' : ''} of tracking`, impact: '+positive' })
  }

  score = Math.max(0, Math.min(1000, score))

  let level = 'Needs Work'
  if (score >= 800) level = 'Excellent'
  else if (score >= 650) level = 'Good'
  else if (score >= 500) level = 'Fair'
  else if (score >= 300) level = 'Needs Work'

  return { score, level, factors }
}

export function detectOverspending(transactions) {
  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const expenses = thisMonth.filter((t) => t.type === 'expense')
  if (expenses.length < 3) return null

  const lastMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() - 1 && d.getFullYear() === now.getFullYear()
  })
  const lastExpenses = lastMonth.filter((t) => t.type === 'expense')
  if (lastExpenses.length === 0) return null

  const thisTotal = expenses.reduce((s, t) => s + t.amount, 0)
  const lastTotal = lastExpenses.reduce((s, t) => s + t.amount, 0)
  const daysIntoMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedTotal = (thisTotal / daysIntoMonth) * daysInMonth

  if (lastTotal > 0 && projectedTotal > lastTotal * 1.3) {
    return {
      type: 'alert',
      message: `Projected spending ${Math.round((projectedTotal / lastTotal - 1) * 100)}% higher than last month`,
      severity: projectedTotal > lastTotal * 1.5 ? 'high' : 'medium',
    }
  }
  return null
}

export function getSavingsRecommendations(transactions, savingsGoal) {
  const tips = []
  const monthly = getMonthlyData(transactions, 3)
  const avgExpense = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length
    : 0
  const avgIncome = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length
    : 0

  if (avgExpense > 0 && avgIncome > 0) {
    const savingsRate = ((avgIncome - avgExpense) / avgIncome) * 100
    if (savingsRate < 10) {
      tips.push({ type: 'saving', text: 'Try saving at least 10% of your income', impact: 'high' })
    }
    if (savingsRate >= 10 && savingsRate < 20) {
      tips.push({ type: 'positive', text: `Good ${Math.round(savingsRate)}% savings rate — aim for 20%`, impact: 'medium' })
    }
  }

  const now = new Date()
  const categories = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  categories.forEach((c) => {
    if (c.amount > avgExpense * 0.3) {
      const catLabel = ALL_CATEGORIES.find((cat) => cat.id === c.category)?.label || c.category
      tips.push({ type: 'saving', text: `Consider reducing "${catLabel}" expenses`, impact: 'medium' })
    }
  })

  if (savingsGoal.target > 0 && savingsGoal.target > savingsGoal.saved) {
    const remaining = savingsGoal.target - savingsGoal.saved
    tips.push({ type: 'goal', text: `${formatCurrency(remaining)} more to reach your savings goal`, impact: 'high' })
  }

  return tips
}

export function getHabitInsights(transactions) {
  if (transactions.length < 5) return []

  const insights = []
  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const weeklyGroups = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  thisMonth.forEach((t) => {
    const d = new Date(t.date)
    const weekNum = Math.floor((d.getDate() - 1) / 7)
    if (weekNum < 5) weeklyGroups[weekNum] += t.type === 'expense' ? t.amount : 0
  })

  const highSpendingWeeks = Object.entries(weeklyGroups)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
  if (highSpendingWeeks.length > 0) {
    const highestWeek = parseInt(highSpendingWeeks[0][0])
    if (highestWeek === 0) {
      insights.push({ type: 'pattern', text: 'Higher spending early in the month', icon: 'Calendar' })
    }
  }

  const weekendTxs = thisMonth.filter((t) => {
    const d = new Date(t.date)
    const day = d.getDay()
    return (day === 0 || day === 6) && t.type === 'expense'
  })
  if (weekendTxs.length > 0) {
    const weekendTotal = weekendTxs.reduce((s, t) => s + t.amount, 0)
    const weekdayTotal = thisMonth.filter((t) => {
      const d = new Date(t.date)
      return d.getDay() > 0 && d.getDay() < 6 && t.type === 'expense'
    }).reduce((s, t) => s + t.amount, 0)
    if (weekendTotal > 0 && weekdayTotal > 0) {
      const weekendDays = weekendTxs.length
      const weekdayDays = thisMonth.filter((t) => {
        const d = new Date(t.date)
        return d.getDay() > 0 && d.getDay() < 6
      }).length || 1
      const avgWeekend = weekendTotal / Math.max(1, weekendDays)
      const avgWeekday = weekdayTotal / Math.max(1, weekdayDays)
      if (avgWeekend > avgWeekday * 1.3) {
        insights.push({ type: 'pattern', text: 'Weekend spending is higher than weekdays', icon: 'Sun' })
      }
    }
  }

  return insights
}

export function getSmartCategoryPrediction(transactions, note) {
  if (!note || transactions.length < 3) return null
  const lowerNote = note.toLowerCase()
  const keywordMap = {
    food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'swiggy', 'zomato', 'eat', 'grocer', 'milk', 'beverage', 'snack'],
    fuel: ['fuel', 'petrol', 'diesel', 'gas', 'petro', 'refuel'],
    bills: ['bill', 'electricity', 'water', 'wifi', 'internet', 'rent', 'maintenance', 'recharge'],
    subscription: ['netflix', 'prime', 'spotify', 'subscription', 'apple', 'youtube', 'premium'],
    shopping: ['shopping', 'cloth', 'amazon', 'flipkart', 'myntra', 'purchase', 'buy'],
    salary: ['salary', 'income', 'payment', 'wage', 'payout'],
    freelance: ['freelance', 'client', 'project', 'consult', 'contract'],
    investment: ['invest', 'stock', 'mutual fund', 'dividend', 'return'],
  }
  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => lowerNote.includes(kw))) {
      return category
    }
  }
  return null
}

export function getFinancialHealth(transactions) {
  if (transactions.length === 0) return { emergencyFund: 0, monthsCovered: 0, rating: 'N/A' }

  const monthly = getMonthlyData(transactions, 3)
  const avgMonthlyExpense = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length
    : 0
  const totalSavings = transactions
    .filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    - transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const monthsCovered = avgMonthlyExpense > 0 ? totalSavings / avgMonthlyExpense : 0

  let rating = 'Needs Work'
  if (monthsCovered >= 6) rating = 'Excellent'
  else if (monthsCovered >= 3) rating = 'Good'
  else if (monthsCovered >= 1) rating = 'Fair'

  return { emergencyFund: totalSavings, monthsCovered: Math.round(monthsCovered * 10) / 10, rating }
}

export function getScoreVelocity(transactions) {
  if (transactions.length < 5) return null

  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const lastMonthTx = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastYear
  })

  if (thisMonthTx.length < 3 || lastMonthTx.length < 3) return null

  const thisScore = calculateFinancialScore(thisMonthTx).score
  const prevScore = calculateFinancialScore(lastMonthTx).score
  const delta = thisScore - prevScore

  return { delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same' }
}

export function getLoggingStreak(transactions) {
  if (transactions.length === 0) return 0

  const dates = new Set(transactions.map((t) => t.date))
  const today = new Date()
  let streak = 0

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (dates.has(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 100, 365]

export async function checkStreakMilestone(transactions) {
  const streak = getLoggingStreak(transactions)
  if (streak < 3) return

  const reached = STREAK_MILESTONES.filter((m) => streak >= m)
  if (reached.length === 0) return

  const stored = safeStorage.get(STORAGE_KEYS.STREAK, { milestone: 0 })
  const lastMilestone = stored.milestone || 0
  const newMilestone = reached[reached.length - 1]

  if (newMilestone <= lastMilestone) return

  safeStorage.set(STORAGE_KEYS.STREAK, { milestone: newMilestone, date: new Date().toISOString().split('T')[0] })

  await sendNotification(NOTIF_TYPES.GOAL_ACHIEVED, {
    id: 9001,
    title: `${newMilestone}-Day Streak!`,
    body: `You've logged transactions ${newMilestone} days in a row. Keep the momentum going!`,
    iconColor: '#F97316',
  })
}

export function getMonthlyScoreHistory(transactions, months = 6) {
  const now = new Date()
  const result = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()

    const monthTx = transactions.filter((t) => {
      const td = new Date(t.date)
      return td.getFullYear() === year && td.getMonth() === month
    })

    const score = monthTx.length >= 3 ? calculateFinancialScore(monthTx).score : null
    const label = d.toLocaleString('default', { month: 'short' })
    result.push({ month: `${year}-${String(month + 1).padStart(2, '0')}`, label, score })
  }

  return result
}

export function getCashflowForecast(recurringList, months = 3) {
  const now = new Date()
  const result = []

  for (let i = 1; i <= months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    let income = 0
    let expense = 0

    recurringList.filter((r) => r.active !== false).forEach((r) => {
      let count = 0
      if (r.frequency === 'monthly') count = 1
      else if (r.frequency === 'weekly') count = 4
      else if (r.frequency === 'yearly') {
        const next = new Date(r.nextDate || r.startDate || r.createdAt)
        if (next.getFullYear() === year && next.getMonth() === month) count = 1
      }

      if (count > 0) {
        if (r.type === 'income') income += r.amount * count
        else expense += r.amount * count
      }
    })

    const label = targetDate.toLocaleString('default', { month: 'short', year: '2-digit' })
    result.push({ label, income, expense, net: income - expense })
  }

  return result
}

export function getScoreBreakdown(transactions) {
  if (transactions.length === 0) return null
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = income - expense
  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthExpense = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Savings discipline (0-250)
  let savingsScore = 0
  if (income > 0) {
    const rate = (savings / income) * 100
    savingsScore = Math.min(250, rate * 5)
  }
  if (savings <= 0) savingsScore = Math.max(0, savingsScore - 100)

  // Debt health (0-200)
  let debtScore = 200
  const hasDebt = expense > income * 1.5
  if (hasDebt) debtScore = 100

  // Spending consistency (0-200)
  let consistencyScore = 150
  if (transactions.length >= 20) consistencyScore = 200
  else if (transactions.length >= 10) consistencyScore = 175

  const categories = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  if (categories.length > 0 && monthExpense > 0) {
    const topRatio = categories[0].amount / monthExpense
    if (topRatio > 0.5) consistencyScore = Math.max(50, consistencyScore - 50)
  }

  // Budget discipline (0-200)
  let budgetScore = 150
  const comparison = compareSpending(transactions)
  if (comparison && comparison.direction === 'down') budgetScore = 200
  else if (comparison && comparison.direction === 'up' && comparison.change > 20) budgetScore = 100

  // Transaction consistency (0-150)
  let txScore = 50
  if (transactions.length >= 10) txScore = 100
  if (thisMonth.length >= 5) txScore = 150

  const total = savingsScore + debtScore + consistencyScore + budgetScore + txScore

  return {
    total: Math.min(1000, Math.max(0, total)),
    categories: [
      { key: 'savings', label: 'Savings Discipline', score: Math.round(savingsScore), max: 250 },
      { key: 'debt', label: 'Debt Health', score: Math.round(debtScore), max: 200 },
      { key: 'consistency', label: 'Spending Consistency', score: Math.round(consistencyScore), max: 200 },
      { key: 'budget', label: 'Budget Discipline', score: Math.round(budgetScore), max: 200 },
      { key: 'tracking', label: 'Transaction Consistency', score: Math.round(txScore), max: 150 },
    ],
  }
}

export function generateSmartInsights(transactions, budgets = {}, _debts = []) {
  if (transactions.length < 3) return []

  const insights = []
  const now = new Date()
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisExpenses = thisMonth.filter((t) => t.type === 'expense')
  const thisIncome = thisMonth.filter((t) => t.type === 'income')

  const thisExpenseTotal = thisExpenses.reduce((s, t) => s + t.amount, 0)
  const thisIncomeTotal = thisIncome.reduce((s, t) => s + t.amount, 0)

  // 1. Spending increased by X%
  const comparison = compareSpending(transactions)
  if (comparison && comparison.direction === 'up' && comparison.change > 0) {
    insights.push({
      type: 'spending_increase',
      severity: comparison.change > 20 ? 'alert' : 'warning',
      message: `Spending increased by ${comparison.change}% compared to last month`,
      detail: `₹${Math.round(comparison.current).toLocaleString()} this month vs ₹${Math.round(comparison.previous).toLocaleString()} last month`,
      category: null,
    })
  } else if (comparison && comparison.direction === 'down' && comparison.change < 0) {
    insights.push({
      type: 'spending_increase',
      severity: 'success',
      message: `Spending decreased by ${Math.abs(comparison.change)}% compared to last month`,
      detail: `₹${Math.round(comparison.current).toLocaleString()} this month vs ₹${Math.round(comparison.previous).toLocaleString()} last month`,
      category: null,
    })
  }

  // 2. Category-level month-over-month comparison
  const catBreakdownThis = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  const catBreakdownLast = getCategoryBreakdown(transactions, 'expense', now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), now.getMonth() === 0 ? 11 : now.getMonth() - 1)

  if (catBreakdownThis.length > 0 && catBreakdownLast.length > 0) {
    catBreakdownThis.forEach((cat) => {
      const lastCat = catBreakdownLast.find((c) => c.category === cat.category)
      if (lastCat && lastCat.amount > 0) {
        const change = ((cat.amount - lastCat.amount) / lastCat.amount) * 100
        if (change > 10) {
          const label = ALL_CATEGORIES.find((c) => c.id === cat.category)?.label || cat.category
          insights.push({
            type: 'category_increase',
            severity: change > 30 ? 'alert' : 'warning',
            message: `"${label}" expenses ${Math.round(change)}% higher than last month`,
            detail: `₹${Math.round(cat.amount).toLocaleString()} this month vs ₹${Math.round(lastCat.amount).toLocaleString()} last month`,
            category: cat.category,
          })
        }
      }
    })
  }

  // 3. Largest expense category
  if (catBreakdownThis.length > 0 && thisExpenseTotal > 0) {
    const topCat = catBreakdownThis[0]
    const topPct = (topCat.amount / thisExpenseTotal) * 100
    const label = ALL_CATEGORIES.find((c) => c.id === topCat.category)?.label || topCat.category
    insights.push({
      type: 'largest_category',
      severity: topPct > 50 ? 'warning' : 'info',
      message: `"${label}" is your largest expense at ${Math.round(topPct)}% of total`,
      detail: `₹${Math.round(topCat.amount).toLocaleString()} spent this month`,
      category: topCat.category,
    })
  }

  // 4. Savings trend over last 3 months
  const monthly = getMonthlyData(transactions, 3)
  if (monthly.length >= 2) {
    const savingsHistory = monthly.map((m) => m.income - m.expense)
    const improving = savingsHistory[savingsHistory.length - 1] > savingsHistory[0]
    const declining = savingsHistory[savingsHistory.length - 1] < savingsHistory[0]
    if (improving) {
      insights.push({
        type: 'savings_trend',
        severity: 'success',
        message: 'Savings are trending upward over the last 3 months',
        detail: `Net savings improved from ₹${Math.round(savingsHistory[0]).toLocaleString()} to ₹${Math.round(savingsHistory[savingsHistory.length - 1]).toLocaleString()}`,
        category: null,
      })
    } else if (declining) {
      insights.push({
        type: 'savings_trend',
        severity: 'alert',
        message: 'Savings are declining over the last 3 months',
        detail: `Net savings dropped from ₹${Math.round(savingsHistory[0]).toLocaleString()} to ₹${Math.round(savingsHistory[savingsHistory.length - 1]).toLocaleString()}`,
        category: null,
      })
    } else {
      insights.push({
        type: 'savings_trend',
        severity: 'info',
        message: 'Savings have remained stable over the last 3 months',
        detail: `Average net: ₹${Math.round(savingsHistory.reduce((s, v) => s + v, 0) / savingsHistory.length).toLocaleString()}`,
        category: null,
      })
    }
  }

  // 5. Budget exceeded warning
  if (budgets && typeof budgets === 'object') {
    Object.entries(budgets).forEach(([category, budget]) => {
      const limit = budget.limit || 0
      if (limit <= 0) return
      const spent = catBreakdownThis.find((c) => c.category === category)?.amount || 0
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
      if (pct >= 100) {
        const label = ALL_CATEGORIES.find((c) => c.id === category)?.label || category
        insights.push({
          type: 'budget_exceeded',
          severity: 'alert',
          message: `"${label}" budget exceeded by ₹${Math.round(spent - limit).toLocaleString()}`,
          detail: `Budget: ₹${Math.round(limit).toLocaleString()} · Spent: ₹${Math.round(spent).toLocaleString()} (${pct}%)`,
          category,
        })
      } else if (pct >= 80) {
        const label = ALL_CATEGORIES.find((c) => c.id === category)?.label || category
        insights.push({
          type: 'budget_exceeded',
          severity: 'warning',
          message: `"${label}" budget at ${pct}% — ₹${Math.round(limit - spent).toLocaleString()} remaining`,
          detail: `Budget: ₹${Math.round(limit).toLocaleString()} · Spent: ₹${Math.round(spent).toLocaleString()}`,
          category,
        })
      }
    })
  }

  // 6. Low balance warning
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const runningBalance = totalIncome - totalExpense
  const monthlyData = getMonthlyData(transactions, 3)
  const avgMonthlyExpense = monthlyData.length > 0
    ? monthlyData.reduce((s, m) => s + m.expense, 0) / monthlyData.length
    : 0
  if (avgMonthlyExpense > 0 && runningBalance < avgMonthlyExpense * 0.2) {
    insights.push({
      type: 'low_balance',
      severity: 'alert',
      message: 'Your balance is running low — less than 20% of your average monthly expense',
      detail: `Balance: ₹${Math.round(runningBalance).toLocaleString()} · Avg expense: ₹${Math.round(avgMonthlyExpense).toLocaleString()}`,
      category: null,
    })
  } else if (avgMonthlyExpense > 0 && runningBalance < avgMonthlyExpense * 0.5) {
    insights.push({
      type: 'low_balance',
      severity: 'warning',
      message: 'Your balance is below 50% of your average monthly expense',
      detail: `Balance: ₹${Math.round(runningBalance).toLocaleString()} · Avg expense: ₹${Math.round(avgMonthlyExpense).toLocaleString()}`,
      category: null,
    })
  }

  // 7. Frequent spending pattern (>3x/week on average)
  const expenseCategories = [...new Set(thisExpenses.map((t) => t.category))]
  expenseCategories.forEach((cat) => {
    const weekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
    thisExpenses.forEach((t) => {
      if (t.category !== cat) return
      const d = new Date(t.date)
      const weekNum = Math.min(Math.floor((d.getDate() - 1) / 7), 4)
      weekCounts[weekNum]++
    })
    const activeWeeks = Object.values(weekCounts).filter((c) => c > 0).length
    const totalCount = Object.values(weekCounts).reduce((s, c) => s + c, 0)
    const avgPerWeek = activeWeeks > 0 ? totalCount / activeWeeks : 0
    if (avgPerWeek > 3) {
      const label = ALL_CATEGORIES.find((c) => c.id === cat)?.label || cat
      insights.push({
        type: 'frequent_spending',
        severity: 'warning',
        message: `"${label}" used ${Math.round(avgPerWeek)}x/week on average this month`,
        detail: `${totalCount} transactions across ${activeWeeks} week${activeWeeks > 1 ? 's' : ''}`,
        category: cat,
      })
    }
  })

  // 8. Monthly financial summary
  const savings = thisIncomeTotal - thisExpenseTotal
  const savingsRate = thisIncomeTotal > 0 ? (savings / thisIncomeTotal) * 100 : 0
  let summaryMsg = ''
  if (thisIncomeTotal > 0) {
    summaryMsg = `Income: ₹${Math.round(thisIncomeTotal).toLocaleString()} · Expense: ₹${Math.round(thisExpenseTotal).toLocaleString()} · Savings: ${Math.round(savingsRate)}% rate`
  } else {
    summaryMsg = `Expenses: ₹${Math.round(thisExpenseTotal).toLocaleString()} · No income recorded this month`
  }
  if (catBreakdownThis.length > 0) {
    const top = catBreakdownThis[0]
    const topLabel = ALL_CATEGORIES.find((c) => c.id === top.category)?.label || top.category
    summaryMsg += ` · Top: "${topLabel}"`
  }
  insights.push({
    type: 'monthly_summary',
    severity: savings >= 0 ? 'success' : 'alert',
    message: `This month: ${savings >= 0 ? 'Net positive' : 'Deficit'} (${Math.round(savingsRate)}% savings rate)`,
    detail: summaryMsg,
    category: null,
  })

  return insights
}

export function predictMonthEndSpend(transactions) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  if (daysElapsed < 3) return null

  const thisMonthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (thisMonthExpenses.length === 0) return null

  const spentSoFar = thisMonthExpenses.reduce((s, t) => s + t.amount, 0)
  const dailyRate = spentSoFar / daysElapsed
  const projected = Math.round(dailyRate * daysInMonth)

  // Per-category projections
  const byCategory = {}
  thisMonthExpenses.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  })
  const categoryProjections = Object.entries(byCategory).map(([category, spent]) => {
    const catLabel = ALL_CATEGORIES.find((c) => c.id === category)?.label || category
    return {
      category,
      label: catLabel,
      projected: Math.round((spent / daysElapsed) * daysInMonth),
      spentSoFar: spent,
    }
  }).sort((a, b) => b.projected - a.projected)

  return { projected, spentSoFar, daysElapsed, daysInMonth, categoryProjections }
}
