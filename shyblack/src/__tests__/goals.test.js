import { describe, expect, it } from 'vitest'
import { getGoalHistory, getGoalTransactionDelta } from '../utils/goals'

describe('goal movement history', () => {
  it('calculates contribution and withdrawal deltas', () => {
    expect(getGoalTransactionDelta({ goalId: 'g1', goalAction: 'contribution', amount: 500 })).toBe(500)
    expect(getGoalTransactionDelta({ goalId: 'g1', goalAction: 'withdrawal', amount: 125 })).toBe(-125)
    expect(getGoalTransactionDelta({ type: 'expense', amount: 500 })).toBe(0)
  })

  it('filters and sorts linked movements newest first', () => {
    const history = getGoalHistory([
      { id: 'old', goalId: 'g1', goalAction: 'contribution', amount: 100, date: '2026-01-01' },
      { id: 'other', goalId: 'g2', goalAction: 'contribution', amount: 200, date: '2026-03-01' },
      { id: 'new', goalId: 'g1', goalAction: 'withdrawal', amount: 50, date: '2026-03-01' },
    ], 'g1')

    expect(history.map((movement) => movement.id)).toEqual(['new', 'old'])
  })
})
