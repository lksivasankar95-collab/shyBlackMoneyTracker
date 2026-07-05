import { getMonthlyData, getCategoryBreakdown } from './analytics'
import { EMI_STATUS } from './emi'
import { formatCurrency } from './helpers'

export function generateSpendingInsights(transactions) {
  const insights = []
  if (transactions.length < 2) return insights

  const monthly = getMonthlyData(transactions, 3)
  if (monthly.length < 2) return insights

  const currentMonth = monthly[monthly.length - 1]
  const prevMonth = monthly[monthly.length - 2]

  const currExpense = currentMonth.expense || 0
  const prevExpense = prevMonth.expense || 0

  if (prevExpense > 0) {
    const change = ((currExpense - prevExpense) / prevExpense) * 100
    if (change > 10) {
      insights.push({
        type: 'spending_increase',
        severity: change > 30 ? 'high' : 'medium',
        message: `Spending increased ${Math.round(change)}% compared to last month.`,
        detail: `₹${formatCurrency(currExpense - prevExpense)} more than last month`,
      })
    } else if (change < -10) {
      insights.push({
        type: 'spending_decrease',
        severity: 'positive',
        message: `Spending decreased ${Math.round(Math.abs(change))}% compared to last month.`,
        detail: `₹${formatCurrency(prevExpense - currExpense)} less than last month`,
      })
    }
  }

  const now = new Date()
  const catBreakdown = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  if (catBreakdown.length > 0) {
    const topCategory = catBreakdown.reduce((max, c) => c.amount > max.amount ? c : max, catBreakdown[0])
    insights.push({
      type: 'largest_category',
      severity: 'info',
      message: `Largest expense category: ${topCategory.category}`,
      detail: `₹${formatCurrency(topCategory.amount)} spent this month`,
    })

    if (monthly.length >= 3) {
      const prevCat = getCategoryBreakdown(transactions.slice(0, -1), 'expense',
        new Date(now.getFullYear(), now.getMonth() - 1).getFullYear(),
        new Date(now.getFullYear(), now.getMonth() - 1).getMonth()
      )
      const prevTop = prevCat.reduce((max, c) => c.amount > max.amount ? c : max, prevCat[0])
      if (prevTop && topCategory.category === prevTop.category && topCategory.amount > prevTop.amount * 1.2) {
        insights.push({
          type: 'fastest_growing',
          severity: 'medium',
          message: `${topCategory.category} spending grew ${Math.round((topCategory.amount / prevTop.amount - 1) * 100)}% this month.`,
          detail: `₹${formatCurrency(topCategory.amount - prevTop.amount)} increase`,
        })
      }
    }
  }

  const income = transactions.filter((t) => t.type === 'income')
  if (income.length > 0) {
    const incomeByMonth = {}
    income.forEach((t) => {
      const key = t.date ? t.date.substring(0, 7) : ''
      if (key) incomeByMonth[key] = (incomeByMonth[key] || 0) + t.amount
    })
    const incomeKeys = Object.keys(incomeByMonth).sort()
    if (incomeKeys.length >= 2) {
      const latest = incomeByMonth[incomeKeys[incomeKeys.length - 1]] || 0
      const prev = incomeByMonth[incomeKeys[incomeKeys.length - 2]] || 0
      if (prev > 0 && latest < prev * 0.9) {
        insights.push({
          type: 'income_drop',
          severity: 'high',
          message: `Income dropped ${Math.round((1 - latest / prev) * 100)}% compared to last month.`,
          detail: `₹${formatCurrency(prev - latest)} less income`,
        })
      }
    }
  }

  return insights
}

export function calculateSavingsRate(transactions) {
  const monthly = getMonthlyData(transactions, 3)
  if (monthly.length === 0) return { rate: 0, level: 'No Data', savings: 0, income: 0, expense: 0 }

  const avgIncome = monthly.reduce((s, m) => s + m.income, 0) / monthly.length
  const avgExpense = monthly.reduce((s, m) => s + m.expense, 0) / monthly.length

  if (avgIncome <= 0) return { rate: 0, level: 'No Income', savings: 0, income: 0, expense: avgExpense }

  const savings = avgIncome - avgExpense
  const rate = (savings / avgIncome) * 100

  let level
  if (rate >= 20) level = 'Excellent'
  else if (rate >= 15) level = 'Good'
  else if (rate >= 10) level = 'Average'
  else if (rate >= 0) level = 'Poor'
  else level = 'Negative'

  return { rate: Math.round(rate), level, savings: Math.round(savings), income: Math.round(avgIncome), expense: Math.round(avgExpense) }
}

