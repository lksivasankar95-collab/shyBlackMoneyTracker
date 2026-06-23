import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  advanceNextDate,
  getDueRecurringTransactions,
  getUpcomingRecurringTransactions,
  autoExecuteDueRecurring,
  normalizeRecurringItem,
  getRecurringStats,
  getSubscriptionSummary,
  updateRecurringTransaction,
  toggleRecurringTransaction,
  addRecurringTransaction,
  removeRecurringTransaction,
} from '../utils/recurring.js'

const mockStorage = {}
vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] ?? fallback,
    set: (key, value) => { mockStorage[key] = value },
    remove: (key) => { delete mockStorage[key] },
  },
  STORAGE_KEYS: { RECURRING: 'shyblack_recurring' },
}))

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
})

describe('advanceNextDate', () => {
  it('advances daily by 1 day', () => {
    expect(advanceNextDate('2024-01-15', 'daily')).toBe('2024-01-16')
  })

  it('advances daily across month boundary', () => {
    expect(advanceNextDate('2024-01-31', 'daily')).toBe('2024-02-01')
  })

  it('advances daily across year boundary', () => {
    expect(advanceNextDate('2024-12-31', 'daily')).toBe('2025-01-01')
  })

  it('advances monthly by one month', () => {
    expect(advanceNextDate('2024-01-15', 'monthly')).toBe('2024-02-15')
  })

  it('handles month-end rollover (Jan 31 → Feb 28)', () => {
    const result = advanceNextDate('2024-01-31', 'monthly')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(result) > new Date('2024-01-31')).toBe(true)
  })

  it('advances weekly by 7 days', () => {
    expect(advanceNextDate('2024-03-01', 'weekly')).toBe('2024-03-08')
  })

  it('advances weekly across month boundary', () => {
    expect(advanceNextDate('2024-01-28', 'weekly')).toBe('2024-02-04')
  })

  it('advances yearly by one year', () => {
    expect(advanceNextDate('2024-06-15', 'yearly')).toBe('2025-06-15')
  })

  it('handles Feb 29 in leap year advancing yearly', () => {
    const result = advanceNextDate('2024-02-29', 'yearly')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(result) > new Date('2024-02-29')).toBe(true)
  })

  it('defaults to monthly for unknown frequency', () => {
    const monthly = advanceNextDate('2024-05-10', 'monthly')
    const unknown = advanceNextDate('2024-05-10', 'biweekly')
    expect(unknown).toBe(monthly)
  })
})

describe('getDueRecurringTransactions', () => {
  const past = '2020-01-01'
  const future = '2099-12-31'

  it('returns items with nextDate in the past', () => {
    const recurring = [
      { id: '1', nextDate: past, active: true },
      { id: '2', nextDate: future, active: true },
    ]
    const due = getDueRecurringTransactions(recurring)
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe('1')
  })

  it('excludes items with active === false', () => {
    const recurring = [{ id: '1', nextDate: past, active: false }]
    expect(getDueRecurringTransactions(recurring)).toHaveLength(0)
  })

  it('excludes items with isActive === false (new field)', () => {
    const recurring = [{ id: '1', nextDate: past, isActive: false }]
    expect(getDueRecurringTransactions(recurring)).toHaveLength(0)
  })

  it('excludes items with no nextDate', () => {
    const recurring = [{ id: '1', active: true }]
    expect(getDueRecurringTransactions(recurring)).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(getDueRecurringTransactions([])).toHaveLength(0)
  })

  it('returns all due items when multiple are past', () => {
    const recurring = [
      { id: '1', nextDate: '2020-01-01', active: true },
      { id: '2', nextDate: '2021-06-15', active: true },
      { id: '3', nextDate: future, active: true },
    ]
    expect(getDueRecurringTransactions(recurring)).toHaveLength(2)
  })

  it('handles isActive field with backward compatibility', () => {
    const recurring = [
      { id: '1', nextDate: past, isActive: true },
      { id: '2', nextDate: past, active: false },
      { id: '3', nextDate: past, active: true },
    ]
    const due = getDueRecurringTransactions(recurring)
    expect(due).toHaveLength(2)
    expect(due.map((d) => d.id)).toEqual(['1', '3'])
  })
})

