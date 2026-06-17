import { getMonthlyData, getCategoryBreakdown, compareSpending } from './analytics'
import { getLoggingStreak, getMonthlyScoreHistory } from './insights'
import { getSubscriptionSummary } from './recurring'
import { getGoals } from './goals'
import { formatCurrency } from './currency'
import { safeStorage, STORAGE_KEYS } from './safeStorage'

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function wasReviewGenerated(year, month) {
  const key = getMonthKey(year, month)
  const data = safeStorage.get(STORAGE_KEYS.REVIEW, {})
  return !!data[key]
}

export function markReviewGenerated(year, month) {
  const key = getMonthKey(year, month)
  const data = safeStorage.get(STORAGE_KEYS.REVIEW, {})
  data[key] = { generatedAt: Date.now() }
  safeStorage.set(STORAGE_KEYS.REVIEW, data)
}

export function generateMonthlyReview(transactions, recurring) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const data = getMonthlyData(transactions, 2)
  if (data.length === 0) return null

  const current = data[data.length - 1]
  const previous = data.length > 1 ? data[data.length - 2] : null

  const items = []
  const score = getMonthlyScoreHistory(transactions, 1)[0]

  // Savings rate
  if (current.income > 0) {
    const savingsRate = ((current.income - current.expense) / current.income) * 100
    if (savingsRate >= 20) {
      items.push({ type: 'positive', icon: 'TrendingUp', text: `Saved ${Math.round(savingsRate)}% of income` })
    } else if (savingsRate > 0) {
      items.push({ type: 'info', icon: 'Target', text: `Saved ${Math.round(savingsRate)}% this month` })
    } else {
      items.push({ type: 'warning', icon: 'AlertTriangle', text: 'Spending exceeded income this month' })
    }
  }

  // Spending change
  if (previous && previous.expense > 0) {
    const change = ((current.expense - previous.expense) / previous.expense) * 100
    if (change < -10) {
      items.push({ type: 'positive', icon: 'TrendingDown', text: `Spending down ${Math.round(Math.abs(change))}% from last month` })
    } else if (change > 10) {
      items.push({ type: 'warning', icon: 'TrendingUp', text: `Spending up ${Math.round(change)}% from last month` })
    } else {
      items.push({ type: 'info', icon: 'Minus', text: 'Spending consistent with last month' })
    }
  }

  // Streak
  const streak = getLoggingStreak(transactions)
  if (streak >= 7) {
    items.push({ type: 'positive', icon: 'Flame', text: `${streak}-day logging streak maintained` })
  } else if (streak >= 3) {
    items.push({ type: 'info', icon: 'Flame', text: `${streak}-day logging streak` })
  }

  // Subscriptions
  const subs = getSubscriptionSummary(recurring)
  if (subs.count > 0) {
    items.push({ type: 'info', icon: 'Repeat2', text: `${formatCurrency(subs.totalMonthly)} in ${subs.count} subscriptions` })
  }

  // Top category
  const categories = getCategoryBreakdown(transactions, 'expense', year, month)
  if (categories.length > 0) {
    const top = categories[0]
    items.push({ type: 'info', icon: 'PieChart', text: `Most spent on ${top.category}` })
  }

  // Score
  if (score && score.score !== null) {
    const scoreLevel = score.score >= 650 ? 'positive' : score.score >= 500 ? 'info' : 'warning'
    items.push({ type: scoreLevel, icon: 'TrendingUp', text: `Financial score: ${score.score}` })
  }

  // Goals
  const goals = getGoals()
  const achieved = goals.filter((g) => g.saved >= g.target)
  if (achieved.length > 0) {
    items.push({ type: 'positive', icon: 'CheckCircle2', text: `Goal achieved: ${achieved[0].name}` })
  }

  // Income vs expense ratio
  if (current.income > 0 && current.expense > 0) {
    const ratio = current.expense / current.income
    if (ratio < 0.5) {
      items.push({ type: 'positive', icon: 'DollarSign', text: 'Keeping expenses under 50% of income' })
    }
  }

  return {
    month: data[0]?.fullMonth || `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]} ${year}`,
    income: current.income,
    expense: current.expense,
    balance: current.balance,
    transactionCount: current.count,
    items,
    score: score?.score || null,
  }
}
