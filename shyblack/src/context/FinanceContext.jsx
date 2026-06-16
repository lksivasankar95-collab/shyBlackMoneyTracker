import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { generateId, extractPeopleFromTransactions } from '../utils/helpers'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { getBudgets, saveBudgets } from '../utils/budgets'
import { getRecurringTransactions, saveRecurringTransactions, getDueRecurringTransactions, advanceNextDate } from '../utils/recurring'
import { getTags, saveTags } from '../utils/tags'
import { getSecuritySettings, saveSecuritySettings } from '../utils/security'
import { getDebts, saveDebts, createDebt, applyRepayment, DEBT_TYPES, DEBT_STATUS } from '../utils/debts'
import {
  calculateFinancialScore, detectOverspending, getSavingsRecommendations,
  getHabitInsights, getFinancialHealth, checkStreakMilestone,
  getMonthlyScoreHistory, getScoreVelocity, getLoggingStreak,
  predictMonthEndSpend, getCashflowForecast,
} from '../utils/insights'
import { getCategoryTrends } from '../utils/analytics'
import { runMigrations } from '../utils/schema'
import { checkAndNotifyBudget } from '../utils/budgetNotifications'
import { hapticLight, hapticMedium } from '../utils/haptics'
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
  return {
    target: typeof raw.target === 'number' ? raw.target : 0,
    saved: typeof raw.saved === 'number' ? raw.saved : 0,
  }
}

const SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function checkRecoverySnapshot(transactions) {
  if (transactions.length > 0) return null
  try {
    const onboarding = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
    if (!onboarding?.hasCompletedOnboarding) return null
    const snap = safeStorage.get(STORAGE_KEYS.SNAPSHOT, null)
    if (!snap?.transactions?.length || !snap.ts) return null
    if (Date.now() - snap.ts > SNAPSHOT_MAX_AGE_MS) return null
    return snap
  } catch {
    return null
  }
}

function loadInitialState() {
  try {
    const migrationResult = runMigrations()
    const transactions = sanitizeTransactions(safeStorage.get(STORAGE_KEYS.TRANSACTIONS, []))
    return {
      transactions,
      savingsGoal: sanitizeSavingsGoal(safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })),
      budgets: getBudgets(),
      recurring: getRecurringTransactions(),
      tags: getTags(),
      security: getSecuritySettings(),
      debts: sanitizeDebts(safeStorage.get(STORAGE_KEYS.DEBTS, [])),
      _migrationResult: migrationResult,
      _recoverySnapshot: checkRecoverySnapshot(transactions),
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
      _migrationResult: null,
      _recoverySnapshot: null,
    }
  }
}

