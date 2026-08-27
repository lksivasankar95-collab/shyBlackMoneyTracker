import { describe, it, expect } from 'vitest'
import { getYearReview } from '../utils/yearReview'

const tx = (date, type, amount, category) => ({ date, type, amount, category })

describe('getYearReview', () => {
  it('aggregates a full year by month', () => {
    const review = getYearReview([
      tx('2025-01-05', 'income', 50000, 'salary'),
      tx('2025-01-10', 'expense', 10000, 'food'),
      tx('2025-02-02', 'income', 60000, 'salary'),
      tx('2025-02-15', 'expense', 20000, 'rent'),
      tx('2024-12-31', 'income', 99999, 'salary'),
    ], 2025)

    expect(review.income).toBe(110000)
    expect(review.expense).toBe(30000)
    expect(review.savings).toBe(80000)
    expect(review.txCount).toBe(4)
    expect(review.savingsRate).toBe(73)
    expect(review.totalMonthsActive).toBe(2)
    expect(review.months[0].label).toBe('Jan')
    expect(review.months[0].income).toBe(50000)
    expect(review.months[1].expense).toBe(20000)
    expect(review.bestMonth).toMatchObject({ month: 0, savings: 40000 })
    expect(review.worstMonth).toMatchObject({ month: 1, expense: 20000 })
    expect(review.topCategories[0]).toEqual({ category: 'rent', amount: 20000 })
    expect(review.topIncomeCategories[0]).toEqual({ category: 'salary', amount: 110000 })
  })

  it('handles an empty year', () => {
    const review = getYearReview([], 2025)
    expect(review.income).toBe(0)
    expect(review.txCount).toBe(0)
    expect(review.bestMonth).toBeNull()
    expect(review.worstMonth).toBeNull()
    expect(review.savingsRate).toBe(0)
  })
})