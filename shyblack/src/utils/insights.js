import { getMonthlyData, getCategoryBreakdown, compareSpending } from './analytics'

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
      tips.push({ type: 'saving', text: `Consider reducing "${c.category}" expenses`, impact: 'medium' })
    }
  })

  if (savingsGoal.target > 0 && savingsGoal.target > savingsGoal.saved) {
    const remaining = savingsGoal.target - savingsGoal.saved
    tips.push({ type: 'goal', text: `₹${remaining.toLocaleString('en-IN')} more to reach your savings goal`, impact: 'high' })
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
