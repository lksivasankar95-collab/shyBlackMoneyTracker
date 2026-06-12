import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { generateId } from '../utils/helpers'
import { storage, keys } from '../utils/storage'
import { getBudgets, saveBudgets } from '../utils/budgets'
import { getRecurringTransactions, saveRecurringTransactions } from '../utils/recurring'
import { getTags, saveTags } from '../utils/tags'
import { getSecuritySettings, saveSecuritySettings } from '../utils/security'
import { calculateFinancialScore, detectOverspending, getSavingsRecommendations, getHabitInsights, getFinancialHealth } from '../utils/insights'

export const FinanceContext = createContext()

function loadInitialState() {
  try {
    return {
      transactions: storage.get(keys.TRANSACTIONS, []),
      savingsGoal: storage.get(keys.SAVINGS, { target: 0, saved: 0 }),
      budgets: getBudgets(),
      recurring: getRecurringTransactions(),
      tags: getTags(),
      security: getSecuritySettings(),
    }
  } catch {
    return {
      transactions: [],
      savingsGoal: { target: 0, saved: 0 },
      budgets: {},
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
    }
  }
}

export function FinanceProvider({ children }) {
  const [state, setState] = useState(loadInitialState)
  const { transactions, savingsGoal, budgets, recurring, tags, security } = state
  const [notification, setNotification] = useState(null)
  const overspendTimer = useRef(null)

  const persist = useCallback((key, data) => {
    try { storage.set(key, data) } catch {}
  }, [])

  useEffect(() => { persist(keys.TRANSACTIONS, transactions) }, [transactions, persist])
  useEffect(() => { persist(keys.SAVINGS, savingsGoal) }, [savingsGoal, persist])
  useEffect(() => { try { saveBudgets(budgets) } catch {} }, [budgets])
  useEffect(() => { try { saveRecurringTransactions(recurring) } catch {} }, [recurring])
  useEffect(() => { try { saveTags(tags) } catch {} }, [tags])
  useEffect(() => { try { saveSecuritySettings(security) } catch {} }, [security])

  useEffect(() => {
    if (transactions.length < 3) return
    if (overspendTimer.current) clearTimeout(overspendTimer.current)
    overspendTimer.current = setTimeout(() => {
      try {
        const overspend = detectOverspending(transactions)
        if (overspend) setNotification(overspend)
      } catch {}
    }, 1000)
    return () => { if (overspendTimer.current) clearTimeout(overspendTimer.current) }
  }, [transactions])

  const addTransaction = useCallback((transaction) => {
    const newTx = {
      ...transaction,
      id: generateId(),
      date: transaction.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    }
    setState((prev) => ({ ...prev, transactions: [newTx, ...prev.transactions] }))
    return newTx
  }, [])

  const deleteTransaction = useCallback((id) => {
    setState((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }))
  }, [])

  const updateTransaction = useCallback((id, updates) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  }, [])

  const getBalance = useCallback(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    return income - expenses
  }, [transactions])

  const getMonthlySummary = useCallback((year, month) => {
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const income = filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const expense = filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

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
    setState((prev) => ({ ...prev, savingsGoal: { ...prev.savingsGoal, ...updates } }))
  }, [])

  const updateBudgets = useCallback((newBudgets) => {
    setState((prev) => ({ ...prev, budgets: newBudgets }))
  }, [])

  const updateBudgetLimit = useCallback((category, limit) => {
    setState((prev) => ({
      ...prev,
      budgets: {
        ...prev.budgets,
        [category]: { ...prev.budgets[category], limit, spent: prev.budgets[category]?.spent || 0 },
      },
    }))
  }, [])

  const addRecurring = useCallback((item) => {
    const newItem = { ...item, id: generateId(), createdAt: Date.now() }
    setState((prev) => ({ ...prev, recurring: [...prev.recurring, newItem] }))
    return newItem
  }, [])

  const removeRecurring = useCallback((id) => {
    setState((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }))
  }, [])

  const addTag = useCallback((name) => {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) return
    setState((prev) => {
      if (prev.tags.find((t) => t.name === trimmed)) return prev
      return { ...prev, tags: [...prev.tags, { name: trimmed, id: generateId() }] }
    })
  }, [])

  const removeTag = useCallback((id) => {
    setState((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== id) }))
  }, [])

  const updateSecurity = useCallback((updates) => {
    setState((prev) => ({ ...prev, security: { ...prev.security, ...updates } }))
  }, [])

  const clearAllData = useCallback(() => {
    try { storage.clear() } catch {}
    setState({
      transactions: [],
      savingsGoal: { target: 0, saved: 0 },
      budgets: {},
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
    })
  }, [])

  const importData = useCallback((data) => {
    setState((prev) => ({
      ...prev,
      ...(data.transactions ? { transactions: data.transactions } : {}),
      ...(data.savings ? { savingsGoal: data.savings } : {}),
      ...(data.budgets ? { budgets: data.budgets } : {}),
      ...(data.recurring ? { recurring: data.recurring } : {}),
    }))
  }, [])

  const insights = useMemo(() => {
    try {
      return {
        score: calculateFinancialScore(transactions),
        overspend: detectOverspending(transactions),
        recommendations: getSavingsRecommendations(transactions, savingsGoal),
        habits: getHabitInsights(transactions),
        health: getFinancialHealth(transactions),
      }
    } catch {
      return { score: { score: 0, level: 'N/A', factors: [] }, overspend: null, recommendations: [], habits: [], health: null }
    }
  }, [transactions, savingsGoal])

  const dismissNotification = useCallback(() => setNotification(null), [])

  const value = useMemo(() => ({
    transactions, savingsGoal, budgets, recurring, tags, security, notification, insights,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification,
  }), [
    transactions, savingsGoal, budgets, recurring, tags, security, notification, insights,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification,
  ])

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}
