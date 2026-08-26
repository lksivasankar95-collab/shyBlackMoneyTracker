import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { generateId, extractPeopleFromTransactions, formatCurrency } from '../utils/helpers'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { buildIndexes } from '../utils/indexer'
import { saveSnapshot, findRecoverySnapshot, getRecoveryChainSummary, detectCorruption } from '../utils/snapshotRecovery'
import { getBackupHealth, getBackupStats } from '../utils/backupHealth'
import { getBudgets, saveBudgets } from '../utils/budgets'
import { getRecurringTransactions, saveRecurringTransactions, getDueRecurringTransactions, advanceNextDate, autoExecuteDueRecurring, normalizeRecurringItem, detectDuplicateGeneration } from '../utils/recurring'
import { getTags, saveTags } from '../utils/tags'
import { getSecuritySettings, saveSecuritySettings } from '../utils/security'
import { getDebts, saveDebts, createDebt, applyRepayment, DEBT_TYPES, DEBT_STATUS, addPayment, undoLastPayment, editPayment, deletePayment, settleLedger, getLedgerSummary, getLedgerStatement, getLedgerInsights } from '../utils/debts'
import { getGoals, saveGoals, createGoal, updateGoal, deleteGoal, getGoalProjection, migrateLegacySavingsGoal } from '../utils/goals'
import { getTemplates, saveTemplates, createTemplate, deleteTemplate, getRecentTemplates } from '../utils/templates'
import { getEmis, saveEmis, createEmi, updateEmi, deleteEmi, closeEmi as closeEmiUtil, reopenEmi as reopenEmiUtil, EMI_STATUS, getEmiSummary, getEnhancedEmiSummary, undoPayment, getEmiStatsForDashboard, getEmiInsights, getEmiPaymentHistory } from '../utils/emi'
import { getAccounts, saveAccounts, saveNetWorthSnapshot } from '../utils/networth'
import {
  getDocuments, saveDocuments, createDocument, updateDocument, deleteDocument,
  getDocumentStats, getDocumentById, getDocumentFileData,
} from '../utils/documents'
import { archiveOldTransactions, getArchiveStats } from '../utils/archiveEngine'
import { runIntegrityCheck, applyRepairs } from '../utils/dataIntegrity'
import {
  calculateFinancialScore, detectOverspending, getSavingsRecommendations,
  getHabitInsights, getFinancialHealth, checkStreakMilestone,
  getMonthlyScoreHistory, getScoreVelocity, getLoggingStreak,
  predictMonthEndSpend, getCashflowForecast, getScoreBreakdown,
  generateSmartInsights,
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
import { runAllDataChecks } from '../utils/dataQuality'
import { generateReviewSummary } from '../utils/reviewCenter'
import { getBudgetsV2, saveBudgetsV2, recalculateBudgetSpending, getBudgetDashboardStats, getBudgetHealthV2, getBudgetAlerts, getOverspentCategories, createBudget as createBudgetV2Util, updateBudget as updateBudgetV2Util, deleteBudget as deleteBudgetV2Util, archiveBudget, reactivateBudget } from '../utils/budgetUtils'
import { generateSmartRecommendations, generateSpendingInsights, calculateSavingsRate, generateEmiInsights, generateDebtInsights, generateRecurringInsights, calculateFinancialScore as calcFinancialScore } from '../utils/insightsEngine'
import { getReceipts, saveReceipts, createReceipt as createReceiptUtil, updateReceipt as updateReceiptUtil, deleteReceipt as deleteReceiptUtil, getReceiptStats } from '../utils/receiptUtils'
import { getWealthAssets, saveWealthAssets, createWealthAsset as createWealthAssetUtil, updateWealthAsset as updateWealthAssetUtil, deleteWealthAsset as deleteWealthAssetUtil, calculateNetWorth, getNetWorthHistory, getAssetAllocation, getPortfolioSummary, calculateWealthScore, getWealthDashboardStats, linkAssetToGoal as linkAssetToGoalUtil, unlinkAssetFromGoal as unlinkAssetFromGoalUtil, getAssetsByGoal as getAssetsByGoalUtil } from '../utils/wealthUtils'
import { snapshotBeforeClearAll, snapshotBeforeBulkDelete, getBackupDashboardStats, createManualBackup, getAutoSnapshots, deleteAutoSnapshot, restoreAutoSnapshot } from '../utils/backupManager'
import { applyCurrencyToTransaction } from '../utils/multiCurrency'
import { runAutoBackupIfDue, getAutoBackupSettings } from '../utils/autoBackup'
import { getSplits, saveSplits, createSplit, updateSplit, deleteSplit, markParticipantPaid } from '../utils/splits'
import { applyRulesToTransaction, recordRuleUsage, getRules } from '../utils/rules'
import { shouldAlertLargeExpense } from '../utils/spendingPulse'
import { createUndoStack, applyUndoEntry, applyRedoEntry } from '../utils/undoManager'
import { mergeDuplicateTransactions } from '../utils/duplicateMerge'

// eslint-disable-next-line react-refresh/only-export-components
export const FinanceContext = createContext()

function isValidTransaction(t) {
  return t && typeof t === 'object' && typeof t.id === 'string' && typeof t.type === 'string' && typeof t.amount === 'number'
}

function isValidDebt(d) {
  return d && typeof d === 'object' && typeof d.id === 'string' && typeof d.personName === 'string' && (typeof d.amount === 'number' || typeof d.originalAmount === 'number')
}

function sanitizeTransactions(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidTransaction)
}

function sanitizeDebts(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(isValidDebt).map((d) => {
    if (typeof d.originalAmount === 'number') return d
    return { ...d, originalAmount: d.amount, currentBalance: d.remainingAmount ?? d.amount, payments: d.payments ?? [], createdDate: d.createdDate ?? d.createdAt ?? Date.now() }
  })
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

    // Integrity check is deferred to a post-mount useEffect to avoid blocking
    // the JavaScript main thread synchronously, which can cause ANR on Android.

    const archiveResult = archiveOldTransactions(transactions)
    if (archiveResult.archivedCount > 0) {
      safeStorage.set(STORAGE_KEYS.TRANSACTIONS, archiveResult.active)
      transactions = sanitizeTransactions(archiveResult.active)
    }

    const goals = getGoals()
    if (goals.length === 0) migrateLegacySavingsGoal()
    const docs = getDocuments()
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
      documents: docs,
      budgetsV2: getBudgetsV2(),
      receipts: getReceipts(),
      wealthAssets: getWealthAssets(),
      splits: getSplits(),
      _migrationResult: migrationResult,
      _recoverySnapshot: recoverySnapshot,
    }
  } catch {
    const fallbackSnap = findRecoverySnapshot([])
    return {
      transactions: sanitizeTransactions(fallbackSnap?.transactions || []),
      savingsGoal: fallbackSnap?.savingsGoal || { target: 0, saved: 0 },
      budgets: {},
      budgetsV2: [],
      receipts: [],
      wealthAssets: [],
      splits: [],
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
      debts: [],
      emis: [],
      accounts: [],
      documents: [],
      _migrationResult: null,
      _recoverySnapshot: fallbackSnap,
    }
  }
}

