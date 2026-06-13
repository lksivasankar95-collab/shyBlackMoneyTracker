import { safeStorage, STORAGE_KEYS } from './safeStorage'

const keys = {
  TRANSACTIONS: STORAGE_KEYS.TRANSACTIONS,
  SAVINGS: STORAGE_KEYS.SAVINGS,
  BUDGETS: STORAGE_KEYS.BUDGETS,
  RECURRING: STORAGE_KEYS.RECURRING,
  TAGS: STORAGE_KEYS.TAGS,
  SETTINGS: STORAGE_KEYS.SETTINGS,
  DEBTS: STORAGE_KEYS.DEBTS,
  SCHEMA: STORAGE_KEYS.SCHEMA,
  ONBOARDING: STORAGE_KEYS.ONBOARDING,
  REMINDER: STORAGE_KEYS.REMINDER,
}

export { keys }

export const storage = {
  get(key, fallback = null) {
    return safeStorage.get(key, fallback)
  },
  set(key, value) {
    return safeStorage.set(key, value)
  },
  remove(key) {
    return safeStorage.remove(key)
  },
  clear() {
    return safeStorage.clear()
  },
}
