import { getStorageAdapter, ADAPTER_TYPES } from './storageAdapter'

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
}

function getAdapter() {
  return getStorageAdapter()
}

export const safeStorage = {
  get(key, fallback = null) {
    try {
      return getAdapter().get(key, fallback)
    } catch {
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
    try {
      return getAdapter().set(key, value)
    } catch {
      return false
    }
  },

  remove(key) {
    try {
      return getAdapter().remove(key)
    } catch {
      return false
    }
  },

  clear() {
    try {
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
}
