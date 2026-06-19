import { describe, it, expect } from 'vitest'
import { getMonthlyTrends, getSavingsTrend, getDebtReductionTrend, getEmiProgressTrend, getGoalAchievementTrend } from '../utils/trends'

describe('getMonthlyTrends', () => {
  const transactions = [
    { id: '1', date: '2025-06-15', amount: 5000, type: 'income', category: 'salary' },
    { id: '2', date: '2025-06-10', amount: 200, type: 'expense', category: 'food' },
    { id: '3', date: '2025-06-05', amount: 150, type: 'expense', category: 'transport' },
    { id: '4', date: '2025-05-15', amount: 3000, type: 'income', category: 'salary' },
  ]

  it('returns trend data for given months', () => {
    const trends = getMonthlyTrends(transactions, 12)
    expect(trends.length).toBe(12)
  })

  it('calculates monthly income and expense correctly', () => {
    const trends = getMonthlyTrends(transactions, 12)
    const juneTrend = trends.find((t) => t.month.includes('Jun') && t.month.includes('2025'))
    if (juneTrend) {
      expect(juneTrend.income).toBe(5000)
      expect(juneTrend.expense).toBe(350)
      expect(juneTrend.savings).toBe(4650)
    }
  })
})

describe('getSavingsTrend', () => {
  it('returns savings trend data', () => {
    const tx = [
      { id: '1', date: new Date().toISOString().split('T')[0], amount: 5000, type: 'income', category: 'salary' },
      { id: '2', date: new Date().toISOString().split('T')[0], amount: -1000, type: 'expense', category: 'food' },
    ]
    const trend = getSavingsTrend(tx, 6)
    expect(trend.length).toBe(6)
    expect(trend.some((t) => t.savings !== 0)).toBe(true)
  })
})

describe('getDebtReductionTrend', () => {
  it('calculates progress correctly', () => {
    const debts = [
      { personName: 'Rahul', amount: 10000, remainingAmount: 4000, type: 'lend' },
    ]
    const trend = getDebtReductionTrend(debts)
    expect(trend[0].paidAmount).toBe(6000)
    expect(trend[0].progress).toBe(60)
  })
})

describe('getEmiProgressTrend', () => {
  it('calculates EMI progress correctly', () => {
    const emis = [
      { name: 'Car Loan', totalMonths: 60, remainingMonths: 30, amount: 15000 },
    ]
    const trend = getEmiProgressTrend(emis)
    expect(trend[0].paidMonths).toBe(30)
    expect(trend[0].progress).toBe(50)
    expect(trend[0].amount).toBe(15000)
  })
})

describe('getGoalAchievementTrend', () => {
  it('calculates goal progress correctly', () => {
    const goals = [
      { name: 'Vacation', target: 100000, saved: 25000, category: 'travel' },
    ]
    const trend = getGoalAchievementTrend(goals)
    expect(trend[0].progress).toBe(25)
    expect(trend[0].saved).toBe(25000)
  })
})
