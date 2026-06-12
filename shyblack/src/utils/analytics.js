const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getMonthlyData(transactions, monthsBack = 6) {
  const now = new Date()
  const months = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const filtered = transactions.filter((t) => {
      const td = new Date(t.date)
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
    })
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    months.push({
      month: MONTHS[d.getMonth()],
      fullMonth: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      income,
      expense,
      balance: income - expense,
      count: filtered.length,
    })
  }
  return months
}

export function getCategoryBreakdown(transactions, type, year, month) {
  const filtered = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === type && d.getMonth() === month && d.getFullYear() === year
  })
  const grouped = {}
  filtered.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = 0
    grouped[t.category] += t.amount
  })
  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function getCategoryTrends(transactions, monthsBack = 3) {
  const now = new Date()
  const trends = {}
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const filtered = transactions.filter((t) => {
      const td = new Date(t.date)
      return t.type === 'expense' && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
    })
    filtered.forEach((t) => {
      if (!trends[t.category]) trends[t.category] = []
      trends[t.category].push({ month: MONTHS[d.getMonth()], amount: t.amount })
    })
  }
  return Object.entries(trends).map(([category, data]) => ({
    category,
    data,
    total: data.reduce((s, d) => s + d.amount, 0),
    avg: data.length > 0 ? data.reduce((s, d) => s + d.amount, 0) / data.length : 0,
  }))
}

export function getNetWorth(transactions) {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return income - expense
}

export function getMonthlyGrowth(transactions) {
  const monthly = getMonthlyData(transactions, 6)
  return monthly.map((m, i) => ({
    ...m,
    growth: i > 0 && monthly[i - 1].balance !== 0
      ? ((m.balance - monthly[i - 1].balance) / Math.abs(monthly[i - 1].balance)) * 100
      : 0,
  }))
}

export function getDailyExpenseHeatmap(transactions, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dayTotal = transactions
      .filter((t) => {
        const td = new Date(t.date)
        return t.type === 'expense' && td.getDate() === d && td.getMonth() === month && td.getFullYear() === year
      })
      .reduce((s, t) => s + t.amount, 0)
    days.push({ day: d, amount: dayTotal })
  }
  return days
}

export function getIncomeForecast(transactions) {
  const monthly = getMonthlyData(transactions, 3)
  if (monthly.length < 2) return null
  const incomes = monthly.map((m) => m.income)
  const avgIncome = incomes.reduce((s, i) => s + i, 0) / incomes.length
  const trend = incomes.length > 1 ? (incomes[incomes.length - 1] - incomes[0]) / incomes.length : 0
  return {
    average: Math.round(avgIncome),
    trend: Math.round(trend),
    nextMonth: Math.round(avgIncome + trend),
    confidence: incomes.every((i) => i > 0) ? 'stable' : 'variable',
  }
}

export function compareSpending(transactions, monthsBack = 2) {
  const data = getMonthlyData(transactions, monthsBack)
  if (data.length < 2) return null
  const current = data[data.length - 1]
  const previous = data[data.length - 2]
  const change = previous.expense > 0
    ? ((current.expense - previous.expense) / previous.expense) * 100
    : 0
  return {
    current: current.expense,
    previous: previous.expense,
    change: Math.round(change * 10) / 10,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
  }
}
