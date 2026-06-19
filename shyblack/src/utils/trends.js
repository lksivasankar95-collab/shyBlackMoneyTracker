import { getMonthlyData, getCategoryBreakdown } from './analytics'

function getMonthlyDataForYearMonth(transactions, year, month) {
  const allData = getMonthlyData(transactions, 24)
  return allData.find((d) => {
    const monthIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(d.month)
    const dYear = parseInt(d.fullMonth.split(' ')[1])
    return monthIdx === month && dYear === year
  }) || { income: 0, expense: 0, transactions: [] }
}

export function getMonthlyTrends(transactions, months = 12) {
  const now = new Date()
  const trends = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthly = getMonthlyDataForYearMonth(transactions, d.getFullYear(), d.getMonth())
    const income = monthly.income || 0
    const expense = monthly.expense || 0
    trends.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      year: d.getFullYear(), monthIndex: d.getMonth(),
      income, expense,
      savings: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income * 100) : 0,
      count: monthly.transactions?.length || 0,
    })
  }
  return trends
}

export function getSavingsTrend(transactions, months = 12) {
  return getMonthlyTrends(transactions, months).map((m) => ({
    month: m.month,
    savings: m.savings,
    savingsRate: m.savingsRate,
  }))
}

export function getDebtReductionTrend(debts) {
  return debts.map((d) => ({
    personName: d.personName,
    originalAmount: d.amount,
    remainingAmount: d.remainingAmount,
    paidAmount: d.amount - d.remainingAmount,
    progress: d.amount > 0 ? ((d.amount - d.remainingAmount) / d.amount * 100) : 0,
    type: d.type,
  }))
}

export function getEmiProgressTrend(emis) {
  return emis.map((e) => ({
    name: e.name,
    totalMonths: e.totalMonths || 1,
    remainingMonths: e.remainingMonths || 0,
    paidMonths: (e.totalMonths || 1) - (e.remainingMonths || 0),
    progress: e.totalMonths > 0 ? ((e.totalMonths - e.remainingMonths) / e.totalMonths * 100) : 0,
    amount: e.amount,
  }))
}

export function getGoalAchievementTrend(goals) {
  return goals.map((g) => ({
    name: g.name,
    target: g.target,
    saved: g.saved || 0,
    progress: g.target > 0 ? ((g.saved || 0) / g.target * 100) : 0,
    category: g.category,
    deadline: g.deadline,
  }))
}
