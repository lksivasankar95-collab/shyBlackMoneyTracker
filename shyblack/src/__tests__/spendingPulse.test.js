import { describe, it, expect, beforeEach } from 'vitest'

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

describe('spending pulse series', () => {
  const day = 86400000
  const now = Date.now()

  it('builds a continuous daily series covering the window', () => {
    const series = mod.getSpendingPulseSeries([], 30)
    expect(series).toHaveLength(30)
    for (const d of series) {
      expect(d).toHaveProperty('day')
      expect(d).toHaveProperty('label')
      expect(d.amount).toBe(0)
    }
    expect(series[0].day < series[29].day).toBe(true)
  })

  it('aggregates expenses by day and ignores income', () => {
    const txs = [
      { type: 'expense', amount: 1000, createdAt: now },
      { type: 'expense', amount: 500, createdAt: now },
      { type: 'income', amount: 50000, createdAt: now },
      { type: 'expense', amount: 250, createdAt: now - 3 * day },
    ]
    const series = mod.getSpendingPulseSeries(txs, 7)
    expect(series[6].amount).toBe(1500)
    expect(series[3].amount).toBe(250)
  })

  it('falls back to date string when createdAt is missing', () => {
    const d = new Date(now)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const series = mod.getSpendingPulseSeries([{ type: 'expense', amount: 777, date: dateStr }], 30)
    expect(series[29].amount).toBe(777)
  })
})

describe('pulse stats', () => {
  const day = 86400000

  it('reports calm when there is no spending', () => {
    const stats = mod.getPulseStats([])
    expect(stats.pulseLevel).toBe('calm')
    expect(stats.today).toBe(0)
    expect(stats.weekTotal).toBe(0)
    expect(stats.monthTotal).toBe(0)
    expect(stats.weekOverWeekDelta).toBe(0)
  })

  it('flags consistent steady spending as calm', () => {
    const now = Date.now()
    const txs = []
    for (let i = 0; i < 30; i++) {
      txs.push({ type: 'expense', amount: 1000, createdAt: now - i * day })
    }
    const stats = mod.getPulseStats(txs)
    expect(stats.weekTotal).toBe(7000)
    expect(stats.monthTotal).toBe(30000)
    expect(stats.weekOverWeekDelta).toBe(0)
    expect(stats.pulseLevel).toBe('calm')
  })

  it('raises pulse level when the last week is much heavier', () => {
    const now = Date.now()
    const txs = []
    for (let i = 7; i < 30; i++) {
      txs.push({ type: 'expense', amount: 1000, createdAt: now - i * day })
    }
    for (let i = 0; i < 7; i++) {
      txs.push({ type: 'expense', amount: 10000, createdAt: now - i * day })
    }
    const stats = mod.getPulseStats(txs)
    expect(['moderate', 'elevated', 'hot']).toContain(stats.pulseLevel)
    expect(stats.weekTotal).toBe(70000)
    expect(stats.weekOverWeekDelta).toBeGreaterThan(0)
  })
})

describe('detectSpendingAnomalies', () => {
  const day = 86400000
  let txs
  let now

  beforeEach(() => {
    now = Date.now()
    txs = []
    for (let i = 0; i < 10; i++) {
      txs.push({ type: 'expense', amount: 1000, createdAt: now - i * day })
    }
  })

  it('flags a day far above the active-day average', () => {
    txs.push({ type: 'expense', amount: 50000, createdAt: now - 15 * day })
    const anomalies = mod.detectSpendingAnomalies(txs, 30)
    expect(anomalies.length).toBeGreaterThan(0)
    expect(anomalies[0].amount).toBe(50000)
    expect(anomalies[0].ratio).toBeGreaterThan(2)
  })

  it('returns empty when nothing stands out', () => {
    expect(mod.detectSpendingAnomalies(txs, 30)).toEqual([])
  })

  it('returns empty when there are not enough active days', () => {
    const sparse = [
      { type: 'expense', amount: 1000, createdAt: now },
      { type: 'expense', amount: 5000, createdAt: now - 2 * day },
    ]
    expect(mod.detectSpendingAnomalies(sparse, 30)).toEqual([])
  })
})
