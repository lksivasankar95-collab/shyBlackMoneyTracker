import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { generateId } from '../utils/helpers'
import { storage, keys } from '../utils/storage'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { getBudgets, saveBudgets } from '../utils/budgets'
import { getRecurringTransactions, saveRecurringTransactions } from '../utils/recurring'
import { getTags, saveTags } from '../utils/tags'
import { getSecuritySettings, saveSecuritySettings } from '../utils/security'
import { getDebts, saveDebts, createDebt, applyRepayment, DEBT_TYPES, DEBT_STATUS } from '../utils/debts'
import { calculateFinancialScore, detectOverspending, getSavingsRecommendations, getHabitInsights, getFinancialHealth } from '../utils/insights'
import { runMigrations } from '../utils/schema'
import * as privacy from '../utils/privacy'

export const FinanceContext = createContext()

function isValidTransaction(t) {
  return t && typeof t === 'object' && typeof t.id === 'string' && typeof t.type === 'string' && typeof t.amount === 'number'
}

function isValidDebt(d) {
  return d && typeof d === 'object' && typeof d.id === 'string' && typeof d.personName === 'string' && typeof d.amount === 'number'
}

function sanitizeTransactions(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidTransaction)
}

function sanitizeDebts(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidDebt)
}

function sanitizeSavingsGoal(raw) {
  if (!raw || typeof raw !== 'object') return { target: 0, saved: 0 }
  return { target: typeof raw.target === 'number' ? raw.target : 0, saved: typeof raw.saved === 'number' ? raw.saved : 0 }
}

function loadInitialState() {
  try {
    const migrationResult = runMigrations()

    const rawTxs = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
    const rawDebts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
    const rawSavings = safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })

    return {
      transactions: sanitizeTransactions(rawTxs),
      savingsGoal: sanitizeSavingsGoal(rawSavings),
      budgets: getBudgets(),
      recurring: getRecurringTransactions(),
      tags: getTags(),
      security: getSecuritySettings(),
      debts: sanitizeDebts(rawDebts),
      _migrationResult: migrationResult,
    }
  } catch {
    return {
      transactions: [],
      savingsGoal: { target: 0, saved: 0 },
      budgets: {},
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
      debts: [],
    }
  }
}

export function FinanceProvider({ children }) {
  const [state, setState] = useState(loadInitialState)
  const { transactions, savingsGoal, budgets, recurring, tags, security, debts } = state
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
  useEffect(() => { try { saveDebts(debts) } catch {} }, [debts])

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
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    return income - expenses
  }, [transactions])

  const getMonthlySummary = useCallback((year, month) => {
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const income = filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const expense = filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
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

  const addDebt = useCallback((data) => {
    const newDebt = createDebt(data)
    setState((prev) => ({ ...prev, debts: [newDebt, ...prev.debts] }))
    return newDebt
  }, [])

  const updateDebt = useCallback((id, updates) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }))
  }, [])

  const deleteDebt = useCallback((id) => {
    setState((prev) => ({ ...prev, debts: prev.debts.filter((d) => d.id !== id) }))
  }, [])

  const recordRepayment = useCallback((id, repaymentAmount) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) =>
        d.id === id ? applyRepayment(d, repaymentAmount) : d
      ),
    }))
  }, [])

  const debtsSummary = useMemo(() => {
    const totalLent = debts
      .filter((d) => d.type === DEBT_TYPES.LENT)
      .reduce((sum, d) => sum + d.amount, 0)
    const totalBorrowed = debts
      .filter((d) => d.type === DEBT_TYPES.BORROWED)
      .reduce((sum, d) => sum + d.amount, 0)
    const pendingReceivables = debts
      .filter((d) => d.type === DEBT_TYPES.LENT && d.status === DEBT_STATUS.PENDING)
      .reduce((sum, d) => sum + d.remainingAmount, 0)
    const pendingPayables = debts
      .filter((d) => d.type === DEBT_TYPES.BORROWED && d.status === DEBT_STATUS.PENDING)
      .reduce((sum, d) => sum + d.remainingAmount, 0)
    const now = new Date()
    const overdueCount = debts.filter(
      (d) => d.status === DEBT_STATUS.PENDING && d.dueDate && new Date(d.dueDate) < now
    ).length
    return { totalLent, totalBorrowed, pendingReceivables, pendingPayables, overdueCount }
  }, [debts])

  const clearAllData = useCallback(() => {
    safeStorage.clear()
    safeStorage.remove(STORAGE_KEYS.SCHEMA)
    privacy.clearPin()
    setState({
      transactions: [],
      savingsGoal: { target: 0, saved: 0 },
      budgets: {},
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
      debts: [],
    })
  }, [])

  const importData = useCallback((data) => {
    const txs = data.transactions ? sanitizeTransactions(data.transactions) : undefined
    const dts = data.debts ? sanitizeDebts(data.debts) : undefined
    const svg = data.savings || data.savingsGoal ? sanitizeSavingsGoal(data.savings || data.savingsGoal) : undefined

    setState((prev) => ({
      ...prev,
      ...(txs ? { transactions: txs } : {}),
      ...(svg ? { savingsGoal: svg } : {}),
      ...(data.budgets ? { budgets: data.budgets } : {}),
      ...(data.recurring ? { recurring: data.recurring } : {}),
      ...(dts ? { debts: dts } : {}),
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
    debts, addDebt, updateDebt, deleteDebt, recordRepayment, debtsSummary,
  }), [
    transactions, savingsGoal, budgets, recurring, tags, security, notification, insights,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification,
    debts, addDebt, updateDebt, deleteDebt, recordRepayment, debtsSummary,
  ])

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}
