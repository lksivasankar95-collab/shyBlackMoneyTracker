import { getMonthlyData, compareSpending } from './analytics'
import { getBudgetHealth } from './budgets'
import { getBudgetHealthV2 } from './budgetUtils'
import { getGoalProjection } from './goals'
import { isOpenDebt } from './debts'

export function calculateHealthScore(transactions, budgets, debts, goals, budgetsV2 = [], savingsGoal = null) {
  if (transactions.length === 0) {
    return { score: 0, categories: [], recommendations: [], level: 'Not Enough Data' }
  }

  const now = new Date()

  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthExpense = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthIncome = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const monthly = getMonthlyData(transactions, 6)
  const avgMonthlyExpense = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length
    : 0
  const avgMonthlyIncome = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length
    : 0

  const allIncome = transactions.filter((t) => t.type === 'income')
  const totalIncome = allIncome.reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netBalance = totalIncome - totalExpense
  const totalSavingsCalc = (savingsGoal?.saved || 0) + Math.max(0, netBalance)

  const categories = []

  // 1. Savings Rate (0-20)
  let savingsRateScore = 0
  let savingsRate = 0
  if (avgMonthlyIncome > 0) {
    const monthlySavings = avgMonthlyIncome - avgMonthlyExpense
    savingsRate = (monthlySavings / avgMonthlyIncome) * 100
    if (savingsRate >= 20) savingsRateScore = 20
    else if (savingsRate >= 15) savingsRateScore = 16
    else if (savingsRate >= 10) savingsRateScore = 12
    else if (savingsRate >= 5) savingsRateScore = 8
    else if (savingsRate > 0) savingsRateScore = 4
  }
  categories.push({
    key: 'savingsRate',
    label: 'Savings Rate',
    score: savingsRateScore,
    max: 20,
    detail: savingsRate > 0 ? `${Math.round(savingsRate)}% saved` : 'Not saving',
  })

  // 2. Expense Control (0-20)
  let expenseScore = 20
  const comparison = compareSpending(transactions)
  if (comparison) {
    if (comparison.direction === 'up' && comparison.change > 20) expenseScore = 8
    else if (comparison.direction === 'up') expenseScore = 14
    else if (comparison.direction === 'down') expenseScore = 20
  }
  if (monthExpense > monthIncome && monthIncome > 0) expenseScore = Math.max(4, expenseScore - 8)
  categories.push({
    key: 'expenseControl',
    label: 'Expense Control',
    score: expenseScore,
    max: 20,
    detail: comparison
      ? comparison.direction === 'up'
        ? `${comparison.change}% increase`
        : comparison.direction === 'down'
          ? `${Math.abs(comparison.change)}% decrease`
          : 'Stable'
      : 'Tracking',
  })

  // 3. Emergency Fund (0-15) — NEW
  let emergencyScore = 0
  const monthsCovered = avgMonthlyExpense > 0 ? totalSavingsCalc / avgMonthlyExpense : 0
  if (monthsCovered >= 6) emergencyScore = 15
  else if (monthsCovered >= 3) emergencyScore = 10
  else if (monthsCovered >= 1) emergencyScore = 5
  categories.push({
    key: 'emergencyFund',
    label: 'Emergency Fund',
    score: emergencyScore,
    max: 15,
    detail: monthsCovered >= 1
      ? `${Math.round(monthsCovered * 10) / 10} months covered`
      : 'Less than 1 month',
  })

  // 4. Debt Ratio (0-15)
  let debtScore = 15
  const totalDebt = debts
    .filter(isOpenDebt)
    .reduce((s, d) => s + (d.remainingAmount || d.currentBalance || 0), 0)
  if (totalDebt > 0) {
    if (avgMonthlyIncome > 0) {
      const debtToIncome = totalDebt / avgMonthlyIncome
      if (debtToIncome > 6) debtScore = 1
      else if (debtToIncome > 4) debtScore = 4
      else if (debtToIncome > 2) debtScore = 8
      else if (debtToIncome > 1) debtScore = 11
    } else {
      debtScore = 4
    }
  }
  categories.push({
    key: 'debtRatio',
    label: 'Debt Ratio',
    score: debtScore,
    max: 15,
    detail: totalDebt > 0 ? `${Math.round(totalDebt / (avgMonthlyIncome || 1) * 10) / 10}x income` : 'Debt-free',
  })

  // 5. Budget Performance (0-15) — replaces Budget Adherence
  let budgetScore = 0
  let budgetDetail = 'No budgets set'
  if (budgetsV2 && budgetsV2.length > 0) {
    const health = getBudgetHealthV2(budgetsV2)
    const activeCount = health.totalActive
    if (activeCount > 0) {
      const pct = (health.safe / activeCount) * 100
      if (pct >= 90) budgetScore = 15
      else if (pct >= 75) budgetScore = 12
      else if (pct >= 50) budgetScore = 8
      else if (pct >= 25) budgetScore = 4
      budgetDetail = `${health.safe}/${activeCount} on track`
    }
  } else {
    const budgetEntries = Object.entries(budgets || {}).filter(([, b]) => b.limit > 0)
    if (budgetEntries.length > 0) {
      const health = getBudgetHealth(budgets)
      const adherence = budgetEntries.length > 0
        ? ((budgetEntries.length - health.overBudget) / budgetEntries.length) * 100
        : 0
      if (adherence >= 90) budgetScore = 15
      else if (adherence >= 75) budgetScore = 12
      else if (adherence >= 50) budgetScore = 8
      else if (adherence >= 25) budgetScore = 4
      budgetDetail = `${budgetEntries.length - health.overBudget}/${budgetEntries.length} on track`
    }
  }
  categories.push({
    key: 'budgetPerformance',
    label: 'Budget Performance',
    score: budgetScore,
    max: 15,
    detail: budgetDetail,
  })

  // 6. Income Stability (0-15) — expanded
  let stabilityScore = 5
  if (transactions.length >= 10) stabilityScore += 1
  if (thisMonth.length >= 5) stabilityScore += 1

  const monthlyIncomeData = getMonthlyData(transactions, 6)
  const monthsWithIncome = monthlyIncomeData.filter((m) => m.income > 0).length
  if (monthsWithIncome >= 6 && monthlyIncomeData.length >= 6) stabilityScore += 5
  else if (monthsWithIncome >= 3) stabilityScore += 2

  const incomeCategories = new Set(
    transactions.filter((t) => t.type === 'income').map((t) => t.category)
  )
  if (incomeCategories.size >= 3) stabilityScore += 3
  else if (incomeCategories.size >= 2) stabilityScore += 1

  stabilityScore = Math.min(15, stabilityScore)
  categories.push({
    key: 'incomeStability',
    label: 'Income Stability',
    score: stabilityScore,
    max: 15,
    detail: incomeCategories.size > 1
      ? `${incomeCategories.size} income sources`
      : 'Single income source',
  })

  const totalScore = categories.reduce((s, c) => s + c.score, 0)
  const clampedScore = Math.max(0, Math.min(100, totalScore))

  let level = 'Poor'
  if (clampedScore >= 85) level = 'Excellent'
  else if (clampedScore >= 65) level = 'Good'
  else if (clampedScore >= 45) level = 'Fair'

  const recommendations = generateRecommendations(
    categories, savingsRate, totalDebt, avgMonthlyIncome, goals,
    monthsCovered, incomeCategories.size, budgetDetail,
  )

  return {
    score: clampedScore,
    categories,
    recommendations,
    level,
    totalSavings: totalSavingsCalc,
    monthsCovered: Math.round(monthsCovered * 10) / 10,
  }
}