export function FinanceProvider({ children }) {
  const [state, setState] = useState(loadInitialState)
  const { transactions, savingsGoal, budgets, recurring, tags, security, debts, _recoverySnapshot } = state
  const [notification, setNotification] = useState(null)
  const [recoverySnapshot, setRecoverySnapshot] = useState(_recoverySnapshot)
  const overspendTimer = useRef(null)
  const txPersistTimer = useRef(null)

  // Refs for non-blocking async operations (budget notifications, etc.)
  const budgetsRef = useRef(budgets)
  const transactionsRef = useRef(transactions)
  const savingsGoalRef = useRef(savingsGoal)
  useEffect(() => { budgetsRef.current = budgets }, [budgets])
  useEffect(() => { transactionsRef.current = transactions }, [transactions])
  useEffect(() => { savingsGoalRef.current = savingsGoal }, [savingsGoal])

  // Debounced transaction persistence — write snapshot after each successful flush
  useEffect(() => {
    if (txPersistTimer.current) clearTimeout(txPersistTimer.current)
    txPersistTimer.current = setTimeout(() => {
      try {
        safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactions)
        safeStorage.set(STORAGE_KEYS.SNAPSHOT, {
          transactions: transactions.slice(0, 100),
          savingsGoal: savingsGoalRef.current,
          ts: Date.now(),
        })
      } catch {}
    }, 300)
    return () => { if (txPersistTimer.current) clearTimeout(txPersistTimer.current) }
  }, [transactions])

  // Flush on app background to prevent Android lifecycle data loss
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (txPersistTimer.current) {
          clearTimeout(txPersistTimer.current)
          txPersistTimer.current = null
        }
        try { safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactionsRef.current) } catch {}
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => { try { safeStorage.set(STORAGE_KEYS.SAVINGS, savingsGoal) } catch {} }, [savingsGoal])
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

    if (transaction.type === 'expense' && transaction.category) {
      const allTx = [newTx, ...transactionsRef.current]
      checkAndNotifyBudget(budgetsRef.current, allTx, transaction.category).catch(() => {})
    }

    checkStreakMilestone([newTx, ...transactionsRef.current]).catch(() => {})
    hapticLight()

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
    const now = new Date()
    const months = []
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

  const executeRecurring = useCallback((recurringId) => {
    setState((prev) => {
      const item = prev.recurring.find((r) => r.id === recurringId)
      if (!item) return prev
      const newTx = {
        type: item.type,
        amount: item.amount,
        category: item.category,
        note: item.note || '',
        date: new Date().toISOString().split('T')[0],
        tags: item.tags || [],
        source: item.source,
        id: generateId(),
        createdAt: Date.now(),
      }
      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        recurring: prev.recurring.map((r) =>
          r.id === recurringId
            ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastExecutedAt: Date.now() }
            : r
        ),
      }
    })
  }, [])

  const executeAllRecurring = useCallback(() => {
    hapticMedium()
    setState((prev) => {
      const due = getDueRecurringTransactions(prev.recurring)
      if (due.length === 0) return prev
      const now = new Date().toISOString().split('T')[0]
      const newTxs = due.map((item) => ({
        type: item.type,
        amount: item.amount,
        category: item.category,
        note: item.note || '',
        date: now,
        tags: item.tags || [],
        source: item.source,
        id: generateId(),
        createdAt: Date.now(),
      }))
      const dueIds = new Set(due.map((d) => d.id))
      return {
        ...prev,
        transactions: [...newTxs, ...prev.transactions],
        recurring: prev.recurring.map((r) =>
          dueIds.has(r.id)
            ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastExecutedAt: Date.now() }
            : r
        ),
      }
    })
  }, [])

  const skipRecurring = useCallback((recurringId) => {
    setState((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) =>
        r.id === recurringId
          ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastSkippedAt: Date.now() }
          : r
      ),
    }))
  }, [])

  const skipAllRecurring = useCallback(() => {
    setState((prev) => {
      const due = getDueRecurringTransactions(prev.recurring)
      if (due.length === 0) return prev
      const dueIds = new Set(due.map((d) => d.id))
      return {
        ...prev,
        recurring: prev.recurring.map((r) =>
          dueIds.has(r.id)
            ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastSkippedAt: Date.now() }
            : r
        ),
      }
    })
  }, [])

  const pendingRecurring = useMemo(() => getDueRecurringTransactions(recurring), [recurring])

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
      debts: prev.debts.map((d) => (d.id === id ? applyRepayment(d, repaymentAmount) : d)),
    }))
  }, [])

  const debtsSummary = useMemo(() => {
    const totalLent = debts.filter((d) => d.type === DEBT_TYPES.LENT).reduce((s, d) => s + d.amount, 0)
    const totalBorrowed = debts.filter((d) => d.type === DEBT_TYPES.BORROWED).reduce((s, d) => s + d.amount, 0)
    const pendingReceivables = debts
      .filter((d) => d.type === DEBT_TYPES.LENT && d.status === DEBT_STATUS.PENDING)
      .reduce((s, d) => s + d.remainingAmount, 0)
    const pendingPayables = debts
      .filter((d) => d.type === DEBT_TYPES.BORROWED && d.status === DEBT_STATUS.PENDING)
      .reduce((s, d) => s + d.remainingAmount, 0)
    const now = new Date()
    const overdueDebts = debts.filter(
      (d) => d.status === DEBT_STATUS.PENDING && d.dueDate && new Date(d.dueDate) < now
    )
    return { totalLent, totalBorrowed, pendingReceivables, pendingPayables, overdueCount: overdueDebts.length, overdueDebts }
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

  const restoreFromSnapshot = useCallback(() => {
    if (!recoverySnapshot) return
    const txs = sanitizeTransactions(recoverySnapshot.transactions || [])
    const svg = sanitizeSavingsGoal(recoverySnapshot.savingsGoal)
    setState((prev) => ({ ...prev, transactions: txs, savingsGoal: svg }))
    setRecoverySnapshot(null)
  }, [recoverySnapshot])

  const insights = useMemo(() => {
    try {
      return {
        score: calculateFinancialScore(transactions),
        overspend: detectOverspending(transactions),
        recommendations: getSavingsRecommendations(transactions, savingsGoal),
        habits: getHabitInsights(transactions),
        health: getFinancialHealth(transactions),
        scoreHistory: getMonthlyScoreHistory(transactions, 6),
        scoreVelocity: getScoreVelocity(transactions),
        streak: getLoggingStreak(transactions),
        monthPrediction: predictMonthEndSpend(transactions),
        trends: getCategoryTrends(transactions, 3),
      }
    } catch {
      return {
        score: { score: 0, level: 'N/A', factors: [] },
        overspend: null, recommendations: [], habits: [], health: null,
        scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
      }
    }
  }, [transactions, savingsGoal])

  const cashflowForecast = useMemo(() => {
    try { return getCashflowForecast(recurring, 3) } catch { return [] }
  }, [recurring])

  const recentPeople = useMemo(() => extractPeopleFromTransactions(transactions), [transactions])

  const dismissNotification = useCallback(() => setNotification(null), [])

  const value = useMemo(() => ({
    transactions, savingsGoal, budgets, recurring, tags, security, notification, insights,
    cashflowForecast, recoverySnapshot, recentPeople,
    pendingRecurring,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
    addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification, restoreFromSnapshot,
    debts, addDebt, updateDebt, deleteDebt, recordRepayment, debtsSummary,
  }), [
    transactions, savingsGoal, budgets, recurring, tags, security, notification, insights,
    cashflowForecast, recoverySnapshot, recentPeople,
    pendingRecurring,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
    addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification, restoreFromSnapshot,
    debts, addDebt, updateDebt, deleteDebt, recordRepayment, debtsSummary,
  ])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
