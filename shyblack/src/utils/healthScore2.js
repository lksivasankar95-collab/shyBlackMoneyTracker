import { getMonthlyData, compareSpending } from './analytics'
import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { ALL_CATEGORIES } from './constants'

const CATEGORY_WEIGHTS = {
  incomeStability: 10,
  savingsScore: 12,
  expenseControl: 10,
  budgetDiscipline: 8,
  cashFlowHealth: 10,
  debtHealth: 10,
  goalProgress: 8,
  netWorthGrowth: 8,
  tradingCashMgmt: 5,
  emergencyFundHealth: 10,
  recurringPaymentStability: 5,
  financialConsistency: 4,
}

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function getCatLabel(id) {
  const c = ALL_CATEGORIES.find((cat) => cat.id === id)
  return c ? c.label : id
}

function scoreIncomeStability(transactions) {
  const monthly = getMonthlyData(transactions, 6)
  const monthsWithIncome = monthly.filter((m) => m.income > 0).length
  const incomeSources = new Set(
    transactions.filter((t) => t.type === 'income').map((t) => t.category)
  )
  const incomes = monthly.map((m) => m.income)
  const avg = incomes.length > 0 ? incomes.reduce((s, v) => s + v, 0) / incomes.length : 0
  const variance = incomes.length > 0
    ? Math.sqrt(incomes.reduce((s, v) => s + (v - avg) ** 2, 0) / incomes.length)
    : 0
  const stability = avg > 0 ? clamp(100 - (variance / avg) * 50) : 0
  const sourceScore = clamp(incomeSources.size * 20)
  const consistency = clamp((monthsWithIncome / 6) * 100)
  const score = Math.round(stability * 0.4 + sourceScore * 0.3 + consistency * 0.3)
  const detail = incomeSources.size > 1
    ? `${incomeSources.size} sources, ${monthsWithIncome}/6 months active`
    : 'Single income source'
  const trend = incomes.length >= 3
    ? (incomes[incomes.length - 1] > incomes[0] ? 'up' : incomes[incomes.length - 1] < incomes[0] ? 'down' : 'stable')
    : 'stable'
  return { score, detail, trend }
}

function scoreSavings(transactions) {
  const monthly = getMonthlyData(transactions, 3)
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0
  const avgExpense = monthly.length > 0 ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length : 0
  const rate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0
  let score = 0
  if (rate >= 20) score = 100
  else if (rate >= 15) score = 80
  else if (rate >= 10) score = 60
  else if (rate >= 5) score = 40
  else if (rate > 0) score = 20
  return { score, detail: `${Math.round(rate)}% savings rate`, rate }
}

function scoreExpenseControl(transactions) {
  const comparison = compareSpending(transactions)
  if (!comparison) return { score: 50, detail: 'Insufficient data', change: 0 }
  let score = 50
  if (comparison.direction === 'down') {
    score = clamp(50 + Math.abs(comparison.change) * 2, 50, 100)
  } else if (comparison.direction === 'up') {
    score = clamp(50 - comparison.change * 2, 0, 50)
  }
  const direction = comparison.direction === 'up' ? 'increased' : comparison.direction === 'down' ? 'decreased' : 'stable'
  return { score: Math.round(score), detail: `${Math.abs(comparison.change)}% ${direction}`, change: comparison.change }
}

function scoreBudgetDiscipline(budgetsV2) {
  if (!Array.isArray(budgetsV2) || budgetsV2.length === 0) {
    return { score: 0, detail: 'No budgets set', safeCount: 0, totalActive: 0 }
  }
  const active = budgetsV2.filter((b) => b.active !== false)
  if (active.length === 0) return { score: 0, detail: 'No budgets set', safeCount: 0, totalActive: 0 }
  const safe = active.filter((b) => {
    const limit = b.amount || b.limit || 0
    const spent = b.spent || 0
    return limit > 0 && spent <= limit
  }).length
  const pct = (safe / active.length) * 100
  let score = 0
  if (pct >= 90) score = 100
  else if (pct >= 75) score = 80
  else if (pct >= 50) score = 50
  else if (pct >= 25) score = 30
  return { score, detail: `${safe}/${active.length} on track`, safeCount: safe, totalActive: active.length }
}

