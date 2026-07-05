export const EVENT_TYPES = {
  income: { color: 'bg-emerald-400', dot: 'bg-emerald-400', label: 'Income', priority: 1 },
  expense: { color: 'bg-red-400', dot: 'bg-red-400', label: 'Expense', priority: 2 },
  trading_deposit: { color: 'bg-amber-400', dot: 'bg-amber-400', label: 'Trading Deposit', priority: 3 },
  trading_withdrawal: { color: 'bg-orange-400', dot: 'bg-orange-400', label: 'Trading Withdrawal', priority: 4 },
  emi: { color: 'bg-pink-400', dot: 'bg-pink-400', label: 'EMI', priority: 5 },
  bill: { color: 'bg-yellow-400', dot: 'bg-yellow-400', label: 'Bill', priority: 6 },
  borrow: { color: 'bg-purple-400', dot: 'bg-purple-400', label: 'Borrow', priority: 7 },
  lend: { color: 'bg-blue-400', dot: 'bg-blue-400', label: 'Lend', priority: 8 },
  recurring: { color: 'bg-indigo-400', dot: 'bg-indigo-400', label: 'Recurring', priority: 9 },
}

export function indexTransactionsByDate(transactions) {
  const map = {}
  for (let i = 0, len = transactions.length; i < len; i++) {
    const tx = transactions[i]
    if (!map[tx.date]) map[tx.date] = []
    map[tx.date].push(tx)
  }
  return map
}

export function getMonthTransactions(transactionIndex, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const result = {}
  for (const date in transactionIndex) {
    if (date.startsWith(prefix)) {
      result[date] = transactionIndex[date]
    }
  }
  return result
}

export function getDailySummaries(monthTransactions) {
  const summaries = {}
  for (const date in monthTransactions) {
    const txs = monthTransactions[date]
    let income = 0
    let expense = 0
    let tradingDeposit = 0
    let tradingWithdrawal = 0
    let borrow = 0
    let lend = 0
    for (let j = 0, len = txs.length; j < len; j++) {
      const tx = txs[j]
      if (tx.category === 'trading_deposit') {
        tradingDeposit += tx.amount
      } else if (tx.category === 'trading_withdrawal') {
        tradingWithdrawal += tx.amount
      } else if (tx.category === 'emi') {
        expense += tx.amount
      } else if (tx.type === 'income') {
        income += tx.amount
      } else if (tx.type === 'expense') {
        expense += tx.amount
      }
    }
    summaries[date] = {
      income,
      expense,
      tradingDeposit,
      tradingWithdrawal,
      borrow,
      lend,
      total: income + tradingWithdrawal - expense - tradingDeposit,
      count: txs.length,
    }
  }
  return summaries
}

export function getDayEventTypes(daySummaries, dayEvents, billsForDay) {
  const types = []
  const summary = daySummaries
  if (summary) {
    if (summary.income > 0) types.push({ type: 'income', priority: EVENT_TYPES.income.priority })
    if (summary.expense > 0) types.push({ type: 'expense', priority: EVENT_TYPES.expense.priority })
    if (summary.tradingDeposit > 0) types.push({ type: 'trading_deposit', priority: EVENT_TYPES.trading_deposit.priority })
    if (summary.tradingWithdrawal > 0) types.push({ type: 'trading_withdrawal', priority: EVENT_TYPES.trading_withdrawal.priority })
  }
  for (let i = 0; i < dayEvents.length; i++) {
    const ev = dayEvents[i]
    if (ev.type === 'debt' && ev.debtType === 'borrow') {
      if (!types.find((t) => t.type === 'borrow')) types.push({ type: 'borrow', priority: EVENT_TYPES.borrow.priority })
    } else if (ev.type === 'debt' && ev.debtType === 'lend') {
      if (!types.find((t) => t.type === 'lend')) types.push({ type: 'lend', priority: EVENT_TYPES.lend.priority })
    } else if (ev.type === 'emi') {
      if (!types.find((t) => t.type === 'emi')) types.push({ type: 'emi', priority: EVENT_TYPES.emi.priority })
    } else if (ev.type === 'recurring') {
      if (!types.find((t) => t.type === 'recurring')) types.push({ type: 'recurring', priority: EVENT_TYPES.recurring.priority })
    }
  }
  if (billsForDay.length > 0) types.push({ type: 'bill', priority: EVENT_TYPES.bill.priority })
  types.sort((a, b) => a.priority - b.priority)
  return types
}

