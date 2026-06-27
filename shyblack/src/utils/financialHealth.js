import { getMonthlyData, getCategoryBreakdown, compareSpending } from './analytics'
import { getBudgetHealth } from './budgets'
import { getGoalProjection } from './goals'
import { safeStorage, STORAGE_KEYS } from './safeStorage'

export function calculateHealthScore(transactions, budgets, debts, goals) {
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

  const monthly = getMonthlyData(transactions, 3)
  const avgMonthlyExpense = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.expense, 0) / monthly.length
    : 0
  const avgMonthlyIncome = monthly.length > 0
    ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length
    : 0

  const categories = []

  // 1. Savings Rate (0-25)
  let savingsRateScore = 0
  let savingsRate = 0
  if (avgMonthlyIncome > 0) {
    const totalSavings = avgMonthlyIncome - avgMonthlyExpense
    savingsRate = (totalSavings / avgMonthlyIncome) * 100
    if (savingsRate >= 20) savingsRateScore = 25
    else if (savingsRate >= 15) savingsRateScore = 20
    else if (savingsRate >= 10) savingsRateScore = 15
    else if (savingsRate >= 5) savingsRateScore = 10
    else if (savingsRate > 0) savingsRateScore = 5
  }
  categories.push({
    key: 'savingsRate',
    label: 'Savings Rate',
    score: savingsRateScore,
    max: 25,
    detail: savingsRate > 0 ? `${Math.round(savingsRate)}% saved` : 'Not saving',
  })

  // 2. Expense Control (0-25)
  let expenseScore = 25
  const comparison = compareSpending(transactions)
  if (comparison) {
    if (comparison.direction === 'up' && comparison.change > 20) expenseScore = 10
    else if (comparison.direction === 'up') expenseScore = 17
    else if (comparison.direction === 'down') expenseScore = 25
  }
  if (monthExpense > monthIncome && monthIncome > 0) expenseScore = Math.max(5, expenseScore - 10)
  categories.push({
    key: 'expenseControl',
    label: 'Expense Control',
    score: expenseScore,
    max: 25,
    detail: comparison
      ? comparison.direction === 'up'
        ? `${comparison.change}% increase`
        : comparison.direction === 'down'
          ? `${Math.abs(comparison.change)}% decrease`
          : 'Stable'
      : 'Tracking',
  })

  // 3. Debt Ratio (0-20)
  let debtScore = 20
  const totalDebt = debts
    .filter((d) => d.status === 'pending')
    .reduce((s, d) => s + d.remainingAmount, 0)
  if (totalDebt > 0) {
    if (avgMonthlyIncome > 0) {
      const debtToIncome = totalDebt / avgMonthlyIncome
      if (debtToIncome > 6) debtScore = 2
      else if (debtToIncome > 4) debtScore = 5
      else if (debtToIncome > 2) debtScore = 10
      else if (debtToIncome > 1) debtScore = 15
    } else {
      debtScore = 5
    }
  }
  categories.push({
    key: 'debtRatio',
    label: 'Debt Ratio',
    score: debtScore,
    max: 20,
    detail: totalDebt > 0 ? `${Math.round(totalDebt / (avgMonthlyIncome || 1) * 10) / 10}x income` : 'Debt-free',
  })

  // 4. Budget Adherence (0-20)
  let budgetScore = 0
  const budgetEntries = Object.entries(budgets || {}).filter(([, b]) => b.limit > 0)
  if (budgetEntries.length > 0) {
    const health = getBudgetHealth(budgets)
    const adherence = budgetEntries.length > 0
      ? ((budgetEntries.length - health.overBudget) / budgetEntries.length) * 100
      : 0
    if (adherence >= 90) budgetScore = 20
    else if (adherence >= 75) budgetScore = 15
    else if (adherence >= 50) budgetScore = 10
    else if (adherence >= 25) budgetScore = 5
    categories.push({
      key: 'budgetAdherence',
      label: 'Budget Adherence',
      score: budgetScore,
      max: 20,
      detail: budgetEntries.length > 0
        ? `${budgetEntries.length - health.overBudget}/${budgetEntries.length} on track`
        : 'No budgets',
    })
  } else {
    categories.push({
      key: 'budgetAdherence',
      label: 'Budget Adherence',
      score: 0,
      max: 20,
      detail: 'No budgets set',
    })
  }

  // 5. Income Stability (0-10)
  let stabilityScore = 5
  if (transactions.length >= 10) stabilityScore += 2
  if (thisMonth.length >= 5) stabilityScore += 1
  if (monthly.length >= 2 && monthly.every((m) => m.income > 0)) stabilityScore += 2
  stabilityScore = Math.min(10, stabilityScore)
  categories.push({
    key: 'incomeStability',
    label: 'Income Stability',
    score: stabilityScore,
    max: 10,
    detail: transactions.length >= 10 ? `${transactions.length} transactions` : 'Getting started',
  })

  const totalScore = categories.reduce((s, c) => s + c.score, 0)
  const clampedScore = Math.max(0, Math.min(100, totalScore))

  let level = 'Poor'
  if (clampedScore >= 80) level = 'Excellent'
  else if (clampedScore >= 60) level = 'Good'
  else if (clampedScore >= 40) level = 'Fair'

  const recommendations = generateRecommendations(categories, savingsRate, totalDebt, avgMonthlyIncome, goals)

  return { score: clampedScore, categories, recommendations, level }
}

function generateRecommendations(categories, savingsRate, totalDebt, avgMonthlyIncome, goals) {
  const recs = []

  const savingsCat = categories.find((c) => c.key === 'savingsRate')
  if (savingsCat && savingsCat.score < 15) {
    recs.push({
      type: 'saving',
      text: 'Try to save at least 10% of your monthly income. Consider automating transfers to savings.',
      impact: 'high',
      category: 'savingsRate',
    })
  }

  const expenseCat = categories.find((c) => c.key === 'expenseControl')
  if (expenseCat && expenseCat.score < 17) {
    recs.push({
      type: 'spending',
      text: 'Your expenses are rising. Review your spending patterns and identify areas to cut back.',
      impact: 'high',
      category: 'expenseControl',
    })
  }

  const debtCat = categories.find((c) => c.key === 'debtRatio')
  if (debtCat && debtCat.score < 10) {
    recs.push({
      type: 'debt',
      text: 'Your debt-to-income ratio is high. Focus on paying down debts as a priority.',
      impact: 'high',
      category: 'debtRatio',
    })
  }

  const budgetCat = categories.find((c) => c.key === 'budgetAdherence')
  if (budgetCat && budgetCat.score < 10) {
    recs.push({
      type: 'budget',
      text: 'Set and follow category budgets to gain better control over your spending.',
      impact: 'medium',
      category: 'budgetAdherence',
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
        text: `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}. Stay on track with monthly contributions.`,
        impact: 'medium',
        category: 'savingsRate',
      })
    }
  }

  return recs
}

export function getHealthHistory(transactions, budgets, debts, goals, months = 6) {
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

    const result = calculateHealthScore(txsUpTo, budgets, debts, goals || [])
    history.push({
      label: d.toLocaleString('default', { month: 'short' }),
      score: result.score,
    })
  }

  return history
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
