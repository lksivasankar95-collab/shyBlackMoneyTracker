const STORAGE_PREFIX = 'shyblack_'

const MAX_RETRIES = 2
const RETRY_DELAY = 50

const STORAGE_KEYS = {
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
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isQuotaError(error) {
  return (
    error instanceof DOMException &&
    (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

function tryParse(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed !== undefined ? parsed : fallback
  } catch {
    return fallback
  }
}

export const safeStorage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key)
      return tryParse(raw, fallback)
    } catch {
      return fallback
    }
  },

  getRaw(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  set(key, value) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const serialized = JSON.stringify(value)
        localStorage.setItem(key, serialized)
        return true
      } catch (error) {
        if (isQuotaError(error) && attempt < MAX_RETRIES - 1) {
          this.remove(STORAGE_KEYS.SCHEMA)
          delay(RETRY_DELAY)
          continue
        }
        return false
      }
    }
    return false
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  clear() {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => {
        try { localStorage.removeItem(k) } catch {}
      })
      return true
    } catch {
      return false
    }
  },

  getStorageInfo() {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const val = localStorage.getItem(key)
          total += (key.length + (val ? val.length : 0)) * 2
        }
      }
      return { usedBytes: total, usedKB: Math.round(total / 1024), keyCount: Object.values(STORAGE_KEYS).length }
    } catch {
      return { usedBytes: 0, usedKB: 0, keyCount: 0 }
    }
  },

  isAvailable() {
    try {
      const k = `${STORAGE_PREFIX}_test`
      localStorage.setItem(k, '1')
      localStorage.removeItem(k)
      return true
    } catch {
      return false
    }
  },
}

export { STORAGE_KEYS }
