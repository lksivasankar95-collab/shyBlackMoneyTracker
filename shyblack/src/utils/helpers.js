export { formatCurrency } from './currency'
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from './constants'
export { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS }

export const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getTransactionDescription(tx) {
  const isIncome = tx.type === 'income'
  const parts = [isIncome ? 'Received' : 'Sent']
  if (tx.person?.name) {
    parts.push(isIncome ? 'from' : 'to')
    parts.push(tx.person.name)
  }
  if (tx.paymentMethod) {
    const method = PAYMENT_METHODS.find((m) => m.id === tx.paymentMethod)
    parts.push('via')
    parts.push(method?.label || tx.paymentMethod)
  }
  return parts.join(' ')
}

export function extractPeopleFromTransactions(transactions) {
  const seen = new Set()
  const people = []
  for (const tx of transactions) {
    const name = tx.person?.name
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      people.push(name)
    }
  }
  return people
}

export const getMonthName = (monthIndex) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return months[monthIndex]
}

export const getCurrentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start, end }
}

export const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start, end }
}

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const groupBy = (items, key) => {
  return items.reduce((acc, item) => {
    const k = item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export const groupByCategory = (transactions, type) => {
  const filtered = transactions.filter((t) => t.type === type)
  const grouped = {}
  filtered.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = 0
    grouped[t.category] += t.amount
  })
  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}
