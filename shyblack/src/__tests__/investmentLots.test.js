import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

const mockStorage = {}

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    getRaw: (key) => mockStorage[key] !== undefined ? JSON.stringify(mockStorage[key]) : null,
    set: (key, value) => { mockStorage[key] = value; return true },
    remove: (key) => { delete mockStorage[key]; return true },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]) },
  },
  STORAGE_KEYS: {
    INVESTMENTS: 'test_investments',
  },
}))

vi.mock('../utils/helpers', () => ({
  generateId: () => 'inv' + Math.floor(Math.random() * 1e9),
}))

describe('investment lots & dividends', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/investmentLots')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('rejects invalid buys', () => {
    expect(mod.addBuy('', { quantity: 10, price: 100, date: '2026-01-01' })).toBeNull()
    expect(mod.addBuy('X', { quantity: 0, price: 100 })).toBeNull()
    expect(mod.addBuy('X', { quantity: -3, price: 100 })).toBeNull()
    expect(mod.addBuy('X', { quantity: 10, price: 0 })).toBeNull()
  })

  it('accumulates lots and computes average cost', () => {
    mod.addBuy('TATA', { kind: 'stock', date: '2026-01-01', quantity: 10, price: 100 })
    mod.addBuy('TATA', { kind: 'stock', date: '2026-02-01', quantity: 10, price: 200 })
    const summary = mod.getInvestmentSummary('TATA')
    expect(summary.quantity).toBe(20)
    expect(summary.averageCost).toBe(150)
    expect(summary.invested).toBe(3000)
  })

  it('sells using average cost and records realized P&L', () => {
    mod.addBuy('TATA', { kind: 'stock', date: '2026-01-01', quantity: 10, price: 100 })
    mod.addBuy('TATA', { kind: 'stock', date: '2026-02-01', quantity: 10, price: 200 })
    const res = mod.addSell('TATA', { date: '2026-03-01', quantity: 15, price: 180 })
    expect(res.success).toBe(true)
    expect(res.realized.gain).toBeCloseTo(15 * 180 - 15 * 150, 0)
    expect(mod.getInvestmentSummary('TATA').quantity).toBe(5)
    expect(mod.getPortfolioSummary().trades).toBe(1)
  })

  it('rejects overselling', () => {
    mod.addBuy('X', { kind: 'crypto', date: '2026-01-01', quantity: 2, price: 10 })
    const res = mod.addSell('X', { date: '2026-03-01', quantity: 3, price: 10 })
    expect(res.success).toBe(false)
  })

  it('tracks dividends and interest income', () => {
    mod.addBuy('MF', { kind: 'mutual_fund', date: '2026-01-01', quantity: 100, price: 10 })
    mod.addDividend('MF', { date: '2026-04-01', amount: 200 })
    mod.addDividend('MF', { date: '2026-05-01', amount: 250, kind: 'interest' })
    const summary = mod.getPortfolioSummary()
    expect(summary.dividends).toBe(450)
    expect(mod.getInvestmentSummary('MF').dividendIncome).toBe(450)
  })

  it('valuates with manual market prices', () => {
    mod.addBuy('GOLD', { kind: 'gold', date: '2026-01-01', quantity: 10, price: 500 })
    mod.updateMarketPrice('GOLD', 600)
    const summary = mod.getInvestmentSummary('GOLD')
    expect(summary.currentValue).toBe(6000)
    expect(summary.unrealizedGain).toBe(1000)
    const portfolio = mod.getPortfolioSummary()
    expect(portfolio.marketValue).toBe(6000)
    expect(portfolio.unrealized).toBe(1000)
  })

  it('deletes an asset and its records', () => {
    mod.addBuy('DEL', { kind: 'stock', date: '2026-01-01', quantity: 5, price: 100 })
    mod.addDividend('DEL', { date: '2026-04-01', amount: 30 })
    expect(mod.deleteAsset('DEL')).toBe(true)
    expect(mod.getInvestmentSummary('DEL')).toBeNull()
    expect(mod.getPortfolioSummary().assets).toBe(0)
  })
})