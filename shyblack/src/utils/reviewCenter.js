import { formatCurrency } from './helpers'
import { DEBT_TYPES, isOpenDebt } from './debts'
import { EMI_STATUS } from './emi'

function getTransactionsInRange(transactions, startDate, endDate) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  return transactions.filter((t) => {
    const ts = new Date(t.date).getTime()
    return ts >= start && ts <= end
  })
}

function generatePeriodSummary(transactions, debts, emis, goals, accounts, label, startDate, endDate) {
  const periodTxs = getTransactionsInRange(transactions, startDate, endDate)
  const totalIncome = periodTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalExpense = periodTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
  const categories = {}
  periodTxs.filter((t) => t.type === 'expense').forEach((t) => {
    categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount)
  })
  const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const activeDebts = debts.filter((d) => d.remainingAmount > 0 && isOpenDebt(d))
  const totalDebtOwed = activeDebts.filter((d) => d.type === DEBT_TYPES.LENT).reduce((s, d) => s + d.remainingAmount, 0)
  const totalDebtBorrowed = activeDebts.filter((d) => d.type === DEBT_TYPES.BORROWED).reduce((s, d) => s + d.remainingAmount, 0)

  const activeEmis = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const totalEmiMonthly = activeEmis.reduce((s, e) => s + (e.emiAmount || e.amount || 0), 0)

  const progressGoals = goals.filter((g) => (g.saved || 0) > 0)
  const totalGoalSaved = progressGoals.reduce((s, g) => s + (g.saved || 0), 0)
  const totalGoalTarget = goals.reduce((s, g) => s + (g.target || 0), 0)

  const netWorth = accounts.reduce((s, a) => s + (a.balance || 0), 0) - totalDebtBorrowed

  return {
    label,
    period: { start: startDate, end: endDate },
    transactionCount: periodTxs.length,
    income: totalIncome,
    expense: totalExpense,
    savings: totalIncome - totalExpense,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0,
    topCategories,
    debts: { owed: totalDebtOwed, borrowed: totalDebtBorrowed, activeCount: activeDebts.length },
    emis: { monthlyTotal: totalEmiMonthly, activeCount: activeEmis.length },
    goals: { saved: totalGoalSaved, target: totalGoalTarget, count: goals.length },
    netWorth,
  }
}

function pad(n) { return String(n).padStart(2, '0') }

export function generateMonthlyReview(transactions, debts, emis, goals, accounts, year, month) {
  const startDate = `${year}-${pad(month + 1)}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return generatePeriodSummary(transactions, debts, emis, goals, accounts, monthName, startDate, endDate)
}

export function generateQuarterlyReview(transactions, debts, emis, goals, accounts, year, quarter) {
  const startMonth = quarter * 3
  const startDate = `${year}-${pad(startMonth + 1)}-01`
  const endDate = `${year}-${pad(startMonth + 3)}-${pad(new Date(year, startMonth + 3, 0).getDate())}`
  const label = `Q${quarter + 1} ${year}`
  return generatePeriodSummary(transactions, debts, emis, goals, accounts, label, startDate, endDate)
}

export function generateYearlyReview(transactions, debts, emis, goals, accounts, year) {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  return generatePeriodSummary(transactions, debts, emis, goals, accounts, String(year), startDate, endDate)
}

export function generateReviewSummary(transactions, debts, emis, goals, accounts) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentQuarter = Math.floor(currentMonth / 3)

  return {
    monthly: generateMonthlyReview(transactions, debts, emis, goals, accounts, currentYear, currentMonth),
    quarterly: generateQuarterlyReview(transactions, debts, emis, goals, accounts, currentYear, currentQuarter),
    yearly: generateYearlyReview(transactions, debts, emis, goals, accounts, currentYear),
  }
}

export function formatReviewAsText(review, formatCurrencyFn) {
  const fmt = formatCurrencyFn || formatCurrency
  const lines = [
    `=== ${review.label} Review ===`,
    '',
    `Income: ${fmt(review.income)}`,
    `Expense: ${fmt(review.expense)}`,
    `Savings: ${fmt(review.savings)} (${review.savingsRate.toFixed(1)}%)`,
    `Transactions: ${review.transactionCount}`,
    '',
    'Top Spending Categories:',
    ...review.topCategories.map(([cat, amt]) => `  ${cat}: ${fmt(amt)}`),
    '',
    `Debts Owed to You: ${fmt(review.debts.owed)}`,
    `Debts You Owe: ${fmt(review.debts.borrowed)}`,
    `Active EMIs: ${review.emis.activeCount} (${fmt(review.emis.monthlyTotal)}/mo)`,
    `Goal Progress: ${fmt(review.goals.saved)} of ${fmt(review.goals.target)}`,
    `Net Worth: ${fmt(review.netWorth)}`,
  ]
  return lines.join('\n')
}
