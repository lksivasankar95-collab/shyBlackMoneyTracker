import { getStorageAdapter } from './storageAdapter'

export const STORAGE_PREFIX = 'shyblack_'

export const STORAGE_KEYS = {
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  SAVINGS: `${STORAGE_PREFIX}savings`,
  BUDGETS: `${STORAGE_PREFIX}budgets`,
  RECURRING: `${STORAGE_PREFIX}recurring`,
  TAGS: `${STORAGE_PREFIX}tags`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
  DEBTS: `${STORAGE_PREFIX}debts`,
  SCHEMA: `${STORAGE_PREFIX}schema`,
  ONBOARDING: `${STORAGE_PREFIX}onboarding`,
  REMINDER: `${STORAGE_PREFIX}reminder`,
  BUDGET_NOTIF: `${STORAGE_PREFIX}budget_notif`,
  STREAK: `${STORAGE_PREFIX}streak`,
  SNAPSHOT: `${STORAGE_PREFIX}snapshot`,
  GOALS: `${STORAGE_PREFIX}goals`,
  TEMPLATES: `${STORAGE_PREFIX}templates`,
  REVIEW: `${STORAGE_PREFIX}review`,
  NET_WORTH_ACCOUNTS: `${STORAGE_PREFIX}net_worth_accounts`,
  NET_WORTH_HISTORY: `${STORAGE_PREFIX}net_worth_history`,
  TRANSFERS: `${STORAGE_PREFIX}transfers`,
  EMIS: `${STORAGE_PREFIX}emis`,
  FORECAST_CONFIG: `${STORAGE_PREFIX}forecast_config`,
  ACHIEVEMENTS: `${STORAGE_PREFIX}achievements`,
  ARCHIVE: `${STORAGE_PREFIX}archive`,
  SEARCH_INDEX: `${STORAGE_PREFIX}search_idx`,
  DOCUMENTS: `${STORAGE_PREFIX}documents`,
  DOCUMENT_FILES: `${STORAGE_PREFIX}document_files`,
  RELATIONSHIPS: `${STORAGE_PREFIX}relationships`,
  EMI_TRACKER: `${STORAGE_PREFIX}emi_tracker`,
  BUDGETS_V2: `${STORAGE_PREFIX}budgets_v2`,
  RECEIPT_SCANS: `${STORAGE_PREFIX}receipt_scans`,
  WEALTH_ASSETS: `${STORAGE_PREFIX}wealth_assets`,
  BACKUPS: `${STORAGE_PREFIX}backups`,
  SCORE_HISTORY: `${STORAGE_PREFIX}score_history`,
  CURRENCY_SETTINGS: `${STORAGE_PREFIX}currency_settings`,
  AUTO_BACKUP: `${STORAGE_PREFIX}auto_backup`,
  SPLITS: `${STORAGE_PREFIX}splits`,
  RULES: `${STORAGE_PREFIX}rules`,
  CAPITAL_GAINS: `${STORAGE_PREFIX}capital_gains`,
  INVESTMENTS: `${STORAGE_PREFIX}investments`,
  NET_WORTH_MILESTONE: `${STORAGE_PREFIX}net_worth_milestone`,
  CUSTOM_CATEGORIES: `${STORAGE_PREFIX}custom_categories`,
  BILLS: `${STORAGE_PREFIX}bills`,
  WALLETS: `${STORAGE_PREFIX}wallets`,
  ACTIVE_WALLET: `${STORAGE_PREFIX}active_wallet`,
}

const memoryCache = new Map()

function getAdapter() {
  return getStorageAdapter()
}

function invalidateCache(key) {
  memoryCache.delete(key)
}

export const safeStorage = {
  get(key, fallback = null) {
    if (memoryCache.has(key)) {
      const cached = memoryCache.get(key)
      // Treat null/undefined cache entries as cache misses so the adapter is
      // always consulted for falsy stored values (e.g. set(key, null)).
      if (cached !== null && cached !== undefined) return cached
    }
    try {
      const value = getAdapter().get(key, fallback)
      memoryCache.set(key, value)
      return value
    } catch {
      invalidateCache(key)
      return fallback
    }
  },

  getRaw(key) {
    try {
      return getAdapter().getRaw(key)
    } catch {
      return null
    }
  },

  set(key, value) {
    let ok
    try {
      ok = getAdapter().set(key, value)
    } catch {
      ok = false
    }
    if (ok) memoryCache.set(key, value)
    else invalidateCache(key)
    return ok
  },

  remove(key) {
    try {
      invalidateCache(key)
      return getAdapter().remove(key)
    } catch {
      return false
    }
  },

  clear() {
    try {
      memoryCache.clear()
      return getAdapter().clear()
    } catch {
      return false
    }
  },

  getStorageInfo() {
    try {
      return getAdapter().getStorageInfo()
    } catch {
      return { usedBytes: 0, usedKB: 0, keyCount: 0 }
    }
  },

  isAvailable() {
    try {
      return getAdapter().isAvailable()
    } catch {
      return false
    }
  },

  getBatch(keys) {
    const results = {}
    for (const key of keys) {
      results[key] = this.get(key, null)
    }
    return results
  },

  setBatch(pairs) {
    const results = {}
    for (const { key, value } of pairs) {
      results[key] = this.set(key, value)
    }
    return results
  },

  invalidateCache(key) {
    if (key) {
      invalidateCache(key)
    } else {
      memoryCache.clear()
    }
  },
}
