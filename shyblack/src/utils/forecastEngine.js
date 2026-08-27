import { getMonthlyData } from './analytics'
import { calculateHealthScore } from './financialHealth'
import { isOpenDebt } from './debts'

const PERIOD_DAYS = [30, 60, 90, 180, 365]

/* ── helpers ── */

function monthsFromNow(n) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d
}

function avg(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function monthlyFromTxs(transactions, months = 3) {
  return getMonthlyData(transactions, months)
}

function recentTxAmounts(transactions, type, days) {
  const cutoff = Date.now() - days * 86400000
  return transactions.filter((t) => {
    const ts = t.createdAt || new Date(t.date).getTime()
    return t.type === type && ts >= cutoff
  }).map((t) => t.amount)
}

/* ═══════════════════════════════════
   PHASE A — CASHFLOW FORECAST ENGINE
   ═══════════════════════════════════ */

export function forecastCashflow({
  transactions = [],
  recurring = [],
  emis = [],
  debts = [],
  _budgets = {},
} = {}) {
  const monthly = monthlyFromTxs(transactions, 6)
  const avgIncome = monthly.length > 0 ? avg(monthly.map((m) => m.income)) : 0
  const avgExpense = monthly.length > 0 ? avg(monthly.map((m) => m.expense)) : 0

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const currentBalance = Math.max(0, totalIncome - totalExpense)

  const recurringMonthlyIncome = recurring
    .filter((r) => r.type === 'income' && r.active !== false)
    .reduce((s, r) => s + (r.amount || 0), 0)
  const recurringMonthlyExpense = recurring
    .filter((r) => r.type === 'expense' && r.active !== false)
    .reduce((s, r) => s + (r.amount || 0), 0)
  const emiMonthly = emis.filter((e) => e.status === 'active').reduce((s, e) => s + (e.emiAmount || e.amount || 0), 0)
  const debtMonthly = debts.filter(isOpenDebt)
    .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0) * 0.05, 0)

  const baseMonthlyIncome = Math.max(avgIncome, recurringMonthlyIncome)
  const baseMonthlyExpense = Math.max(avgExpense, recurringMonthlyExpense) + emiMonthly + debtMonthly

  const periods = PERIOD_DAYS.map((days) => {
    const months = days / 30
    const monthsInt = Math.round(months)

    const bestIncome = baseMonthlyIncome * 1.1
    const bestExpense = baseMonthlyExpense * 0.9
    const expectedIncome = baseMonthlyIncome
    const expectedExpense = baseMonthlyExpense
    const worstIncome = baseMonthlyIncome * 0.9
    const worstExpense = baseMonthlyExpense * 1.1

    const bestNet = (bestIncome - bestExpense) * monthsInt
    const expectedNet = (expectedIncome - expectedExpense) * monthsInt
    const worstNet = (worstIncome - worstExpense) * monthsInt

    return {
      periodDays: days,
      periodLabel: `${days}d`,
      bestCase: { projectedBalance: currentBalance + bestNet, projectedIncome: bestIncome * monthsInt, projectedExpenses: bestExpense * monthsInt, projectedSavings: bestNet },
      expectedCase: { projectedBalance: currentBalance + expectedNet, projectedIncome: expectedIncome * monthsInt, projectedExpenses: expectedExpense * monthsInt, projectedSavings: expectedNet },
      worstCase: { projectedBalance: currentBalance + worstNet, projectedIncome: worstIncome * monthsInt, projectedExpenses: worstExpense * monthsInt, projectedSavings: worstNet },
    }
  })

  const lastExpense30d = recentTxAmounts(transactions, 'expense', 30).reduce((s, a) => s + a, 0)
  const lastIncome30d = recentTxAmounts(transactions, 'income', 30).reduce((s, a) => s + a, 0)

  const predictedMonthEndBalance = currentBalance + (lastIncome30d - lastExpense30d) / 30 * (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())

  const lowCashThreshold = 5000
  const lowCashAlerts = []
  for (const p of periods) {
    if (p.expectedCase.projectedBalance < lowCashThreshold) {
      const daysToThreshold = Math.round(p.periodDays * (1 - p.expectedCase.projectedBalance / lowCashThreshold))
      lowCashAlerts.push(`Projected balance may fall below ₹${lowCashThreshold.toLocaleString()} in ${clamp(daysToThreshold, 1, p.periodDays)} days.`)
    }
  }

  const monthlyIncomeArr = monthly.map((m) => m.income)
  const monthlyExpenseArr = monthly.map((m) => m.expense)
  const incomeStability = monthlyIncomeArr.length >= 2
    ? (monthlyIncomeArr.every((v) => v > 0) ? 0.8 : 0.5)
    : 0.3
  const expenseConsistency = monthlyExpenseArr.length >= 2
    ? 1 - Math.min(1, Math.abs(monthlyExpenseArr[monthlyExpenseArr.length - 1] - avg(monthlyExpenseArr)) / (avg(monthlyExpenseArr) || 1))
    : 0.3
  const confidenceScore = Math.round(clamp((incomeStability + expenseConsistency) / 2 * 100, 0, 100))

  const midPeriod = periods[2]
  const projectedIncome = midPeriod?.expectedCase.projectedIncome || 0
  const projectedExpenses = midPeriod?.expectedCase.projectedExpenses || 0
  const projectedSavings = midPeriod?.expectedCase.projectedSavings || 0

  return {
    currentBalance,
    projectedBalance: midPeriod?.expectedCase.projectedBalance || currentBalance,
    projectedIncome,
    projectedExpenses,
    projectedSavings,
    confidenceScore,
    periods,
    predictedMonthEndBalance,
    lowCashAlerts,
    scenarios: {
      bestCase: periods.map((p) => ({ periodDays: p.periodDays, balance: p.bestCase.projectedBalance })),
      expectedCase: periods.map((p) => ({ periodDays: p.periodDays, balance: p.expectedCase.projectedBalance })),
      worstCase: periods.map((p) => ({ periodDays: p.periodDays, balance: p.worstCase.projectedBalance })),
    },
    avgMonthlyIncome: baseMonthlyIncome,
    avgMonthlyExpenses: baseMonthlyExpense,
  }
}