export function generateSavingsInsights(transactions) {
  const sr = calculateSavingsRate(transactions)
  const insights = []

  if (sr.level === 'Excellent') {
    insights.push({ type: 'savings_excellent', severity: 'positive', message: 'Excellent savings rate of ' + sr.rate + '%. Keep it up!', detail: `Saving ₹${formatCurrency(sr.savings)} per month on average` })
  } else if (sr.level === 'Good') {
    insights.push({ type: 'savings_good', severity: 'positive', message: `Good savings rate of ${sr.rate}%. Aim for 20%+.`, detail: `Saving ₹${formatCurrency(sr.savings)} per month` })
  } else if (sr.level === 'Average') {
    insights.push({ type: 'savings_average', severity: 'info', message: `Savings rate at ${sr.rate}%. Try to increase it.`, detail: `Increase monthly savings by ₹${formatCurrency(Math.round(sr.income * 0.2 - sr.savings))} to reach 20%` })
  } else if (sr.level === 'Poor') {
    insights.push({ type: 'savings_poor', severity: 'medium', message: `Low savings rate of ${sr.rate}%. Consider reducing expenses.`, detail: `Only ₹${formatCurrency(sr.savings)} saved per month` })
  } else if (sr.level === 'Negative') {
    insights.push({ type: 'savings_negative', severity: 'high', message: 'Expenses exceed income.', detail: `Spending ₹${formatCurrency(Math.abs(sr.savings))} more than you earn per month` })
  }

  return insights
}

export function generateEmiInsights(emis, monthlyIncome) {
  const insights = []
  const activeEmis = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)

  if (activeEmis.length === 0) return insights

  const totalMonthlyEMI = activeEmis.reduce((s, e) => s + (e.emiAmount || e.amount || 0), 0)
  const totalOutstanding = activeEmis.reduce((s, e) => s + (e.remainingAmount || 0), 0)
  const totalPaid = activeEmis.reduce((s, e) => s + (e.totalPaid || 0), 0)

  if (monthlyIncome > 0) {
    const burden = (totalMonthlyEMI / monthlyIncome) * 100
    let risk
    if (burden > 50) risk = 'Dangerous'
    else if (burden > 35) risk = 'High Risk'
    else if (burden > 20) risk = 'Moderate Risk'
    else risk = 'Low Risk'

    insights.push({
      type: 'emi_burden',
      severity: burden > 35 ? 'high' : burden > 20 ? 'medium' : 'info',
      message: `EMI burden at ${Math.round(burden)}% of income. ${risk}.`,
      detail: `Total EMI: ₹${formatCurrency(totalMonthlyEMI)} / month`,
    })
  }

  insights.push({
    type: 'emi_outstanding',
    severity: 'info',
    message: `Total EMI outstanding: ₹${formatCurrency(totalOutstanding)}`,
    detail: `${activeEmis.length} active loan(s) · ₹${formatCurrency(totalPaid)} already paid`,
  })

  return insights
}

