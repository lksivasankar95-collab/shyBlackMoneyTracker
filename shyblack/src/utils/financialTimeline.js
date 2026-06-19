import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { getGoalProjection } from './goals'
import { calculateHealthScore, getHealthHistory } from './financialHealth'

export function buildTimeline({
  transactions, debts, goals, savingsGoal, budgets,
  storedNetWorthHistory,
}) {
  const timeline = []
  const now = new Date()
  const monthsBack = 12

  const nwHistory = (storedNetWorthHistory || [])
    .filter((h) => {
      const d = new Date(h.date)
      const cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      return d >= cutoff
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const monthlyBrackets = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyBrackets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      start: d,
      end: new Date(now.getFullYear(), now.getMonth() - i + 1, 0),
    })
  }

  const monthlyTxData = monthlyBrackets.map((m) => {
    const txs = transactions.filter((t) => {
      const td = new Date(t.date)
      return td >= m.start && td <= m.end
    })
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
    const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
    return {
      key: m.key,
      label: m.label,
      income,
      expenses,
      net: income - expenses,
    }
  })

  const healthHistory = getHealthHistory(transactions, budgets, debts, goals, monthsBack)

  const debtHistory = monthlyBrackets.map((m) => {
    const txsUpTo = transactions.filter((t) => t.date <= m.end.toISOString().split('T')[0])
    const debtAtTime = debts
      .filter((d) => new Date(d.createdAt || 0) <= m.end)
      .reduce((s, d) => s + (d.remainingAmount || d.amount || 0), 0)
    return {
      key: m.key,
      label: m.label,
      totalDebt: debtAtTime,
    }
  })

  const goalHistory = monthlyBrackets.map((m) => {
    const totalTarget = goals.reduce((s, g) => s + (g.target || 0), 0)
    const totalSaved = goals.reduce((s, g) => {
      const p = getGoalProjection(g)
      return s + (p?.progress ? (g.target || 0) * (p.progress / 100) : (g.saved || 0))
    }, 0)
    return {
      key: m.key,
      label: m.label,
      totalTarget,
      totalSaved,
      progress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
    }
  })

  const savingsHistory = monthlyBrackets.map((m) => {
    const txsUpTo = transactions.filter((t) => t.date <= m.end.toISOString().split('T')[0])
    const income = txsUpTo.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
    const expenses = txsUpTo.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
    return {
      key: m.key,
      label: m.label,
      savings: income - expenses,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
    }
  })

  const nwMonthly = monthlyBrackets.map((m) => {
    const entriesInMonth = nwHistory.filter((h) => {
      const hd = new Date(h.date)
      return hd >= m.start && hd <= m.end
    })
    const last = entriesInMonth[entriesInMonth.length - 1]
    return {
      key: m.key,
      label: m.label,
      netWorth: last ? last.netWorth : null,
      assets: last ? last.assets : null,
      liabilities: last ? last.liabilities : null,
    }
  })

  return {
    monthly: monthlyTxData,
    netWorth: nwMonthly,
    healthScores: healthHistory,
    debts: debtHistory,
    goals: goalHistory,
    savings: savingsHistory,
  }
}

export function getTimelineInsights(timeline) {
  const insights = []

  const nwValues = timeline.netWorth.filter((m) => m.netWorth !== null).map((m) => m.netWorth)
  if (nwValues.length >= 2) {
    const first = nwValues[0]
    const last = nwValues[nwValues.length - 1]
    const change = last - first
    const pct = first !== 0 ? Math.round((change / Math.abs(first)) * 100) : 0
    insights.push({
      type: 'netWorth',
      label: 'Net Worth',
      value: change,
      percentage: pct,
      direction: change >= 0 ? 'up' : 'down',
      summary: pct >= 0 ? `Grew by ${pct}%` : `Declined by ${Math.abs(pct)}%`,
    })
  }

  const healthScores = timeline.healthScores.filter((h) => h.score !== null)
  if (healthScores.length >= 2) {
    const firstScore = healthScores[0].score
    const lastScore = healthScores[healthScores.length - 1].score
    const delta = lastScore - firstScore
    insights.push({
      type: 'health',
      label: 'Financial Health',
      value: delta,
      direction: delta >= 0 ? 'up' : 'down',
      summary: delta >= 0 ? `Improved by ${delta} points` : `Declined by ${Math.abs(delta)} points`,
    })
  }

  const last3 = timeline.monthly.slice(-3)
  if (last3.length >= 3) {
    const avgExpense = last3.reduce((s, m) => s + m.expenses, 0) / last3.length
    const avgIncome = last3.reduce((s, m) => s + m.income, 0) / last3.length
    insights.push({
      type: 'spending',
      label: 'Avg Monthly Spend',
      value: avgExpense,
      direction: avgExpense > avgIncome ? 'up' : 'down',
      summary: avgExpense > avgIncome ? 'Spending exceeds income' : `Saving ${Math.round(avgIncome - avgExpense)}/mo`,
    })
  }

  const debtStart = timeline.debts[0]?.totalDebt || 0
  const debtEnd = timeline.debts[timeline.debts.length - 1]?.totalDebt || 0
  if (debtStart > 0 || debtEnd > 0) {
    const debtChange = debtStart - debtEnd
    insights.push({
      type: 'debt',
      label: 'Debt',
      value: debtChange,
      direction: debtChange >= 0 ? 'down' : 'up',
      summary: debtChange > 0 ? `Reduced by ${Math.round(debtChange)}` : debtChange < 0 ? `Increased by ${Math.round(Math.abs(debtChange))}` : 'Unchanged',
    })
  }

  return insights
}

export function getPeriodTrend(timeline, metric, period) {
  const map = {
    netWorth: timeline.netWorth,
    health: timeline.healthScores,
    income: timeline.monthly,
    expenses: timeline.monthly,
    debt: timeline.debts,
    savings: timeline.savings,
  }
  const data = map[metric]
  if (!data || data.length === 0) return []

  const now = new Date()
  let cutoff
  switch (period) {
    case '3m':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case '6m':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      break
    case '1y':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      break
    default:
      cutoff = new Date(0)
  }

  return data.filter((d) => {
    if (d.date) return new Date(d.date) >= cutoff
    if (d.label) {
      const parts = d.label.split(' ')
      if (parts.length === 2) {
        const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
        const m = monthMap[parts[0]]
        const y = 2000 + parseInt(parts[1])
        if (m !== undefined && !isNaN(y)) {
          return new Date(y, m, 1) >= cutoff
        }
      }
    }
    return true
  })
}
