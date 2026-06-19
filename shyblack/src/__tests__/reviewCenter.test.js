import { describe, it, expect } from 'vitest'
import { generateMonthlyReview, generateQuarterlyReview, generateYearlyReview, generateReviewSummary, formatReviewAsText } from '../utils/reviewCenter'

describe('generateMonthlyReview', () => {
  const transactions = [
    { id: '1', date: '2025-06-15', amount: 5000, type: 'income', category: 'salary' },
    { id: '2', date: '2025-06-10', amount: 200, type: 'expense', category: 'food' },
    { id: '3', date: '2025-06-05', amount: 150, type: 'expense', category: 'transport' },
  ]
  const debts = []
  const emis = []
  const goals = []
  const accounts = []

  it('generates monthly summary with correct income/expense', () => {
    const review = generateMonthlyReview(transactions, debts, emis, goals, accounts, 2025, 5)
    expect(review.income).toBe(5000)
    expect(review.expense).toBe(350)
    expect(review.savings).toBe(4650)
    expect(review.transactionCount).toBe(3)
  })

  it('calculates savings rate', () => {
    const review = generateMonthlyReview(transactions, debts, emis, goals, accounts, 2025, 5)
    expect(review.savingsRate).toBe(93)
  })

  it('returns top spending categories', () => {
    const review = generateMonthlyReview(transactions, debts, emis, goals, accounts, 2025, 5)
    expect(review.topCategories.length).toBeGreaterThan(0)
  })
})

describe('generateQuarterlyReview', () => {
  const transactions = [
    { id: '1', date: '2025-04-15', amount: 5000, type: 'income', category: 'salary' },
    { id: '2', date: '2025-05-10', amount: 300, type: 'expense', category: 'food' },
    { id: '3', date: '2025-06-05', amount: 200, type: 'expense', category: 'transport' },
  ]

  it('generates quarterly summary (Q2 2025)', () => {
    const review = generateQuarterlyReview(transactions, [], [], [], [], 2025, 1)
    expect(review.income).toBe(5000)
    expect(review.expense).toBe(500)
    expect(review.transactionCount).toBe(3)
    expect(review.label).toBe('Q2 2025')
  })
})

describe('generateYearlyReview', () => {
  it('generates yearly summary', () => {
    const transactions = [
      { id: '1', date: '2025-03-15', amount: 12000, type: 'income', category: 'salary' },
      { id: '2', date: '2025-07-10', amount: 1000, type: 'expense', category: 'bills' },
    ]
    const review = generateYearlyReview(transactions, [], [], [], [], 2025)
    expect(review.income).toBe(12000)
    expect(review.expense).toBe(1000)
    expect(review.transactionCount).toBe(2)
  })
})

describe('generateReviewSummary', () => {
  it('returns monthly, quarterly, and yearly reviews', () => {
    const transactions = [
      { id: '1', date: new Date().toISOString().split('T')[0], amount: 1000, type: 'income', category: 'salary' },
    ]
    const summary = generateReviewSummary(transactions, [], [], [], [])
    expect(summary).toHaveProperty('monthly')
    expect(summary).toHaveProperty('quarterly')
    expect(summary).toHaveProperty('yearly')
    expect(summary.monthly.income).toBe(1000)
  })
})

describe('formatReviewAsText', () => {
  it('returns formatted text representation', () => {
    const review = {
      label: 'June 2025',
      income: 5000,
      expense: 2000,
      savings: 3000,
      savingsRate: 60,
      transactionCount: 10,
      topCategories: [['food', 500]],
      debts: { owed: 1000, borrowed: 500, activeCount: 2 },
      emis: { monthlyTotal: 300, activeCount: 1 },
      goals: { saved: 2000, target: 10000, count: 2 },
      netWorth: 15000,
    }
    const text = formatReviewAsText(review, (v) => `$${v}`)
    expect(text).toContain('June 2025')
    expect(text).toContain('$5000')
    expect(text).toContain('$15000')
  })
})
