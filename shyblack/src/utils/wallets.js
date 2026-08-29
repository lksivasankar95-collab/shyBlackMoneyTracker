import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

const WALLET_DATA_PREFIX = 'shyblack_wallet_data_'

// User data that must be isolated when the active wallet changes.
const WALLET_DATA_KEYS = [
  STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.SAVINGS, STORAGE_KEYS.BUDGETS,
  STORAGE_KEYS.RECURRING, STORAGE_KEYS.TAGS, STORAGE_KEYS.DEBTS,
  STORAGE_KEYS.GOALS, STORAGE_KEYS.TEMPLATES, STORAGE_KEYS.NET_WORTH_ACCOUNTS,
  STORAGE_KEYS.NET_WORTH_HISTORY, STORAGE_KEYS.TRANSFERS, STORAGE_KEYS.EMIS,
  STORAGE_KEYS.DOCUMENTS, STORAGE_KEYS.DOCUMENT_FILES, STORAGE_KEYS.RELATIONSHIPS,
  STORAGE_KEYS.ARCHIVE, STORAGE_KEYS.BUDGETS_V2, STORAGE_KEYS.RECEIPT_SCANS,
  STORAGE_KEYS.WEALTH_ASSETS, STORAGE_KEYS.SPLITS, STORAGE_KEYS.RULES,
  STORAGE_KEYS.CAPITAL_GAINS, STORAGE_KEYS.INVESTMENTS, STORAGE_KEYS.BILLS,
  STORAGE_KEYS.CUSTOM_CATEGORIES,
]

const EMPTY_WALLET_NAME = 'Personal'

function walletDataKey(id) {
  return `${WALLET_DATA_PREFIX}${id}`
}

function readWallets() {
  const wallets = safeStorage.get(STORAGE_KEYS.WALLETS, [])
  return Array.isArray(wallets) ? wallets : []
}

function saveWallets(wallets) {
  safeStorage.set(STORAGE_KEYS.WALLETS, wallets)
}

function getWalletData(id) {
  const data = safeStorage.get(walletDataKey(id), {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

function saveWalletData(id, data) {
  safeStorage.set(walletDataKey(id), data)
}

function readRawOptional(key) {
  if (typeof safeStorage.getRaw === 'function') return safeStorage.getRaw(key)
  try { return safeStorage.get(key, null) } catch { return null }
}

function snapshotCurrentData() {
  const data = {}
  for (const key of WALLET_DATA_KEYS) {
    const raw = readRawOptional(key)
    if (raw === null || raw === undefined) continue
    if (typeof raw === 'string') {
      try { data[key] = JSON.parse(raw) } catch { /* Ignore corrupt optional data. */ }
    } else {
      data[key] = raw
    }
  }
  return data
}

function restoreWalletData(data) {
  for (const key of WALLET_DATA_KEYS) safeStorage.remove(key)
  for (const [key, value] of Object.entries(data || {})) {
    if (WALLET_DATA_KEYS.includes(key)) safeStorage.set(key, value)
  }
  safeStorage.invalidateCache()
}

function activeWalletId() {
  return safeStorage.get(STORAGE_KEYS.ACTIVE_WALLET, null)
}

export function ensureWalletStorage() {
  let wallets = readWallets()
  if (wallets.length === 0) {
    const wallet = { id: generateId(), name: EMPTY_WALLET_NAME, createdAt: Date.now(), updatedAt: Date.now() }
    wallets = [wallet]
    saveWallets(wallets)
    saveWalletData(wallet.id, snapshotCurrentData())
    safeStorage.set(STORAGE_KEYS.ACTIVE_WALLET, wallet.id)
    return wallet
  }

  const currentId = activeWalletId()
  const current = wallets.find((wallet) => wallet.id === currentId) || wallets[0]
  if (current.id !== currentId) safeStorage.set(STORAGE_KEYS.ACTIVE_WALLET, current.id)
  return current
}

export function getWallets() {
  ensureWalletStorage()
  return readWallets()
}

export function getActiveWallet() {
  ensureWalletStorage()
  const id = activeWalletId()
  return readWallets().find((wallet) => wallet.id === id) || readWallets()[0]
}

export function createWallet(name) {
  const current = ensureWalletStorage()
  saveWalletData(current.id, snapshotCurrentData())
  const wallet = { id: generateId(), name: String(name || '').trim() || 'New Wallet', createdAt: Date.now(), updatedAt: Date.now() }
  saveWalletData(wallet.id, {})
  saveWallets([...readWallets(), wallet])
  restoreWalletData({})
  safeStorage.set(STORAGE_KEYS.ACTIVE_WALLET, wallet.id)
  return wallet
}

export function switchWallet(id) {
  const current = ensureWalletStorage()
  const target = readWallets().find((wallet) => wallet.id === id)
  if (!target) return { success: false, error: 'Wallet not found' }
  if (target.id === current.id) return { success: true, wallet: target }

  saveWalletData(current.id, snapshotCurrentData())
  restoreWalletData(getWalletData(target.id))
  safeStorage.set(STORAGE_KEYS.ACTIVE_WALLET, target.id)
  return { success: true, wallet: target }
}

export function renameWallet(id, name) {
  const cleanName = String(name || '').trim()
  if (!cleanName) return null
  const wallets = readWallets().map((wallet) => wallet.id === id
    ? { ...wallet, name: cleanName, updatedAt: Date.now() }
    : wallet)
  saveWallets(wallets)
  return wallets.find((wallet) => wallet.id === id) || null
}

export function deleteWallet(id) {
  const current = ensureWalletStorage()
  if (id === current.id) return { success: false, error: 'Switch wallets before deleting the active wallet' }
  const wallets = readWallets()
  if (!wallets.some((wallet) => wallet.id === id)) return { success: false, error: 'Wallet not found' }
  saveWallets(wallets.filter((wallet) => wallet.id !== id))
  safeStorage.remove(walletDataKey(id))
  return { success: true }
}

export function collectWalletBackup() {
  const current = ensureWalletStorage()
  saveWalletData(current.id, snapshotCurrentData())
  const wallets = readWallets()
  const data = {}
  for (const wallet of wallets) data[wallet.id] = getWalletData(wallet.id)
  return { wallets, activeWalletId: current.id, data }
}

export function restoreWalletBackup(payload) {
  if (!payload || !Array.isArray(payload.wallets) || !payload.data || typeof payload.data !== 'object') {
    return { success: false, error: 'Wallet backup data is invalid' }
  }
  const validWallets = payload.wallets.filter((wallet) => wallet && typeof wallet.id === 'string' && typeof wallet.name === 'string')
  if (validWallets.length === 0) return { success: false, error: 'Wallet backup contains no wallets' }
  saveWallets(validWallets)
  for (const wallet of validWallets) saveWalletData(wallet.id, payload.data[wallet.id] || {})
  const active = validWallets.some((wallet) => wallet.id === payload.activeWalletId) ? payload.activeWalletId : validWallets[0].id
  restoreWalletData(getWalletData(active))
  safeStorage.set(STORAGE_KEYS.ACTIVE_WALLET, active)
  return { success: true, walletCount: validWallets.length }
}

export { WALLET_DATA_KEYS }