function scoreCashFlow(transactions) {
  const monthly = getMonthlyData(transactions, 3)
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0
  const avgExpense = monthly.length > 0 ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length : 0
  if (avgIncome === 0) return { score: 0, detail: 'No income data', ratio: 0 }
  const ratio = avgIncome / Math.max(1, avgExpense)
  let score = 0
  if (ratio >= 2) score = 100
  else if (ratio >= 1.5) score = 85
  else if (ratio >= 1.2) score = 70
  else if (ratio >= 1) score = 55
  else if (ratio >= 0.8) score = 35
  else score = 15
  return { score, detail: `${ratio.toFixed(1)}x income/expense`, ratio }
}

function scoreDebtHealth(debts, transactions) {
  const monthly = getMonthlyData(transactions, 3)
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0
  const activeDebts = (Array.isArray(debts) ? debts : []).filter(
    (d) => d.status !== 'settled' && d.status !== 'paid'
  )
  if (activeDebts.length === 0) return { score: 100, detail: 'Debt-free', ratio: 0 }
  const totalDebt = activeDebts.reduce(
    (s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0
  )
  const ratio = avgIncome > 0 ? totalDebt / avgIncome : totalDebt
  let score = 0
  if (ratio === 0) score = 100
  else if (ratio < 1) score = 80
  else if (ratio < 2) score = 60
  else if (ratio < 4) score = 30
  else if (ratio < 6) score = 10
  return { score, detail: ratio > 0 ? `${ratio.toFixed(1)}x income` : 'Debt-free', ratio, activeCount: activeDebts.length }
}

function scoreGoalProgress(goals) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return { score: 0, detail: 'No goals', avgCompletion: 0 }
  }
  const withTarget = goals.filter((g) => g.target > 0)
  if (withTarget.length === 0) return { score: 0, detail: 'No goals', avgCompletion: 0 }
  const completionRatios = withTarget.map((g) => clamp((g.saved || 0) / g.target * 100))
  const avgCompletion = completionRatios.reduce((s, v) => s + v, 0) / completionRatios.length
  let score = 0
  if (avgCompletion >= 80) score = 100
  else if (avgCompletion >= 60) score = 80
  else if (avgCompletion >= 40) score = 60
  else if (avgCompletion >= 20) score = 40
  else if (avgCompletion > 0) score = 20
  return { score: Math.round(score), detail: `${Math.round(avgCompletion)}% avg completion`, avgCompletion }
}

