import { describe, it, expect } from 'vitest'
import { getReceiptMatchScore, findReceiptMatchSuggestions } from '../utils/receiptMatcher'

const tx = (id, amount, date, note, category = 'food') => ({ id, type: 'expense', amount, date, note, category })
const receipt = (id, amount, date, merchant, category = 'food') => ({ id, amount, date, merchant, category })

describe('receiptMatcher', () => {
  it('scores a same-day same-amount receipt highly', () => {
    const score = getReceiptMatchScore(
      receipt('r1', 500, '2026-02-05', 'Cafe Coffee Day'),
      tx('t1', 500, '2026-02-05', 'coffee at ccd')
    )
    expect(score).not.toBeNull()
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('rejects matches that are too far apart in date or amount', () => {
    expect(getReceiptMatchScore(receipt('r1', 500, '2026-02-05'), tx('t1', 500, '2026-02-20'))).toBeNull()
    expect(getReceiptMatchScore(receipt('r1', 500, '2026-02-05'), tx('t1', 2000, '2026-02-05'))).toBeNull()
  })

  it('only matches expense transactions', () => {
    const score = getReceiptMatchScore(receipt('r1', 500, '2026-02-05'), tx('t1', 500, '2026-02-05'))
    expect(score).not.toBeNull()
    expect(getReceiptMatchScore(
      receipt('r1', 500, '2026-02-05'),
      { id: 't2', type: 'income', amount: 500, date: '2026-02-05' }
    )).toBeNull()
  })

  it('suggests the best unlinked receipt-to-transaction pair', () => {
    const suggestions = findReceiptMatchSuggestions(
      [receipt('r1', 500, '2026-02-05', 'Cafe Coffee Day')],
      [tx('t1', 99999, '2026-02-05'), tx('t2', 500, '2026-02-05', 'ccd')]
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].receipt.id).toBe('r1')
    expect(suggestions[0].match.id).toBe('t2')
    expect(suggestions[0].score).toBeGreaterThanOrEqual(45)
  })

  it('skips receipts already linked to a transaction', () => {
    const suggestions = findReceiptMatchSuggestions(
      [{ ...receipt('r1', 500, '2026-02-05'), transactionId: 't2' }],
      [tx('t2', 500, '2026-02-05')]
    )
    expect(suggestions).toHaveLength(0)
  })
})