/* ═══════════════════════════════════
   PHASE B — GOAL FORECASTING
   ═══════════════════════════════════ */

export function forecastGoal(goal) {
  if (!goal || !goal.target || goal.target <= 0) return null
  const savedAmt = goal.saved || 0
  const remaining = Math.max(0, goal.target - savedAmt)
  const monthly = goal.monthlyContribution || 0

  const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : null
  const targetDate = monthsToGoal !== null ? monthsFromNow(monthsToGoal) : null

  const progress = goal.target > 0 ? Math.min(100, (savedAmt / goal.target) * 100) : 0
  return {
    remaining,
    progress,
    monthsToGoal,
    targetDate: targetDate ? targetDate.toISOString().split('T')[0] : null,
    targetLabel: targetDate
      ? targetDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      : 'Not enough data',
    isAchieved: goal.saved >= goal.target,
  }
}

export function getGoalHealthScore(goal) {
  if (!goal || goal.target <= 0) return { score: 0, status: 'No Data', level: 'N/A' }
  const p = forecastGoal(goal)
  if (!p || p.isAchieved) return { score: 100, status: 'achieved', level: 'Completed' }

  const progress = p.progress
  const monthsRatio = p.monthsToGoal !== null
    ? Math.max(0, 1 - p.monthsToGoal / 60)
    : 0

  let score = Math.round(progress * 0.4 + monthsRatio * 60)
  score = clamp(score, 0, 100)

  let status, level
  if (score >= 75) { status = 'on_track'; level = 'On Track' }
  else if (score >= 50) { status = 'slightly_delayed'; level = 'Slightly Delayed' }
  else if (score >= 25) { status = 'high_risk'; level = 'High Risk' }
  else { status = 'unachievable'; level = 'Unachievable' }

  return { score, status, level }
}