describe('getUpcomingRecurringTransactions', () => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomStr = tomorrow.toISOString().split('T')[0]
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const weekStr = nextWeek.toISOString().split('T')[0]
  const past = '2020-01-01'

  it('returns upcoming items sorted by nextDate', () => {
    const items = [
      { id: '2', nextDate: weekStr, active: true, amount: 200 },
      { id: '1', nextDate: tomStr, active: true, amount: 100 },
    ]
    const upcoming = getUpcomingRecurringTransactions(items, 5)
    expect(upcoming).toHaveLength(2)
    expect(upcoming[0].id).toBe('1')
    expect(upcoming[1].id).toBe('2')
  })

  it('excludes past items', () => {
    const items = [
      { id: '1', nextDate: past, active: true },
      { id: '2', nextDate: tomStr, active: true },
    ]
    expect(getUpcomingRecurringTransactions(items, 5)).toHaveLength(1)
  })

  it('excludes inactive items', () => {
    const items = [
      { id: '1', nextDate: tomStr, active: false },
      { id: '2', nextDate: tomStr, isActive: false },
    ]
    expect(getUpcomingRecurringTransactions(items, 5)).toHaveLength(0)
  })

  it('respects count limit', () => {
    const items = [
      { id: '1', nextDate: tomStr, active: true },
      { id: '2', nextDate: weekStr, active: true },
    ]
    expect(getUpcomingRecurringTransactions(items, 1)).toHaveLength(1)
  })

  it('returns empty for empty input', () => {
    expect(getUpcomingRecurringTransactions([])).toHaveLength(0)
  })
})

describe('autoExecuteDueRecurring', () => {
  it('executes due items', () => {
    const items = [
      { id: '1', nextDate: '2020-01-01', active: true, type: 'expense', amount: 100 },
    ]
    const executeFn = vi.fn()
    const count = autoExecuteDueRecurring(items, executeFn)
    expect(count).toBe(1)
    expect(executeFn).toHaveBeenCalledWith(items[0])
  })

  it('skips items executed today (duplicate prevention)', () => {
    const today = new Date().toISOString().split('T')[0]
    const items = [
      { id: '1', nextDate: '2020-01-01', active: true, lastExecutedAt: today, type: 'expense', amount: 100 },
    ]
    const executeFn = vi.fn()
    const count = autoExecuteDueRecurring(items, executeFn)
    expect(count).toBe(0)
    expect(executeFn).not.toHaveBeenCalled()
  })

  it('does not execute non-due items', () => {
    const items = [
      { id: '1', nextDate: '2099-12-31', active: true },
    ]
    const executeFn = vi.fn()
    const count = autoExecuteDueRecurring(items, executeFn)
    expect(count).toBe(0)
    expect(executeFn).not.toHaveBeenCalled()
  })

  it('does not execute inactive items', () => {
    const items = [
      { id: '1', nextDate: '2020-01-01', active: false },
    ]
    const executeFn = vi.fn()
    const count = autoExecuteDueRecurring(items, executeFn)
    expect(count).toBe(0)
    expect(executeFn).not.toHaveBeenCalled()
  })

  it('executes multiple due items', () => {
    const items = [
      { id: '1', nextDate: '2020-01-01', active: true },
      { id: '2', nextDate: '2020-06-15', active: true },
    ]
    const executeFn = vi.fn()
    const count = autoExecuteDueRecurring(items, executeFn)
    expect(count).toBe(2)
    expect(executeFn).toHaveBeenCalledTimes(2)
  })

  it('handles empty array', () => {
    expect(autoExecuteDueRecurring([], vi.fn())).toBe(0)
  })

  it('handles disabled items with isActive field', () => {
    const items = [
      { id: '1', nextDate: '2020-01-01', isActive: false },
      { id: '2', nextDate: '2020-01-01', isActive: true },
    ]
    const executeFn = vi.fn()
    const count = autoExecuteDueRecurring(items, executeFn)
    expect(count).toBe(1)
  })
})

describe('normalizeRecurringItem', () => {
  it('maps recurrenceType to frequency', () => {
    const item = normalizeRecurringItem({ nextRunDate: '2024-01-01', recurrenceType: 'weekly', isActive: true })
    expect(item.nextDate).toBe('2024-01-01')
    expect(item.frequency).toBe('weekly')
    expect(item.active).toBe(true)
  })

  it('handles mixed old/new fields', () => {
    const item = normalizeRecurringItem({ nextDate: '2024-01-01', frequency: 'monthly', active: false, isActive: false })
    expect(item.nextDate).toBe('2024-01-01')
    expect(item.frequency).toBe('monthly')
    expect(item.active).toBe(false)
  })

  it('provides defaults for missing fields', () => {
    const item = normalizeRecurringItem({})
    expect(item.frequency).toBe('monthly')
    expect(item.active).toBe(true)
  })
})

