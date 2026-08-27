import { describe, it, expect } from 'vitest'
import { getBudgetPace } from '../utils/budgetPace'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevMonthDayStr(day) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

describe('getBudgetPace', () => {
  it('returns unused for categories with no spend', () => {
    const { pace } = getBudgetPace({ food: { limit: 8000 } }, [])
    expect(pace).toHaveLength(1)
    expect(pace[0].status).toBe('unused')
  })

  it('flags breached when spend crosses the limit', () => {
    const { pace, summary } = getBudgetPace(
      { food: { limit: 10000 } },
      [{ type: 'expense', amount: 15000, date: todayStr(), category: 'food' }]
    )
    expect(pace[0].status).toBe('breached')
    expect(pace[0].pctSpent).toBe(150)
    expect(summary.breached).toBe(1)
  })

  it('derives pace relative to elapsed part of the month', () => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const expected = Math.round((10000 * now.getDate()) / daysInMonth)
    const { pace } = getBudgetPace(
      { rent: { limit: 10000 } },
      [{ type: 'expense', amount: Math.round(expected * 0.5), date: todayStr(), category: 'rent' }]
    )
    expect(pace[0].status).toBe('behind')
  })

  it('ignores non-expense and out-of-month transactions', () => {
    const { pace } = getBudgetPace(
      { food: { limit: 8000 } },
      [
        { type: 'income', amount: 99000, date: todayStr(), category: 'food' },
        { type: 'expense', amount: 5000, date: prevMonthDayStr(15), category: 'food' },
      ]
    )
    expect(pace[0].spent).toBe(0)
  })
})