export function getGoalRecommendations(goal, transactions = []) {
  const recs = []
  if (!goal || goal.target <= 0) return recs
  const p = forecastGoal(goal)
  if (!p || p.isAchieved) return recs

  const health = getGoalHealthScore(goal)
  if (health.status === 'unachievable') {
    recs.push(`Consider reducing your target for "${goal.name}" by ₹${Math.round(goal.target * 0.3).toLocaleString()} to make it achievable.`)
  }

  if (p.monthsToGoal !== null && p.monthsToGoal > 36) {
    const extraNeeded = Math.ceil((goal.target - goal.saved) / 36 - goal.monthlyContribution)
    if (extraNeeded > 0) {
      recs.push(`Increase savings by ₹${extraNeeded.toLocaleString()}/month to reach "${goal.name}" in 3 years.`)
    }
  }

  if (health.status === 'high_risk' && goal.monthlyContribution > 0) {
    const boost = Math.ceil(goal.monthlyContribution * 0.25)
    recs.push(`Increase savings by ₹${boost.toLocaleString()}/month for "${goal.name}".`)
  }

  if (transactions.length > 0) {
    const discretionary = transactions
      .filter((t) => t.type === 'expense' && ['food', 'shopping', 'subscription'].includes(t.category))
      .reduce((s, t) => s + t.amount, 0)
    const avgDisc = discretionary / Math.max(1, transactions.filter((t) => t.type === 'expense').length)
    if (avgDisc > 1000) {
      recs.push(`Reduce discretionary spending by ₹${Math.round(avgDisc * 0.3).toLocaleString()} to save more.`)
    }
  }

  return recs
}

/* ═══════════════════════════════════
   PHASE C — EMI PAYOFF FORECAST
   ═══════════════════════════════════ */

export function forecastEmiPayoff(emi, extraMonthly = 0) {
  if (!emi || !emi.remainingAmount || emi.remainingAmount <= 0) return null
  const monthlyEmi = emi.emiAmount || emi.amount || 0
  const remaining = emi.remainingAmount || 0
  const rate = (emi.interestRate || 0) / 100 / 12

  const currentMonths = rate > 0 && monthlyEmi > rate * remaining
    ? Math.ceil(Math.log(monthlyEmi / (monthlyEmi - rate * remaining)) / Math.log(1 + rate))
    : Math.ceil(remaining / Math.max(monthlyEmi, 1))
  const currentClosureDate = monthsFromNow(currentMonths)

  const totalWithCurrent = currentMonths * monthlyEmi
  const interestWithCurrent = Math.max(0, totalWithCurrent - remaining)

  const acceleratedMonthly = monthlyEmi + extraMonthly
  const acceleratedMonths = rate > 0 && acceleratedMonthly > rate * remaining
    ? Math.ceil(Math.log(acceleratedMonthly / (acceleratedMonthly - rate * remaining)) / Math.log(1 + rate))
    : Math.ceil(remaining / Math.max(acceleratedMonthly, 1))
  const acceleratedClosureDate = monthsFromNow(acceleratedMonths)

  const totalWithAccelerated = acceleratedMonths * acceleratedMonthly
  const interestWithAccelerated = Math.max(0, totalWithAccelerated - remaining)
  const interestSaved = interestWithCurrent - interestWithAccelerated

  const monthsSaved = currentMonths - acceleratedMonths
  const loanName = emi.loanName || emi.name || 'Loan'

  return {
    loanName,
    current: {
      monthsToClosure: currentMonths,
      closureDate: currentClosureDate.toISOString().split('T')[0],
      closureLabel: currentClosureDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalInterest: Math.round(interestWithCurrent),
      totalPayment: Math.round(totalWithCurrent),
      pace: 'current',
    },
    accelerated: extraMonthly > 0 ? {
      monthsToClosure: acceleratedMonths,
      closureDate: acceleratedClosureDate.toISOString().split('T')[0],
      closureLabel: acceleratedClosureDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalInterest: Math.round(interestWithAccelerated),
      totalPayment: Math.round(totalWithAccelerated),
      pace: 'accelerated',
      extraMonthly,
    } : null,
    monthsSaved: Math.max(0, monthsSaved),
    interestSaved: Math.max(0, Math.round(interestSaved)),
  }
}

/* ═══════════════════════════════════
   PHASE D — WEALTH FORECAST ENGINE
   ═══════════════════════════════════ */