describe('getRecurringStats', () => {
  it('calculates stats', () => {
    const items = [
      { id: '1', type: 'income', amount: 5000, frequency: 'monthly', active: true },
      { id: '2', type: 'expense', amount: 1000, frequency: 'monthly', active: true },
      { id: '3', type: 'expense', amount: 200, frequency: 'weekly', active: false },
    ]
    const stats = getRecurringStats(items)
    expect(stats.total).toBe(3)
    expect(stats.active).toBe(2)
    expect(stats.income).toBe(5000)
    expect(stats.expense).toBe(1000)
    expect(stats.totalMonthly).toBeGreaterThan(0)
  })

  it('handles empty array', () => {
    const stats = getRecurringStats([])
    expect(stats.total).toBe(0)
    expect(stats.active).toBe(0)
    expect(stats.totalMonthly).toBe(0)
  })

  it('handles isActive field', () => {
    const items = [
      { id: '1', type: 'expense', amount: 500, frequency: 'monthly', isActive: true },
      { id: '2', type: 'expense', amount: 300, frequency: 'monthly', isActive: false },
    ]
    const stats = getRecurringStats(items)
    expect(stats.active).toBe(1)
    expect(stats.totalMonthly).toBe(500)
  })
})

describe('getSubscriptionSummary', () => {
  it('calculates subscription summary with daily frequency', () => {
    const items = [
      { type: 'expense', amount: 10, frequency: 'daily', active: true },
    ]
    const s = getSubscriptionSummary(items)
    expect(s.count).toBe(1)
    expect(s.totalMonthly).toBe(300)
    expect(s.activeSubs).toBe(1)
  })

  it('handles mixed frequencies', () => {
    const items = [
      { type: 'expense', amount: 1000, frequency: 'monthly', active: true },
      { type: 'expense', amount: 12000, frequency: 'yearly', active: true },
      { type: 'expense', amount: 500, frequency: 'weekly', active: true },
    ]
    const s = getSubscriptionSummary(items)
    expect(s.count).toBe(3)
    expect(s.totalMonthly).toBe(1000 + 1000 + Math.round(500 * 4.33))
  })
})

describe('updateRecurringTransaction', () => {
  it('updates an existing item', () => {
    mockStorage['shyblack_recurring'] = [{ id: '1', amount: 100, frequency: 'monthly', active: true }]
    const result = updateRecurringTransaction('1', { amount: 200, note: 'Updated' })
    expect(result.amount).toBe(200)
    expect(result.note).toBe('Updated')
    expect(result.updatedAt).toBeDefined()
  })

  it('returns null for non-existent id', () => {
    mockStorage['shyblack_recurring'] = [{ id: '1', amount: 100 }]
    expect(updateRecurringTransaction('999', { amount: 200 })).toBeNull()
  })
})

describe('toggleRecurringTransaction', () => {
  it('toggles active status', () => {
    mockStorage['shyblack_recurring'] = [{ id: '1', active: true }]
    const result = toggleRecurringTransaction('1')
    expect(result.active).toBe(false)
    expect(result.isActive).toBe(false)
  })

  it('toggles inactive item', () => {
    mockStorage['shyblack_recurring'] = [{ id: '1', active: false }]
    const result = toggleRecurringTransaction('1')
    expect(result.active).toBe(true)
    expect(result.isActive).toBe(true)
  })
})

describe('addRecurringTransaction', () => {
  it('adds with default fields', () => {
    mockStorage['shyblack_recurring'] = []
    const result = addRecurringTransaction({ amount: 500, type: 'income' })
    expect(result.id).toBeDefined()
    expect(result.frequency).toBe('monthly')
    expect(result.active).toBe(true)
    expect(result.createdAt).toBeDefined()
    expect(result.updatedAt).toBeDefined()
  })

  it('adds with new field names', () => {
    mockStorage['shyblack_recurring'] = []
    const result = addRecurringTransaction({ amount: 1000, type: 'expense', recurrenceType: 'weekly', isActive: false })
    expect(result.frequency).toBe('weekly')
    expect(result.active).toBe(false)
  })
})

describe('removeRecurringTransaction', () => {
  it('removes by id', () => {
    mockStorage['shyblack_recurring'] = [
      { id: '1', amount: 100 },
      { id: '2', amount: 200 },
    ]
    removeRecurringTransaction('1')
    const items = mockStorage['shyblack_recurring']
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('2')
  })
})