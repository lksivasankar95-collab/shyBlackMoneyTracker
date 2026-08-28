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
const { addCustomCategory, removeCustomCategory, getCustomCategories, getCategoriesForType, getCategoryById, isCustomCategory } = await import('../utils/customCategories.js')

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); safeStorage.remove(STORAGE_KEYS.CUSTOM_CATEGORIES) })

describe('customCategories', () => {
  it('adds a custom category with generated id and persists', () => {
    const entry = addCustomCategory({ label: 'Groceries', type: 'expense' })
    expect(entry).toBeTruthy()
    expect(entry.id.startsWith('custom_expense_')).toBe(true)
    expect(entry.label).toBe('Groceries')
    expect(isCustomCategory(entry.id)).toBe(true)
    const list = getCustomCategories()
    expect(list).toHaveLength(1)
    expect(list[0].label).toBe('Groceries')
  })

  it('rejects blank labels', () => {
    const entry = addCustomCategory({ label: '  ' })
    expect(entry).toBeNull()
    expect(getCustomCategories()).toHaveLength(0)
  })

  it('merges custom categories into base list for type', () => {
    addCustomCategory({ label: 'Groceries', type: 'expense' })
    addCustomCategory({ label: 'Bonus', type: 'income' })
    const expenseCats = getCategoriesForType('expense')
    expect(expenseCats.find((c) => c.label === 'Groceries')).toBeTruthy()
    expect(expenseCats.find((c) => c.label === 'Bonus')).toBeFalsy()
    const incomeCats = getCategoriesForType('income')
    expect(incomeCats.find((c) => c.label === 'Bonus')).toBeTruthy()
  })

  it('removes a custom category', () => {
    const entry = addCustomCategory({ label: 'Groceries' })
    removeCustomCategory(entry.id)
    expect(getCustomCategories()).toHaveLength(0)
    expect(getCategoryById(entry.id, 'expense')).toBeNull()
  })
})