export function forecastWealth({
  wealthAssets = [],
  accounts = [],
  transactions = [],
  debts = [],
  emis = [],
  model = 'balanced',
} = {}) {
  const totalAssets = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const accountBalances = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0)
  const totalLiabilities = [...(emis || []), ...(debts || [])]
    .reduce((s, e) => s + ((e.remainingAmount ?? e.currentBalance ?? 0)), 0)

  const monthly = monthlyFromTxs(transactions, 6)
  const avgSavings = monthly.length > 0 ? avg(monthly.map((m) => m.income - m.expense)) : 0

  const growthRates = { conservative: 0.004, balanced: 0.007, aggressive: 0.012 }
  const monthlyGrowthRate = growthRates[model] || growthRates.balanced
  const monthlyDebtReduction = totalLiabilities > 0 ? Math.max(0, avgSavings * 0.2) : 0

  const periods = PERIOD_DAYS.map((days) => {
    const months = days / 30
    let projectedAssets = totalAssets + accountBalances
    let projectedDebt = totalLiabilities
    for (let i = 0; i < Math.round(months); i++) {
      projectedAssets = projectedAssets * (1 + monthlyGrowthRate) + Math.max(0, avgSavings * 0.6)
      projectedDebt = Math.max(0, projectedDebt - monthlyDebtReduction)
    }
    return {
      periodDays: days,
      periodLabel: `${days}d`,
      projectedAssets: Math.round(projectedAssets),
      projectedDebt: Math.round(projectedDebt),
      projectedNetWorth: Math.round(projectedAssets - projectedDebt),
    }
  })

  return {
    currentNetWorth: Math.round(totalAssets + accountBalances - totalLiabilities),
    currentAssets: Math.round(totalAssets + accountBalances),
    currentLiabilities: Math.round(totalLiabilities),
    model,
    periods,
    projectedNetWorth30d: periods[0]?.projectedNetWorth || 0,
    projectedNetWorth90d: periods[2]?.projectedNetWorth || 0,
    projectedNetWorth180d: periods[3]?.projectedNetWorth || 0,
    projectedNetWorth365d: periods[4]?.projectedNetWorth || 0,
  }
}

/* ═══════════════════════════════════
   PHASE E — BUDGET RISK PREDICTION
   ═══════════════════════════════════ */

export function predictBudgetRisk(categoryId, transactions = [], budgets = {}) {
  const budget = budgets[categoryId]
  if (!budget || !budget.limit) return null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysRemaining = daysInMonth - dayOfMonth

  const monthSpend = transactions
    .filter((t) => {
      const d = new Date(t.date)
      return t.type === 'expense' && t.category === categoryId && d >= monthStart && d <= now
    })
    .reduce((s, t) => s + t.amount, 0)

  const dailyAvgSoFar = dayOfMonth > 0 ? monthSpend / dayOfMonth : 0
  const projectedMonthTotal = monthSpend + dailyAvgSoFar * daysRemaining

  const breachProbability = budget.limit > 0
    ? clamp(Math.round((projectedMonthTotal / budget.limit) * 100), 0, 100)
    : 0

  const willExceed = projectedMonthTotal > budget.limit

  return {
    categoryId,
    budget: budget.limit,
    currentSpend: Math.round(monthSpend),
    projectedTotal: Math.round(projectedMonthTotal),
    breachProbability,
    willExceed,
    daysRemaining,
    dailyAvg: Math.round(dailyAvgSoFar),
    overshootAmount: Math.max(0, Math.round(projectedMonthTotal - budget.limit)),
  }
}

export function getOverspendingDetection(transactions = [], budgets = {}) {
  const categories = Object.keys(budgets).filter((k) => budgets[k].limit > 0)
  return categories
    .map((cat) => predictBudgetRisk(cat, transactions, budgets))
    .filter(Boolean)
    .filter((r) => r.breachProbability > 50)
    .sort((a, b) => b.breachProbability - a.breachProbability)
}

/* ═══════════════════════════════════
   PHASE F — RETIREMENT PLANNER
   ═══════════════════════════════════ */

export function calculateRetirement({
  currentAge = 30,
  retirementAge = 60,
  monthlyInvestment = 0,
  currentSavings = 0,
  expectedReturn = 8,
  monthlyExpensesInRetirement = 0,
} = {}) {
  const yearsToRetirement = Math.max(1, retirementAge - currentAge)
  const monthsToRetirement = yearsToRetirement * 12
  const monthlyRate = expectedReturn / 100 / 12

  let retirementCorpus = currentSavings
  for (let i = 0; i < monthsToRetirement; i++) {
    retirementCorpus = retirementCorpus * (1 + monthlyRate) + monthlyInvestment
  }

  retirementCorpus = Math.round(retirementCorpus)

  const withdrawalRate = 0.04
  const monthlyRetirementIncome = Math.round(retirementCorpus * withdrawalRate / 12)

  const targetMonthlyIncome = monthlyExpensesInRetirement || monthlyInvestment * 0.7
  const readinessScore = targetMonthlyIncome > 0
    ? clamp(Math.round((monthlyRetirementIncome / targetMonthlyIncome) * 100), 0, 100)
    : 50

  let readinessLevel
  if (readinessScore >= 100) readinessLevel = 'Fully Ready'
  else if (readinessScore >= 75) readinessLevel = 'Well Prepared'
  else if (readinessScore >= 50) readinessLevel = 'On Track'
  else if (readinessScore >= 25) readinessLevel = 'Needs Attention'
  else readinessLevel = 'Critical'

  return {
    currentAge,
    retirementAge,
    yearsToRetirement,
    monthlyInvestment,
    currentSavings,
    expectedReturn,
    retirementCorpus,
    monthlyRetirementIncome,
    targetMonthlyIncome,
    readinessScore,
    readinessLevel,
  }
}

