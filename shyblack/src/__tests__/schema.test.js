import { describe, it, expect, beforeEach } from 'vitest'

// Minimal localStorage stub — no jsdom required
const store = {}
const localStorageStub = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}
global.localStorage = localStorageStub

const { safeStorage } = await import('../utils/safeStorage.js')

// After stubbing localStorage, import the modules under test
const { runMigrations, getSchemaVersion, setSchemaVersion, isMigrationNeeded, APP_SCHEMA_VERSION } =
  await import('../utils/schema.js')

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
  safeStorage.invalidateCache()
})

describe('getSchemaVersion', () => {
  it('returns 0 when no schema key exists', () => {
    expect(getSchemaVersion()).toBe(0)
  })

  it('returns stored version', () => {
    setSchemaVersion(2)
    expect(getSchemaVersion()).toBe(2)
  })

  it('returns 0 when stored value is malformed', () => {
    store['shyblack_schema'] = '{invalid json'
    expect(getSchemaVersion()).toBe(0)
  })
})

describe('runMigrations', () => {
  it('returns migrated:false when already at target version', () => {
    setSchemaVersion(APP_SCHEMA_VERSION)
    const result = runMigrations()
    expect(result.migrated).toBe(false)
    expect(result.from).toBe(APP_SCHEMA_VERSION)
  })

  it('is idempotent — running twice produces same schema version', () => {
    runMigrations()
    const second = runMigrations()
    expect(getSchemaVersion()).toBe(APP_SCHEMA_VERSION)
    expect(second.migrated).toBe(false)
  })

  it('handles missing transactions gracefully (no throw)', () => {
    // TRANSACTIONS key absent — migration should not throw
    expect(() => runMigrations()).not.toThrow()
  })

  it('handles corrupt transactions array gracefully', () => {
    store['shyblack_transactions'] = '[{invalid'
    expect(() => runMigrations()).not.toThrow()
    expect(getSchemaVersion()).toBe(APP_SCHEMA_VERSION)
  })

  it('strips trading-specific fields from transactions during migration', () => {
    store['shyblack_transactions'] = JSON.stringify([
      { id: '1', type: 'income', amount: 100, transactionPurpose: 'trading_profit', date: '2024-01-01' },
      { id: '2', type: 'expense', amount: 50, date: '2024-01-02' },
    ])
    runMigrations()
    const stored = JSON.parse(store['shyblack_transactions'])
    expect(stored[0].transactionPurpose).toBeUndefined()
    expect(stored[1].date).toBe('2024-01-02')
  })

  it('preserves transaction fields not targeted by migration', () => {
    store['shyblack_transactions'] = JSON.stringify([
      { id: 'abc', type: 'expense', amount: 200, category: 'food', note: 'lunch', date: '2024-03-01' },
    ])
    runMigrations()
    const stored = JSON.parse(store['shyblack_transactions'])
    expect(stored[0]).toMatchObject({ id: 'abc', type: 'expense', amount: 200, category: 'food' })
  })

  it('advances schema version to APP_SCHEMA_VERSION after successful migration', () => {
    runMigrations()
    expect(getSchemaVersion()).toBe(APP_SCHEMA_VERSION)
  })
})

describe('isMigrationNeeded', () => {
  it('returns true when version is behind', () => {
    setSchemaVersion(0)
    expect(isMigrationNeeded()).toBe(true)
  })

  it('returns false when version is current', () => {
    setSchemaVersion(APP_SCHEMA_VERSION)
    expect(isMigrationNeeded()).toBe(false)
  })
})
