import { createContext, useState, useEffect, useCallback } from 'react'
import { generateId } from '../utils/helpers'

export const FinanceContext = createContext()

const STORAGE_KEY = 'shyblack_transactions'
const SAVINGS_KEY = 'shyblack_savings'

const loadFromStorage = (key, fallback) => {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

export function FinanceProvider({ children }) {
  const [transactions, setTransactions] = useState(
    () => loadFromStorage(STORAGE_KEY, [])
  )
  const [savingsGoal, setSavingsGoal] = useState(
    () => loadFromStorage(SAVINGS_KEY, { target: 0, saved: 0 })
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(savingsGoal))
  }, [savingsGoal])

  const addTransaction = useCallback((transaction) => {
    const newTx = {
      ...transaction,
      id: generateId(),
      date: transaction.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    }
    setTransactions((prev) => [newTx, ...prev])
    return newTx
  }, [])

  const deleteTransaction = useCallback((id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTransaction = useCallback((id, updates) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
  }, [])

  const getBalance = useCallback(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    return income - expenses
  }, [transactions])

  const getMonthlySummary = useCallback(
    (year, month) => {
      const filtered = transactions.filter((t) => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      const income = filtered
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      const expense = filtered
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      return { income, expense, balance: income - expense }
    },
    [transactions]
  )

  const getMonthlyData = useCallback(() => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const summary = getMonthlySummary(d.getFullYear(), d.getMonth())
      months.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        income: summary.income,
        expense: summary.expense,
      })
    }
    return months
  }, [getMonthlySummary])

  const updateSavings = useCallback((updates) => {
    setSavingsGoal((prev) => ({ ...prev, ...updates }))
  }, [])

  const clearAllData = useCallback(() => {
    setTransactions([])
    setSavingsGoal({ target: 0, saved: 0 })
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SAVINGS_KEY)
  }, [])

  const importData = useCallback((data) => {
    if (data.transactions) setTransactions(data.transactions)
    if (data.savings) setSavingsGoal(data.savings)
  }, [])

  const value = {
    transactions,
    savingsGoal,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    getBalance,
    getMonthlySummary,
    getMonthlyData,
    updateSavings,
    clearAllData,
    importData,
  }

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}