export function getMonthHighlights(transactionIndex, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  let highestExpense = { date: '', amount: 0 }
  let highestIncome = { date: '', amount: 0 }
  let noSpendDays = 0
  let negativeCashFlowDays = 0
  let savingsDays = 0
  let totalDays = 0
  let daysWithExpense = 0

  for (const date in transactionIndex) {
    if (!date.startsWith(prefix)) continue
    totalDays++
    const txs = transactionIndex[date]
    let dayIncome = 0
    let dayExpense = 0
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i]
      if (tx.type === 'income') dayIncome += tx.amount
      else if (tx.type === 'expense') dayExpense += tx.amount
    }
    if (dayExpense > highestExpense.amount) highestExpense = { date, amount: dayExpense }
    if (dayIncome > highestIncome.amount) highestIncome = { date, amount: dayIncome }
    if (dayExpense === 0 && dayIncome > 0) noSpendDays++
    if (dayExpense > dayIncome) negativeCashFlowDays++
    if (dayIncome > dayExpense && dayIncome > 0) savingsDays++
    if (dayExpense > 0) daysWithExpense++
  }

  return { highestExpense, highestIncome, noSpendDays, negativeCashFlowDays, savingsDays, daysWithExpense, totalDays }
}

export function getMonthlyTrends(transactions, currentYear, currentMonth, monthsBack) {
  const result = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    let m = currentMonth - i
    let y = currentYear
    while (m < 0) { m += 12; y-- }
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    let income = 0
    let expense = 0
    let count = 0
    for (let j = 0; j < transactions.length; j++) {
      const tx = transactions[j]
      if (tx.date && tx.date.startsWith(prefix)) {
        if (tx.type === 'income') income += tx.amount
        else if (tx.type === 'expense') expense += tx.amount
        count++
      }
    }
    const maxVal = Math.max(income, expense, 1)
    result.push({
      label: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} ${String(y).slice(2)}`,
      income,
      expense,
      count,
      incomePct: (income / maxVal) * 100,
      expensePct: (expense / maxVal) * 100,
    })
  }
  return result
}

export function getDailyHeatmap(transactionIndex, year, month, type) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const cells = []
  let maxVal = 0
  const dayValues = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${prefix}-${String(d).padStart(2, '0')}`
    let val = 0
    const txs = transactionIndex[dateStr]
    if (txs) {
      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i]
        if (type === 'expense' && tx.type === 'expense') val += tx.amount
        else if (type === 'income' && tx.type === 'income') val += tx.amount
      }
    }
    dayValues[d] = val
    if (val > maxVal) maxVal = val
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const val = dayValues[d] || 0
    const dayOfWeek = new Date(year, month, d).getDay()
    const weekIdx = Math.floor((d - 1 + new Date(year, month, 1).getDay()) / 7)
    cells.push({
      day: d,
      value: val,
      intensity: maxVal > 0 ? val / maxVal : 0,
      dayOfWeek,
      weekIdx,
    })
  }
  return cells
}

export function getTransactionFrequency(transactions, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  let count = 0
  for (let i = 0; i < transactions.length; i++) {
    if (transactions[i].date && transactions[i].date.startsWith(prefix)) count++
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return {
    total: count,
    avgPerDay: daysInMonth > 0 ? (count / daysInMonth).toFixed(1) : '0',
    avgPerWeek: (count / Math.max(1, daysInMonth / 7)).toFixed(1),
  }
}

export function getRunningBalance(transactions, upToDate) {
  let balance = 0
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.date <= upToDate) {
      if (tx.type === 'income') balance += tx.amount
      else if (tx.type === 'expense') balance -= tx.amount
    }
  }
  return balance
}

export function filterTransactions(transactions, query) {
  if (!query || !query.trim()) return transactions
  const q = query.toLowerCase().trim()
  const qNum = parseFloat(q)
  return transactions.filter((tx) => {
    if (tx.note && tx.note.toLowerCase().includes(q)) return true
    if (tx.category && tx.category.toLowerCase().includes(q)) return true
    if (tx.date && tx.date.includes(q)) return true
    if (!isNaN(qNum) && tx.amount === qNum) return true
    if (tx.person && tx.person.name && tx.person.name.toLowerCase().includes(q)) return true
    return false
  })
}

export function getBillsForDate(bills, dateStr) {
  return bills.filter((b) => {
    if (!b.active) return false
    if (b.paidDates && b.paidDates.includes(dateStr)) return false
    if (b.dueDate === dateStr) return true
    if (b.recurring) {
      const due = new Date(b.dueDate)
      const check = new Date(dateStr)
      if (due.getDate() === check.getDate() && check >= due) return true
    }
    return false
  })
}

export function getActiveFilters(filterState) {
  return Object.entries(filterState).filter(([, v]) => v).map(([k]) => k)
}

export function matchesActiveFilters(daySummary, dayEventTypes, activeFilters) {
  if (activeFilters.length === 0) return true
  for (const f of activeFilters) {
    if (f === 'income' && daySummary && daySummary.income > 0) return true
    if (f === 'expense' && daySummary && daySummary.expense > 0) return true
    if (f === 'trading' && daySummary && (daySummary.tradingDeposit > 0 || daySummary.tradingWithdrawal > 0)) return true
    if (f === 'emi' && dayEventTypes.find((t) => t.type === 'emi')) return true
    if (f === 'bills' && dayEventTypes.find((t) => t.type === 'bill')) return true
    if (f === 'recurring' && dayEventTypes.find((t) => t.type === 'recurring')) return true
  }
  return false
}

export function getMonthDateStr(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}
