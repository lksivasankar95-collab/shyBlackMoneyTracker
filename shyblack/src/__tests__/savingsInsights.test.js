import { describe, it, expect } from 'vitest'
import { calculateSavingsRate, generateSavingsInsights } from '../utils/insightsEngine'

function inMonth(offset, day, type, amount) {
  const d = new Date()
  const dt = new Date(d.getFullYear(), d.getMonth() - offset, Math.min(Math.max(day, 1), 28))
  return {
    type,
    amount,
    date: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
    category: type === 'income' ? 'salary' : 'food',
  }
}

function months(fn) {
  const txs = []
  for (let o = 0; o < 3; o++) txs.push(...fn(o))
  return txs
}

const excellent = months((o) => [inMonth(o, 5, 'income', 50000), inMonth(o, 20, 'expense', 10000)])

describe('calculateSavingsRate', () => {
  it('computes an excellent savings rate', () => {
    const sr = calculateSavingsRate(excellent)
    expect(sr.rate).toBe(80)
    expect(sr.level).toBe('Excellent')
    expect(sr.savings).toBe(40000)
  })

  it('returns No Income for empty transactions', () => {
    const sr = calculateSavingsRate([])
    expect(sr.level).toBe('No Income')
    expect(sr.rate).toBe(0)
  })

  it('flags negative savings when expenses exceed income', () => {
    const negative = months((o) => [inMonth(o, 5, 'income', 20000), inMonth(o, 20, 'expense', 30000)])
    const sr = calculateSavingsRate(negative)
    expect(sr.level).toBe('Negative')
    expect(sr.savings).toBeLessThan(0)
  })
})

describe('generateSavingsInsights', () => {
  it('produces a positive insight for excellent savers', () => {
    const insights = generateSavingsInsights(excellent)
    expect(insights).toHaveLength(1)
    expect(insights[0].type).toBe('savings_excellent')
    expect(insights[0].severity).toBe('positive')
    expect(insights[0].message).toContain('80')
  })

  it('produces a high-severity insight when spending exceeds income', () => {
    const negative = months((o) => [inMonth(o, 5, 'income', 20000), inMonth(o, 20, 'expense', 30000)])
    const insights = generateSavingsInsights(negative)
    expect(insights[0].type).toBe('savings_negative')
    expect(insights[0].severity).toBe('high')
  })

  it('returns empty for transactions without income data', () => {
    expect(generateSavingsInsights([])).toEqual([])
  })
})