/* ═══════════════════════════════════
   PHASE G — EMERGENCY FUND PLANNER
   ═══════════════════════════════════ */

export function calculateEmergencyFund({
  monthlyExpenses = 0,
  currentSavings = 0,
  monthsToCover = 6,
} = {}) {
  const recommended = monthlyExpenses * monthsToCover
  const currentCoverage = currentSavings
  const monthsCovered = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0
  const gap = Math.max(0, recommended - currentSavings)
  const coveragePercent = recommended > 0
    ? clamp(Math.round((currentSavings / recommended) * 100), 0, 100)
    : 0

  let status
  if (coveragePercent >= 100) status = 'fully_funded'
  else if (coveragePercent >= 50) status = 'partially_funded'
  else status = 'underfunded'

  let statusLabel
  if (coveragePercent >= 100) statusLabel = 'Fully Funded'
  else if (coveragePercent >= 50) statusLabel = 'Partially Funded'
  else statusLabel = 'Underfunded'

  return {
    recommendedFund: Math.round(recommended),
    currentCoverage: Math.round(currentCoverage),
    monthsCovered: Math.round(monthsCovered * 10) / 10,
    gap: Math.round(gap),
    coveragePercent,
    monthsToCover,
    status,
    statusLabel,
  }
}

export function getEmergencyFundFromTransactions(transactions = [], currentSavings = 0) {
  const monthly = monthlyFromTxs(transactions, 3)
  const avgMonthlyExpenses = monthly.length > 0 ? avg(monthly.map((m) => m.expense)) : 0
  return calculateEmergencyFund({
    monthlyExpenses: avgMonthlyExpenses,
    currentSavings,
    monthsToCover: 6,
  })
}

/* ═══════════════════════════════════
   PHASE H — FINANCIAL HEALTH FORECAST
   ═══════════════════════════════════ */

export function forecastFinancialHealth({
  transactions = [],
  budgets = {},
  debts = [],
  goals = [],
} = {}) {
  const currentScore = calculateHealthScore(transactions, budgets, debts, goals)
  const monthly = monthlyFromTxs(transactions, 6)

  const expenseTrend = monthly.length >= 2
    ? (monthly[monthly.length - 1].expense - monthly[0].expense) / monthly.length
    : 0
  const incomeTrend = monthly.length >= 2
    ? (monthly[monthly.length - 1].income - monthly[0].income) / monthly.length
    : 0
  const savingsTrend = monthly.length >= 2
    ? (monthly[monthly.length - 1].balance - monthly[0].balance) / monthly.length
    : 0

  const base = currentScore.score || 50
  const monthlyDelta = Math.round((savingsTrend > 0 ? 2 : -1) + (incomeTrend > 0 ? 1 : -0.5) + (expenseTrend < 0 ? 1 : -0.5))

  const periods = PERIOD_DAYS.map((days) => {
    const months = Math.round(days / 30)
    const projected = clamp(base + monthlyDelta * months, 0, 100)
    const change = projected - base
    return {
      periodDays: days,
      periodLabel: `${days}d`,
      score: projected,
      direction: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
    }
  })

  return {
    currentScore: base,
    currentLevel: currentScore.level,
    periods,
    trend: periods[periods.length - 1]?.direction || 'stable',
  }
}

/* ═══════════════════════════════════
   SMART RECOMMENDATION ENGINE
   ═══════════════════════════════════ */

