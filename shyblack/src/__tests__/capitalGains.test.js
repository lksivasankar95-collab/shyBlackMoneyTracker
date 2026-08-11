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
    CAPITAL_GAINS: 'test_capital_gains',
  },
}))

vi.mock('../utils/helpers', () => ({
  generateId: () => 'cg' + Math.floor(Math.random() * 1e9),
}))

describe('capital gains & tax', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/capitalGains')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('rejects invalid lots', () => {
    expect(mod.addLot({ name: '', quantity: 10, buyPrice: 100 })).toBeNull()
    expect(mod.addLot({ name: 'X', quantity: 0, buyPrice: 100 })).toBeNull()
    expect(mod.addLot({ name: 'X', quantity: 10, buyPrice: 0 })).toBeNull()
  })

  it('adds lots and aggregates holdings FIFO-agnostic', () => {
    mod.addLot({ name: 'RELIANCE', taxClass: 'equity', buyDate: '2024-01-01', quantity: 10, buyPrice: 100 })
    mod.addLot({ name: 'RELIANCE', taxClass: 'equity', buyDate: '2024-06-01', quantity: 5, buyPrice: 120 })
    mod.addLot({ name: 'BITCOIN', taxClass: 'crypto', buyDate: '2024-03-01', quantity: 1, buyPrice: 4000 })
    const holdings = mod.getHoldings()
    expect(holdings).toHaveLength(2)
    const rel = holdings.find((h) => h.name === 'RELIANCE')
    expect(rel.quantity).toBe(15)
    expect(rel.averageCost).toBeCloseTo(106.67, 1)
  })

  it('sells FIFO across lots and classifies long term', () => {
    mod.addLot({ name: 'TCS', taxClass: 'equity', buyDate: '2023-01-01', quantity: 10, buyPrice: 100 })
    mod.addLot({ name: 'TCS', taxClass: 'equity', buyDate: '2025-05-01', quantity: 10, buyPrice: 100 })
    const result = mod.sellLots('TCS', { date: '2026-01-01', quantity: 15, price: 150 })
    expect(result.success).toBe(true)
    expect(result.realized).toHaveLength(2)
    expect(result.realized[0].isLongTerm).toBe(true)
    expect(result.realized[1].isLongTerm).toBe(false)
    expect(mod.getOpenLots('TCS')).toHaveLength(1)
    expect(mod.getOpenLots('TCS')[0].quantity).toBe(5)
  })

  it('rejects overselling', () => {
    mod.addLot({ name: 'X', taxClass: 'equity', buyDate: '2024-01-01', quantity: 5, buyPrice: 100 })
    const result = mod.sellLots('X', { date: '2025-01-01', quantity: 6, price: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toBe('insufficient_holdings')
  })

  it('computes tax: equity STCG 15%, LTCG above 1L 10%, crypto flat 30%', () => {
    mod.addLot({ name: 'A', taxClass: 'equity', buyDate: '2026-01-01', quantity: 1, buyPrice: 100 })
    mod.sellLots('A', { date: '2026-03-01', quantity: 1, price: 300 }) // STCG 200 -> 30
    mod.addLot({ name: 'B', taxClass: 'equity', buyDate: '2023-01-01', quantity: 1, buyPrice: 100 })
    mod.sellLots('B', { date: '2026-03-01', quantity: 1, price: 200000 }) // LTCG 199900 -> (199900-100000)*0.1 = 9990
    mod.addLot({ name: 'C', taxClass: 'crypto', buyDate: '2025-01-01', quantity: 1, buyPrice: 100 })
    mod.sellLots('C', { date: '2026-03-01', quantity: 1, price: 400 }) // gain 300 -> 90
    const summary = mod.getTaxSummary()
    expect(summary.totalGain).toBe(200400)
    expect(summary.totalTax).toBeCloseTo(30 + 9990 + 90, 0)
    expect(summary.trades).toBe(3)
  })

  it('estimates 80C deductions with the 1.5L cap', () => {
    const txs = [
      { type: 'expense', note: 'ELSS SIP', amount: 100000, date: '2026-01-05' },
      { type: 'expense', note: 'Random purchase', amount: 5000, date: '2026-01-06' },
      { type: 'expense', note: 'life insurance premium', amount: 60000, date: '2026-02-01' },
    ]
    const result = mod.estimate80CDeductions(txs)
    expect(result.eligible).toBe(150000)
    expect(result.capReached).toBe(true)
    expect(result.items).toHaveLength(2)
  })

  it('deletes lots and clears realized history', () => {
    mod.addLot({ name: 'Z', taxClass: 'debt', buyDate: '2026-01-01', quantity: 10, buyPrice: 50 })
    const lot = mod.addLot({ name: 'Y', taxClass: 'debt', buyDate: '2026-01-01', quantity: 10, buyPrice: 50 })
    mod.sellLots('Z', { date: '2026-06-01', quantity: 10, price: 60 })
    expect(mod.getTaxSummary().trades).toBe(1)
    expect(mod.deleteLot(lot.id)).toBe(true)
    expect(mod.getHoldings()).toHaveLength(0)
    mod.clearRealizedGains()
    expect(mod.getTaxSummary().trades).toBe(0)
  })
})