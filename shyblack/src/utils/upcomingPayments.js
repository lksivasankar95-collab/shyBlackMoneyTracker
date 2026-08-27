import { getUpcomingBills } from './bills'
import { getUpcomingRecurringTransactions } from './recurring'

export function getDaysUntil(dateStr, from = new Date()) {
  if (!dateStr) return null
  const now = new Date(from)
  now.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  if (Number.isNaN(due.getTime())) return null
  due.setHours(0, 0, 0, 0)
  return Math.round((due - now) / 86400000)
}

export function getUpcomingPayments(bills = [], recurring = [], days = 7) {
  const items = []

  for (const bill of getUpcomingBills(bills, days)) {
    items.push({
      id: `bill-${bill.id}`,
      kind: 'bill',
      name: bill.name,
      amount: bill.amount || 0,
      dueDate: bill.dueDate,
      daysLeft: getDaysUntil(bill.dueDate),
    })
  }

  const upcomingRecurring = getUpcomingRecurringTransactions(recurring, 100)
  for (const rec of upcomingRecurring) {
    const daysLeft = getDaysUntil(rec.nextDate)
    if (daysLeft !== null && daysLeft >= 0 && daysLeft <= days) {
      items.push({
        id: `recurring-${rec.id}`,
        kind: 'recurring',
        name: rec.note || rec.category || 'Recurring',
        amount: rec.amount || 0,
        dueDate: rec.nextDate,
        daysLeft,
      })
    }
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6)
}