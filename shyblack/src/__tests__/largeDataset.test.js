import { describe, it, expect } from 'vitest'
import { getMonthlyTrends, getEmiProgressTrend, getDebtReductionTrend } from '../utils/trends'
import { runAllDataChecks } from '../utils/dataQuality'
import { generateReviewSummary } from '../utils/reviewCenter'

function generateLargeTransactions(count) {
  const types = ['income', 'expense']
  const categories = ['food', 'transport', 'bills', 'shopping', 'entertainment', 'salary']
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id: `tx_${i}`,
    date: new Date(now - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: Math.random() > 0.3 ? -(Math.random() * 10000 + 100) : (Math.random() * 50000 + 1000),
    type: types[Math.floor(Math.random() * types.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    note: `Transaction ${i}`,
  }))
}

function generateLargeDebts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `debt_${i}`,
    personName: `Person ${i}`,
    amount: Math.random() * 100000 + 1000,
    remainingAmount: Math.random() * 100000,
    type: Math.random() > 0.5 ? 'lend' : 'borrow',
    status: 'active',
  }))
}

function generateLargeEmis(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `emi_${i}`,
    name: `EMI ${i}`,
    amount: Math.random() * 50000 + 1000,
    totalMonths: Math.floor(Math.random() * 60) + 6,
    remainingMonths: Math.floor(Math.random() * 60),
    status: 'active',
  }))
}

describe('Large Dataset - Performance', () => {
  it('processes 5000 transactions for trends under 2000ms', () => {
    const tx = generateLargeTransactions(5000)
    const start = performance.now()
    const trends = getMonthlyTrends(tx, 12)
    const elapsed = performance.now() - start
    expect(trends.length).toBe(12)
    expect(elapsed).toBeLessThan(2000)
  })

  it('processes 5000 transactions for data quality under 2000ms', () => {
    const tx = generateLargeTransactions(5000)
    const start = performance.now()
    const result = runAllDataChecks(tx, [], [], [], [], [], [])
    const elapsed = performance.now() - start
    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(2000)
  })

  it('processes 5000 transactions for review summary under 2000ms', () => {
    const tx = generateLargeTransactions(5000)
    const start = performance.now()
    const summary = generateReviewSummary(tx, [], [], [], [])
    const elapsed = performance.now() - start
    expect(summary).toBeTruthy()
    expect(elapsed).toBeLessThan(2000)
  })

  it('processes 500 EMIs for trend quickly', () => {
    const emis = generateLargeEmis(500)
    const start = performance.now()
    const trend = getEmiProgressTrend(emis)
    const elapsed = performance.now() - start
    expect(trend.length).toBe(500)
    expect(elapsed).toBeLessThan(500)
  })

  it('processes 500 debts for trend quickly', () => {
    const debts = generateLargeDebts(500)
    const start = performance.now()
    const trend = getDebtReductionTrend(debts)
    const elapsed = performance.now() - start
    expect(trend.length).toBe(500)
    expect(elapsed).toBeLessThan(500)
  })
})
