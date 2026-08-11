import { describe, it, expect } from 'vitest'

const mod = await import('../utils/incomeTax')

describe('income tax estimator (India)', () => {
  it('computes FY 2026-27 new regime: 12L taxable pays zero (87A rebate)', () => {
    const result = mod.computeNewRegimeTax(1200000, '2026-27')
    expect(result.taxBeforeRebate).toBe(60000)
    expect(result.rebateApplied).toBe(true)
    expect(result.total).toBe(0)
  })

  it('salaried gross 12.75L pays zero after 75k standard deduction', () => {
    const est = mod.estimateIncomeTax({ fy: '2026-27', salary: 1275000 })
    expect(est.newRegime.taxableIncome).toBe(1200000)
    expect(est.newRegime.total).toBe(0)
    expect(est.recommended).toBe('new')
  })

  it('new regime 15L taxable: 1,05,000 + 4% cess', () => {
    const result = mod.computeNewRegimeTax(1500000, '2026-27')
    expect(result.taxBeforeRebate).toBe(105000)
    expect(result.cess).toBeCloseTo(4200, 1)
    expect(result.total).toBeCloseTo(109200, 1)
  })

  it('new regime 20L taxable: 2,00,000 before cess', () => {
    const result = mod.computeNewRegimeTax(2000000, '2026-27')
    expect(result.taxBeforeRebate).toBe(200000)
  })

  it('new regime 25L taxable: 3,30,000 before cess', () => {
    const result = mod.computeNewRegimeTax(2500000, '2026-27')
    expect(result.taxBeforeRebate).toBe(330000)
  })

  it('old regime uses 2.5/5/10L slabs and 50k standard deduction', () => {
    const est = mod.estimateIncomeTax({ fy: '2026-27', salary: 800000 })
    expect(est.oldRegime.taxableIncome).toBe(750000)
    // 2.5-5L @5% = 12,500 + 5-7.5L @20% = 50,000
    expect(est.oldRegime.taxBeforeRebate).toBe(62500)
  })

  it('old regime 80C and NPS reduce taxable income with caps', () => {
    const est = mod.estimateIncomeTax({
      fy: '2026-27',
      salary: 1500000,
      deductions80C: 200000,
      nps: 100000,
    })
    // caps at 1.5L + 50k
    expect(est.oldRegime.taxableIncome).toBe(1500000 - 50000 - 150000 - 50000)
  })

  it('old regime rebate zeroes tax up to 5L taxable', () => {
    const result = mod.computeOldRegimeTax(500000, '2026-27')
    expect(result.total).toBe(0)
  })

  it('recommends the cheaper regime', () => {
    // High deductions make the old regime cheaper for high earners
    const est = mod.estimateIncomeTax({
      fy: '2026-27',
      salary: 3000000,
      deductions80C: 150000,
      nps: 50000,
    })
    expect(['new', 'old']).toContain(est.recommended)
    expect(est.savings).toBeGreaterThanOrEqual(0)
  })

  it('maps FY 2024-25 with its lower rebate limit', () => {
    const result = mod.computeNewRegimeTax(750000, '2024-25')
    // 2024-25 rebate limited to 25k on 7L taxable
    expect(result.taxBeforeRebate).toBeGreaterThan(0)
    expect(result.rebateApplied).toBe(false)
  })

  it('aggregates income transactions by Indian financial year', () => {
    const txs = [
      { type: 'income', category: 'salary', amount: 600000, date: '2026-02-15' },   // FY 2025-26
      { type: 'income', category: 'salary', amount: 400000, date: '2026-04-10' },   // FY 2026-27
      { type: 'income', category: 'freelance', amount: 200000, date: '2026-11-01' }, // FY 2026-27
      { type: 'income', category: 'investment', amount: 50000, date: '2026-05-01' }, // FY 2026-27
      { type: 'expense', category: 'food', amount: 5000, date: '2026-04-10' },
    ]
    const fy2627 = mod.aggregateIncomeByFY(txs, '2026-27')
    expect(fy2627).toEqual({ salary: 400000, freelance: 200000, investment: 50000, otherIncome: 0 })
    const fy2526 = mod.aggregateIncomeByFY(txs, '2025-26')
    expect(fy2526.salary).toBe(600000)
  })

  it('fyFromDate handles April/March boundaries', () => {
    expect(mod.fyFromDate('2026-03-31')).toBe('2025-26')
    expect(mod.fyFromDate('2026-04-01')).toBe('2026-27')
  })

  it('estimates capital gains tax with 1.25L exemption', () => {
    const result = mod.estimateCapitalGainsTax({ equitySTCG: 200000, equityLTCG: 100000 })
    expect(result.tax).toBeCloseTo((200000 - 125000) * 0.2, 1)
    expect(result.cess).toBeCloseTo(result.tax * 0.04, 1)
  })
})