function generateRecommendations(categories, savingsRate, totalDebt, avgMonthlyIncome, goals, monthsCovered, incomeSourceCount, budgetDetail) {
  const recs = []

  const savingsCat = categories.find((c) => c.key === 'savingsRate')
  if (savingsCat && savingsCat.score < 12) {
    recs.push({
      type: 'saving',
      text: savingsRate <= 0
        ? 'You are not saving any income. Start by saving at least 5% of your monthly income. Open a recurring deposit or set up an auto-transfer to a savings account.'
        : `You are saving ${Math.round(savingsRate)}% of your income. Aim for 10-20% by reducing discretionary spending on entertainment, dining out, and shopping.`,
      impact: 'high',
      category: 'savingsRate',
    })
  }

  const expenseCat = categories.find((c) => c.key === 'expenseControl')
  if (expenseCat && expenseCat.score < 12) {
    recs.push({
      type: 'spending',
      text: expenseCat.score < 8
        ? 'Your expenses have increased significantly. Review each category: subscriptions, groceries, utilities. Cancel unused subscriptions and switch to more affordable alternatives.'
        : 'Your expenses are rising. Track daily spending using a budgeting app and identify 2-3 categories where you can reduce spending by 10%.',
      impact: 'high',
      category: 'expenseControl',
    })
  }

  const emergencyCat = categories.find((c) => c.key === 'emergencyFund')
  if (emergencyCat && emergencyCat.score < 10) {
    const target3 = Math.round(avgMonthlyIncome * 3)
    const target6 = Math.round(avgMonthlyIncome * 6)
    recs.push({
      type: 'emergency',
      text: monthsCovered < 1
        ? `You have less than 1 month of expenses saved. Build an emergency fund of at least 3 months of expenses (₹${target3}). Start by saving a fixed amount every month.`
        : `You have ${monthsCovered} months of expenses covered. Aim for 3-6 months of emergency fund (₹${target3} - ₹${target6}).`,
      impact: 'high',
      category: 'emergencyFund',
    })
  }

  const debtCat = categories.find((c) => c.key === 'debtRatio')
  if (debtCat && debtCat.score < 8) {
    recs.push({
      type: 'debt',
      text: totalDebt > avgMonthlyIncome * 4
        ? `Your total debt (₹${Math.round(totalDebt)}) is very high relative to your income. Focus on high-interest debt first, consider debt consolidation, or negotiate with creditors for better terms.`
        : 'Your debt-to-income ratio needs improvement. Try the debt snowball method: list debts from smallest to largest and pay minimum on all except the smallest.',
      impact: 'high',
      category: 'debtRatio',
    })
  }

  const budgetCat = categories.find((c) => c.key === 'budgetPerformance')
  if (budgetCat && budgetCat.score < 8) {
    recs.push({
      type: 'budget',
      text: budgetDetail === 'No budgets set'
        ? 'Set up category budgets for major expense areas (food, transport, bills, shopping, subscriptions). Allocate limits based on your past 3 months of spending.'
        : `${budgetDetail} budgets on track. Review the categories going over budget and either adjust limits or reduce spending in those areas. Use the 50/30/20 rule as a guide.`,
      impact: 'medium',
      category: 'budgetPerformance',
    })
  }

  const incomeCat = categories.find((c) => c.key === 'incomeStability')
  if (incomeCat && incomeCat.score < 10) {
    recs.push({
      type: 'income',
      text: incomeSourceCount < 2
        ? 'You have a single income source. Diversify by exploring side hustles, freelancing, or passive income through investments. Even an additional 5-10% income can boost stability significantly.'
        : `You have ${incomeSourceCount} income sources. Good diversity! Focus on growing the most promising sources and ensuring at least one provides consistent monthly income.`,
      impact: 'medium',
      category: 'incomeStability',
    })
  }

  if (goals && goals.length > 0) {
    const activeGoals = goals.filter((g) => {
      const p = getGoalProjection(g)
      return p && !p.isAchieved
    })
    if (activeGoals.length > 0) {
      recs.push({
        type: 'goal',
        text: activeGoals.length === 1
          ? `You have 1 active goal: ${activeGoals[0].name} (₹${Math.round(activeGoals[0].target - activeGoals[0].saved)} remaining). Stay consistent with monthly contributions.`
          : `You have ${activeGoals.length} active goals: ${activeGoals.slice(0, 2).map((g) => `${g.name} (₹${Math.round(g.target - g.saved)} remaining)`).join(', ')}. Stay consistent with monthly contributions.`,
        impact: 'medium',
        category: 'savingsRate',
      })
    }
  }

  return recs
}

