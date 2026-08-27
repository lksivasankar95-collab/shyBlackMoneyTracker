/**
 * Spending pulse — real-time large-expense alerting + daily spending velocity.
 * Alerts when an expense exceeds an absolute threshold (₹50,000) or more than
 * 2× the user's average expense, whichever is higher.
 */

export const LARGE_TRANSACTION_ABSOLUTE = 50000

export function getSpendingPulseThreshold(transactions) {
  const expenses = (transactions || []).filter((t) => t.type === 'expense' && t.amount > 0)
  if (expenses.length === 0) return LARGE_TRANSACTION_ABSOLUTE
  const avg = expenses.reduce((s, t) => s + t.amount, 0) / expenses.length
  return Math.max(LARGE_TRANSACTION_ABSOLUTE, avg * 2)
}

export function shouldAlertLargeExpense(transactions, amount) {
  return typeof amount === 'number' && amount > 0 && amount >= getSpendingPulseThreshold(transactions)
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Daily expense series for the last `days` days (pulse chart data).
 * Days with no spending are included with amount 0 so charts stay continuous.
 */
export function getSpendingPulseSeries(transactions = [], days = 30) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end.getTime() - (days - 1) * 86400000)
  start.setHours(0, 0, 0, 0)

  const byDay = new Map()
  for (const t of transactions || []) {
    if (!t || t.type !== 'expense' || !(t.amount > 0)) continue
    const ts = t.createdAt || (t.date ? new Date(t.date).getTime() : null)
    if (!ts || isNaN(ts)) continue
    const d = new Date(ts)
    if (d >= start && d <= end) {
      const k = dayKey(d)
      byDay.set(k, (byDay.get(k) || 0) + t.amount)
    }
  }

  const series = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    const k = dayKey(d)
    series.push({
      day: k,
      label: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      amount: Math.round(byDay.get(k) || 0),
    })
  }
  return series
}

function sumSeries(arr) {
  return arr.reduce((s, x) => s + (x.amount || 0), 0)
}

/**
 * Pulse stats comparing the last 7 days against the trailing month.
 * `pulseLevel` is one of calm | moderate | elevated | hot.
 */
export function getPulseStats(transactions = []) {
  const series = getSpendingPulseSeries(transactions, 30)
  const week = series.slice(-7)
  const prevWeek = series.slice(-14, -7)

  const today = sumSeries(series.slice(-1))
  const weekTotal = sumSeries(week)
  const monthTotal = sumSeries(series)
  const activeDays7 = week.filter((x) => x.amount > 0).length
  const activeDays30 = series.filter((x) => x.amount > 0).length
  const weekAvg = activeDays7 > 0 ? weekTotal / activeDays7 : 0
  const monthAvg = activeDays30 > 0 ? monthTotal / activeDays30 : 0
  const prevWeekTotal = sumSeries(prevWeek)
  const weekOverWeekDelta = prevWeekTotal > 0
    ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100)
    : 0

  let pulseLevel = 'calm'
  let pulseLabel = 'Calm'
  if (weekAvg > 0 && monthAvg > 0) {
    const ratio = weekAvg / monthAvg
    if (ratio >= 1.6) { pulseLevel = 'hot'; pulseLabel = 'Hot' }
    else if (ratio >= 1.25) { pulseLevel = 'elevated'; pulseLabel = 'Elevated' }
    else if (ratio >= 1.05) { pulseLevel = 'moderate'; pulseLabel = 'Moderate' }
  } else if (weekTotal > 0) {
    pulseLevel = 'moderate'
    pulseLabel = 'Moderate'
  }

  return {
    today,
    weekTotal,
    monthTotal,
    weekAvg: Math.round(weekAvg),
    monthAvg: Math.round(monthAvg),
    activeDays7,
    activeDays30,
    weekOverWeekDelta,
    pulseLevel,
    pulseLabel,
    series,
    week,
  }
}

/**
 * Detects unusually large daily spends (anomalies) within the window.
 * A day is anomalous when its spend is more than 2.2× the average active day.
 */
export function detectSpendingAnomalies(transactions = [], days = 30) {
  const series = getSpendingPulseSeries(transactions, days)
  const active = series.filter((x) => x.amount > 0)
  if (active.length < 3) return []
  const avg = active.reduce((s, x) => s + x.amount, 0) / active.length
  if (avg <= 0) return []
  return active
    .filter((x) => x.amount > avg * 2.2 && x.amount >= 1000)
    .map((x) => ({
      date: x.day,
      label: x.label,
      amount: x.amount,
      avg: Math.round(avg),
      ratio: Math.round(x.amount / avg),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
}
