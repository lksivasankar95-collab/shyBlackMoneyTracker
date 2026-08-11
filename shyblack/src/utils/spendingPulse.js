/**
 * Spending pulse — real-time large-expense alerting.
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
