import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'
import { DEBT_TYPES, isOpenDebt } from './debts'

export const ACCOUNT_TYPES = {
  CASH: 'cash',
  BANK: 'bank',
  TRADING: 'trading',
}

export const NET_WORTH_HISTORY_KEY = STORAGE_KEYS.NET_WORTH_HISTORY

export function getAccounts() {
  return safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
}

export function saveAccounts(accounts) {
  safeStorage.set(STORAGE_KEYS.NET_WORTH_ACCOUNTS, accounts)
}

export function createAccount({ name, type, balance }) {
  const accounts = getAccounts()
  const account = {
    id: generateId(),
    name: name.trim(),
    type,
    balance: Math.abs(balance) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  accounts.push(account)
  saveAccounts(accounts)
  return account
}

export function updateAccount(id, updates) {
  const accounts = getAccounts().map((a) =>
    a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
  )
  saveAccounts(accounts)
  return accounts.find((a) => a.id === id)
}

export function deleteAccount(id) {
  const accounts = getAccounts().filter((a) => a.id !== id)
  saveAccounts(accounts)
}

export function calculateNetWorth(transactions, debts, accounts) {
  const accountByType = { cash: 0, bank: 0, trading: 0 }
  ;(accounts || []).forEach((a) => {
    accountByType[a.type] = (accountByType[a.type] || 0) + a.balance
  })

  const hasAccounts = (accounts || []).length > 0
  const hasCashAccounts = accountByType.cash > 0 || accountByType.bank > 0

  let cashAndBank = 0
  if (hasCashAccounts) {
    cashAndBank = accountByType.cash + accountByType.bank
  } else {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    cashAndBank = income - expense
  }

  let tradingCapital = accountByType.trading
  if (tradingCapital === 0 && !hasAccounts) {
    const tradingDeposits = transactions
      .filter((t) => t.category === 'trading_deposit')
      .reduce((s, t) => s + t.amount, 0)
    const tradingWithdrawals = transactions
      .filter((t) => t.category === 'trading_withdrawal')
      .reduce((s, t) => s + t.amount, 0)
    tradingCapital = tradingDeposits - tradingWithdrawals
  }

  const debtsGiven = (debts || [])
    .filter((d) => d.type === DEBT_TYPES.LENT && isOpenDebt(d))
    .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
  const debtsTaken = (debts || [])
    .filter((d) => d.type === DEBT_TYPES.BORROWED && isOpenDebt(d))
    .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)

  const totalAssets = Math.max(0, cashAndBank) + Math.max(0, tradingCapital) + debtsGiven
  const totalLiabilities = Math.max(0, -cashAndBank) + Math.max(0, -tradingCapital) + debtsTaken

  return {
    cashAndBank,
    tradingCapital,
    debtsGiven,
    debtsTaken,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    breakdown: [
      { label: 'Cash & Bank', value: cashAndBank, type: cashAndBank >= 0 ? 'asset' : 'liability', color: '#39ff14' },
      { label: 'Trading Capital', value: tradingCapital, type: tradingCapital >= 0 ? 'asset' : 'liability', color: '#3b82f6' },
      { label: 'Debts Owed to You', value: debtsGiven, type: 'asset', color: '#a855f7' },
      { label: 'Your Debts', value: debtsTaken, type: 'liability', color: '#ef4444' },
    ],
  }
}

export function getNetWorthHistory(transactions, debts, accounts, months = 6) {
  const now = new Date()
  const history = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const endStr = endDate.toISOString().split('T')[0]

    const txsUpTo = transactions.filter((t) => t.date <= endStr)
    const nw = calculateNetWorth(txsUpTo, debts, accounts)

    history.push({
      month: monthDate.toLocaleString('default', { month: 'short' }),
      netWorth: nw.netWorth,
      assets: nw.totalAssets,
      liabilities: nw.totalLiabilities,
    })
  }

  return history
}

export function getMonthlyGrowth(netWorthHistory) {
  if (netWorthHistory.length < 2) return 0
  const current = netWorthHistory[netWorthHistory.length - 1].netWorth
  const previous = netWorthHistory[netWorthHistory.length - 2].netWorth
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

// ── Real Net Worth History with automatic snapshots ──────────────

export function getStoredNetWorthHistory() {
  return safeStorage.get(NET_WORTH_HISTORY_KEY, [])
}

export function saveNetWorthSnapshot(transactions, debts, accounts) {
  const history = getStoredNetWorthHistory()
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const existing = history.find((h) => h.date === today)
  if (existing) return history

  const nw = calculateNetWorth(transactions, debts, accounts)
  const entry = {
    date: today,
    assets: nw.totalAssets,
    liabilities: nw.totalLiabilities,
    netWorth: nw.netWorth,
    cashAndBank: nw.cashAndBank,
    tradingCapital: nw.tradingCapital,
    debtsGiven: nw.debtsGiven,
    debtsTaken: nw.debtsTaken,
    createdAt: Date.now(),
  }
  history.push(entry)

  const maxEntries = 400
  if (history.length > maxEntries) {
    history.splice(0, history.length - maxEntries)
  }

  safeStorage.set(NET_WORTH_HISTORY_KEY, history)
  return history
}

export function getNetWorthTrend(history, period) {
  if (history.length === 0) return []

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const now = new Date()

  let cutoff
  switch (period) {
    case '7d':
      cutoff = new Date(now.getTime() - 7 * 86400000)
      break
    case '30d':
      cutoff = new Date(now.getTime() - 30 * 86400000)
      break
    case '6m':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      break
    case '1y':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      break
    default:
      cutoff = new Date(0)
  }

  return sorted.filter((h) => new Date(h.date) >= cutoff)
}
