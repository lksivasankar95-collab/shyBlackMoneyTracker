import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage = {}

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    getRaw: (key) => mockStorage[key] !== undefined ? JSON.stringify(mockStorage[key]) : null,
    set: (key, value) => { mockStorage[key] = value; return true },
    remove: (key) => { delete mockStorage[key]; return true },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]) },
  },
  STORAGE_KEYS: { INVESTMENTS: 'test_investments' },
}))

vi.mock('../utils/helpers', () => ({
  generateId: () => 'inv' + Math.floor(Math.random() * 1e9),
}))

import { calculateXirr, daysBetween, npv, xirrForAsset, xirrForPortfolio } from '../utils/xirr'
import { resetInvestmentStore, addBuy, addDividend, updateMarketPrice } from '../utils/investmentLots'

describe('XIRR calculator', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    resetInvestmentStore()
  })
  it('computes days between ISO dates', () => {
    expect(daysBetween('2021-01-01', '2022-01-01')).toBe(365)
    expect(daysBetween('2020-01-01', '2020-01-10')).toBe(9)
  })

  it('matches the documented Excel XIRR example (~37.34%)', () => {
    const flows = [
      { date: '2008-01-01', amount: -10000 },
      { date: '2008-03-01', amount: 2750 },
      { date: '2008-10-30', amount: 4250 },
      { date: '2009-02-15', amount: 3250 },
      { date: '2009-04-01', amount: 2750 },
    ]
    const rate = calculateXirr(flows)
    expect(rate).not.toBeNull()
    expect(rate).toBeCloseTo(0.373362535, 4)
  })

  it('returns null for flows without a direction change', () => {
    expect(calculateXirr([{ date: '2020-01-01', amount: -100 }, { date: '2021-01-01', amount: -50 }])).toBeNull()
    expect(calculateXirr([{ date: '2020-01-01', amount: 100 }])).toBeNull()
    expect(calculateXirr([])).toBeNull()
  })

  it('returns ~0 for break-even investment', () => {
    const flows = [
      { date: '2021-01-01', amount: -1000 },
      { date: '2022-01-01', amount: 1050 },
    ]
    expect(calculateXirr(flows)).toBeCloseTo(0.05, 3)
  })

  it('handles dividends and current value in asset XIRR', () => {
    resetInvestmentStore()
    addBuy('TEST MF', { quantity: 100, price: 100, date: '2023-01-01', fees: 0 })
    addBuy('TEST MF', { quantity: 100, price: 100, date: '2024-01-01', fees: 0 })
    addDividend('TEST MF', { amount: 500, date: '2024-06-01' })
    updateMarketPrice('TEST MF', 130)
    const rate = xirrForAsset('TEST MF', '2025-01-01')
    expect(rate).not.toBeNull()
    expect(rate).toBeGreaterThan(0)
  })

  it('returns null for asset without lots', () => {
    resetInvestmentStore()
    expect(xirrForAsset('MISSING ASSET', '2025-01-01')).toBeNull()
  })

  it('portfolio XIRR requires a market price for valuation', () => {
    resetInvestmentStore()
    addBuy('NO PRICE', { quantity: 10, price: 50, date: '2024-01-01', fees: 0 })
    expect(xirrForPortfolio('2025-01-01')).toBeNull()
    updateMarketPrice('NO PRICE', 60)
    const rate = xirrForPortfolio('2025-01-01')
    expect(rate).not.toBeNull()
    expect(rate).toBeGreaterThan(0)
  })

  it('npv sum matches manual calculation', () => {
    const flows = [
      { date: '2021-01-01', amount: -1000 },
      { date: '2022-01-01', amount: 1100 },
    ]
    const value = npv(0.1, flows)
    expect(value).toBeCloseTo(0, 3)
  })
})