export function getHealthHistory(transactions, budgets, debts, goals, months = 6, budgetsV2, savingsGoal) {
  const now = new Date()
  const history = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const endStr = endDate.toISOString().split('T')[0]

    const txsUpTo = transactions.filter((t) => t.date <= endStr)
    if (txsUpTo.length < 3) {
      history.push({ label: d.toLocaleString('default', { month: 'short' }), score: null })
      continue
    }

    const result = calculateHealthScore(txsUpTo, budgets, debts, goals || [], budgetsV2, savingsGoal)
    history.push({
      label: d.toLocaleString('default', { month: 'short' }),
      score: result.score,
    })
  }

  return history
}

export function getHealthSummary(history) {
  const valid = history.filter((h) => h.score !== null)
  if (valid.length === 0) {
    return { trend: 'stable', average: 0, min: 0, max: 0, current: 0, delta: 0 }
  }
  const scores = valid.map((h) => h.score)
  const average = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const current = scores[scores.length - 1]
  const previous = scores.length > 1 ? scores[scores.length - 2] : current
  const delta = current - previous
  let trend = 'stable'
  if (delta > 3) trend = 'up'
  else if (delta < -3) trend = 'down'
  return { trend, average, min, max, current, delta }
}

export function getHealthOverview(transactions, budgets, debts, goals, budgetsV2, savingsGoal) {
  const health = calculateHealthScore(transactions, budgets, debts, goals, budgetsV2, savingsGoal)
  const sorted = [...health.categories].sort((a, b) => (b.score / b.max) - (a.score / a.max))
  return {
    score: health.score,
    level: health.level,
    best: sorted[0] || null,
    worst: sorted[sorted.length - 1] || null,
    categories: health.categories,
    totalRecommendations: health.recommendations.length,
  }
}

export function getScoreVelocity(history) {
  if (history.length < 2) return null
  const valid = history.filter((h) => h.score !== null)
  if (valid.length < 2) return null
  const current = valid[valid.length - 1].score
  const previous = valid[valid.length - 2].score
  const delta = current - previous
  return { delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same' }
}
