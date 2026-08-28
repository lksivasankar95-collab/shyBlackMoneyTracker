import { ALL_CATEGORIES } from './constants'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getCategorySummary(transactions) {
  const grouped = {}
  for (const t of transactions) {
    if (!grouped[t.category]) {
      const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
      grouped[t.category] = { categoryId: t.category, label: cat?.label || t.category, icon: cat?.icon, total: 0, txCount: 0, type: t.type }
    }
    grouped[t.category].total += t.amount
    grouped[t.category].txCount += 1
  }

  const totalAll = Object.values(grouped).reduce((s, g) => s + g.total, 0)
  return Object.values(grouped)
    .map((g) => ({ ...g, percentage: totalAll > 0 ? (g.total / totalAll) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)
}

export function getCategoryDetail(transactions, categoryId) {
  const catTx = transactions.filter((t) => t.category === categoryId)
  const cat = ALL_CATEGORIES.find((c) => c.id === categoryId)

  if (catTx.length === 0) return null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const currentMonthTx = catTx.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const prevMonthTx = catTx.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  })

  const currentAmount = currentMonthTx.reduce((s, t) => s + t.amount, 0)
  const prevAmount = prevMonthTx.reduce((s, t) => s + t.amount, 0)
  const totalAmount = catTx.reduce((s, t) => s + t.amount, 0)
  const amounts = catTx.map((t) => t.amount)
  const avgAmount = totalAmount / catTx.length
  const highest = Math.max(...amounts)
  const lowest = Math.min(...amounts)

  const change = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : currentAmount > 0 ? 100 : 0

  // Monthly trend (last 6 months)
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthTotal = catTx.filter((t) => {
      const td = new Date(t.date)
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
    }).reduce((s, t) => s + t.amount, 0)
    monthlyTrend.push({ month: MONTHS[d.getMonth()], amount: monthTotal })
  }

  // Weekly trend (current month)
  const weeklyTrend = []
  const weekBuckets = {}
  for (const t of currentMonthTx) {
    const d = new Date(t.date)
    const day = d.getDate()
    const weekNum = Math.floor((day - 1) / 7)
    if (!weekBuckets[weekNum]) weekBuckets[weekNum] = { label: `Week ${weekNum + 1}`, amount: 0 }
    weekBuckets[weekNum].amount += t.amount
  }
  for (let w = 0; w < 5; w++) {
    if (weekBuckets[w]) weeklyTrend.push(weekBuckets[w])
  }

  // Category share (this category vs all)
  const allCurrentMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const totalCurrentMonth = allCurrentMonth.reduce((s, t) => s + t.amount, 0)
  const categoryShare = totalCurrentMonth > 0 ? (currentAmount / totalCurrentMonth) * 100 : 0

  return {
    categoryId,
    label: cat?.label || categoryId,
    icon: cat?.icon,
    totalAmount,
    currentMonthAmount: currentAmount,
    previousMonthAmount: prevAmount,
    percentageChange: Math.round(change * 10) / 10,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    transactionCount: catTx.length,
    averageTransaction: Math.round(avgAmount),
    highestTransaction: highest,
    lowestTransaction: lowest,
    monthlyTrend,
    weeklyTrend,
    categoryShare: Math.round(categoryShare * 10) / 10,
    type: catTx[0]?.type || 'expense',
  }
}

export function getCategoryMonthlyTrend(transactions, categoryId, monthsBack = 6) {
  const now = new Date()
  const trend = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const total = transactions.filter((t) => {
      const td = new Date(t.date)
      return t.category === categoryId && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
    }).reduce((s, t) => s + t.amount, 0)
    trend.push({ month: MONTHS[d.getMonth()], amount: total })
  }
  return trend
}
