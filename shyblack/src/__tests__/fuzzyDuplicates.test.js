import { describe, it, expect } from 'vitest'

const mod = await import('../utils/fuzzyDuplicates')

describe('fuzzy duplicate detection', () => {
  it('computes levenshtein distance and similarity', () => {
    expect(mod.levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(mod.levenshteinDistance('zomato', 'zomato')).toBe(0)
    expect(mod.textSimilarity('Zomato Payment', 'zomato payment')).toBe(1)
    expect(mod.textSimilarity('netflix', 'amazon prime')).toBeLessThan(0.5)
  })

  it('normalizes notes with UPI refs and payment keywords', () => {
    expect(mod.normalizeNote('UPI/ZOMATO PAYMENTS ref 412038493020')).toBe('zomato payments')
    expect(mod.normalizeNote('Netflix - UPI 9123456789@ybl')).toBe('netflix')
  })

  it('finds near-duplicates within date and amount windows', () => {
    const txs = [
      { id: '1', type: 'expense', amount: 250, date: '2025-01-05', note: 'Zomato order' },
      { id: '2', type: 'expense', amount: 250, date: '2025-01-07', note: 'zomato order' },
      { id: '3', type: 'expense', amount: 9000, date: '2025-01-06', note: 'Rent' },
    ]
    const dupes = mod.findFuzzyDuplicates(txs)
    expect(dupes).toHaveLength(1)
    expect(dupes[0].tx.id).toBe('2')
    expect(dupes[0].duplicateOf.id).toBe('1')
    expect(dupes[0].score).toBeGreaterThanOrEqual(90)
  })

  it('does not match different amounts or far-apart dates', () => {
    const txs = [
      { id: '1', type: 'expense', amount: 250, date: '2025-01-05', note: 'Zomato order' },
      { id: '2', type: 'expense', amount: 999, date: '2025-01-05', note: 'zomato order' },
      { id: '3', type: 'expense', amount: 250, date: '2025-04-10', note: 'zomato order' },
    ]
    expect(mod.findFuzzyDuplicates(txs)).toHaveLength(0)
  })

  it('filters import candidates against existing fuzzy matches', () => {
    const existing = [{ id: 'a', type: 'expense', amount: 199, date: '2025-02-01', note: 'Netflix India' }]
    const candidates = [
      { type: 'expense', amount: 199, date: '2025-02-02', note: 'netflix india - UPI' },
      { type: 'expense', amount: 5000, date: '2025-02-03', note: 'Groceries' },
    ]
    const { result, duplicates } = mod.filterFuzzyDuplicates(candidates, existing)
    expect(result).toHaveLength(1)
    expect(result[0].note).toBe('Groceries')
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].duplicateOf.id).toBe('a')
  })

  it('exact + fuzzy combined dedupe returns correct counts', () => {
    const existing = [
      { date: '2025-03-01', amount: 120, type: 'expense', note: 'Swiggy order' },
    ]
    const list = [
      { type: 'expense', amount: 120, date: '2025-03-01', note: 'Swiggy order' },
      { type: 'expense', amount: 120, date: '2025-03-02', note: 'swiggy order ' },
      { type: 'income', amount: 500, date: '2025-03-02', note: 'Cashback' },
    ]
    const { result, duplicates, exactDuplicates } = mod.dedupeWithFuzzy(list, existing)
    expect(exactDuplicates).toBe(1)
    expect(result).toHaveLength(1)
    expect(duplicates).toBe(2)
  })
})