export function generateDebtInsights(debts) {
  const insights = []
  const activeDebts = debts.filter((d) => d.status !== 'settled' && d.status !== 'closed')
  if (activeDebts.length === 0) return insights

  const totalOutstanding = activeDebts.reduce((s, d) => s + (d.remaining || d.amount || 0), 0)
  insights.push({
    type: 'debt_outstanding',
    severity: totalOutstanding > 100000 ? 'high' : 'medium',
    message: `Total debt outstanding: ₹${formatCurrency(totalOutstanding)}`,
    detail: `${activeDebts.length} active debt(s)`,
  })

  const monthlyPayments = activeDebts.reduce((s, d) => {
    const payments = d.payments || d.paymentHistory || []
    const recent = payments.filter((p) => {
      const d = new Date(p.date || p.paymentDate || Date.now())
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return s + recent.reduce((sum, p) => sum + (p.amount || 0), 0)
  }, 0)

  if (monthlyPayments > 0 && totalOutstanding > 0) {
    const monthsToPayoff = Math.ceil(totalOutstanding / monthlyPayments)
    insights.push({
      type: 'debt_payoff',
      severity: monthsToPayoff > 24 ? 'high' : monthsToPayoff > 12 ? 'medium' : 'positive',
      message: `At current pace, debt can be cleared in ${monthsToPayoff} months.`,
      detail: `₹${formatCurrency(monthlyPayments)} / month repayment`,
    })
  }

  return insights
}

export function generateRecurringInsights(recurring) {
  const insights = []
  if (recurring.length === 0) return insights

  const now = new Date()
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  let upcomingExpense = 0
  let upcomingIncome = 0
  let count = 0

  for (const r of recurring) {
    if (r.status === 'paused' || r.status === 'inactive') continue
    const nextDate = r.nextDate || r.nextRunDate || r.startDate
    if (nextDate && new Date(nextDate) <= next30) {
      if (r.type === 'expense' || r.type === 'income') {
        if (r.type === 'expense') upcomingExpense += r.amount || 0
        else upcomingIncome += r.amount || 0
        count++
      }
    }
  }

  if (count > 0) {
    insights.push({
      type: 'recurring_upcoming',
      severity: upcomingExpense > upcomingIncome ? 'medium' : 'info',
      message: `${count} recurring transaction(s) due in the next 30 days.`,
      detail: `₹${formatCurrency(upcomingExpense)} expenses · ₹${formatCurrency(upcomingIncome)} income`,
    })
  }

  return insights
}

export function calculateFinancialScore(transactions, budgets, debts, emis, _recurring) {
  if (transactions.length === 0) {
    return { score: 0, grade: 'N/A', summary: 'Not enough data to calculate score.', breakdown: [] }
  }

  const monthly = getMonthlyData(transactions, 3)
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0

  const breakdown = []
  let totalScore = 0

  const sr = calculateSavingsRate(transactions)
  let budgetScore = 0
  if (sr.rate >= 20) budgetScore = 25
  else if (sr.rate >= 15) budgetScore = 20
  else if (sr.rate >= 10) budgetScore = 15
  else if (sr.rate >= 5) budgetScore = 10
  else if (sr.rate > 0) budgetScore = 5
  breakdown.push({ category: 'Savings Rate', score: budgetScore, max: 25, detail: `${sr.rate}% savings rate` })
  totalScore += budgetScore

  let debtScore = 0
  const totalDebt = debts.reduce((s, d) => s + (d.remaining || d.amount || 0), 0)
  const activeEmis = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const totalEMIOutstanding = activeEmis.reduce((s, e) => s + (e.remainingAmount || 0), 0)
  const totalBurden = totalDebt + totalEMIOutstanding
  if (avgIncome > 0) {
    const burdenRatio = totalBurden / avgIncome
    if (burdenRatio <= 0.5) debtScore = 25
    else if (burdenRatio <= 1) debtScore = 20
    else if (burdenRatio <= 2) debtScore = 15
    else if (burdenRatio <= 3) debtScore = 10
    else debtScore = 5
  } else {
    debtScore = 15
  }
  breakdown.push({ category: 'Debt Burden', score: debtScore, max: 25, detail: totalBurden > 0 ? `₹${formatCurrency(totalBurden)} total outstanding` : 'No debt' })
  totalScore += debtScore

  let expenseScore = 0
  if (avgIncome > 0) {
    const expRatio = avgExpense / avgIncome
    if (expRatio <= 0.5) expenseScore = 25
    else if (expRatio <= 0.7) expenseScore = 20
    else if (expRatio <= 0.85) expenseScore = 15
    else if (expRatio <= 1) expenseScore = 10
    else expenseScore = 5
  } else {
    expenseScore = 15
  }
  breakdown.push({ category: 'Expense Control', score: expenseScore, max: 25, detail: `${Math.round((avgExpense / (avgIncome || 1)) * 100)}% expense-to-income ratio` })
  totalScore += expenseScore

  let stabilityScore = 0
  const incomeTx = transactions.filter((t) => t.type === 'income')
  if (incomeTx.length >= 2) {
    const months = new Set(incomeTx.map((t) => t.date ? t.date.substring(0, 7) : ''))
    stabilityScore = Math.min(25, months.size * 5)
  } else {
    stabilityScore = 10
  }
  breakdown.push({ category: 'Income Stability', score: stabilityScore, max: 25, detail: `Income in ${new Set(transactions.filter(t => t.type === 'income').map(t => t.date?.substring(0, 7))).size} month(s)` })
  totalScore += stabilityScore

  const finalScore = Math.min(100, Math.max(0, totalScore))
  let grade
  if (finalScore >= 90) grade = 'A+'
  else if (finalScore >= 80) grade = 'A'
  else if (finalScore >= 65) grade = 'B'
  else if (finalScore >= 50) grade = 'C'
  else grade = 'D'

  let summary
  if (finalScore >= 80) summary = 'Excellent financial health. Keep maintaining good habits.'
  else if (finalScore >= 65) summary = 'Good financial health with room for improvement.'
  else if (finalScore >= 50) summary = 'Fair financial health. Consider reviewing your budget and expenses.'
  else summary = 'Financial health needs attention. Review spending, reduce debt, and build savings.'

  return { score: finalScore, grade, summary, breakdown }
}

export function generateSmartRecommendations(transactions, budgets, debts, emis, _goals, _recurring) {
  const recommendations = []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthly = getMonthlyData(transactions, 3)
  const avgIncome = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0

  const activeBudgets = (budgets || []).filter((b) => b.active && b.amount > 0)
  for (const b of activeBudgets) {
    if (b.spent > b.amount) {
      const excess = b.spent - b.amount
      recommendations.push({
        type: 'budget_exceeded',
        category: b.category,
        priority: 'high',
        message: `${b.name} exceeded by ₹${formatCurrency(excess)}.`,
        action: `Reduce ${b.name} spending by ₹${formatCurrency(excess)} to stay within budget.`,
      })
    } else if (b.spent > b.amount * 0.8) {
      const remaining = b.amount - b.spent
      recommendations.push({
        type: 'budget_warning',
        category: b.category,
        priority: 'medium',
        message: `${b.name} at ${Math.round((b.spent / b.amount) * 100)}% of budget.`,
        action: `Only ₹${formatCurrency(remaining)} left for ${b.name} this month.`,
      })
    }
  }

  const sr = calculateSavingsRate(transactions)
  if (sr.level === 'Poor' || sr.level === 'Average') {
    const targetSavings = Math.round(avgIncome * 0.2)
    const currentSavings = sr.savings
    if (targetSavings > currentSavings) {
      recommendations.push({
        type: 'savings_target',
        priority: 'medium',
        message: `Savings rate at ${sr.rate}%.`,
        action: `Increase monthly savings by ₹${formatCurrency(targetSavings - currentSavings)} to reach 20% target.`,
      })
    }
  }

  const activeEmis = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  if (activeEmis.length > 0 && avgIncome > 0) {
    const totalEMI = activeEmis.reduce((s, e) => s + (e.emiAmount || e.amount || 0), 0)
    const emiBurden = (totalEMI / avgIncome) * 100
    if (emiBurden > 40) {
      recommendations.push({
        type: 'debt_high_burden',
        priority: 'high',
        message: `EMI burden is ${Math.round(emiBurden)}% of income.`,
        action: 'Consider debt consolidation or prepayment to reduce EMI burden.',
      })
    }
  }

  const activeDebts = debts.filter((d) => d.status !== 'settled')
  if (activeDebts.length > 0 && avgIncome > 0) {
    const totalDebt = activeDebts.reduce((s, d) => s + (d.remaining || d.amount || 0), 0)
    const debtRatio = (totalDebt / avgIncome) * 100
    if (debtRatio > 40) {
      recommendations.push({
        type: 'debt_burden',
        priority: 'high',
        message: `Debt burden is ${Math.round(debtRatio)}% of monthly income.`,
        action: 'Prioritize high-interest debt repayment to reduce financial stress.',
      })
    }
  }

  const thisMonthExpense = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const foodSpend = thisMonthExpense.filter((t) => t.category === 'food').reduce((s, t) => s + t.amount, 0)
  if (foodSpend > 3000) {
    recommendations.push({
      type: 'food_optimization',
      priority: 'low',
      message: `Food spending at ₹${formatCurrency(foodSpend)} this month.`,
      action: 'Try meal planning to optimize food expenses.',
    })
  }

  return recommendations
}