export function generateForecastRecommendations({
  transactions = [],
  goals = [],
  emis = [],
  debts = [],
  budgets = {},
  forecastConfig: _forecastConfig = {},
} = {}) {
  const recs = []
  const cashflow = forecastCashflow({ transactions, emis, debts, budgets })

  if (cashflow.confidenceScore < 40) {
    recs.push({ type: 'cashflow', text: 'Income is unstable. Consider building a consistent income stream.', impact: 'high' })
  }

  if (cashflow.lowCashAlerts.length > 0) {
    recs.push({ type: 'emergency', text: cashflow.lowCashAlerts[0], impact: 'high' })
  }

  const avgMonthlyExpense = cashflow.avgMonthlyExpenses
  const currentBalance = cashflow.currentBalance
  const emergencyMonths = avgMonthlyExpense > 0 ? currentBalance / avgMonthlyExpense : 0
  if (emergencyMonths < 3) {
    recs.push({ type: 'emergency_fund', text: `Emergency fund covers only ${Math.round(emergencyMonths * 10) / 10} months. Aim for 6 months of expenses.`, impact: 'high' })
  }

  const savingsRate = cashflow.avgMonthlyIncome > 0
    ? ((cashflow.avgMonthlyIncome - cashflow.avgMonthlyExpenses) / cashflow.avgMonthlyIncome) * 100
    : 0
  if (savingsRate < 10 && cashflow.avgMonthlyIncome > 0) {
    const targetSavings = cashflow.avgMonthlyIncome * 0.15
    const currentSavings = cashflow.avgMonthlyIncome - cashflow.avgMonthlyExpenses
    const extra = Math.round(targetSavings - currentSavings)
    if (extra > 0) {
      recs.push({ type: 'savings_rate', text: `Increase savings rate from ${Math.round(savingsRate)}% to 15% (₹${extra.toLocaleString()}/month more).`, impact: 'medium' })
    }
  }

  goals.forEach((g) => {
    const health = getGoalHealthScore(g)
    if (health.status === 'high_risk' || health.status === 'unachievable') {
      const recommendations = getGoalRecommendations(g, transactions)
      recommendations.forEach((r) => recs.push({ type: 'goal', text: r, impact: 'medium' }))
    }
  })

  const activeEmis = emis.filter((e) => e.status === 'active')
  activeEmis.forEach((emi) => {
    const extraAmount = Math.round((emi.emiAmount || emi.amount || 0) * 0.3)
    const payoff = forecastEmiPayoff(emi, extraAmount)
    if (payoff && payoff.monthsSaved > 3) {
      recs.push({ type: 'emi', text: `Allocate surplus cash toward EMI reduction — save ${payoff.monthsSaved} months of interest on "${payoff.loanName}".`, impact: 'high' })
    }
  })

  return recs
}

/* ═══════════════════════════════════
   WHAT-IF SCENARIOS
   ═══════════════════════════════════ */

export function simulateScenario(transactions = [], scenario = {}) {
  const {
    salaryIncrease = 0,
    emiReduction = 0,
    savingsIncrease = 0,
    expenseReduction = 0,
    lumpSum = 0,
  } = scenario

  const adjusted = transactions.map((t) => {
    let amount = t.amount
    if (t.type === 'income' && salaryIncrease > 0) {
      amount = amount * (1 + salaryIncrease / 100)
    }
    return { ...t, amount }
  })

  const income = adjusted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = adjusted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const monthly = monthlyFromTxs(adjusted, 3)
  const baselineMonthly = monthlyFromTxs(transactions, 3)
  const avgMonthlyIncome = monthly.length > 0 ? avg(monthly.map((m) => m.income)) : 0
  const avgMonthlyExpense = monthly.length > 0 ? avg(monthly.map((m) => m.expense)) : 0
  const baselineAvgIncome = baselineMonthly.length > 0 ? avg(baselineMonthly.map((m) => m.income)) : 0
  const baselineAvgExpense = baselineMonthly.length > 0 ? avg(baselineMonthly.map((m) => m.expense)) : 0

  const emiSavings = emiReduction > 0 ? emiReduction : 0
  const extraSavings = savingsIncrease > 0 ? savingsIncrease : 0
  const expenseCut = expenseReduction > 0 ? expenseReduction : 0

  const monthlySurplus = avgMonthlyIncome - avgMonthlyExpense + emiSavings + extraSavings + expenseCut
  const baselineSurplus = Math.round(baselineAvgIncome - baselineAvgExpense)
  const oneTime = lumpSum > 0 ? lumpSum : 0
  const currentBalance = Math.max(0, income - expense) + oneTime

  const periods = PERIOD_DAYS.map((days) => {
    const months = days / 30
    const projectedBalance = currentBalance + monthlySurplus * months
    return {
      periodDays: days,
      periodLabel: `${days}d`,
      projectedBalance: Math.round(projectedBalance),
      monthlySurplus: Math.round(monthlySurplus),
    }
  })

  const summaryParts = []
  if (salaryIncrease > 0) summaryParts.push(`Salary +${salaryIncrease}%`)
  if (emiReduction > 0) summaryParts.push(`EMI -₹${emiReduction.toLocaleString()}`)
  if (savingsIncrease > 0) summaryParts.push(`Savings +₹${savingsIncrease.toLocaleString()}/mo`)
  if (expenseReduction > 0) summaryParts.push(`Expense -₹${expenseReduction.toLocaleString()}/mo`)
  if (lumpSum > 0) summaryParts.push(`Lump sum ₹${lumpSum.toLocaleString()}`)

  const summary = summaryParts.length > 0
    ? `${summaryParts.join(', ')} → Monthly surplus ₹${Math.round(monthlySurplus).toLocaleString()}`
    : `Monthly surplus ₹${Math.round(monthlySurplus).toLocaleString()}`

  return {
    scenario,
    currentBalance: Math.round(currentBalance),
    monthlySurplus: Math.round(monthlySurplus),
    baselineSurplus,
    improvement: Math.round(monthlySurplus) - baselineSurplus,
    periods,
    annualSavings: Math.round(monthlySurplus * 12),
    projectedBalance365d: periods[4]?.projectedBalance || 0,
    summary,
  }
}

