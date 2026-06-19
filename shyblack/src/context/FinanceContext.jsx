import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { generateId, extractPeopleFromTransactions } from '../utils/helpers'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { buildIndexes } from '../utils/indexer'
import { saveSnapshot, findRecoverySnapshot, getRecoveryChainSummary, detectCorruption } from '../utils/snapshotRecovery'
import { getBackupHealth, getBackupStats } from '../utils/backupHealth'
import { getBudgets, saveBudgets } from '../utils/budgets'
import { getRecurringTransactions, saveRecurringTransactions, getDueRecurringTransactions, advanceNextDate } from '../utils/recurring'
import { getTags, saveTags } from '../utils/tags'
import { getSecuritySettings, saveSecuritySettings } from '../utils/security'
import { getDebts, saveDebts, createDebt, applyRepayment, DEBT_TYPES, DEBT_STATUS } from '../utils/debts'
import { getGoals, saveGoals, createGoal, updateGoal, deleteGoal, getGoalProjection, migrateLegacySavingsGoal } from '../utils/goals'
import { getTemplates, saveTemplates, createTemplate, deleteTemplate, getRecentTemplates } from '../utils/templates'
import { getEmis, saveEmis, createEmi, EMI_STATUS, getEmiSummary } from '../utils/emi'
import { getAccounts, saveAccounts, saveNetWorthSnapshot } from '../utils/networth'
import { archiveOldTransactions, getArchiveStats } from '../utils/archiveEngine'
import { runIntegrityCheck, applyRepairs } from '../utils/dataIntegrity'
import {
  calculateFinancialScore, detectOverspending, getSavingsRecommendations,
  getHabitInsights, getFinancialHealth, checkStreakMilestone,
  getMonthlyScoreHistory, getScoreVelocity, getLoggingStreak,
  predictMonthEndSpend, getCashflowForecast, getScoreBreakdown,
} from '../utils/insights'
import { getCategoryTrends } from '../utils/analytics'
import { runMigrations } from '../utils/schema'
import { checkAndNotifyBudget } from '../utils/budgetNotifications'
import { hapticLight, hapticMedium } from '../utils/haptics'
import * as privacy from '../utils/privacy'
import {
  scheduleEmiNotifications, cancelEmiNotifications,
  rescheduleAllEmiNotifications, cancelAllEmiNotifications,
} from '../utils/emiNotifications'

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

function loadInitialState() {
  try {
    const migrationResult = runMigrations()
    let transactions = sanitizeTransactions(safeStorage.get(STORAGE_KEYS.TRANSACTIONS, []))
    let recoverySnapshot = null

    if (transactions.length === 0) {
      recoverySnapshot = findRecoverySnapshot(transactions)
      if (recoverySnapshot) {
        transactions = sanitizeTransactions(recoverySnapshot.transactions || [])
      }
    }

    const integrityResult = runIntegrityCheck({ transactions, debts: sanitizeDebts(safeStorage.get(STORAGE_KEYS.DEBTS, [])), goals: getGoals(), accounts: getAccounts(), transfers: safeStorage.get(STORAGE_KEYS.TRANSFERS, []), emis: getEmis() })
    if (integrityResult.hasIssues && integrityResult.summary.totalRepairs > 0) {
      const repaired = applyRepairs(integrityResult)
      if (repaired.transactions) transactions = sanitizeTransactions(repaired.transactions)
      if (repaired.debts) safeStorage.set(STORAGE_KEYS.DEBTS, repaired.debts)
      if (repaired.goals) safeStorage.set(STORAGE_KEYS.GOALS, repaired.goals)
      if (repaired.accounts) safeStorage.set(STORAGE_KEYS.NET_WORTH_ACCOUNTS, repaired.accounts)
      if (repaired.transfers) safeStorage.set(STORAGE_KEYS.TRANSFERS, repaired.transfers)
      if (repaired.emis) safeStorage.set(STORAGE_KEYS.EMIS, repaired.emis)
    }

    const archiveResult = archiveOldTransactions(transactions)
    if (archiveResult.archivedCount > 0) {
      safeStorage.set(STORAGE_KEYS.TRANSACTIONS, archiveResult.active)
      transactions = sanitizeTransactions(archiveResult.active)
    }

    const goals = getGoals()
    if (goals.length === 0) migrateLegacySavingsGoal()
    return {
      transactions,
      savingsGoal: sanitizeSavingsGoal(safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })),
      budgets: getBudgets(),
      recurring: getRecurringTransactions(),
      tags: getTags(),
      security: getSecuritySettings(),
      debts: sanitizeDebts(safeStorage.get(STORAGE_KEYS.DEBTS, [])),
      goals: getGoals(),
      templates: getTemplates(),
      emis: getEmis(),
      accounts: getAccounts(),
      _migrationResult: migrationResult,
      _recoverySnapshot: recoverySnapshot,
    }
  } catch {
    const fallbackSnap = findRecoverySnapshot([])
    return {
      transactions: sanitizeTransactions(fallbackSnap?.transactions || []),
      savingsGoal: fallbackSnap?.savingsGoal || { target: 0, saved: 0 },
      budgets: {},
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
      debts: [],
      emis: [],
      accounts: [],
      _migrationResult: null,
      _recoverySnapshot: fallbackSnap,
    }
  }
}

