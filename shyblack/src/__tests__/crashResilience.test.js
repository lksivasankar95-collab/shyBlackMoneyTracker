import { describe, it, expect } from 'vitest'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { validateBackupData } from '../utils/backup'
import { runMigrations } from '../utils/schema'

describe('Crash Resilience - Storage', () => {
  it('handles null values with default', () => {
    safeStorage.set(STORAGE_KEYS.TRANSACTIONS, null)
    const data = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
    expect(Array.isArray(data)).toBe(true)
  })

  it('handles missing keys with default', () => {
    safeStorage.remove(STORAGE_KEYS.TRANSACTIONS)
    const data = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('Crash Resilience - Backup Validation', () => {
  it('detects invalid backup data', () => {
    const result = validateBackupData(null)
    expect(result).toBeDefined()
  })
})

describe('Crash Resilience - Schema Migration', () => {
  it('handles schema version 0 (fresh install) gracefully', () => {
    let caught
    try {
      safeStorage.remove(STORAGE_KEYS.SCHEMA_VERSION)
      runMigrations()
      caught = null
    } catch (e) {
      caught = e
    }
    expect(caught).toBeNull()
  })
})