/**
 * Evaluates each single "lever" against the baseline and picks the one that
 * grows annual savings the most. Great for a "what should I do next" card.
 */
export function getBestScenarioLever(transactions = [], customLevers = null) {
  const options = Array.isArray(customLevers)
    ? customLevers
    : [
        { key: 'salary', label: 'Salary +10%', scenario: { salaryIncrease: 10 } },
        { key: 'spending', label: 'Cut spending ₹2,000/mo', scenario: { expenseReduction: 2000 } },
        { key: 'emi', label: 'Refinance EMI −₹2,000/mo', scenario: { emiReduction: 2000 } },
        { key: 'savings', label: 'Save ₹2,000/mo more', scenario: { savingsIncrease: 2000 } },
      ]

  const baseline = simulateScenario(transactions, {})
  let best = null
  for (const opt of options) {
    const result = simulateScenario(transactions, opt.scenario)
    const gain = result.annualSavings - baseline.annualSavings
    if (!best || gain > best.gain) {
      best = { key: opt.key, label: opt.label, scenario: opt.scenario, gain, result }
    }
  }

  return best
    ? {
        key: best.key,
        label: best.label,
        gain: best.gain,
        monthlySurplus: best.result.monthlySurplus,
        annualSavings: best.result.annualSavings,
        improvement: best.result.improvement,
      }
    : null
}

/* ═══════════════════════════════════
   DASHBOARD STATS
   ═══════════════════════════════════ */

export function getForecastDashboardStats({
  transactions = [],
  recurring = [],
  emis = [],
  debts = [],
  goals = [],
  budgets = {},
  wealthAssets: _wealthAssets = [],
  accounts: _accounts = [],
} = {}) {
  const cashflow = forecastCashflow({ transactions, recurring, emis, debts, budgets })
  const ret = calculateRetirement({
    currentSavings: cashflow.currentBalance,
    monthlyInvestment: Math.round(cashflow.avgMonthlyIncome * 0.1),
  })
  const ef = getEmergencyFundFromTransactions(transactions, cashflow.currentBalance)

  const forecastCount = goals.length + emis.filter((e) => e.status === 'active').length

  return {
    forecastCount,
    cashflowConfidence: cashflow.confidenceScore,
    projectedBalance: cashflow.projectedBalance,
    predictedMonthEndBalance: cashflow.predictedMonthEndBalance,
    lowCashAlerts: cashflow.lowCashAlerts.length,
    retirementReadiness: ret.readinessScore,
    retirementLevel: ret.readinessLevel,
    emergencyFundProgress: ef.coveragePercent,
    emergencyFundStatus: ef.status,
    goalForecastCount: goals.filter((g) => {
      const p = forecastGoal(g)
      return p && !p.isAchieved
    }).length,
    atRiskGoals: goals.filter((g) => {
      const h = getGoalHealthScore(g)
      return h.status === 'high_risk' || h.status === 'unachievable'
    }).length,
  }
}
