import { getCategoryBreakdown } from './analytics'
import { ALL_CATEGORIES } from './constants'

function getDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr() {
  return getDateKey(new Date())
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const mon = new Date(now)
  mon.setDate(now.getDate() - diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { start: getDateKey(mon), end: getDateKey(sun) }
}

function filterByDateRange(transactions, start, end) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return transactions.filter((t) => {
    const ts = new Date(t.date).getTime()
    return ts >= s && ts <= e
  })
}

function sumByType(txs, type) {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + Math.abs(t.amount), 0)
}

function sumCategory(txs) {
  const m = {}
  txs.forEach((t) => {
    const cat = t.category || 'other'
    m[cat] = (m[cat] || 0) + Math.abs(t.amount)
  })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

function getCatLabel(id) {
  const c = ALL_CATEGORIES.find((cat) => cat.id === id)
  return c ? c.label : id
}

export function getTodayReview(transactions) {
  const today = todayStr()
  const todayTxs = transactions.filter((t) => t.date === today)
  const income = sumByType(todayTxs, 'income')
  const expense = sumByType(todayTxs, 'expense')
  const topCategories = sumCategory(todayTxs.filter((t) => t.type === 'expense')).slice(0, 5)
  return {
    income,
    expense,
    savings: income - expense,
    count: todayTxs.length,
    topCategories: topCategories.map(([id, amt]) => ({ category: id, label: getCatLabel(id), amount: amt })),
  }
}

export function getWeekReview(transactions) {
  const { start, end } = getWeekRange()
  const weekTxs = filterByDateRange(transactions, start, end)
  const income = sumByType(weekTxs, 'income')
  const expense = sumByType(weekTxs, 'expense')
  const tradingDeposit = sumByType(weekTxs.filter((t) => t.category === 'trading_deposit'), 'expense')
  const tradingWithdrawal = sumByType(weekTxs.filter((t) => t.category === 'trading_withdrawal'), 'income')
  const topCategories = sumCategory(weekTxs.filter((t) => t.type === 'expense')).slice(0, 5)
  const borrowLend = weekTxs.filter((t) => t.category === 'borrow' || t.category === 'lend')
  return {
    income,
    expense,
    savings: income - expense,
    count: weekTxs.length,
    tradingDeposit,
    tradingWithdrawal,
    borrowLendCount: borrowLend.length,
    topCategories: topCategories.map(([id, amt]) => ({ category: id, label: getCatLabel(id), amount: amt })),
  }
}

export function getBudgetReview(budgetsV2, transactions) {
  if (!Array.isArray(budgetsV2) || budgetsV2.length === 0) return []
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const expenseCat = getCategoryBreakdown(transactions, 'expense', thisYear, thisMonth)
  return budgetsV2
    .filter((b) => b.active !== false)
    .map((b) => {
      const spent = expenseCat.find((c) => c.category === b.category)
      const spentAmt = spent ? spent.amount : 0
      const limit = b.amount || b.limit || 0
      const pct = limit > 0 ? (spentAmt / limit) * 100 : 0
      return {
        id: b.id,
        category: b.category,
        label: getCatLabel(b.category),
        limit,
        spent: spentAmt,
        percentage: Math.round(pct),
        remaining: Math.max(0, limit - spentAmt),
        status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'safe',
      }
    })
    .filter((b) => b.limit > 0)
}

export function getSpendingReview(transactions) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const expenseTxs = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year
  })
  const total = expenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0)
  const cats = getCategoryBreakdown(transactions, 'expense', year, month)
  const topCategories = cats.slice(0, 8).map((c) => ({
    category: c.category,
    label: getCatLabel(c.category),
    amount: c.amount,
    percentage: total > 0 ? (c.amount / total) * 100 : 0,
  }))
  const merchantCounts = {}
  let totalTx = expenseTxs.length
  expenseTxs.forEach((t) => {
    const note = (t.note || '').trim().toLowerCase()
    if (note) {
      merchantCounts[note] = (merchantCounts[note] || 0) + 1
    }
  })
  const topMerchants = Object.entries(merchantCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
  return { total, count: totalTx, average: totalTx > 0 ? total / totalTx : 0, topCategories, topMerchants }
}

