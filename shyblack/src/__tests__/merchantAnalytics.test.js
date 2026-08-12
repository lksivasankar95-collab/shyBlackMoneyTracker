import { describe, it, expect } from 'vitest'
import { getMerchantStats, getMerchantSummary } from '../utils/merchantAnalytics'

const TX = [
  { id: '1', type: 'expense', date: '2026-01-05', amount: -200, category: 'food', note: 'Swiggy order #123' },
  { id: '2', type: 'expense', date: '2026-01-12', amount: -250, category: 'food', note: 'Swiggy - UPI 9123456789@ybl' },
  { id: '3', type: 'expense', date: '2026-01-20', amount: -149, category: 'entertainment', note: 'Netflix plan' },
  { id: '4', type: 'expense', date: '2026-02-02', amount: -149, category: 'entertainment', note: 'Netflix renewal' },
  { id: '5', type: 'income', date: '2026-01-10', amount: 50000, category: 'salary', note: 'Salary credit' },
  { id: '6', type: 'expense', date: '2026-01-08', amount: -50, category: 'transport', note: '' },
]

describe('merchant analytics', () => {
  it('groups expenses by merchant and sorts by total', () => {
    const stats = getMerchantStats(TX)
    expect(stats.length).toBe(2)
    expect(stats[0].merchant).toBe('swiggy')
    expect(stats[0].total).toBe(450)
    expect(stats[0].count).toBe(2)
    expect(stats[0].avg).toBe(225)
    expect(stats[0].max).toBe(250)
    expect(stats[0].topCategory).toBe('food')
    expect(stats[1].merchant).toBe('netflix')
    expect(stats[1].count).toBe(2)
  })

  it('ignores income and empty notes', () => {
    const stats = getMerchantStats(TX)
    expect(stats.some((m) => m.merchant === 'salary')).toBe(false)
    expect(stats.reduce((s, m) => s + m.count, 0)).toBe(4)
  })

  it('builds monthly trend buckets for trailing months', () => {
    const stats = getMerchantStats(TX, { months: 12 })
    expect(stats[0].monthly).toHaveLength(12)
    const swiggy = stats.find((m) => m.merchant === 'swiggy')
    const jan = swiggy.monthly.find((b) => b.bucket === '2026-01')
    expect(jan.amount).toBe(450)
  })

  it('builds weekday totals', () => {
    const stats = getMerchantStats(TX)
    const netflix = stats.find((m) => m.merchant === 'netflix')
    expect(netflix.weekday.length).toBe(7)
    const mondayTotal = netflix.weekday[1]
    expect(mondayTotal).toBeGreaterThan(0)
  })

  it('respects minCount filter', () => {
    const stats = getMerchantStats(TX, { minCount: 2 })
    expect(stats.length).toBe(2)
  })

  it('produces a summary', () => {
    const summary = getMerchantSummary(TX)
    expect(summary.merchantCount).toBe(2)
    expect(summary.topMerchant).toBe('swiggy')
    expect(summary.totalMerchantSpend).toBe(748)
    expect(summary.stats.length).toBe(2)
  })

  it('handles empty input', () => {
    const stats = getMerchantStats([])
    expect(stats).toEqual([])
    const summary = getMerchantSummary([])
    expect(summary.merchantCount).toBe(0)
    expect(summary.topMerchant).toBeNull()
  })
})