import { describe, it, expect, beforeEach } from 'vitest'

const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}

const { safeStorage, STORAGE_KEYS } = await import('../utils/safeStorage.js')

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]) })

describe('safeStorage', () => {
  it('set and get round-trip', () => {
    const ok = safeStorage.set(STORAGE_KEYS.TRANSACTIONS, [{ id: '1', amount: 100 }])
    expect(ok).toBe(true)
    const result = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('get returns fallback for missing key', () => {
    const result = safeStorage.get('nonexistent', 'fallback')
    expect(result).toBe('fallback')
  })

  it('get returns fallback for corrupted JSON', () => {
    store['shyblack_test'] = '{bad json'
    const result = safeStorage.get('shyblack_test', [])
    expect(result).toEqual([])
  })

  it('getRaw returns raw string', () => {
    store['shyblack_test'] = JSON.stringify({ a: 1 })
    expect(safeStorage.getRaw('shyblack_test')).toBe(JSON.stringify({ a: 1 }))
  })

  it('getRaw returns null for missing key', () => {
    expect(safeStorage.getRaw('nonexistent')).toBeNull()
  })

  it('remove deletes a key', () => {
    store['shyblack_test'] = 'value'
    safeStorage.remove('shyblack_test')
    expect('shyblack_test' in store).toBe(false)
  })

  it('clear removes all prefixed keys', () => {
    store['shyblack_a'] = '1'
    store['shyblack_b'] = '2'
    store['other_key'] = '3'
    safeStorage.clear()
    expect('shyblack_a' in store).toBe(false)
    expect('shyblack_b' in store).toBe(false)
    expect('other_key' in store).toBe(true)
  })

  it('isAvailable returns true', () => {
    expect(safeStorage.isAvailable()).toBe(true)
  })

  it('getStorageInfo returns usage stats', () => {
    store['shyblack_test'] = JSON.stringify({ data: 'hello' })
    const info = safeStorage.getStorageInfo()
    expect(info.usedBytes).toBeGreaterThan(0)
    expect(info.keyCount).toBeGreaterThan(0)
  })
})