export function getIncomeReview(transactions) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const incomeTxs = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'income' && d.getMonth() === month && d.getFullYear() === year
  })
  const total = incomeTxs.reduce((s, t) => s + Math.abs(t.amount), 0)
  const cats = getCategoryBreakdown(transactions, 'income', year, month)
  const sources = cats.slice(0, 8).map((c) => ({
    category: c.category,
    label: getCatLabel(c.category),
    amount: c.amount,
    percentage: total > 0 ? (c.amount / total) * 100 : 0,
  }))
  return { total, count: incomeTxs.length, sources }
}

export function getTradingReview(transactions) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const deposits = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.category === 'trading_deposit' && d.getMonth() === month && d.getFullYear() === year
  })
  const withdrawals = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.category === 'trading_withdrawal' && d.getMonth() === month && d.getFullYear() === year
  })
  const totalDeposit = deposits.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalWithdrawal = withdrawals.reduce((s, t) => s + Math.abs(t.amount), 0)
  return {
    depositCount: deposits.length,
    depositAmount: totalDeposit,
    withdrawalCount: withdrawals.length,
    withdrawalAmount: totalWithdrawal,
    netFlow: totalWithdrawal - totalDeposit,
  }
}

export function getGoalReview(goals, _transactions) {
  if (!Array.isArray(goals) || goals.length === 0) return []
  return goals
    .filter((g) => g.target > 0)
    .map((g) => {
      const saved = g.saved || 0
      const target = g.target || 1
      const pct = Math.min(100, (saved / target) * 100)
      const remaining = Math.max(0, target - saved)
      return {
        id: g.id,
        name: g.name,
        saved,
        target,
        percentage: Math.round(pct),
        remaining,
        achieved: saved >= target,
      }
    })
}

export function getSmartAlerts(transactions, budgetsV2, emis, debts, goals, _recurring) {
  const alerts = []
  const now = new Date()

  const emiDueSoon = (Array.isArray(emis) ? emis : [])
    .filter((e) => {
      if (e.status === 'closed' || (e.remainingAmount !== undefined && e.remainingAmount <= 0)) return false
      if (!e.nextDate && !e.dueDate) return false
      const due = new Date(e.nextDate || e.dueDate)
      const diffDays = Math.ceil((due - now) / 86400000)
      return diffDays >= 0 && diffDays <= 7
    })
  emiDueSoon.forEach((e) => {
    alerts.push({ type: 'emi', severity: 'warning', message: `EMI due: ${e.loanName || e.name || 'EMI'}`, detail: `Due ${e.nextDate || e.dueDate}` })
  })

  const goalsNearDeadline = (Array.isArray(goals) ? goals : [])
    .filter((g) => {
      if (!g.targetDate) return false
      const due = new Date(g.targetDate)
      const diffDays = Math.ceil((due - now) / 86400000)
      return diffDays >= 0 && diffDays <= 30 && (g.saved || 0) < g.target
    })
  goalsNearDeadline.forEach((g) => {
    alerts.push({ type: 'goal', severity: 'warning', message: `Goal "${g.name}" nearing deadline`, detail: `₹${Math.round(g.target - (g.saved || 0)).toLocaleString()} remaining` })
  })

  const lowSavings = getCategoryBreakdown(transactions, 'expense', now.getFullYear(), now.getMonth())
  const totalExpense = lowSavings.reduce((s, c) => s + c.amount, 0)
  const totalIncome = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, t) => s + t.amount, 0)
  if (totalIncome > 0 && totalExpense > totalIncome * 0.9) {
    alerts.push({ type: 'savings', severity: 'alert', message: 'Low savings rate this month', detail: `${Math.round((1 - totalExpense / totalIncome) * 100)}% saved — below recommended 20%` })
  }

  const overBudget = (Array.isArray(budgetsV2) ? budgetsV2 : [])
    .filter((b) => {
      if (b.active === false) return false
      const limit = b.amount || b.limit || 0
      if (limit <= 0) return false
      const spent = lowSavings.find((c) => c.category === b.category)
      const spentAmt = spent ? spent.amount : 0
      return spentAmt > limit * 0.9
    })
  overBudget.forEach((b) => {
    alerts.push({ type: 'budget', severity: 'alert', message: `"${getCatLabel(b.category)}" budget nearly exhausted`, detail: 'Consider reducing spending in this category' })
  })

  return alerts
}

export function getChartsData(transactions) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const txs = transactions.filter((t) => {
      const td = new Date(t.date)
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
    })
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    months.push({
      month: d.toLocaleString('en-US', { month: 'short' }),
      income,
      expense,
      savings: income - expense,
    })
  }
  return months
}