export function FinanceProvider({ children }) {
  const [state, setState] = useState(loadInitialState)
  const { transactions, savingsGoal, budgets, budgetsV2, receipts, wealthAssets, recurring, tags, security, debts, goals, templates, emis, accounts, documents, splits, _recoverySnapshot } = state
  const [notification, setNotification] = useState(null)
  const [recoverySnapshot, setRecoverySnapshot] = useState(_recoverySnapshot)
  const [backupVersion, setBackupVersion] = useState(0)
  const overspendTimer = useRef(null)
  const txPersistTimer = useRef(null)
  const undoStackRef = useRef(createUndoStack())
  const [undoVersion, setUndoVersion] = useState(0)

  const canUndo = useMemo(() => undoVersion >= 0 && undoStackRef.current.canUndo, [undoVersion])
  const canRedo = useMemo(() => undoVersion >= 0 && undoStackRef.current.canRedo, [undoVersion])

  // Refs for non-blocking async operations (budget notifications, etc.)
  const budgetsRef = useRef(budgets)
  const transactionsRef = useRef(transactions)
  const savingsGoalRef = useRef(savingsGoal)
  const emisRef = useRef(emis)
  useEffect(() => { budgetsRef.current = budgets }, [budgets])
  useEffect(() => { transactionsRef.current = transactions }, [transactions])
  useEffect(() => { savingsGoalRef.current = savingsGoal }, [savingsGoal])
  useEffect(() => { emisRef.current = emis }, [emis])
  const budgetsV2Ref = useRef(budgetsV2)
  useEffect(() => { budgetsV2Ref.current = budgetsV2 }, [budgetsV2])

  // Debounced transaction persistence with rolling snapshot chain
  useEffect(() => {
    if (txPersistTimer.current) clearTimeout(txPersistTimer.current)
    txPersistTimer.current = setTimeout(() => {
      try {
        safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactions)
        saveSnapshot(transactions, savingsGoalRef.current)
      } catch { /* silent */ }
    }, 300)
    return () => { if (txPersistTimer.current) clearTimeout(txPersistTimer.current) }
  }, [transactions])

  // Flush pending transaction persist on unmount to prevent data loss
  useEffect(() => {
    return () => {
      if (txPersistTimer.current) {
        clearTimeout(txPersistTimer.current)
        txPersistTimer.current = null
        try {
          safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactionsRef.current)
          saveSnapshot(transactionsRef.current, savingsGoalRef.current)
        } catch { /* silent */ }
      }
    }
  }, [])

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
        } catch { /* silent */ }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => { try { safeStorage.set(STORAGE_KEYS.SAVINGS, savingsGoal) } catch { /* silent */ } }, [savingsGoal])
  useEffect(() => { try { saveBudgets(budgets) } catch { /* silent */ } }, [budgets])
  useEffect(() => { try { saveRecurringTransactions(recurring) } catch { /* silent */ } }, [recurring])
  useEffect(() => { try { saveBudgetsV2(budgetsV2) } catch { /* silent */ } }, [budgetsV2])
  useEffect(() => { try { saveReceipts(receipts) } catch { /* silent */ } }, [receipts])
  useEffect(() => { try { saveWealthAssets(wealthAssets) } catch { /* silent */ } }, [wealthAssets])
  useEffect(() => { try { saveSplits(splits) } catch { /* silent */ } }, [splits])

  // Automated backups: run once shortly after startup if due
  useEffect(() => {
    const timer = setTimeout(() => {
      const settings = getAutoBackupSettings()
      if (settings.enabled) {
        runAutoBackupIfDue().catch(() => {})
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Deferred integrity check — runs 800 ms after first mount so the UI paints
  // before we iterate over all data. This prevents the main thread from blocking
  // at startup (which caused ANR / "app closing" on slower Android devices).
  const integrityChecked = useRef(false)
  useEffect(() => {
    if (integrityChecked.current) return
    integrityChecked.current = true
    const timer = setTimeout(() => {
      try {
        const currentDebts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
        const currentGoals = safeStorage.get(STORAGE_KEYS.GOALS, [])
        const currentAccounts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
        const currentTransfers = safeStorage.get(STORAGE_KEYS.TRANSFERS, [])
        const currentEmis = safeStorage.get(STORAGE_KEYS.EMIS, [])
        const integrityResult = runIntegrityCheck({
          transactions,
          debts: sanitizeDebts(currentDebts),
          goals: Array.isArray(currentGoals) ? currentGoals : [],
          accounts: Array.isArray(currentAccounts) ? currentAccounts : [],
          transfers: Array.isArray(currentTransfers) ? currentTransfers : [],
          emis: Array.isArray(currentEmis) ? currentEmis : [],
        })
        if (integrityResult.hasIssues && integrityResult.summary.totalRepairs > 0) {
          const repaired = applyRepairs(integrityResult)
          setState((prev) => {
            const next = { ...prev }
            if (repaired.transactions) {
              const fixedTxs = sanitizeTransactions(repaired.transactions)
              safeStorage.set(STORAGE_KEYS.TRANSACTIONS, fixedTxs)
              next.transactions = fixedTxs
            }
            if (repaired.debts) {
              safeStorage.set(STORAGE_KEYS.DEBTS, repaired.debts)
              next.debts = sanitizeDebts(repaired.debts)
            }
            if (repaired.goals) {
              safeStorage.set(STORAGE_KEYS.GOALS, repaired.goals)
              next.goals = repaired.goals
            }
            if (repaired.accounts) {
              safeStorage.set(STORAGE_KEYS.NET_WORTH_ACCOUNTS, repaired.accounts)
              next.accounts = repaired.accounts
            }
            if (repaired.transfers) {
              safeStorage.set(STORAGE_KEYS.TRANSFERS, repaired.transfers)
            }
            if (repaired.emis) {
              saveEmis(repaired.emis)
              next.emis = repaired.emis
            }
            return next
          })
        }
      } catch { /* silent — integrity check is best-effort */ }
    }, 800)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isFirstMount = useRef(true)
  useEffect(() => {
    if (!isFirstMount.current) return
    isFirstMount.current = false
    const timer = setTimeout(() => {
      try {
        const normalized = recurring.map(normalizeRecurringItem)
        const today = new Date().toISOString().split('T')[0]
        const duplicateCheck = detectDuplicateGeneration(normalized, transactions)
        autoExecuteDueRecurring(normalized.filter((item) => {
          const dup = duplicateCheck.find((d) => d.recurring.id === item.id)
          return !(dup && dup.generatedToday)
        }), (item) => {
          const newTx = {
            type: item.type,
            amount: item.amount,
            category: item.category,
            note: item.note || '',
            date: today,
            tags: item.tags || [],
            source: item.source || 'recurring',
            id: generateId(),
            createdAt: Date.now(),
          }
          const nextDate = advanceNextDate(item.nextDate, item.frequency || 'monthly')
          setState((prev) => ({
            ...prev,
            transactions: [newTx, ...prev.transactions],
            recurring: prev.recurring.map((r) =>
              r.id === item.id
                ? { ...r, nextDate, lastExecutedAt: Date.now(), updatedAt: Date.now() }
                : r
            ),
          }))
        })
      } catch { /* silent */ }
    }, 1500)
    return () => clearTimeout(timer)
  }, [recurring, transactions])
  useEffect(() => { try { saveTags(tags) } catch { /* silent */ } }, [tags])
  useEffect(() => { try { saveSecuritySettings(security) } catch { /* silent */ } }, [security])
  useEffect(() => { try { saveDebts(debts) } catch { /* silent */ } }, [debts])
  useEffect(() => { try { saveGoals(goals) } catch { /* silent */ } }, [goals])
  useEffect(() => { try { saveTemplates(templates) } catch { /* silent */ } }, [templates])
  useEffect(() => { try { saveEmis(emis) } catch { /* silent */ } }, [emis])
  useEffect(() => { try { saveAccounts(accounts) } catch { /* silent */ } }, [accounts])
  useEffect(() => { try { saveDocuments(documents) } catch { /* silent */ } }, [documents])

  useEffect(() => {
    if (transactions.length < 3) return
    if (overspendTimer.current) clearTimeout(overspendTimer.current)
    overspendTimer.current = setTimeout(() => {
      try {
        const overspend = detectOverspending(transactions)
        if (overspend) setNotification(overspend)
      } catch { /* silent */ }
    }, 1000)
    return () => { if (overspendTimer.current) clearTimeout(overspendTimer.current) }
  }, [transactions])

  const recalcBudgetsV2 = useCallback((allTx) => {
    try {
      const updated = recalculateBudgetSpending(allTx || transactionsRef.current)
      setState((prev) => ({ ...prev, budgetsV2: updated }))
    } catch { /* silent */ }
  }, [])

  const addBudgetV2 = useCallback((data) => {
    const budget = createBudgetV2Util(data)
    setState((prev) => ({ ...prev, budgetsV2: [...prev.budgetsV2, budget] }))
    return budget
  }, [])

  const updateBudgetV2 = useCallback((id, updates) => {
    const updated = updateBudgetV2Util(id, updates)
    if (updated) {
      setState((prev) => ({
        ...prev,
        budgetsV2: prev.budgetsV2.map((b) => (b.id === id ? { ...b, ...updated } : b)),
      }))
    }
    return updated
  }, [])

  const deleteBudgetV2 = useCallback((id) => {
    deleteBudgetV2Util(id)
    setState((prev) => ({ ...prev, budgetsV2: prev.budgetsV2.filter((b) => b.id !== id) }))
  }, [])

  const archiveBudgetV2 = useCallback((id) => {
    const updated = archiveBudget(id)
    if (updated) {
      setState((prev) => ({
        ...prev,
        budgetsV2: prev.budgetsV2.map((b) => (b.id === id ? { ...b, ...updated } : b)),
      }))
    }
  }, [])

  const reactivateBudgetV2 = useCallback((id) => {
    const updated = reactivateBudget(id)
    if (updated) {
      setState((prev) => ({
        ...prev,
        budgetsV2: prev.budgetsV2.map((b) => (b.id === id ? { ...b, ...updated } : b)),
      }))
    }
  }, [])

  const addTransaction = useCallback((transaction) => {
    const base = { ...transaction }
    const hasCustomCurrency = transaction.currency && transaction.amount !== undefined
    const prepared = hasCustomCurrency
      ? applyCurrencyToTransaction(base, transaction.amount, transaction.currency)
      : base
    const newTx = {
      ...prepared,
      id: generateId(),
      date: prepared.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    }
    let withRule = newTx
    if (!withRule.category || withRule.source === 'csv_import') {
      withRule = applyRulesToTransaction(newTx)
      if (withRule.ruleId) recordRuleUsage(withRule.ruleId)
    }
    const allTx = [withRule, ...transactionsRef.current]
    setState((prev) => ({ ...prev, transactions: [withRule, ...prev.transactions] }))

    undoStackRef.current.push({ kind: 'add', tx: withRule, index: 0, expense: withRule.type === 'expense' })
    setUndoVersion((v) => v + 1)

    if (transaction.type === 'expense' && transaction.category) {
      checkAndNotifyBudget(budgetsRef.current, allTx, transaction.category).catch(() => {})
    }

    if (transaction.type === 'expense') {
      recalcBudgetsV2(allTx)
    }

    if (withRule.type === 'expense' && shouldAlertLargeExpense(transactionsRef.current, withRule.amount)) {
      import('../utils/notifications').then(({ sendNotification, NOTIF_TYPES }) => {
        const amountStr = formatCurrency(withRule.amount)
        return sendNotification(NOTIF_TYPES.EXPENSE_ADDED, {
          title: 'Large expense alert',
          body: `${amountStr} — ${withRule.note || withRule.category || 'expense'}`,
          deepLink: 'history',
          transactionId: withRule.id,
        })
      }).catch(() => {})
    }

    checkStreakMilestone(allTx).catch(() => {})
    hapticLight()

    return withRule
  }, [recalcBudgetsV2])

  const addTransactionsBulk = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) return []
    const now = new Date().toISOString().split('T')[0]
    const prepared = list.map((t) => {
      const base = { ...t }
      const hasCustomCurrency = t.currency && t.amount !== undefined
      const tx = hasCustomCurrency
        ? applyCurrencyToTransaction(base, t.amount, t.currency)
        : base
      const ruled = applyRulesToTransaction(tx, getRules(), { override: true })
      if (ruled.ruleId) recordRuleUsage(ruled.ruleId)
      return {
        ...ruled,
        id: generateId(),
        date: ruled.date || now,
        createdAt: Date.now(),
      }
    })
    const allTx = [...prepared, ...transactionsRef.current]
    setState((prev) => ({ ...prev, transactions: [...prepared, ...prev.transactions] }))
    if (prepared.length > 0) {
      undoStackRef.current.push({ kind: 'addMany', txs: prepared, expense: prepared.some((t) => t.type === 'expense') })
      setUndoVersion((v) => v + 1)
    }
    const hasExpenses = prepared.some((t) => t.type === 'expense')
    if (hasExpenses) {
      try {
        const updated = recalculateBudgetSpending(allTx)
        setState((prev) => ({ ...prev, budgetsV2: updated }))
      } catch { /* silent */ }
    }
    checkStreakMilestone(allTx).catch(() => {})
    hapticLight()
    return prepared
  }, [])

  const deleteTransaction = useCallback((id) => {
    const deleted = transactionsRef.current.find((t) => t.id === id)
    if (deleted) {
      const index = transactionsRef.current.findIndex((t) => t.id === id)
      undoStackRef.current.push({ kind: 'delete', tx: deleted, index, expense: deleted.type === 'expense' })
      setUndoVersion((v) => v + 1)
    }
    setState((prev) => {
      const remaining = prev.transactions.filter((t) => t.id !== id)
      if (deleted && deleted.type === 'expense') {
        try {
          const updated = recalculateBudgetSpending(remaining)
          return { ...prev, transactions: remaining, budgetsV2: updated }
        } catch { /* silent */ }
      }
      return { ...prev, transactions: remaining }
    })
  }, [])

  const updateTransaction = useCallback((id, updates) => {
    const oldTx = transactionsRef.current.find((t) => t.id === id)
    const nextUpdates = { ...updates }
    if (updates.amount !== undefined && (updates.currency !== undefined || oldTx?.currency)) {
      const effectiveCurrency = updates.currency || oldTx?.currency
      const converted = applyCurrencyToTransaction({}, updates.amount, effectiveCurrency)
      nextUpdates.amount = converted.amount
      if (converted.currency) {
        nextUpdates.originalAmount = converted.originalAmount
        nextUpdates.currency = converted.currency
      } else {
        nextUpdates.originalAmount = undefined
        nextUpdates.currency = undefined
      }
    }
    const nextTx = oldTx ? { ...oldTx, ...nextUpdates } : null
    if (oldTx && nextTx) {
      undoStackRef.current.push({
        kind: 'update', id,
        before: oldTx,
        after: nextTx,
        expense: oldTx.type === 'expense' || nextTx.type === 'expense',
      })
      setUndoVersion((v) => v + 1)
    }
    setState((prev) => {
      const updated = prev.transactions.map((t) => (t.id === id ? { ...t, ...nextUpdates } : t))
      if ((oldTx?.type === 'expense' || updates?.type === 'expense') &&
          (updates?.amount !== undefined || updates?.category !== undefined)) {
        try {
          const recalc = recalculateBudgetSpending(updated)
          return { ...prev, transactions: updated, budgetsV2: recalc }
        } catch { /* silent */ }
      }
      return { ...prev, transactions: updated }
    })
  }, [])

  const deleteTransactionsBulk = useCallback((ids) => {
    const idSet = new Set(ids)
    const deleted = transactionsRef.current.filter((t) => idSet.has(t.id))
    if (!deleted.length) return 0
    const withIndexes = deleted.map((tx) => ({
      tx,
      index: transactionsRef.current.findIndex((t) => t.id === tx.id),
    }))
    undoStackRef.current.push({
      kind: 'deleteMany',
      txs: withIndexes,
      expense: deleted.some((t) => t.type === 'expense'),
    })
    setUndoVersion((v) => v + 1)
    setState((prev) => {
      const remaining = prev.transactions.filter((t) => !idSet.has(t.id))
      if (deleted.some((t) => t.type === 'expense')) {
        try {
          const recalc = recalculateBudgetSpending(remaining)
          return { ...prev, transactions: remaining, budgetsV2: recalc }
        } catch { /* silent */ }
      }
      return { ...prev, transactions: remaining }
    })
    return deleted.length
  }, [])

  const updateTransactionsBulk = useCallback((updates) => {
    const changes = []
    for (const u of updates || []) {
      const oldTx = transactionsRef.current.find((t) => t.id === u.id)
      if (!oldTx) continue
      const patch = { ...u }
      delete patch.id
      if (patch.amount !== undefined && (patch.currency !== undefined || oldTx.currency)) {
        const effectiveCurrency = patch.currency || oldTx.currency
        const converted = applyCurrencyToTransaction({}, patch.amount, effectiveCurrency)
        patch.amount = converted.amount
        if (converted.currency) {
          patch.originalAmount = converted.originalAmount
          patch.currency = converted.currency
        } else {
          patch.originalAmount = undefined
          patch.currency = undefined
        }
      }
      const nextTx = { ...oldTx, ...patch }
      if (nextTx.category === '') nextTx.category = undefined
      changes.push({ id: oldTx.id, before: oldTx, after: nextTx })
    }
    if (!changes.length) return 0
    undoStackRef.current.push({
      kind: 'updateMany',
      changes,
      expense: changes.some((c) => c.before.type === 'expense' || c.after.type === 'expense'),
    })
    setUndoVersion((v) => v + 1)
    setState((prev) => {
      const map = new Map(changes.map((c) => [c.id, c.after]))
      const updated = prev.transactions.map((t) => (map.has(t.id) ? map.get(t.id) : t))
      if (changes.some((c) => c.before.type === 'expense' || c.after.type === 'expense')) {
        try {
          const recalc = recalculateBudgetSpending(updated)
          return { ...prev, transactions: updated, budgetsV2: recalc }
        } catch { /* silent */ }
      }
      return { ...prev, transactions: updated }
    })
    return changes.length
  }, [])

  const mergeDuplicateTransactionsCb = useCallback((keepId, removeId) => {
    const keep = transactionsRef.current.find((t) => t.id === keepId)
    const dup = transactionsRef.current.find((t) => t.id === removeId)
    if (!keep || !dup) return false
    const merged = mergeDuplicateTransactions(keep, dup)
    const dupIndex = transactionsRef.current.findIndex((t) => t.id === removeId)
    undoStackRef.current.push({
      kind: 'merge', id: keepId, dupTx: dup, index: dupIndex,
      before: keep, after: merged,
      expense: keep.type === 'expense' || dup.type === 'expense',
    })
    setUndoVersion((v) => v + 1)
    setState((prev) => {
      const next = prev.transactions
        .filter((t) => t.id !== removeId)
        .map((t) => (t.id === keepId ? merged : t))
      if (keep.type === 'expense' || dup.type === 'expense') {
        try {
          const recalc = recalculateBudgetSpending(next)
          return { ...prev, transactions: next, budgetsV2: recalc }
        } catch { /* silent */ }
      }
      return { ...prev, transactions: next }
    })
    return true
  }, [])

  const undoLastAction = useCallback(() => {
    const entry = undoStackRef.current.popUndo()
    if (!entry) return false
    undoStackRef.current.pushRedo(entry)
    setState((prev) => {
      const transactions = applyUndoEntry(entry, prev.transactions)
      if (entry.expense) {
        try {
          const recalc = recalculateBudgetSpending(transactions)
          return { ...prev, transactions, budgetsV2: recalc }
        } catch { /* silent */ }
      }
      return { ...prev, transactions }
    })
    setUndoVersion((v) => v + 1)
    return true
  }, [])

  const redoLastAction = useCallback(() => {
    const entry = undoStackRef.current.popRedo()
    if (!entry) return false
    undoStackRef.current.push(entry)
    setState((prev) => {
      const transactions = applyRedoEntry(entry, prev.transactions)
      if (entry.expense) {
        try {
          const recalc = recalculateBudgetSpending(transactions)
          return { ...prev, transactions, budgetsV2: recalc }
        } catch { /* silent */ }
      }
      return { ...prev, transactions }
    })
    setUndoVersion((v) => v + 1)
    return true
  }, [])

  const clearUndoHistory = useCallback(() => {
    undoStackRef.current.clear()
    setUndoVersion((v) => v + 1)
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

  const updateRecurring = useCallback((id, updates) => {
    setState((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
      ),
    }))
  }, [])

  const toggleRecurring = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) =>
        r.id === id ? { ...r, active: !r.active, isActive: !(r.isActive ?? r.active ?? true), updatedAt: Date.now() } : r
      ),
    }))
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

  const pauseRecurring = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) =>
        r.id === id
          ? { ...r, paused: true, pausedAt: Date.now(), updatedAt: Date.now() }
          : r
      ),
    }))
  }, [])

  const resumeRecurring = useCallback((id) => {
    setState((prev) => {
      const item = prev.recurring.find((r) => r.id === id)
      if (!item) return prev
      const nextDate = advanceNextDate(item.nextDate || item.startDate || new Date().toISOString().split('T')[0], item.frequency || 'monthly')
      return {
        ...prev,
        recurring: prev.recurring.map((r) =>
          r.id === id
            ? { ...r, paused: false, pausedAt: undefined, nextDate, updatedAt: Date.now() }
            : r
        ),
      }
    })
  }, [])

  const skipNextOccurrence = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) =>
        r.id === id
          ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency || 'monthly'), lastSkippedAt: Date.now(), updatedAt: Date.now() }
          : r
      ),
    }))
  }, [])

  const editFutureOccurrences = useCallback((id, updates) => {
    const today = new Date().toISOString().split('T')[0]
    setState((prev) => {
      const updatedTransactions = prev.transactions.map((tx) => {
        if (tx.source === 'recurring' && tx.date >= today) {
          const txUpdates = {}
          if (updates.amount !== undefined) txUpdates.amount = updates.amount
          if (updates.category !== undefined) txUpdates.category = updates.category
          if (updates.note !== undefined) txUpdates.note = updates.note
          return Object.keys(txUpdates).length ? { ...tx, ...txUpdates } : tx
        }
        return tx
      })
      return {
        ...prev,
        transactions: updatedTransactions,
        recurring: prev.recurring.map((r) =>
          r.id === id
            ? { ...r, ...updates, updatedAt: Date.now() }
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

  const renameTag = useCallback((id, newName) => {
    const trimmed = newName.trim().toLowerCase()
    if (!trimmed) return
    setState((prev) => {
      if (prev.tags.find((t) => t.name === trimmed && t.id !== id)) return prev
      return {
        ...prev,
        tags: prev.tags.map((t) => (t.id === id ? { ...t, name: trimmed } : t)),
      }
    })
  }, [])

  const mergeTags = useCallback((sourceName, targetName) => {
    const s = sourceName.toLowerCase().trim()
    const t = targetName.toLowerCase().trim()
    if (!s || !t || s === t) return
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.name !== s),
      transactions: prev.transactions.map((tx) => {
        if (!tx.tags || !tx.tags.includes(s)) return tx
        const updated = tx.tags.map((tag) => (tag === s ? t : tag))
        const deduped = [...new Set(updated)]
        return { ...tx, tags: deduped }
      }),
    }))
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

  const addLedgerPayment = useCallback((ledgerId, amount, notes) => {
    const result = addPayment(ledgerId, amount, notes)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
      }))
    }
    return result
  }, [])

  const undoLedgerPayment = useCallback((ledgerId) => {
    const result = undoLastPayment(ledgerId)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
      }))
    }
    return result
  }, [])

  const editLedgerPayment = useCallback((ledgerId, paymentId, updates) => {
    const result = editPayment(ledgerId, paymentId, updates)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
      }))
    }
    return result
  }, [])

  const deleteLedgerPayment = useCallback((ledgerId, paymentId) => {
    const result = deletePayment(ledgerId, paymentId)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
      }))
    }
    return result
  }, [])

  const doSettleLedger = useCallback((ledgerId) => {
    const result = settleLedger(ledgerId)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
      }))
    }
    return result
  }, [])

  const ledgerInsights = useMemo(() => {
    try { return getLedgerInsights(debts) } catch { return [] }
  }, [debts])

  const debtsSummary = useMemo(() => {
    try {
      const summary = getLedgerSummary(debts)
      const now = new Date()
      const overdueDebts = debts.filter(
        (d) => d.status === 'active' && d.currentBalance > 0 && d.dueDate && new Date(d.dueDate) < now
      )
      return { ...summary, overdueCount: overdueDebts.length, overdueDebts }
    } catch {
      const totalLent = debts.filter((d) => d.type === DEBT_TYPES.LENT).reduce((s, d) => s + (d.originalAmount || d.amount || 0), 0)
      const totalBorrowed = debts.filter((d) => d.type === DEBT_TYPES.BORROWED).reduce((s, d) => s + (d.originalAmount || d.amount || 0), 0)
      const pendingReceivables = debts
        .filter((d) => d.type === DEBT_TYPES.LENT && d.status !== 'settled' && d.status !== DEBT_STATUS.PAID)
        .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
      const pendingPayables = debts
        .filter((d) => d.type === DEBT_TYPES.BORROWED && d.status !== 'settled' && d.status !== DEBT_STATUS.PAID)
        .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
      const now = new Date()
      const overdueDebts = debts.filter(
        (d) => d.status !== 'settled' && d.status !== DEBT_STATUS.PAID && d.dueDate && new Date(d.dueDate) < now
      )
      return { totalLent, totalBorrowed, pendingReceivables, pendingPayables, overdueCount: overdueDebts.length, overdueDebts, totalActive: 0, totalSettled: 0 }
    }
  }, [debts])

  const addSplit = useCallback((data) => {
    const split = createSplit(data)
    if (!split) return null
    setState((prev) => ({ ...prev, splits: [split, ...prev.splits] }))
    hapticLight()
    return split
  }, [])

  const updateSplitCb = useCallback((id, updates) => {
    const updated = updateSplit(id, updates)
    if (updated) {
      setState((prev) => ({
        ...prev,
        splits: prev.splits.map((s) => (s.id === id ? updated : s)),
      }))
    }
    return updated
  }, [])

  const deleteSplitCb = useCallback((id) => {
    deleteSplit(id)
    setState((prev) => ({ ...prev, splits: prev.splits.filter((s) => s.id !== id) }))
  }, [])

  const markSplitPaid = useCallback((splitId, participantId, amount) => {
    const result = markParticipantPaid(splitId, participantId, amount)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        splits: prev.splits.map((s) => (s.id === splitId ? result.split : s)),
      }))
      hapticLight()
    }
    return result
  }, [])

  const clearAllData = useCallback(() => {
    snapshotBeforeClearAll()
    clearUndoHistory()
    cancelAllEmiNotifications(emisRef.current).catch(() => {})
    safeStorage.clear()
    safeStorage.remove(STORAGE_KEYS.SCHEMA)
    privacy.clearPin()
    setState({
      transactions: [],
      savingsGoal: { target: 0, saved: 0 },
      budgets: {},
      budgetsV2: [],
      recurring: [],
      tags: [],
      security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
      debts: [],
      emis: [],
      goals: [],
      templates: [],
      documents: [],
      receipts: [],
      accounts: [],
      wealthAssets: [],
      splits: [],
      _migrationResult: null,
      _recoverySnapshot: null,
    })
  }, [clearUndoHistory])

  const importData = useCallback((data) => {
    clearUndoHistory()
    const txs = data.transactions ? sanitizeTransactions(data.transactions) : undefined
    const dts = data.debts ? sanitizeDebts(data.debts) : undefined
    const svg = data.savings || data.savingsGoal ? sanitizeSavingsGoal(data.savings || data.savingsGoal) : undefined
    const accts = data.accounts ? (Array.isArray(data.accounts) ? data.accounts : undefined) : undefined
    const wa = data.wealthAssets ? (Array.isArray(data.wealthAssets) ? data.wealthAssets : undefined) : undefined
    setState((prev) => ({
      ...prev,
      ...(txs ? { transactions: txs } : {}),
      ...(svg ? { savingsGoal: svg } : {}),
      ...(data.budgets ? { budgets: data.budgets } : {}),
      ...(data.recurring ? { recurring: data.recurring } : {}),
      ...(dts ? { debts: dts } : {}),
      ...(data.emis ? { emis: data.emis } : {}),
      ...(accts ? { accounts: accts } : {}),
      ...(wa ? { wealthAssets: wa } : {}),
      ...(Array.isArray(data.goals) ? { goals: data.goals } : {}),
      ...(Array.isArray(data.tags) ? { tags: data.tags } : {}),
      ...(Array.isArray(data.templates) ? { templates: data.templates } : {}),
      ...(Array.isArray(data.budgetsV2) ? { budgetsV2: data.budgetsV2 } : {}),
      ...(Array.isArray(data.receipts) ? { receipts: data.receipts } : {}),
      ...(Array.isArray(data.documents) ? { documents: data.documents } : {}),
      ...(Array.isArray(data.splits) ? { splits: data.splits } : {}),
    }))
    if (data.emis) {
      rescheduleAllEmiNotifications(data.emis).catch(() => {})
    }
  }, [clearUndoHistory])

  const restoreFromSnapshot = useCallback(() => {
    if (!recoverySnapshot) return
    clearUndoHistory()
    const txs = sanitizeTransactions(recoverySnapshot.transactions || [])
    const svg = sanitizeSavingsGoal(recoverySnapshot.savingsGoal)
    setState((prev) => ({ ...prev, transactions: txs, savingsGoal: svg }))
    setRecoverySnapshot(null)
  }, [recoverySnapshot, clearUndoHistory])

  const reloadFromStorage = useCallback(() => {
    clearUndoHistory()
    const newState = loadInitialState()
    setState(newState)
    setRecoverySnapshot(newState._recoverySnapshot || null)
    rescheduleAllEmiNotifications(newState.emis).catch(() => {})
  }, [clearUndoHistory])

  const [debouncedInsights, setDebouncedInsights] = useState({
    score: { score: 0, level: 'N/A', factors: [] },
    scoreBreakdown: null,
    overspend: null, recommendations: [], habits: [], health: null,
    scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
    smartInsights: [],
  })
  const insightsTimerRef = useRef(null)

  useEffect(() => {
    if (insightsTimerRef.current) clearTimeout(insightsTimerRef.current)
    insightsTimerRef.current = setTimeout(() => {
      const txLen = transactions.length
      if (txLen < 3) {
        setDebouncedInsights({
          score: { score: 0, level: 'N/A', factors: [] },
          overspend: null, recommendations: [], habits: [], health: null,
          scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
          smartInsights: [],
        })
        return
      }
      try {
        setDebouncedInsights({
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
          smartInsights: generateSmartInsights(transactions, budgetsRef.current, debts),
        })
      } catch {
        setDebouncedInsights({
          score: { score: 0, level: 'N/A', factors: [] },
          scoreBreakdown: null,
          overspend: null, recommendations: [], habits: [], health: null,
          scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
          smartInsights: [],
        })
      }
    }, 400)
    return () => { if (insightsTimerRef.current) clearTimeout(insightsTimerRef.current) }
  }, [transactions, savingsGoal, debts])

  const insights = debouncedInsights

  const transactionIndex = useMemo(() => {
    try { return buildIndexes(transactions) } catch { return { byId: {}, byDate: {}, byCategory: {}, byType: {}, byPerson: new Map() } }
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
    const goals = getGoals()
    setState((prev) => ({ ...prev, goals }))
    return goal
  }, [])

  const editGoal = useCallback((id, updates) => {
    updateGoal(id, updates)
    const goals = getGoals()
    setState((prev) => ({ ...prev, goals }))
  }, [])

  const removeGoal = useCallback((id) => {
    deleteGoal(id)
    const goals = getGoals()
    setState((prev) => ({ ...prev, goals }))
  }, [])

  const addTemplate = useCallback((tx) => {
    createTemplate(tx)
    setState((prev) => ({ ...prev, templates: getTemplates() }))
  }, [])

  const removeTemplate = useCallback((id) => {
    deleteTemplate(id)
    setState((prev) => ({ ...prev, templates: getTemplates() }))
  }, [])

  const recentTemplates = useMemo(
    () => [...templates].sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 5),
    [templates]
  )

  const addEmi = useCallback((data) => {
    const newEmi = createEmi(data)
    setState((prev) => ({ ...prev, emis: [newEmi, ...prev.emis] }))
    scheduleEmiNotifications(newEmi).catch(() => {})
    return newEmi
  }, [])

  const updateEmi = useCallback((id, updates) => {
    const oldEmi = emisRef.current.find((e) => e.id === id)
    if (!oldEmi) return
    setState((prev) => ({
      ...prev,
      emis: prev.emis.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
      ),
    }))
    cancelEmiNotifications(id).catch(() => {})
    const merged = { ...oldEmi, ...updates }
    if (merged.status === EMI_STATUS.ACTIVE && (merged.remainingMonths || 0) > 0) {
      scheduleEmiNotifications(merged).catch(() => {})
    }
  }, [])

  const deleteEmi = useCallback((id) => {
    setState((prev) => ({ ...prev, emis: prev.emis.filter((e) => e.id !== id) }))
    cancelEmiNotifications(id).catch(() => {})
  }, [])

  const closeEmi = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      emis: prev.emis.map((e) =>
        e.id === id ? { ...e, status: EMI_STATUS.CLOSED, remainingAmount: 0, remainingMonths: 0, updatedAt: Date.now() } : e
      ),
    }))
    cancelEmiNotifications(id).catch(() => {})
  }, [])

  const reopenEmi = useCallback((id) => {
    let updatedEmi = null
    setState((prev) => {
      const emi = prev.emis.find((e) => e.id === id)
      if (!emi || emi.status !== EMI_STATUS.CLOSED) return prev
      const originalRemaining = (emi.principalAmount ?? emi.amount ?? 0) - (emi.totalPaid || 0)
      const originalRemainingMonths = (emi.tenureMonths || 0) - (emi.totalPaidCount || 0)
      updatedEmi = {
        ...emi,
        status: EMI_STATUS.ACTIVE,
        remainingAmount: Math.max(0, originalRemaining),
        remainingMonths: Math.max(0, originalRemainingMonths),
        updatedAt: Date.now(),
      }
      return { ...prev, emis: prev.emis.map((e) => (e.id === id ? updatedEmi : e)) }
    })
    if (updatedEmi) scheduleEmiNotifications(updatedEmi).catch(() => {})
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
      const emiAmount = emi.emiAmount || emi.amount || 0
      const emiName = emi.loanName || emi.name || ''
      const emiLender = emi.lenderName || emi.lender || ''

      const newTx = {
        type: 'expense',
        amount: emiAmount,
        category: 'emi',
        note: `EMI: ${emiName}${emiLender ? ` - ${emiLender}` : ''}`,
        date: today,
        tags: ['emi'],
        source: emiLender || undefined,
        id: generateId(),
        createdAt: Date.now(),
      }

      const paymentRecord = {
        id: generateId(),
        paymentId: generateId(),
        emiId,
        date: today,
        paymentDate: today,
        amount: emiAmount,
        transactionId: newTx.id,
        paidAt: Date.now(),
        notes: `EMI payment for ${emiName}`,
        principal: Math.min(emiAmount, emi.remainingAmount || 0),
        interest: 0,
        extraAmount: 0,
        timestamp: Date.now(),
      }

      const principalPaid = Math.min(emiAmount, emi.remainingAmount || 0)
      const currentRemainingMonths = emi.remainingMonths !== undefined ? emi.remainingMonths : (emi.tenureMonths || 0)
      const newRemainingMonths = Math.max(0, currentRemainingMonths - 1)
      const newRemainingAmount = Math.max(0, (emi.remainingAmount || 0) - principalPaid)
      const isCompleted = newRemainingMonths === 0 || newRemainingAmount <= 0

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        emis: prev.emis.map((e) =>
          e.id === emiId
            ? {
                ...e,
                totalPaid: (e.totalPaid || 0) + emiAmount,
                totalPaidCount: (e.totalPaidCount || 0) + 1,
                remainingMonths: newRemainingMonths,
                remainingAmount: newRemainingAmount,
                status: isCompleted ? EMI_STATUS.CLOSED : (e.status || EMI_STATUS.ACTIVE),
                lastPaidDate: today,
                updatedAt: Date.now(),
                payments: [...(e.payments || []), paymentRecord],
              }
            : e
        ),
      }
    })
    cancelEmiNotifications(emiId).catch(() => {})
    const emi = emisRef.current.find((e) => e.id === emiId)
    if (emi) {
      const newRemaining = Math.max(0, (emi.remainingMonths || emi.tenureMonths || 0) - 1)
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

  const undoEmiPayment = useCallback((emiId) => {
    const result = undoPayment(emiId)
    if (result.success) {
      setState((prev) => ({
        ...prev,
        emis: prev.emis.map((e) => (e.id === emiId ? result.emi : e)),
      }))
    }
    return result
  }, [])

  const emiSummary = useMemo(() => {
    try { return getEnhancedEmiSummary(emis) } catch { return getEmiSummary(emis) }
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

  const addDocument = useCallback((data) => {
    const doc = createDocument(data)
    const documents = getDocuments()
    setState((prev) => ({ ...prev, documents }))
    return doc
  }, [])

  const editDocument = useCallback((id, updates) => {
    const result = updateDocument(id, updates)
    if (result) {
      const documents = getDocuments()
      setState((prev) => ({ ...prev, documents }))
    }
    return result
  }, [])

  const removeDocument = useCallback((id) => {
    const ok = deleteDocument(id)
    if (ok) {
      const documents = getDocuments()
      setState((prev) => ({ ...prev, documents }))
    }
    return ok
  }, [])

  const addReceipt = useCallback((data) => {
    const receipt = createReceiptUtil(data)
    setState((prev) => ({ ...prev, receipts: [receipt, ...prev.receipts] }))
    return receipt
  }, [])

  const updateReceiptCb = useCallback((id, updates) => {
    const updated = updateReceiptUtil(id, updates)
    if (updated) {
      setState((prev) => ({
        ...prev,
        receipts: prev.receipts.map((r) => (r.id === id ? updated : r)),
      }))
    }
    return updated
  }, [])

  const deleteReceiptCb = useCallback((id) => {
    deleteReceiptUtil(id)
    setState((prev) => ({ ...prev, receipts: prev.receipts.filter((r) => r.id !== id) }))
  }, [])

  const createTransactionFromReceipt = useCallback((receiptData) => {
    const newTx = {
      type: 'expense',
      amount: receiptData.amount,
      category: receiptData.category,
      date: receiptData.date,
      note: receiptData.merchant + (receiptData.notes ? ' - ' + receiptData.notes : ''),
      source: 'receipt_scan',
    }
    const tx = addTransaction(newTx)
    const receipt = createReceiptUtil({ ...receiptData, transactionId: tx.id })
    setState((prev) => ({ ...prev, receipts: [receipt, ...prev.receipts] }))
    return { transaction: tx, receipt }
  }, [addTransaction])

  const receiptStats = useMemo(() => {
    try { return getReceiptStats(receipts) } catch { return { total: 0, thisMonth: 0, mostScannedCategory: null, avgConfidence: 0 } }
  }, [receipts])

  const addWealthAsset = useCallback((data) => {
    const asset = createWealthAssetUtil(data)
    setState((prev) => ({ ...prev, wealthAssets: [...prev.wealthAssets, asset] }))
    return asset
  }, [])

  const updateWealthAssetCb = useCallback((id, updates) => {
    const updated = updateWealthAssetUtil(id, updates)
    if (updated) {
      setState((prev) => ({
        ...prev,
        wealthAssets: prev.wealthAssets.map((a) => (a.id === id ? updated : a)),
      }))
    }
    return updated
  }, [])

  const deleteWealthAssetCb = useCallback((id) => {
    deleteWealthAssetUtil(id)
    setState((prev) => ({ ...prev, wealthAssets: prev.wealthAssets.filter((a) => a.id !== id) }))
  }, [])

  const netWorthData = useMemo(() => {
    try { return calculateNetWorth(wealthAssets, accounts, emis, debts) } catch { return { totalAssets: 0, totalLiabilities: 0, netWorth: 0, accountBalances: 0, cash: 0 } }
  }, [wealthAssets, accounts, emis, debts])

  const netWorthHistory = useMemo(() => {
    try { return getNetWorthHistory(wealthAssets, accounts, emis, debts) } catch { return [] }
  }, [wealthAssets, accounts, emis, debts])

  const assetAllocation = useMemo(() => {
    try { return getAssetAllocation(wealthAssets) } catch { return [] }
  }, [wealthAssets])

  const portfolioSummary = useMemo(() => {
    try { return getPortfolioSummary(wealthAssets) } catch { return { totalInvested: 0, totalCurrent: 0, totalProfitLoss: 0, profitLossPercent: 0 } }
  }, [wealthAssets])

  const wealthScore = useMemo(() => {
    try { return calculateWealthScore(wealthAssets, accounts, emis, debts) } catch { return { diversificationScore: 0, liquidityScore: 0, debtRatio: 0, investmentRatio: 0, overallScore: 0, grade: 'N/A', breakdown: [] } }
  }, [wealthAssets, accounts, emis, debts])

  const wealthDashboardStats = useMemo(() => {
    try { return getWealthDashboardStats(wealthAssets, accounts, emis, debts) } catch { return { netWorth: 0, totalAssets: 0, totalLiabilities: 0, totalInvested: 0, totalCurrent: 0, totalProfitLoss: 0, profitLossPercent: 0, assetCount: 0, wealthScore: 0, wealthGrade: 'N/A', topAllocation: [] } }
  }, [wealthAssets, accounts, emis, debts])

  const documentStats = useMemo(() => {
    try { return getDocumentStats() } catch { return { total: 0, totalFileSize: 0, thisMonth: 0, byCategory: {}, recent: [] } }
  }, [])

  const dataQuality = useMemo(() => {
    try {
      const rels = safeStorage.get(STORAGE_KEYS.RELATIONSHIPS, [])
      const transfers = transactions.filter((t) => t.type === 'transfer')
      return runAllDataChecks(transactions, documents, debts, emis, accounts, rels, transfers)
    } catch { return { issues: [], total: 0, bySeverity: {}, byCheck: {} } }
  }, [transactions, documents, debts, emis, accounts])

  const reviewSummary = useMemo(() => {
    try { return generateReviewSummary(transactions, debts, emis, goals, accounts) }
    catch { return null }
  }, [transactions, debts, emis, goals, accounts])

  const spendingInsights = useMemo(() => {
    try { return generateSpendingInsights(transactions) } catch { return [] }
  }, [transactions])

  const savingsRate = useMemo(() => {
    try { return calculateSavingsRate(transactions) } catch { return { rate: 0, level: 'No Data', savings: 0, income: 0, expense: 0 } }
  }, [transactions])

  const monthlyIncome = useMemo(() => {
    const now = new Date()
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  const emiInsightsData = useMemo(() => {
    try { return generateEmiInsights(emis, monthlyIncome) } catch { return [] }
  }, [emis, monthlyIncome])

  const debtInsightsData = useMemo(() => {
    try { return generateDebtInsights(debts) } catch { return [] }
  }, [debts])

  const recurringInsightsData = useMemo(() => {
    try { return generateRecurringInsights(recurring) } catch { return [] }
  }, [recurring])

  const financialScore = useMemo(() => {
    try { return calcFinancialScore(transactions, budgetsV2, debts, emis, recurring) } catch { return { score: 0, grade: 'N/A', summary: '', breakdown: [] } }
  }, [transactions, budgetsV2, debts, emis, recurring])

  const smartRecommendations = useMemo(() => {
    try { return generateSmartRecommendations(transactions, budgetsV2, debts, emis, goals, recurring) } catch { return [] }
  }, [transactions, budgetsV2, debts, emis, goals, recurring])

  const budgetDashboardStats = useMemo(() => {
    try { return getBudgetDashboardStats(budgetsV2) } catch { return { totalBudgets: 0, activeBudgets: 0, overBudgetCount: 0, totalBudgeted: 0, totalSpent: 0, utilization: 0 } }
  }, [budgetsV2])

  const budgetHealthV2 = useMemo(() => {
    try { return getBudgetHealthV2(budgetsV2) } catch { return { safe: 0, warning: 0, exceeded: 0, health: 100, totalActive: 0 } }
  }, [budgetsV2])

  const budgetAlerts = useMemo(() => {
    try { return getBudgetAlerts(budgetsV2) } catch { return [] }
  }, [budgetsV2])

  const overspentCategories = useMemo(() => {
    try { return getOverspentCategories(budgetsV2) } catch { return [] }
  }, [budgetsV2])

  const backupDashboardStats = useMemo(() => {
    try { return getBackupDashboardStats() } catch { return { backupCount: 0, latestBackupAt: null, healthScore: 0, healthGrade: 'F', healthStatus: 'critical', totalSize: 0 } }
  }, [])

  const handleCreateBackup = useCallback(async () => {
    try {
      const result = await createManualBackup()
      setBackupVersion((v) => v + 1)
      return result
    } catch { return null }
  }, [])

  const transactionActions = useMemo(() => ({
    addTransaction, addTransactionsBulk, deleteTransaction, deleteTransactionsBulk,
    updateTransaction, updateTransactionsBulk, getBalance,
    getMonthlySummary, getMonthlyData, undoLastAction, redoLastAction, clearUndoHistory, canUndo, canRedo,
    mergeDuplicateTransactionsCb,
  }), [addTransaction, addTransactionsBulk, deleteTransaction, deleteTransactionsBulk,
    updateTransaction, updateTransactionsBulk, getBalance, getMonthlySummary, getMonthlyData,
    undoLastAction, redoLastAction, clearUndoHistory, canUndo, canRedo,
    mergeDuplicateTransactionsCb])

  const recurringActions = useMemo(() => ({
    addRecurring, updateRecurring, toggleRecurring, removeRecurring,
    executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
    pauseRecurring, resumeRecurring, skipNextOccurrence, editFutureOccurrences,
  }), [addRecurring, updateRecurring, toggleRecurring, removeRecurring,
    executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
    pauseRecurring, resumeRecurring, skipNextOccurrence, editFutureOccurrences])

  const budgetActions = useMemo(() => ({
    addBudgetV2, updateBudgetV2, deleteBudgetV2, archiveBudgetV2, reactivateBudgetV2, recalcBudgetsV2,
  }), [addBudgetV2, updateBudgetV2, deleteBudgetV2, archiveBudgetV2, reactivateBudgetV2, recalcBudgetsV2])

  const tagActions = useMemo(() => ({
    addTag, removeTag, renameTag, mergeTags,
  }), [addTag, removeTag, renameTag, mergeTags])

  const debtActions = useMemo(() => ({
    addDebt, updateDebt, deleteDebt, recordRepayment,
    addLedgerPayment, undoLedgerPayment, editLedgerPayment, deleteLedgerPayment, doSettleLedger,
  }), [addDebt, updateDebt, deleteDebt, recordRepayment,
    addLedgerPayment, undoLedgerPayment, editLedgerPayment, deleteLedgerPayment, doSettleLedger])

  const goalActions = useMemo(() => ({ addGoal, editGoal, removeGoal }), [addGoal, editGoal, removeGoal])

  const templateActions = useMemo(() => ({ addTemplate, removeTemplate }), [addTemplate, removeTemplate])

  const emiActions = useMemo(() => ({
    addEmi, updateEmi, deleteEmi, closeEmi, reopenEmi, pauseEmi, resumeEmi, markEmiPaid, undoEmiPayment,
  }), [addEmi, updateEmi, deleteEmi, closeEmi, reopenEmi, pauseEmi, resumeEmi, markEmiPaid, undoEmiPayment])

  const documentActions = useMemo(() => ({
    addDocument, editDocument, removeDocument,
  }), [addDocument, editDocument, removeDocument])

  const receiptActions = useMemo(() => ({
    addReceipt, updateReceiptCb, deleteReceiptCb, createTransactionFromReceipt,
  }), [addReceipt, updateReceiptCb, deleteReceiptCb, createTransactionFromReceipt])

  const wealthActions = useMemo(() => ({
    addWealthAsset, updateWealthAssetCb, deleteWealthAssetCb,
  }), [addWealthAsset, updateWealthAssetCb, deleteWealthAssetCb])

  const splitActions = useMemo(() => ({
    addSplit, updateSplitCb, deleteSplitCb, markSplitPaid,
  }), [addSplit, updateSplitCb, deleteSplitCb, markSplitPaid])

  const computedData = useMemo(() => ({
    insights, cashflowForecast, recentPeople, goalsProjections,
    snapshotDiagnostics, storageCorruptionReport, backupHealth, backupStats,
    pendingRecurring, dataQuality, reviewSummary,
    spendingInsights, savingsRate, emiInsightsData, debtInsightsData, recurringInsightsData,
    financialScore, smartRecommendations, budgetDashboardStats, budgetHealthV2,
    budgetAlerts, overspentCategories, ledgerInsights, debtsSummary,
    emiSummary, documentStats, receiptStats,
    netWorthData, netWorthHistory, assetAllocation, portfolioSummary, wealthScore, wealthDashboardStats,
    backupDashboardStats,
  }), [insights, cashflowForecast, recentPeople, goalsProjections,
    snapshotDiagnostics, storageCorruptionReport, backupHealth, backupStats,
    pendingRecurring, dataQuality, reviewSummary,
    spendingInsights, savingsRate, emiInsightsData, debtInsightsData, recurringInsightsData,
    financialScore, smartRecommendations, budgetDashboardStats, budgetHealthV2,
    budgetAlerts, overspentCategories, ledgerInsights, debtsSummary,
    emiSummary, documentStats, receiptStats,
    netWorthData, netWorthHistory, assetAllocation, portfolioSummary, wealthScore, wealthDashboardStats,
    backupDashboardStats])

  const value = useMemo(() => ({
    ...computedData,
    transactions, transactionIndex, savingsGoal, budgets, recurring, tags, security, notification,
    recoverySnapshot, goals, templates, recentTemplates,
    budgetsV2, debts, emis, accounts, documents, receipts, wealthAssets, splits,
    ...transactionActions,
    ...recurringActions,
    ...budgetActions,
    ...tagActions,
    ...debtActions,
    ...goalActions,
    ...templateActions,
    ...emiActions,
    ...documentActions,
    ...receiptActions,
    ...wealthActions,
    ...splitActions,
    updateSavings, updateBudgets, updateBudgetLimit, updateSecurity,
    updateAccounts, clearAllData, importData, dismissNotification,
    restoreFromSnapshot, reloadFromStorage, handleCreateBackup,
  }), [
    computedData,
    transactions, transactionIndex, savingsGoal, budgets, recurring, tags, security, notification,
    recoverySnapshot, goals, templates, recentTemplates,
    budgetsV2, debts, emis, accounts, documents, receipts, wealthAssets, splits,
    transactionActions, recurringActions, budgetActions, tagActions,
    debtActions, goalActions, templateActions, emiActions, documentActions, receiptActions, wealthActions,
    splitActions,
    updateSavings, updateBudgets, updateBudgetLimit, updateSecurity,
    updateAccounts, clearAllData, importData, dismissNotification,
    restoreFromSnapshot, reloadFromStorage, handleCreateBackup,
  ])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
