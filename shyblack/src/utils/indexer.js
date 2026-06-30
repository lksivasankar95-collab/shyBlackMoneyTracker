export function buildIndexes(transactions) {
  const byMonth = new Map()
  const byCategory = new Map()
  const byType = { income: [], expense: [] }
  const byPerson = new Map()
  const byPaymentMethod = new Map()
  const byTags = new Map()
  const bySource = new Map()

  let totalIncome = 0
  let totalExpense = 0

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    if (!t) continue

    if (t.type === 'income') {
      byType.income.push(t)
      totalIncome += t.amount || 0
    } else if (t.type === 'expense') {
      byType.expense.push(t)
      totalExpense += t.amount || 0
    }

    if (t.date) {
      const monthKey = t.date.substring(0, 7)
      let monthArr = byMonth.get(monthKey)
      if (!monthArr) {
        monthArr = []
        byMonth.set(monthKey, monthArr)
      }
      monthArr.push(t)
    }

    if (t.category) {
      let catArr = byCategory.get(t.category)
      if (!catArr) {
        catArr = []
        byCategory.set(t.category, catArr)
      }
      catArr.push(t)
    }

    if (t.person?.name) {
      const name = t.person.name.toLowerCase()
      let personArr = byPerson.get(name)
      if (!personArr) {
        personArr = []
        byPerson.set(name, personArr)
      }
      personArr.push(t)
    }

    if (t.tags && Array.isArray(t.tags)) {
      for (const tag of t.tags) {
        const tagLower = tag.toLowerCase()
        let tagArr = byTags.get(tagLower)
        if (!tagArr) {
          tagArr = []
          byTags.set(tagLower, tagArr)
        }
        tagArr.push(t)
      }
    }

    if (t.paymentMethod) {
      let pmArr = byPaymentMethod.get(t.paymentMethod)
      if (!pmArr) {
        pmArr = []
        byPaymentMethod.set(t.paymentMethod, pmArr)
      }
      pmArr.push(t)
    }

    const source = t.source || 'manual'
    let srcArr = bySource.get(source)
    if (!srcArr) {
      srcArr = []
      bySource.set(source, srcArr)
    }
    srcArr.push(t)
  }

  const monthlySummaries = []
  for (const [monthKey, txs] of byMonth) {
    let income = 0
    let expense = 0
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i]
      if (t.type === 'income') income += t.amount || 0
      else if (t.type === 'expense') expense += t.amount || 0
    }
    monthlySummaries.push({ month: monthKey, income, expense, balance: income - expense, count: txs.length })
  }
  monthlySummaries.sort((a, b) => a.month.localeCompare(b.month))

  const categoryTotals = []
  for (const [cat, txs] of byCategory) {
    let income = 0
    let expense = 0
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i]
      if (t.type === 'income') income += t.amount || 0
      else if (t.type === 'expense') expense += t.amount || 0
    }
    categoryTotals.push({ category: cat, totalIncome: income, totalExpense: expense })
  }
  categoryTotals.sort((a, b) => b.totalExpense - a.totalExpense)

  return {
    byMonth,
    byCategory,
    byType,
    byPerson,
    byPaymentMethod,
    byTags,
    bySource,
    summaries: {
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      transactionCount: transactions.length,
      monthly: monthlySummaries,
      categoryTotals,
    },
  }
}

export function getMonthlySummaryFromIndex(index, year, month) {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const txs = index.byMonth.get(monthKey)
  if (!txs) return { income: 0, expense: 0, balance: 0 }

  let income = 0
  let expense = 0
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i]
    if (t.type === 'income') income += t.amount || 0
    else if (t.type === 'expense') expense += t.amount || 0
  }
  return { income, expense, balance: income - expense }
}

export function getCategoryBreakdownFromIndex(index, type, year, month) {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const txs = index.byMonth.get(monthKey)
  if (!txs) return []

  const grouped = {}
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i]
    if (t.type !== type || !t.category) continue
    grouped[t.category] = (grouped[t.category] || 0) + (t.amount || 0)
  }

  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function getDailyExpenseFromIndex(index, year, month) {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const txs = index.byMonth.get(monthKey)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const daily = new Map()
  if (txs) {
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i]
      if (t.type !== 'expense') continue
      const day = new Date(t.date).getDate()
      daily.set(day, (daily.get(day) || 0) + (t.amount || 0))
    }
  }

  const result = []
  for (let d = 1; d <= daysInMonth; d++) {
    result.push({ day: d, amount: daily.get(d) || 0 })
  }
  return result
}

export function getPeopleFromIndex(index) {
  return Array.from(index.byPerson.keys())
}
