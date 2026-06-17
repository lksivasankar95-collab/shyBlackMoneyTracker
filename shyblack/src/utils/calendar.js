import { getDueRecurringTransactions, getSubscriptionSummary } from './recurring'
import { PAYMENT_METHODS } from './constants'
import { formatCurrency } from './helpers'

export function getUpcomingEvents(transactions, recurring, debts, days = 30) {
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  const events = []

  // Recurring transactions due in range
  recurring.forEach((r) => {
    if (r.active === false || !r.nextDate) return
    const next = new Date(r.nextDate)
    if (next > endDate) return
    if (next < now) return

    events.push({
      id: `rec-${r.id}`,
      date: r.nextDate,
      type: r.type === 'income' ? 'income' : 'expense',
      title: r.category,
      subtitle: r.note || '',
      amount: r.amount,
      source: 'recurring',
      frequency: r.frequency,
    })
  })

  // Debt due dates
  debts.forEach((d) => {
    if (d.status === 'paid' || !d.dueDate || d.remainingAmount <= 0) return
    const due = new Date(d.dueDate)
    if (due > endDate || due < now) return

    events.push({
      id: `debt-${d.id}`,
      date: d.dueDate,
      type: d.type === 'lent' ? 'income' : 'expense',
      title: d.personName,
      subtitle: d.notes ? `Due: ${d.notes}` : `${d.type === 'lent' ? 'Repayment expected' : 'Payment due'}`,
      amount: d.remainingAmount,
      source: 'debt',
      isOverdue: due < now,
    })
  })

  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date))

  // Group by date proximity
  const groups = {}
  events.forEach((e) => {
    const d = new Date(e.date)
    const key = d.toISOString().split('T')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  return { events, groups, total: events.length }
}

export function getUpcomingSummary(transactions, recurring, debts, days = 30) {
  const { events } = getUpcomingEvents(transactions, recurring, debts, days)
  const income = events.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = events.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  return { income, expense, net: income - expense, count: events.length }
}
