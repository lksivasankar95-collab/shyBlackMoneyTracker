import { describe, it, expect } from 'vitest'
import {
  validateSplits, attachSplits, getSplitLines, expandSplitTransactions,
  getSplitCategoryBreakdown, hasSplits,
} from '../utils/splitUtils'
import { getCategoryBreakdown } from '../utils/analytics'

describe('category split utils', () => {
  it('validates split lines against the total', () => {
    expect(validateSplits([{ category: 'food', amount: 300 }, { category: 'bills', amount: 200 }], 500).valid).toBe(true)
    const mismatch = validateSplits([{ category: 'food', amount: 300 }], 500)
    expect(mismatch.valid).toBe(false)
    expect(mismatch.errors).toContain('sum_mismatch')
    expect(validateSplits([{ category: '', amount: 300 }], 300).errors).toContain('missing_category')
    expect(validateSplits([{ category: 'food', amount: -5 }], 100).errors).toContain('invalid_amount')
    expect(validateSplits([], 100).valid).toBe(false)
  })

  it('attaches split metadata with rounding', () => {
    const tx = { id: 'a', type: 'expense', amount: 500, category: 'food' }
    const withSplits = attachSplits(tx, [
      { category: 'food', amount: 300.005 },
      { category: 'bills', amount: 199.995, note: 'electricity' },
    ])
    expect(withSplits.splits).toHaveLength(2)
    expect(withSplits.splits[0].amount).toBe(300.01)
    expect(withSplits.splits[1].amount).toBe(200)
    expect(withSplits.splitTotal).toBe(500.01)
    expect(hasSplits(withSplits)).toBe(true)
    expect(hasSplits(tx)).toBe(false)
  })

  it('attachSplits ignores invalid lines', () => {
    const tx = { id: 'a', amount: 100 }
    expect(attachSplits(tx, [{ category: '', amount: 100 }]).splits).toBeUndefined()
    expect(attachSplits(tx, []).splits).toBeUndefined()
    expect(attachSplits(tx, null)).toEqual(tx)
  })

  it('expands a parent into split lines', () => {
    const parent = attachSplits({ id: 'p', type: 'expense', amount: 500, category: 'food', date: '2026-03-01' }, [
      { category: 'food', amount: 300 },
      { category: 'bills', amount: 200 },
    ])
    const lines = getSplitLines(parent)
    expect(lines).toHaveLength(2)
    expect(lines[0].splitCategory).toBe('food')
    expect(lines[0].splitAmount).toBe(300)
    expect(lines[1].splitCategory).toBe('bills')
    expect(lines[1].splitAmount).toBe(200)
    const single = getSplitLines({ id: 's', category: 'rent', amount: 900 })
    expect(single).toHaveLength(1)
    expect(single[0].splitCategory).toBe('rent')
  })

  it('flattens lists preserving order', () => {
    const parent = attachSplits({ id: 'p', type: 'expense', amount: 500, category: 'food' }, [
      { category: 'food', amount: 300 },
      { category: 'bills', amount: 200 },
    ])
    const rows = expandSplitTransactions([{ id: 'x', type: 'expense', amount: 10, category: 'misc' }, parent])
    expect(rows).toHaveLength(3)
    expect(rows[0].id).toBe('x')
    expect(rows[2].splitCategory).toBe('bills')
  })

  it('computes split-aware category breakdown', () => {
    const list = [
      { id: 'a', type: 'expense', amount: 500, category: 'food', date: '2026-03-01' },
      attachSplits({ id: 'b', type: 'expense', amount: 500, category: 'food', date: '2026-03-01' }, [
        { category: 'bills', amount: 300 },
        { category: 'shopping', amount: 200 },
      ]),
    ]
    const breakdown = getSplitCategoryBreakdown(list)
    const food = breakdown.find((b) => b.category === 'food')
    expect(food.amount).toBe(500)
    expect(breakdown.find((b) => b.category === 'bills').amount).toBe(300)
    expect(breakdown.find((b) => b.category === 'shopping').amount).toBe(200)
    expect(breakdown.reduce((s, b) => s + b.amount, 0)).toBe(1000)
  })

  it('analytics getCategoryBreakdown respects splits', () => {
    const list = [
      { id: 'a', type: 'expense', amount: 500, category: 'food', date: '2026-03-05' },
      attachSplits({ id: 'b', type: 'expense', amount: 600, category: 'food', date: '2026-03-10' }, [
        { category: 'bills', amount: 400 },
        { category: 'transport', amount: 200 },
      ]),
    ]
    const breakdown = getCategoryBreakdown(list, 'expense', 2026, 2)
    expect(breakdown.find((b) => b.category === 'food').amount).toBe(500)
    expect(breakdown.find((b) => b.category === 'bills').amount).toBe(400)
    expect(breakdown.find((b) => b.category === 'transport').amount).toBe(200)
  })
})