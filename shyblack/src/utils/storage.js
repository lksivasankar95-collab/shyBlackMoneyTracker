const STORAGE_PREFIX = 'shyblack_'

const keys = {
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  SAVINGS: `${STORAGE_PREFIX}savings`,
  BUDGETS: `${STORAGE_PREFIX}budgets`,
  RECURRING: `${STORAGE_PREFIX}recurring`,
  TAGS: `${STORAGE_PREFIX}tags`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
  DEBTS: `${STORAGE_PREFIX}debts`,
}

export { keys }

export const storage = {
  get(key, fallback = null) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
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
      Object.values(keys).forEach((k) => localStorage.removeItem(k))
      return true
    } catch {
      return false
    }
  },
}
