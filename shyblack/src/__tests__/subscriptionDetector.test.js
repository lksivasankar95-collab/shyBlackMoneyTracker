import { describe, it, expect } from 'vitest'

const mod = await import('../utils/subscriptionDetector')

function tx(id, date, amount, note, category = 'subscription') {
  return { id, date, amount, note, type: 'expense', category }
}

describe('subscription detector', () => {
  it('detects a monthly subscription pattern', () => {
    const txs = [
      tx('1', '2025-06-01', 199, 'Netflix India'),
      tx('2', '2025-07-01', 199, 'Netflix India'),
      tx('3', '2025-08-02', 199, 'Netflix India'),
    ]
    const candidates = mod.detectSubscriptionCandidates(txs)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      frequency: 'monthly',
      amount: 199,
      occurrences: 3,
    })
    expect(candidates[0].nextDate).toBe('2025-09-02')
    expect(candidates[0].confidence).toBeGreaterThanOrEqual(60)
  })

  it('detects yearly renewals', () => {
    const txs = [
      tx('1', '2024-06-15', 1499, 'Amazon Prime'),
      tx('2', '2025-06-20', 1499, 'Amazon Prime'),
    ]
    const candidates = mod.detectSubscriptionCandidates(txs, [], { minOccurrences: 2 })
    expect(candidates).toHaveLength(1)
    expect(candidates[0].frequency).toBe('yearly')
    expect(candidates[0].amount).toBe(1499)
  })

  it('ignores one-off purchases and inconsistent amounts', () => {
    const txs = [
      tx('1', '2025-06-01', 199, 'Netflix India'),
      tx('2', '2025-06-05', 500, 'Netflix India'),
    ]
    expect(mod.detectSubscriptionCandidates(txs)).toHaveLength(0)
  })

  it('ignores EMI and trading categories', () => {
    const txs = [
      tx('1', '2025-06-01', 12000, 'HDFC Loan EMI', 'emi'),
      tx('2', '2025-07-01', 12000, 'HDFC Loan EMI', 'emi'),
    ]
    expect(mod.detectSubscriptionCandidates(txs)).toHaveLength(0)
  })

  it('excludes already tracked subscriptions', () => {
    const txs = [
      tx('1', '2025-06-01', 199, 'Netflix India'),
      tx('2', '2025-07-01', 199, 'Netflix India'),
    ]
    const existing = [{ source: 'subscription', note: 'Netflix India', amount: 199 }]
    expect(mod.detectSubscriptionCandidates(txs, existing)).toHaveLength(0)
  })

  it('handles UPI noise in notes', () => {
    const txs = [
      tx('1', '2025-06-01', 899, 'Spotify Premium - UPI ref 88213'),
      tx('2', '2025-07-01', 899, 'Spotify Premium'),
    ]
    const candidates = mod.detectSubscriptionCandidates(txs)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].merchant).toBe('spotify premium')
  })

  it('estimates monthly cost for yearly subscriptions', () => {
    const txs = [
      tx('1', '2024-06-15', 1200, 'iCloud'),
      tx('2', '2025-06-20', 1200, 'iCloud'),
    ]
    const candidates = mod.detectSubscriptionCandidates(txs)
    expect(candidates[0].estimatedMonthlyCost).toBeCloseTo(100, 1)
  })
})
