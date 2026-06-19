import { describe, it, expect } from 'vitest'
import { checkMissingCategories, checkDuplicateTransactions, checkOrphanedDocuments } from '../utils/dataQuality'
import { getMonthlyTrends } from '../utils/trends'

describe('Data quality performance', () => {
  it('handles 1000 transactions quickly for missing category check', () => {
    const tx = Array.from({ length: 1000 }, (_, i) => ({
      id: `t${i}`,
      date: '2025-01-01',
      amount: 100,
      type: 'expense',
      category: i % 10 === 0 ? '' : 'food',
      note: `Transaction ${i}`,
    }))
    const start = performance.now()
    const result = checkMissingCategories(tx)
    const elapsed = performance.now() - start
    expect(result.length).toBe(100)
    expect(elapsed).toBeLessThan(500)
  })

  it('handles 1000 transactions for duplicate check', () => {
    const tx = Array.from({ length: 1000 }, (_, i) => ({
      id: `t${i}`,
      date: `2025-01-${(i % 30) + 1}`,
      amount: (i % 50) * 100 + 100,
      type: 'expense',
      category: 'food',
      note: `Item ${i % 200}`,
    }))
    const start = performance.now()
    const result = checkDuplicateTransactions(tx)
    const elapsed = performance.now() - start
    expect(Array.isArray(result)).toBe(true)
    expect(elapsed).toBeLessThan(500)
  })

  it('handles 500 documents for orphan check', () => {
    const docs = Array.from({ length: 500 }, (_, i) => ({
      id: `d${i}`,
      title: `Doc ${i}`,
      category: 'other',
      linkedTo: i < 10 ? ['t1'] : [],
    }))
    const start = performance.now()
    const result = checkOrphanedDocuments(docs, [], [], [])
    const elapsed = performance.now() - start
    expect(result.length).toBe(490)
    expect(elapsed).toBeLessThan(500)
  })

  it('handles large transaction sets in trends calculation', () => {
    const tx = Array.from({ length: 1000 }, (_, i) => ({
      id: `t${i}`,
      date: new Date(2024, i % 12, (i % 28) + 1).toISOString().split('T')[0],
      amount: (i % 100) * 1000 + 500,
      type: i % 3 === 0 ? 'income' : 'expense',
      category: 'food',
      note: `Bulk tx ${i}`,
    }))
    const start = performance.now()
    const trends = getMonthlyTrends(tx, 12)
    const elapsed = performance.now() - start
    expect(trends.length).toBe(12)
    expect(elapsed).toBeLessThan(500)
  })
})
