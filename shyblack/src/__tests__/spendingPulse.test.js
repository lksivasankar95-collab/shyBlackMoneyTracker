import { describe, it, expect } from 'vitest'

const mod = await import('../utils/spendingPulse')

describe('spending pulse alerts', () => {
  it('defaults to 50k when there is no history', () => {
    expect(mod.getSpendingPulseThreshold([])).toBe(50000)
    expect(mod.getSpendingPulseThreshold([{ type: 'income', amount: 100000 }])).toBe(50000)
  })

  it('raises the bar when the user spends small amounts', () => {
    const txs = [
      { type: 'expense', amount: 100 },
      { type: 'expense', amount: 200 },
      { type: 'expense', amount: 300 },
    ]
    // avg 200 → threshold max(50k, 400) = 50k
    expect(mod.getSpendingPulseThreshold(txs)).toBe(50000)
  })

  it('uses 2x average when history has larger spends', () => {
    const txs = [
      { type: 'expense', amount: 100000 },
      { type: 'expense', amount: 200000 },
    ]
    expect(mod.getSpendingPulseThreshold(txs)).toBe(300000)
  })

  it('shouldAlertLargeExpense respects the threshold', () => {
    const txs = [
      { type: 'expense', amount: 100000 },
      { type: 'expense', amount: 200000 },
    ]
    expect(mod.shouldAlertLargeExpense(txs, 299999)).toBe(false)
    expect(mod.shouldAlertLargeExpense(txs, 300000)).toBe(true)
    expect(mod.shouldAlertLargeExpense(txs, 301000)).toBe(true)
    expect(mod.shouldAlertLargeExpense(txs, 0)).toBe(false)
  })
})
