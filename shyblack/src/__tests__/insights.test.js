import { describe, it, expect } from 'vitest'
import { calculateFinancialScore, getScoreBreakdown, getLoggingStreak, detectOverspending, getFinancialHealth } from '../utils/insights.js'

function tx(id, type, amount, date, category) {
  return { id, type, amount, date: date || '2024-06-15', category: category || 'food' }
}

describe('calculateFinancialScore', () => {
  it('returns zero score for empty transactions', () => {
    const result = calculateFinancialScore([])
    expect(result.score).toBe(0)
    expect(result.level).toBe('N/A')
  })

  it('returns higher score with savings', () => {
    const txs = [
      tx('1', 'income', 5000, '2024-06-01'),
      tx('2', 'expense', 1000, '2024-06-02'),
    ]
    const result = calculateFinancialScore(txs)
    expect(result.score).toBeGreaterThan(500)
    expect(result.factors.length).toBeGreaterThan(0)
  })

  it('drops score when spending exceeds income', () => {
    const txs = [
      tx('1', 'income', 1000, '2024-06-01'),
      tx('2', 'expense', 2000, '2024-06-02'),
    ]
    const result = calculateFinancialScore(txs)
    expect(result.factors.some((f) => f.text.includes('exceeds'))).toBe(true)
  })

  it('awards consistency points for many transactions', () => {
    const txs = Array.from({ length: 20 }, (_, i) => tx(`i${i}`, 'income', 1000, '2024-06-01'))
    const ten = calculateFinancialScore(txs.slice(0, 10))
    const twenty = calculateFinancialScore(txs)
    expect(twenty.score).toBeGreaterThanOrEqual(ten.score)
  })

  it('returns within valid range', () => {
    const txs = Array.from({ length: 50 }, (_, i) =>
      tx(`t${i}`, i % 2 === 0 ? 'income' : 'expense', 1000, '2024-06-01')
    )
    const result = calculateFinancialScore(txs)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1000)
  })
})

describe('getScoreBreakdown', () => {
  it('returns null for empty transactions', () => {
    expect(getScoreBreakdown([])).toBeNull()
  })

  it('returns all 5 category scores', () => {
    const txs = [tx('1', 'income', 5000, '2024-06-01'), tx('2', 'expense', 2000, '2024-06-02')]
    const result = getScoreBreakdown(txs)
    expect(result.categories).toHaveLength(5)
    const keys = result.categories.map((c) => c.key)
    expect(keys).toContain('savings')
    expect(keys).toContain('debt')
    expect(keys).toContain('consistency')
    expect(keys).toContain('budget')
    expect(keys).toContain('tracking')
  })

  it('total is bounded to 1000', () => {
    const txs = Array.from({ length: 50 }, (_, i) => tx(`t${i}`, 'income', 10000, '2024-06-01'))
    const result = getScoreBreakdown(txs)
    expect(result.total).toBeLessThanOrEqual(1000)
    expect(result.total).toBeGreaterThanOrEqual(0)
  })
})

describe('getLoggingStreak', () => {
  it('returns 0 for empty transactions', () => {
    expect(getLoggingStreak([])).toBe(0)
  })

  it('counts consecutive days', () => {
    const today = new Date()
    const txs = [0, 1, 2].map((offset) => {
      const d = new Date(today)
      d.setDate(d.getDate() - offset)
      return tx(String(offset), 'expense', 100, d.toISOString().split('T')[0])
    })
    expect(getLoggingStreak(txs)).toBe(3)
  })

  it('breaks on missing day', () => {
    const today = new Date()
    const txs = [0, 2].map((offset) => {
      const d = new Date(today)
      d.setDate(d.getDate() - offset)
      return tx(String(offset), 'expense', 100, d.toISOString().split('T')[0])
    })
    expect(getLoggingStreak(txs)).toBe(1)
  })
})

describe('detectOverspending', () => {
  it('returns null when expenses are low', () => {
    const txs = [tx('1', 'expense', 100, new Date().toISOString().split('T')[0])]
    expect(detectOverspending(txs)).toBeNull()
  })

  it('returns null for empty transactions', () => {
    expect(detectOverspending([])).toBeNull()
  })
})

describe('getFinancialHealth', () => {
  it('returns N/A for empty transactions', () => {
    const result = getFinancialHealth([])
    expect(result.rating).toBe('N/A')
  })

  it('calculates months covered', () => {
    const now = new Date()
    const m1 = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const m2 = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const m3 = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]
    const txs = [
      tx('1', 'income', 10000, m1),
      tx('2', 'income', 10000, m2),
      tx('3', 'income', 10000, m3),
      tx('4', 'expense', 1000, m1),
    ]
    const result = getFinancialHealth(txs)
    expect(result.monthsCovered).toBeGreaterThan(0)
    expect(typeof result.rating).toBe('string')
  })
})
