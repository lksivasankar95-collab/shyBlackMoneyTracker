import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { getEmiSummary } from './emi'

export function getForecastConfig() {
  return safeStorage.get(STORAGE_KEYS.FORECAST_CONFIG, {
    forecastMonths: 3,
    includeRecurring: true,
    includeEmis: true,
    includeDebts: true,
    pessimisticAdjustment: 0.9,
    optimisticAdjustment: 1.1,
  })
}

export function saveForecastConfig(config) {
  safeStorage.set(STORAGE_KEYS.FORECAST_CONFIG, config)
}

export function calculateCashFlowForecast({
  transactions,
  budgets,
  recurring,
  emis,
  debts,
  forecastMonths = 3,
  includeRecurring = true,
  includeEmis = true,
  includeDebts = true,
  pessimisticAdjustment = 0.9,
  optimisticAdjustment = 1.1,
}) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Historical analysis
  const monthlyData = getMonthlyHistory(transactions, 6)
  const avgMonthlyIncome = monthlyData.reduce((s, m) => s + m.income, 0) / Math.max(monthlyData.length, 1)
  const avgMonthlyExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0) / Math.max(monthlyData.length, 1)

  // Current cash position: lifetime surplus from transactions
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const currentCash = Math.max(0, totalIncome - totalExpenses)

  const months = []
  const incomeProjections = []
  const expenseProjections = []
  const balanceProjections = []
  const riskFlags = []

  let runningBalance = currentCash

  for (let i = 0; i < forecastMonths; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthLabel = forecastDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })

    // Base projection from historical average
    let projectedIncome = avgMonthlyIncome
    let projectedExpenses = avgMonthlyExpenses

    // Recurring adjustments (blend with historical average)
    if (includeRecurring && recurring.length > 0) {
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`
      const recurringIncome = recurring
        .filter((r) => r.type === 'income' && r.active !== false && r.nextDate?.startsWith(monthKey))
        .reduce((s, r) => s + r.amount, 0)
      const recurringExpenses = recurring
        .filter((r) => r.type === 'expense' && r.active !== false && r.nextDate?.startsWith(monthKey))
        .reduce((s, r) => s + r.amount, 0)

      if (recurringIncome > 0) {
        projectedIncome = Math.max(projectedIncome, recurringIncome)
      }
      if (recurringExpenses > 0) {
        projectedExpenses = Math.max(projectedExpenses, recurringExpenses)
      }
    }

    // EMI adjustments
    if (includeEmis) {
      const emiSummary = getEmiSummary(emis)
      projectedExpenses += emiSummary.totalMonthly
    }

    // Debt adjustments (average monthly debt payments)
    if (includeDebts && debts.length > 0) {
      const avgDebtPayment = debts
        .filter((d) => d.remainingAmount > 0)
        .reduce((s, d) => s + d.remainingAmount * 0.05, 0)
      projectedExpenses += avgDebtPayment
    }

    // Scenario projections
    const pessimisticIncome = projectedIncome * pessimisticAdjustment
    const pessimisticExpenses = projectedExpenses / pessimisticAdjustment
    const optimisticIncome = projectedIncome * optimisticAdjustment
    const optimisticExpenses = projectedExpenses / optimisticAdjustment

    const baseNet = projectedIncome - projectedExpenses
    const pessimisticNet = pessimisticIncome - pessimisticExpenses
    const optimisticNet = optimisticIncome - optimisticExpenses

    runningBalance += baseNet

    incomeProjections.push(projectedIncome)
    expenseProjections.push(projectedExpenses)
    balanceProjections.push(runningBalance)

    // Risk flags
    if (runningBalance < 0) {
      riskFlags.push({
        month: monthLabel,
        severity: 'critical',
        message: `Projected deficit of ${formatCurrency(Math.abs(runningBalance))}`,
      })
    } else if (runningBalance < avgMonthlyExpenses * 0.5) {
      riskFlags.push({
        month: monthLabel,
        severity: 'warning',
        message: `Low cash reserve: ${formatCurrency(runningBalance)} (less than 2 weeks expenses)`,
      })
    }

    months.push({
      month: monthLabel,
      date: forecastDate.toISOString().split('T')[0],
      income: projectedIncome,
      expenses: projectedExpenses,
      netCashflow: baseNet,
      runningBalance,
      pessimistic: {
        income: pessimisticIncome,
        expenses: pessimisticExpenses,
        netCashflow: pessimisticNet,
      },
      optimistic: {
        income: optimisticIncome,
        expenses: optimisticExpenses,
        netCashflow: optimisticNet,
      },
    })
  }

  const avgNet = months.reduce((s, m) => s + m.netCashflow, 0) / months.length
  let overallHealth = 'stable'
  if (months.some((m) => m.runningBalance < 0)) {
    overallHealth = 'critical'
  } else if (avgNet < 0) {
    overallHealth = 'declining'
  } else if (avgNet > avgMonthlyExpenses * 0.2) {
    overallHealth = 'strong'
  }

  return {
    months,
    summary: {
      currentCash,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      avgNetCashflow: avgNet,
      forecastMonths,
      overallHealth,
      riskFlags: riskFlags.sort((a, b) => {
        const order = { critical: 0, warning: 1 }
        return order[a.severity] - order[b.severity]
      }),
      savingsRate: avgMonthlyIncome > 0
        ? Math.round(((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100)
        : 0,
    },
    incomeProjections,
    expenseProjections,
    balanceProjections,
  }
}

function getMonthlyHistory(transactions, months = 6) {
  const now = new Date()
  const data = []

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= monthStart && d <= monthEnd
    })

    const income = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Math.abs(t.amount), 0)

    const expenses = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Math.abs(t.amount), 0)

    data.push({
      month: monthStart.toLocaleDateString('default', { month: 'short', year: 'numeric' }),
      income,
      expenses,
      net: income - expenses,
    })
  }

  return data
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}
