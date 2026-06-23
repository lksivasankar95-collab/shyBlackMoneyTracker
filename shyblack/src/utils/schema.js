import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const APP_SCHEMA_VERSION = 10
export const SCHEMA_VERSION_KEY = STORAGE_KEYS.SCHEMA

const SCHEMA_MIGRATIONS = {
  2: () => {
    const raw = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
    if (!Array.isArray(raw)) return
    const cleaned = raw.map((tx) => {
      if (!tx || typeof tx !== 'object') return tx
      const purpose = tx.transactionPurpose
      if (purpose === 'trading_profit' || purpose === 'trading_loss' || purpose === 'investment_transfer') {
        const { transactionPurpose, ...rest } = tx
        return rest
      }
      return tx
    })
    safeStorage.set(STORAGE_KEYS.TRANSACTIONS, cleaned)
  },
  3: () => {
    const accounts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, null)
    if (accounts === null) {
      safeStorage.set(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
    }
  },
  4: () => {
    const emis = safeStorage.get(STORAGE_KEYS.EMIS, [])
    if (!Array.isArray(emis)) return
    let changed = false
    const migrated = emis.map((emi) => {
      if (emi && !emi.frequency) {
        changed = true
        return { ...emi, frequency: 'monthly' }
      }
      return emi
    })
    if (changed) {
      safeStorage.set(STORAGE_KEYS.EMIS, migrated)
    }
  },
  5: () => {
    const debts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
    if (!Array.isArray(debts)) return
    let changed = false
    const migrated = debts.map((debt) => {
      if (!debt || debt.originalAmount !== undefined) return debt
      changed = true
      return {
        ...debt,
        originalAmount: debt.amount || 0,
        currentBalance: debt.remainingAmount ?? debt.amount ?? 0,
        status: debt.status === 'paid' ? 'settled' : 'active',
        createdDate: debt.createdAt || Date.now(),
        settlementDate: debt.status === 'paid' ? (debt.updatedAt || Date.now()) : null,
        payments: [],
      }
    })
    if (changed) {
      safeStorage.set(STORAGE_KEYS.DEBTS, migrated)
    }
  },
  6: () => {
    const docs = safeStorage.get(STORAGE_KEYS.DOCUMENTS, null)
    if (docs === null) {
      safeStorage.set(STORAGE_KEYS.DOCUMENTS, [])
    }
    const files = safeStorage.get(STORAGE_KEYS.DOCUMENT_FILES, null)
    if (files === null) {
      safeStorage.set(STORAGE_KEYS.DOCUMENT_FILES, {})
    }
  },
  7: () => {
    const rels = safeStorage.get(STORAGE_KEYS.RELATIONSHIPS, null)
    if (rels === null) {
      safeStorage.set(STORAGE_KEYS.RELATIONSHIPS, [])
    }
  },
  8: () => {
    const bv2 = safeStorage.get(STORAGE_KEYS.BUDGETS_V2, null)
    if (bv2 === null) {
      safeStorage.set(STORAGE_KEYS.BUDGETS_V2, [])
    }
  },
  9: () => {
    const rs = safeStorage.get(STORAGE_KEYS.RECEIPT_SCANS, null)
    if (rs === null) {
      safeStorage.set(STORAGE_KEYS.RECEIPT_SCANS, [])
    }
  },
  10: () => {
    const wa = safeStorage.get(STORAGE_KEYS.WEALTH_ASSETS, null)
    if (wa === null) {
      safeStorage.set(STORAGE_KEYS.WEALTH_ASSETS, [])
    }
  },
}

export function getSchemaVersion() {
  const stored = safeStorage.get(SCHEMA_VERSION_KEY, { version: 0 })
  return stored && typeof stored.version === 'number' ? stored.version : 0
}

export function setSchemaVersion(version) {
  return safeStorage.set(SCHEMA_VERSION_KEY, { version, updatedAt: Date.now() })
}

export function runMigrations() {
  const currentVersion = getSchemaVersion()
  if (currentVersion >= APP_SCHEMA_VERSION) return { migrated: false, from: currentVersion, to: APP_SCHEMA_VERSION }

  const migrationKeys = Object.keys(SCHEMA_MIGRATIONS)
    .map(Number)
    .filter((v) => v > currentVersion && v <= APP_SCHEMA_VERSION)
    .sort((a, b) => a - b)

  let lastVersion = currentVersion
  for (const version of migrationKeys) {
    try {
      SCHEMA_MIGRATIONS[version]()
      lastVersion = version
      setSchemaVersion(version)
    } catch (error) {
      return { migrated: false, from: currentVersion, to: lastVersion, error: error.message }
    }
  }

  return { migrated: migrationKeys.length > 0, from: currentVersion, to: lastVersion }
}

export function isMigrationNeeded() {
  return getSchemaVersion() < APP_SCHEMA_VERSION
}

export function resetSchemaVersion() {
  safeStorage.remove(SCHEMA_VERSION_KEY)
}