function scoreNetWorthGrowth(netWorthHistory) {
  if (!Array.isArray(netWorthHistory) || netWorthHistory.length < 2) {
    return { score: 50, detail: 'Insufficient history', growth: 0 }
  }
  const valid = netWorthHistory.filter((h) => h.netWorth !== undefined && h.netWorth !== null)
  if (valid.length < 2) return { score: 50, detail: 'Insufficient history', growth: 0 }
  const first = valid[0].netWorth
  const last = valid[valid.length - 1].netWorth
  const growth = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : last > 0 ? 100 : 0
  let score = 50
  if (growth >= 20) score = 100
  else if (growth >= 10) score = 85
  else if (growth >= 5) score = 70
  else if (growth > 0) score = 60
  else if (growth > -10) score = 40
  else if (growth > -20) score = 25
  else score = 10
  const direction = growth > 0 ? 'growing' : growth < 0 ? 'declining' : 'stable'
  return { score, detail: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% ${direction}`, growth }
}

function scoreTradingCashMgmt(transactions) {
  const now = new Date()
  const deposits = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.category === 'trading_deposit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const withdrawals = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.category === 'trading_withdrawal' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalDeposit = deposits.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalWithdrawal = withdrawals.reduce((s, t) => s + Math.abs(t.amount), 0)
  if (totalDeposit === 0 && totalWithdrawal === 0) return { score: 50, detail: 'No trading activity', netFlow: 0 }
  if (totalDeposit === 0) return { score: 80, detail: 'Withdrawals only', netFlow: totalWithdrawal }
  const pnl = ((totalWithdrawal - totalDeposit) / totalDeposit) * 100
  let score = 50
  if (pnl >= 20) score = 100
  else if (pnl >= 10) score = 85
  else if (pnl >= 0) score = 70
  else if (pnl > -20) score = 50
  else if (pnl > -40) score = 30
  else score = 10
  return { score, detail: pnl >= 0 ? `${pnl.toFixed(1)}% profit` : `${Math.abs(pnl).toFixed(1)}% loss`, netFlow: totalWithdrawal - totalDeposit }
}

function scoreEmergencyFund(transactions) {
  const monthly = getMonthlyData(transactions, 3)
  const avgExpense = monthly.length > 0 ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length : 0
  const allIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const allExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalSavings = allIncome - allExpense
  const monthsCovered = avgExpense > 0 ? totalSavings / avgExpense : 0
  let score = 0
  if (monthsCovered >= 6) score = 100
  else if (monthsCovered >= 3) score = 80
  else if (monthsCovered >= 1) score = 50
  else if (monthsCovered > 0) score = 25
  return { score, detail: monthsCovered >= 1 ? `${monthsCovered.toFixed(1)} months covered` : 'Less than 1 month', monthsCovered }
}

function scoreRecurringPayments(recurring, transactions) {
  if (!Array.isArray(recurring) || recurring.length === 0) {
    return { score: 100, detail: 'No recurring payments', ratio: 0 }
  }
  const monthly = getMonthlyData(transactions, 3)
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0
  const activeRecurring = recurring.filter((r) => r.active !== false)
  const recurringExpense = activeRecurring
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => s + Math.abs(r.amount), 0)
  const netRecurringOutflow = recurringExpense
  const ratio = avgIncome > 0 ? netRecurringOutflow / avgIncome : 0
  let score = 0
  if (ratio === 0) score = 100
  else if (ratio < 0.2) score = 90
  else if (ratio < 0.4) score = 60
  else if (ratio < 0.6) score = 30
  else score = 10
  return { score, detail: `${(ratio * 100).toFixed(0)}% of income on recurring`, ratio }
}

function scoreConsistency(transactions) {
  if (transactions.length === 0) return { score: 0, detail: 'No transactions' }
  const now = new Date()
  const dates = new Set(transactions.map((t) => t.date))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (dates.has(dateStr)) { streak++ }
    else if (i > 0) break
  }
  const monthlyCount = getMonthlyData(transactions, 3)
  const avgMonthlyTx = monthlyCount.length > 0
    ? monthlyCount.reduce((s, m) => s + m.count, 0) / monthlyCount.length
    : 0
  let score = 0
  if (streak >= 30) score += 60
  else if (streak >= 14) score += 40
  else if (streak >= 7) score += 25
  else if (streak >= 3) score += 15
  if (avgMonthlyTx >= 20) score += 40
  else if (avgMonthlyTx >= 10) score += 25
  else if (avgMonthlyTx >= 5) score += 15
  return { score: Math.min(100, score), detail: `${streak}-day streak, ${Math.round(avgMonthlyTx)}/mo avg` }
}

export function calculateScore2(transactions, budgetsV2, debts, goals, recurring, netWorthHistory) {
  if (!transactions || transactions.length === 0) {
    return { overall: 0, categories: [], level: 'No Data' }
  }
  const results = {
    incomeStability: scoreIncomeStability(transactions),
    savingsScore: scoreSavings(transactions),
    expenseControl: scoreExpenseControl(transactions),
    budgetDiscipline: scoreBudgetDiscipline(budgetsV2),
    cashFlowHealth: scoreCashFlow(transactions),
    debtHealth: scoreDebtHealth(debts, transactions),
    goalProgress: scoreGoalProgress(goals),
    netWorthGrowth: scoreNetWorthGrowth(netWorthHistory),
    tradingCashMgmt: scoreTradingCashMgmt(transactions),
    emergencyFundHealth: scoreEmergencyFund(transactions),
    recurringPaymentStability: scoreRecurringPayments(recurring, transactions),
    financialConsistency: scoreConsistency(transactions),
  }
  const categories = Object.entries(results).map(([key, data]) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
    score: data.score,
    detail: data.detail,
    weight: CATEGORY_WEIGHTS[key] || 5,
  }))
  const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((s, w) => s + w, 0)
  const weightedSum = categories.reduce((s, c) => s + c.score * c.weight, 0)
  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
  let level = 'Critical'
  if (overall >= 90) level = 'Excellent'
  else if (overall >= 80) level = 'Very Good'
  else if (overall >= 70) level = 'Good'
  else if (overall >= 60) level = 'Average'
  else if (overall >= 40) level = 'Needs Improvement'
  return { overall, categories, level, results }
}

export function detectRisks(transactions, budgetsV2, debts, goals, recurring) {
  const risks = []
  const now = new Date()
  const monthly = getMonthlyData(transactions, 3)
  const currentMonth = monthly[monthly.length - 1]
  const prevMonth = monthly.length >= 2 ? monthly[monthly.length - 2] : null
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0
  const avgExpense = monthly.length > 0 ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length : 0

  if (currentMonth && prevMonth && currentMonth.expense > currentMonth.income &&
      currentMonth.expense > prevMonth.expense * 1.2) {
    risks.push({ type: 'overspending', severity: 'high', message: 'Overspending detected', detail: `Expenses ${prevMonth ? Math.round((currentMonth.expense / prevMonth.expense - 1) * 100) : 0}% higher than last month, exceeding income` })
  }
  if (monthly.length >= 2) {
    const deficitMonths = monthly.filter((m) => m.expense > m.income).length
    if (deficitMonths >= 2) {
      risks.push({ type: 'negative_cashflow', severity: 'high', message: 'Negative cash flow', detail: `${deficitMonths} of the last ${monthly.length} months had expenses exceeding income` })
    }
  }
  const activeDebts = (Array.isArray(debts) ? debts : []).filter(
    (d) => d.status !== 'settled' && d.status !== 'paid'
  )
  if (activeDebts.length > 0) {
    const totalDebt = activeDebts.reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
    if (avgIncome > 0 && totalDebt > avgIncome * 4) {
      risks.push({ type: 'high_debt', severity: 'high', message: 'High debt level', detail: `Total debt (${totalDebt.toLocaleString()}) exceeds 4x monthly income` })
    }
  }
  const savingsRate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0
  if (savingsRate < 5 && avgIncome > 0) {
    risks.push({ type: 'low_savings', severity: 'warning', message: 'Low savings rate', detail: `Saving only ${Math.round(savingsRate)}% of income — below recommended 10-20%` })
  }
  if (Array.isArray(budgetsV2)) {
    const exceeded = budgetsV2.filter((b) => {
      if (b.active === false) return false
      const limit = b.amount || b.limit || 0
      const spent = b.spent || 0
      return limit > 0 && spent > limit
    })
    if (exceeded.length >= 2) {
      risks.push({ type: 'budget_violations', severity: 'warning', message: `${exceeded.length} budgets exceeded`, detail: exceeded.slice(0, 3).map((b) => getCatLabel(b.category)).join(', ') })
    }
  }
  if (Array.isArray(recurring)) {
    const recurringExpense = recurring.filter((r) => r.active !== false && r.type === 'expense')
      .reduce((s, r) => s + Math.abs(r.amount), 0)
    if (avgIncome > 0 && recurringExpense > avgIncome * 0.5) {
      risks.push({ type: 'recurring_payment_risk', severity: 'warning', message: 'High recurring payment burden', detail: `Recurring payments are ${Math.round((recurringExpense / avgIncome) * 100)}% of monthly income` })
    }
  }
  if (Array.isArray(goals)) {
    const delayed = goals.filter((g) => {
      if (!g.targetDate || g.target <= 0) return false
      const due = new Date(g.targetDate)
      return due < now && (g.saved || 0) < g.target
    })
    if (delayed.length > 0) {
      risks.push({ type: 'goal_delay', severity: 'warning', message: `${delayed.length} goal${delayed.length > 1 ? 's' : ''} behind schedule`, detail: delayed.slice(0, 2).map((g) => g.name).join(', ') })
    }
  }
  const year = now.getFullYear()
  const month = now.getMonth()
  const deposits = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.category === 'trading_deposit' && d.getMonth() === month && d.getFullYear() === year
  }).reduce((s, t) => s + Math.abs(t.amount), 0)
  const withdrawals = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.category === 'trading_withdrawal' && d.getMonth() === month && d.getFullYear() === year
  }).reduce((s, t) => s + Math.abs(t.amount), 0)
  if (deposits > 0 && withdrawals < deposits * 0.7) {
    risks.push({ type: 'trading_risk', severity: 'info', message: 'Trading withdrawals lag deposits', detail: `Only ${Math.round((withdrawals / deposits) * 100)}% of deposits withdrawn — net loss likely` })
  }
  const allIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const allExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalSavings = allIncome - allExpense
  const monthsCovered = avgExpense > 0 ? totalSavings / avgExpense : 0
  if (monthsCovered < 3) {
    risks.push({ type: 'emergency_fund_risk', severity: monthsCovered < 1 ? 'high' : 'warning', message: 'Emergency fund below recommendation', detail: `${monthsCovered.toFixed(1)} months covered — aim for 3-6 months` })
  }
  if (transactions.length > 0) {
    const incomeCategories = new Set(
      transactions.filter((t) => t.type === 'income').map((t) => t.category)
    )
    if (incomeCategories.size <= 1) {
      risks.push({ type: 'income_instability', severity: 'info', message: 'Single income source', detail: 'Diversifying income sources can improve financial stability' })
    }
  }
  return risks
}

export function generateRecommendations2(results, _risks) {
  const recs = []
  if (results.savingsScore && results.savingsScore.score < 60) {
    const rate = results.savingsScore.rate || 0
    recs.push({
      priority: 'high',
      category: 'savingsScore',
      reason: `Savings rate is ${rate.toFixed(0)}%`,
      expectedBenefit: 'Build financial cushion and emergency fund faster',
      estimatedImpact: rate < 5 ? '₹5,000-10,000/month additional savings' : '₹2,000-5,000/month additional savings',
      difficulty: rate < 5 ? 'hard' : 'medium',
      action: rate <= 0
        ? 'Start by saving at least 5% of income. Automate a monthly transfer to a savings account.'
        : `Increase savings from ${rate.toFixed(0)}% to 15-20%. Review discretionary spending to find areas to cut.`,
    })
  }
  if (results.expenseControl && results.expenseControl.score < 50) {
    const change = results.expenseControl.change || 0
    recs.push({
      priority: 'high',
      category: 'expenseControl',
      reason: `Expenses ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% vs last month`,
      expectedBenefit: 'Reduce financial stress and increase savings capacity',
      estimatedImpact: change > 0 ? `₹${Math.abs(Math.round(change))}% reduction in expense growth` : 'Maintain downward trend',
      difficulty: 'medium',
      action: 'Track expenses by category. Identify top 3 spending areas and set reduction targets. Cancel unused subscriptions.',
    })
  }
  if (results.debtHealth && results.debtHealth.score < 50) {
    const ratio = results.debtHealth.ratio || 0
    recs.push({
      priority: 'high',
      category: 'debtHealth',
      reason: `Debt is ${ratio.toFixed(1)}x monthly income`,
      expectedBenefit: 'Reduce interest burden and improve financial freedom',
      estimatedImpact: ratio > 4 ? '₹10,000-25,000/month in debt payments' : '₹5,000-10,000/month in debt payments',
      difficulty: 'hard',
      action: ratio > 4
        ? 'Prioritize high-interest debt repayment. Consider debt consolidation for better rates.'
        : 'Use the debt snowball method: pay minimum on all debts, put extra toward the smallest balance.',
    })
  }
  if (results.emergencyFundHealth && results.emergencyFundHealth.score < 50) {
    const covered = results.emergencyFundHealth.monthsCovered || 0
    recs.push({
      priority: 'high',
      category: 'emergencyFundHealth',
      reason: `Emergency fund covers only ${covered.toFixed(1)} months`,
      expectedBenefit: 'Financial protection against emergencies and job loss',
      estimatedImpact: '3-6 months of essential expenses as target',
      difficulty: 'medium',
      action: covered < 1
        ? 'Build emergency fund to at least 1 month of expenses. Start with a small, consistent monthly contribution.'
        : `Increase emergency fund from ${covered.toFixed(1)} to 3-6 months. Set a monthly auto-transfer target.`,
    })
  }
  if (results.budgetDiscipline && results.budgetDiscipline.score < 50) {
    const safe = results.budgetDiscipline.safeCount || 0
    const total = results.budgetDiscipline.totalActive || 0
    recs.push({
      priority: 'medium',
      category: 'budgetDiscipline',
      reason: `${safe}/${total} budgets on track`,
      expectedBenefit: 'Better spending control and awareness',
      estimatedImpact: '10-20% reduction in overspending',
      difficulty: 'easy',
      action: total === 0
        ? 'Set up budgets for major categories (food, transport, bills, shopping). Use past 3 months as reference.'
        : `Review the categories going over budget. Adjust limits or reduce spending. Try the 50/30/20 rule.`,
    })
  }
  if (results.cashFlowHealth && results.cashFlowHealth.score < 60) {
    const ratio = results.cashFlowHealth.ratio || 0
    recs.push({
      priority: 'medium',
      category: 'cashFlowHealth',
      reason: `Income/expense ratio is ${ratio.toFixed(1)}x`,
      expectedBenefit: 'Reduce financial stress and build surplus',
      estimatedImpact: ratio < 1 ? 'Critical — aim for 1.2x minimum' : 'Aim for 1.5x+ for healthy cash flow',
      difficulty: 'hard',
      action: ratio < 1
        ? 'Expenses exceed income. Review all spending categories and cut non-essentials. Consider additional income sources.'
        : 'Maintain positive cash flow by keeping expenses below 80% of income. Build buffer for irregular expenses.',
    })
  }
  if (results.incomeStability && results.incomeStability.score < 50) {
    recs.push({
      priority: 'medium',
      category: 'incomeStability',
      reason: 'Income sources are limited or inconsistent',
      expectedBenefit: 'More predictable monthly income',
      estimatedImpact: '10-30% income diversification',
      difficulty: 'hard',
      action: 'Diversify income through freelancing, side hustles, or investments. Aim for at least 2-3 income streams.',
    })
  }
  if (results.goalProgress && results.goalProgress.score < 50) {
    const avg = results.goalProgress.avgCompletion || 0
    recs.push({
      priority: 'medium',
      category: 'goalProgress',
      reason: `Goals are ${Math.round(avg)}% complete on average`,
      expectedBenefit: 'Achieve financial goals faster',
      estimatedImpact: '₹5,000-15,000/month toward goal achievement',
      difficulty: 'medium',
      action: 'Set specific timelines for each goal. Automate monthly contributions. Review and adjust goals quarterly.',
    })
  }
  if (results.tradingCashMgmt && results.tradingCashMgmt.score < 50) {
    const netFlow = results.tradingCashMgmt.netFlow || 0
    recs.push({
      priority: 'low',
      category: 'tradingCashMgmt',
      reason: netFlow < 0 ? 'Trading losses exceed gains' : 'Trading performance needs improvement',
      expectedBenefit: 'Better trading outcomes',
      estimatedImpact: netFlow < 0 ? 'Stop losses or reduce position sizes' : 'Set profit targets',
      difficulty: 'hard',
      action: netFlow < 0
        ? 'Review trading strategy. Consider reducing position sizes and setting strict stop-losses. Diversify across instruments.'
        : 'Review your trading performance. Consider taking profits at predetermined levels.',
    })
  }
  if (results.recurringPaymentStability && results.recurringPaymentStability.score < 50) {
    const ratio = results.recurringPaymentStability.ratio || 0
    recs.push({
      priority: 'low',
      category: 'recurringPaymentStability',
      reason: `Recurring payments are ${(ratio * 100).toFixed(0)}% of income`,
      expectedBenefit: 'Free up monthly cash flow',
      estimatedImpact: '₹2,000-5,000/month savings from optimizing subscriptions',
      difficulty: 'easy',
      action: 'Review all recurring payments. Cancel unused subscriptions. Negotiate better rates on essential services.',
    })
  }
  return recs
}

export function loadScoreHistory() {
  try {
    return safeStorage.get(STORAGE_KEYS.SCORE_HISTORY, [])
  } catch { return [] }
}

export function saveScoreSnapshot(overall, categories) {
  try {
    const history = loadScoreHistory()
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const existing = history.findIndex((h) => h.month === monthKey)
    const entry = { month: monthKey, score: overall, categories, timestamp: Date.now() }
    if (existing >= 0) {
      history[existing] = entry
    } else {
      history.push(entry)
    }
    history.sort((a, b) => a.month.localeCompare(b.month))
    const trimmed = history.slice(-24)
    safeStorage.set(STORAGE_KEYS.SCORE_HISTORY, trimmed)
    return trimmed
  } catch { return [] }
}

export function getHistoryView(history, range) {
  if (!Array.isArray(history) || history.length === 0) return []
  return history.slice(-range)
}

export function getScoreTrend(history) {
  if (history.length < 2) return { direction: 'stable', change: 0 }
  const valid = history.filter((h) => h.score !== undefined)
  if (valid.length < 2) return { direction: 'stable', change: 0 }
  const current = valid[valid.length - 1].score
  const previous = valid[valid.length - 2].score
  const change = current - previous
  const direction = change > 2 ? 'up' : change < -2 ? 'down' : 'stable'
  return { direction, change, current, previous }
}

const EMERGENCY_FUND_RECOMMENDATION = {
  minimum: 3,
  recommended: 6,
}

export function getCategoryDetails() {
  return Object.entries(CATEGORY_WEIGHTS).map(([key, weight]) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
    weight,
  }))
}

export { EMERGENCY_FUND_RECOMMENDATION }