export function FinanceProvider({ children }) {
  const [state, setState] = useState(loadInitialState)
  const { transactions, savingsGoal, budgets, recurring, tags, security, debts, goals, templates, emis, accounts, _recoverySnapshot } = state
  const [notification, setNotification] = useState(null)
  const [recoverySnapshot, setRecoverySnapshot] = useState(_recoverySnapshot)
  const overspendTimer = useRef(null)
  const txPersistTimer = useRef(null)

  // Refs for non-blocking async operations (budget notifications, etc.)
  const budgetsRef = useRef(budgets)
  const transactionsRef = useRef(transactions)
  const savingsGoalRef = useRef(savingsGoal)
  const emisRef = useRef(emis)
  useEffect(() => { budgetsRef.current = budgets }, [budgets])
  useEffect(() => { transactionsRef.current = transactions }, [transactions])
  useEffect(() => { savingsGoalRef.current = savingsGoal }, [savingsGoal])
  useEffect(() => { emisRef.current = emis }, [emis])

  // Debounced transaction persistence with rolling snapshot chain
  useEffect(() => {
    if (txPersistTimer.current) clearTimeout(txPersistTimer.current)
    txPersistTimer.current = setTimeout(() => {
      try {
        safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactions)
        saveSnapshot(transactions, savingsGoalRef.current)
      } catch {}
    }, 300)
    return () => { if (txPersistTimer.current) clearTimeout(txPersistTimer.current) }
  }, [transactions])

  // Flush + snapshot + archive on app background to prevent Android lifecycle data loss
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (txPersistTimer.current) {
          clearTimeout(txPersistTimer.current)
          txPersistTimer.current = null
        }
        try {
          const archiveResult = archiveOldTransactions(transactionsRef.current)
          if (archiveResult.archivedCount > 0) {
            safeStorage.set(STORAGE_KEYS.TRANSACTIONS, archiveResult.active)
            return
          }
          safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactionsRef.current)
          saveSnapshot(transactionsRef.current, savingsGoalRef.current)
          const accts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
          const dts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
          saveNetWorthSnapshot(transactionsRef.current, dts, accts)
        } catch {}
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
  useEffect(() => { try { saveGoals(goals) } catch {} }, [goals])
  useEffect(() => { try { saveTemplates(templates) } catch {} }, [templates])
  useEffect(() => { try { saveEmis(emis) } catch {} }, [emis])
  useEffect(() => { try { saveAccounts(accounts) } catch {} }, [accounts])

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
    cancelAllEmiNotifications(emisRef.current).catch(() => {})
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
      emis: [],
      accounts: [],
    })
  }, [])

  const importData = useCallback((data) => {
    const txs = data.transactions ? sanitizeTransactions(data.transactions) : undefined
    const dts = data.debts ? sanitizeDebts(data.debts) : undefined
    const svg = data.savings || data.savingsGoal ? sanitizeSavingsGoal(data.savings || data.savingsGoal) : undefined
    const accts = data.accounts ? (Array.isArray(data.accounts) ? data.accounts : undefined) : undefined
    setState((prev) => ({
      ...prev,
      ...(txs ? { transactions: txs } : {}),
      ...(svg ? { savingsGoal: svg } : {}),
      ...(data.budgets ? { budgets: data.budgets } : {}),
      ...(data.recurring ? { recurring: data.recurring } : {}),
      ...(dts ? { debts: dts } : {}),
      ...(data.emis ? { emis: data.emis } : {}),
      ...(accts ? { accounts: accts } : {}),
    }))
    if (data.emis) {
      rescheduleAllEmiNotifications(data.emis).catch(() => {})
    }
  }, [])

  const restoreFromSnapshot = useCallback(() => {
    if (!recoverySnapshot) return
    const txs = sanitizeTransactions(recoverySnapshot.transactions || [])
    const svg = sanitizeSavingsGoal(recoverySnapshot.savingsGoal)
    setState((prev) => ({ ...prev, transactions: txs, savingsGoal: svg }))
    setRecoverySnapshot(null)
  }, [recoverySnapshot])

  const reloadFromStorage = useCallback(() => {
    const newState = loadInitialState()
    setState(newState)
    setRecoverySnapshot(newState._recoverySnapshot || null)
    rescheduleAllEmiNotifications(newState.emis).catch(() => {})
  }, [])

  const insights = useMemo(() => {
    const txLen = transactions.length
    if (txLen < 3) {
      return {
        score: { score: 0, level: 'N/A', factors: [] },
        overspend: null, recommendations: [], habits: [], health: null,
        scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
      }
    }
    const start = performance.now()
    const result = (() => {
      try {
        return {
          score: calculateFinancialScore(transactions),
          scoreBreakdown: getScoreBreakdown(transactions),
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
    })()
    return result
  }, [transactions, savingsGoal])

  const transactionIndex = useMemo(() => {
    try { return buildIndexes(transactions) } catch { return null }
  }, [transactions])

  const cashflowForecast = useMemo(() => {
    try { return getCashflowForecast(recurring, 3) } catch { return [] }
  }, [recurring])

  const goalsProjections = useMemo(() => {
    return goals.map((g) => ({ ...g, projection: getGoalProjection(g) }))
  }, [goals])

  const updateAccounts = useCallback((newAccounts) => {
    setState((prev) => ({ ...prev, accounts: newAccounts }))
  }, [])

  const addGoal = useCallback((data) => {
    const goal = createGoal(data)
    setState((prev) => ({ ...prev, goals: getGoals() }))
    return goal
  }, [])

  const editGoal = useCallback((id, updates) => {
    updateGoal(id, updates)
    setState((prev) => ({ ...prev, goals: getGoals() }))
  }, [])

  const removeGoal = useCallback((id) => {
    deleteGoal(id)
    setState((prev) => ({ ...prev, goals: getGoals() }))
  }, [])

  const addTemplate = useCallback((tx) => {
    createTemplate(tx)
    setState((prev) => ({ ...prev, templates: getTemplates() }))
  }, [])

  const removeTemplate = useCallback((id) => {
    deleteTemplate(id)
    setState((prev) => ({ ...prev, templates: getTemplates() }))
  }, [])

  const recentTemplates = useMemo(() => getRecentTemplates(), [templates])

  const addEmi = useCallback((data) => {
    const newEmi = createEmi(data)
    setState((prev) => ({ ...prev, emis: [newEmi, ...prev.emis] }))
    scheduleEmiNotifications(newEmi).catch(() => {})
    return newEmi
  }, [])

  const updateEmi = useCallback((id, updates) => {
    const oldEmi = emisRef.current.find((e) => e.id === id)
    let remainingMonthsOverride = null
    if (oldEmi && updates.tenure && updates.tenure !== oldEmi.tenure) {
      const paidMonths = oldEmi.tenure - oldEmi.remainingMonths
      remainingMonthsOverride = Math.max(0, updates.tenure - paidMonths)
    }
    setState((prev) => ({
      ...prev,
      emis: prev.emis.map((e) =>
        e.id === id
          ? { ...e, ...updates, ...(remainingMonthsOverride !== null ? { remainingMonths: remainingMonthsOverride } : {}), updatedAt: Date.now() }
          : e
      ),
    }))
    cancelEmiNotifications(id).catch(() => {})
    if (oldEmi) {
      const merged = { ...oldEmi, ...updates, ...(remainingMonthsOverride !== null ? { remainingMonths: remainingMonthsOverride } : {}) }
      if (merged.status === EMI_STATUS.ACTIVE && merged.remainingMonths > 0) {
        scheduleEmiNotifications(merged).catch(() => {})
      }
    }
  }, [])

  const closeEmi = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      emis: prev.emis.map((e) =>
        e.id === id
          ? { ...e, status: EMI_STATUS.CLOSED, closedAt: Date.now(), updatedAt: Date.now() }
          : e
      ),
    }))
    cancelEmiNotifications(id).catch(() => {})
  }, [])

  const pauseEmi = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      emis: prev.emis.map((e) =>
        e.id === id
          ? { ...e, status: EMI_STATUS.PAUSED, updatedAt: Date.now() }
          : e
      ),
    }))
    cancelEmiNotifications(id).catch(() => {})
  }, [])

  const resumeEmi = useCallback((id) => {
    let updatedEmi = null
    setState((prev) => {
      const emi = prev.emis.find((e) => e.id === id)
      if (!emi) return prev
      updatedEmi = { ...emi, status: EMI_STATUS.ACTIVE, updatedAt: Date.now() }
      return {
        ...prev,
        emis: prev.emis.map((e) =>
          e.id === id ? updatedEmi : e
        ),
      }
    })
    if (updatedEmi) {
      scheduleEmiNotifications(updatedEmi).catch(() => {})
    }
  }, [])

  const markEmiPaid = useCallback((emiId) => {
    setState((prev) => {
      const emi = prev.emis.find((e) => e.id === emiId)
      if (!emi) return prev

      const today = new Date().toISOString().split('T')[0]
      const newTx = {
        type: 'expense',
        amount: emi.amount,
        category: 'emi',
        note: emi.name,
        date: today,
        tags: ['emi'],
        source: emi.lender || undefined,
        person: emi.contactName ? { name: emi.contactName, phoneNumber: emi.phoneNumber || undefined } : undefined,
        id: generateId(),
        createdAt: Date.now(),
      }

      const paymentRecord = {
        id: generateId(),
        date: today,
        amount: emi.amount,
        transactionId: newTx.id,
        paidAt: Date.now(),
      }

      const newRemainingMonths = Math.max(0, emi.remainingMonths - 1)
      const isCompleted = newRemainingMonths === 0

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        emis: prev.emis.map((e) =>
          e.id === emiId
            ? {
                ...e,
                lastPaidDate: today,
                totalPaidCount: e.totalPaidCount + 1,
                remainingMonths: newRemainingMonths,
                status: isCompleted ? EMI_STATUS.CLOSED : e.status,
                closedAt: isCompleted ? Date.now() : e.closedAt,
                updatedAt: Date.now(),
                paymentHistory: [...(e.paymentHistory || []), paymentRecord],
              }
            : e
        ),
      }
    })
    cancelEmiNotifications(emiId).catch(() => {})
    const emi = emisRef.current.find((e) => e.id === emiId)
    if (emi) {
      const newRemaining = Math.max(0, emi.remainingMonths - 1)
      if (newRemaining > 0) {
        const nextRef = new Date()
        nextRef.setMonth(nextRef.getMonth() + 1)
        scheduleEmiNotifications(
          { ...emi, remainingMonths: newRemaining },
          nextRef,
        ).catch(() => {})
      }
    }
    checkStreakMilestone([{ date: new Date().toISOString().split('T')[0] }, ...transactionsRef.current]).catch(() => {})
    hapticLight()
  }, [])

  const emiSummary = useMemo(() => {
    try { return getEmiSummary(emis) } catch { return null }
  }, [emis])

  const snapshotDiagnostics = useMemo(() => {
    try { return getRecoveryChainSummary() } catch { return null }
  }, [])

  const storageCorruptionReport = useMemo(() => {
    try { return detectCorruption() } catch { return [] }
  }, [])

  const backupHealth = useMemo(() => {
    try { return getBackupHealth() } catch { return { status: 'unknown', message: '' } }
  }, [])

  const backupStats = useMemo(() => {
    try { return getBackupStats() } catch { return { totalExports: 0, totalEncryptedExports: 0, totalRestores: 0 } }
  }, [])

  const recentPeople = useMemo(() => extractPeopleFromTransactions(transactions), [transactions])

  const dismissNotification = useCallback(() => setNotification(null), [])

  const value = useMemo(() => ({
    transactions, transactionIndex, savingsGoal, budgets, recurring, tags, security, notification, insights,
    cashflowForecast, recoverySnapshot, recentPeople, goals, goalsProjections,
    templates, recentTemplates,
    snapshotDiagnostics, storageCorruptionReport,
    backupHealth, backupStats,
    pendingRecurring,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
    addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification, restoreFromSnapshot, reloadFromStorage,
    debts, addDebt, updateDebt, deleteDebt, recordRepayment, debtsSummary,
    addGoal, editGoal, removeGoal, addTemplate, removeTemplate,
    emis, addEmi, updateEmi, closeEmi, pauseEmi, resumeEmi, markEmiPaid, emiSummary,
    accounts, updateAccounts,
  }), [
    transactions, transactionIndex, savingsGoal, budgets, recurring, tags, security, notification, insights,
    cashflowForecast, recoverySnapshot, recentPeople, goals, goalsProjections,
    templates, recentTemplates,
    snapshotDiagnostics, storageCorruptionReport,
    backupHealth, backupStats,
    pendingRecurring,
    addTransaction, deleteTransaction, updateTransaction, getBalance,
    getMonthlySummary, getMonthlyData, updateSavings, updateBudgets, updateBudgetLimit,
    addRecurring, removeRecurring, executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
    addTag, removeTag, updateSecurity,
    clearAllData, importData, dismissNotification, restoreFromSnapshot, reloadFromStorage,
    debts, addDebt, updateDebt, deleteDebt, recordRepayment, debtsSummary,
    addGoal, editGoal, removeGoal, addTemplate, removeTemplate,
    emis, addEmi, updateEmi, closeEmi, pauseEmi, resumeEmi, markEmiPaid, emiSummary,
    accounts, updateAccounts,
  ])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
