import { describe, it, expect, beforeEach } from 'vitest'

// localStorage stub
const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}

const { validateAllModules, validateBeforeExport } = await import('../utils/dataValidator.js')

const ARCHIVE_KEY = 'shyblack_archive'

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
})

describe('validateAllModules', () => {
  it('returns valid when no data is stored', () => {
    const result = validateAllModules()
    expect(result.valid).toBe(true)
    expect(result.errors).toBe(0)
  })

  it('returns valid when archive is stored as proper object', () => {
    store[ARCHIVE_KEY] = JSON.stringify({ version: 1, transactions: [], archivedAt: null })
    const result = validateAllModules()
    expect(result.valid).toBe(true)
  })

  it('BUG-001 regression: auto-migrates archive stored as array', () => {
    // Simulate old-format archive stored as plain array
    store[ARCHIVE_KEY] = JSON.stringify([{ id: 'tx1', amount: 100, date: '2023-01-01', type: 'expense' }])
    const result = validateAllModules()
    // Should NOT produce an error — migration should fix it silently
    expect(result.errors).toBe(0)
    expect(result.valid).toBe(true)
    // The stored value should now be an object
    const migrated = JSON.parse(store[ARCHIVE_KEY])
    expect(typeof migrated).toBe('object')
    expect(Array.isArray(migrated)).toBe(false)
    expect(Array.isArray(migrated.transactions)).toBe(true)
    expect(migrated.transactions).toHaveLength(1)
  })

  it('BUG-001 regression: auto-migrates empty array archive', () => {
    store[ARCHIVE_KEY] = JSON.stringify([])
    const result = validateAllModules()
    expect(result.errors).toBe(0)
    expect(result.valid).toBe(true)
    const migrated = JSON.parse(store[ARCHIVE_KEY])
    expect(Array.isArray(migrated.transactions)).toBe(true)
  })

  it('still reports error for non-array, non-object archive data', () => {
    // A primitive string stored in archive is genuinely corrupt
    store[ARCHIVE_KEY] = JSON.stringify('corrupt string')
    const result = validateAllModules()
    expect(result.errors).toBeGreaterThan(0)
  })

  it('reports error for corrupted JSON', () => {
    store[ARCHIVE_KEY] = 'not valid json {'
    const result = validateAllModules()
    expect(result.errors).toBeGreaterThan(0)
  })
})

describe('validateBeforeExport', () => {
  it('allows export when no data is stored', () => {
    const result = validateBeforeExport()
    expect(result.canExport).toBe(true)
  })

  it('BUG-001 regression: allows export when archive is legacy array format', () => {
    store[ARCHIVE_KEY] = JSON.stringify([{ id: 'tx1', amount: 500, date: '2022-06-01', type: 'income' }])
    const result = validateBeforeExport()
    expect(result.canExport).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('blocks export when archive has corrupt JSON', () => {
    store[ARCHIVE_KEY] = '{ bad json'
    const result = validateBeforeExport()
    expect(result.canExport).toBe(false)
  })
})
