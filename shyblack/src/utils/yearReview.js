const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function getYearReview(transactions, year) {
  const yearTx = (transactions || []).filter((t) => t.date && t.date.startsWith(String(year)))

  let income = 0
  let expense = 0
  const categoryMap = {}
  const incomeCatMap = {}
  const months = []

  for (let m = 0; m < 12; m++) {
    const prefix = monthPrefix(year, m)
    let mIncome = 0
    let mExpense = 0
    let mCount = 0
    for (const tx of yearTx) {
      if (!tx.date.startsWith(prefix)) continue
      mCount++
      if (tx.type === 'income') {
        mIncome += tx.amount || 0
        incomeCatMap[tx.category || 'other_income'] = (incomeCatMap[tx.category || 'other_income'] || 0) + (tx.amount || 0)
      } else if (tx.type === 'expense') {
        mExpense += tx.amount || 0
        categoryMap[tx.category || 'other_expense'] = (categoryMap[tx.category || 'other_expense'] || 0) + (tx.amount || 0)
      }
    }
    income += mIncome
    expense += mExpense
    months.push({
      month: m,
      label: MONTHS[m],
      income: Math.round(mIncome),
      expense: Math.round(mExpense),
      savings: Math.round(mIncome - mExpense),
      txCount: mCount,
    })
  }

  const savings = income - expense
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

  const topCategories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const topIncomeCategories = Object.entries(incomeCatMap)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  let bestMonth = null
  let worstMonth = null
  for (const m of months) {
    if (m.savings > 0 && (!bestMonth || m.savings > bestMonth.savings)) bestMonth = m
    if (m.expense > 0 && (!worstMonth || m.expense > worstMonth.expense)) worstMonth = m
  }

  return {
    year,
    totalMonthsActive: months.filter((m) => m.txCount > 0).length,
    income: Math.round(income),
    expense: Math.round(expense),
    savings: Math.round(savings),
    savingsRate,
    txCount: yearTx.length,
    avgMonthlyExpense: Math.round(expense / Math.max(1, months.filter((m) => m.txCount > 0).length)),
    months,
    topCategories,
    topIncomeCategories,
    bestMonth,
    worstMonth,
  }
}