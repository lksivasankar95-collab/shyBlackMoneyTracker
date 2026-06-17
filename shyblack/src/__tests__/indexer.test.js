import { describe, it, expect } from 'vitest'
import { buildIndexes, getMonthlySummaryFromIndex, getCategoryBreakdownFromIndex, getDailyExpenseFromIndex, getPeopleFromIndex } from '../utils/indexer.js'

function tx(id, type, amount, date, category, person, paymentMethod, source) {
  return {
    id,
    type,
    amount,
    date: date || '2024-06-15',
    category: category || 'food',
    ...(person ? { person: { name: person } } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(source ? { source } : {}),
  }
}

describe('buildIndexes', () => {
  it('returns empty indexes for empty array', () => {
    const idx = buildIndexes([])
    expect(idx.byType.income).toHaveLength(0)
    expect(idx.byType.expense).toHaveLength(0)
    expect(idx.summaries.transactionCount).toBe(0)
    expect(idx.summaries.totalIncome).toBe(0)
    expect(idx.summaries.totalExpense).toBe(0)
  })

  it('indexes by type', () => {
    const txs = [tx('1', 'income', 1000), tx('2', 'expense', 500)]
    const idx = buildIndexes(txs)
    expect(idx.byType.income).toHaveLength(1)
    expect(idx.byType.expense).toHaveLength(1)
    expect(idx.summaries.totalIncome).toBe(1000)
    expect(idx.summaries.totalExpense).toBe(500)
    expect(idx.summaries.netCashflow).toBe(500)
  })

  it('indexes by month', () => {
    const txs = [
      tx('1', 'income', 1000, '2024-06-01'),
      tx('2', 'expense', 500, '2024-06-15'),
      tx('3', 'expense', 200, '2024-07-01'),
    ]
    const idx = buildIndexes(txs)
    expect(idx.byMonth.has('2024-06')).toBe(true)
    expect(idx.byMonth.has('2024-07')).toBe(true)
    expect(idx.byMonth.get('2024-06')).toHaveLength(2)
    expect(idx.byMonth.get('2024-07')).toHaveLength(1)
  })

  it('indexes by category', () => {
    const txs = [tx('1', 'expense', 100, '2024-06-01', 'food'), tx('2', 'expense', 200, '2024-06-01', 'fuel')]
    const idx = buildIndexes(txs)
    expect(idx.byCategory.has('food')).toBe(true)
    expect(idx.byCategory.has('fuel')).toBe(true)
    expect(idx.byCategory.get('food')).toHaveLength(1)
  })

  it('indexes by person', () => {
    const txs = [tx('1', 'expense', 100, '2024-06-01', 'food', 'Alice'), tx('2', 'income', 500, '2024-06-01', 'salary', 'Bob')]
    const idx = buildIndexes(txs)
    expect(idx.byPerson.has('alice')).toBe(true)
    expect(idx.byPerson.has('bob')).toBe(true)
  })

  it('indexes by payment method', () => {
    const txs = [tx('1', 'expense', 100, '2024-06-01', 'food', null, 'gpay'), tx('2', 'expense', 200, '2024-06-01', 'fuel', null, 'cash')]
    const idx = buildIndexes(txs)
    expect(idx.byPaymentMethod.has('gpay')).toBe(true)
    expect(idx.byPaymentMethod.has('cash')).toBe(true)
  })

  it('indexes by source', () => {
    const txs = [tx('1', 'expense', 100, '2024-06-01', 'food', null, null, 'recurring'), tx('2', 'expense', 200, '2024-06-01')]
    const idx = buildIndexes(txs)
    expect(idx.bySource.has('recurring')).toBe(true)
    expect(idx.bySource.has('manual')).toBe(true)
  })

  it('provides monthly summaries sorted by month', () => {
    const txs = [
      tx('1', 'income', 5000, '2024-05-01'),
      tx('2', 'expense', 2000, '2024-06-01'),
      tx('3', 'income', 3000, '2024-07-01'),
    ]
    const idx = buildIndexes(txs)
    expect(idx.summaries.monthly).toHaveLength(3)
    expect(idx.summaries.monthly[0].month).toBe('2024-05')
    expect(idx.summaries.monthly[2].month).toBe('2024-07')
  })

  it('provides category totals sorted by expense descending', () => {
    const txs = [
      tx('1', 'expense', 500, '2024-06-01', 'fuel'),
      tx('2', 'expense', 1000, '2024-06-01', 'food'),
    ]
    const idx = buildIndexes(txs)
    expect(idx.summaries.categoryTotals[0].category).toBe('food')
    expect(idx.summaries.categoryTotals[0].totalExpense).toBe(1000)
  })
})

describe('getMonthlySummaryFromIndex', () => {
  it('returns correct monthly totals', () => {
    const txs = [tx('1', 'income', 5000, '2024-06-10'), tx('2', 'expense', 2000, '2024-06-15')]
    const idx = buildIndexes(txs)
    const summary = getMonthlySummaryFromIndex(idx, 2024, 5)
    expect(summary.income).toBe(5000)
    expect(summary.expense).toBe(2000)
    expect(summary.balance).toBe(3000)
  })

  it('returns zeros for empty month', () => {
    const idx = buildIndexes([])
    const summary = getMonthlySummaryFromIndex(idx, 2024, 5)
    expect(summary.income).toBe(0)
    expect(summary.expense).toBe(0)
    expect(summary.balance).toBe(0)
  })
})

describe('getCategoryBreakdownFromIndex', () => {
  it('returns categories sorted by amount', () => {
    const txs = [
      tx('1', 'expense', 500, '2024-06-01', 'fuel'),
      tx('2', 'expense', 1000, '2024-06-01', 'food'),
      tx('3', 'expense', 300, '2024-06-01', 'bills'),
    ]
    const idx = buildIndexes(txs)
    const breakdown = getCategoryBreakdownFromIndex(idx, 'expense', 2024, 5)
    expect(breakdown).toHaveLength(3)
    expect(breakdown[0].category).toBe('food')
    expect(breakdown[0].amount).toBe(1000)
  })
})

describe('getDailyExpenseFromIndex', () => {
  it('returns array of all days in month', () => {
    const idx = buildIndexes([])
    const days = getDailyExpenseFromIndex(idx, 2024, 1)
    expect(days).toHaveLength(29)
  })

  it('fills in expense amounts for each day', () => {
    const txs = [tx('1', 'expense', 500, '2024-02-15')]
    const idx = buildIndexes(txs)
    const days = getDailyExpenseFromIndex(idx, 2024, 1)
    expect(days[14].day).toBe(15)
    expect(days[14].amount).toBe(500)
  })
})

describe('getPeopleFromIndex', () => {
  it('returns unique person names', () => {
    const txs = [
      tx('1', 'expense', 100, '2024-06-01', 'food', 'Alice'),
      tx('2', 'expense', 200, '2024-06-01', 'food', 'Bob'),
      tx('3', 'expense', 300, '2024-06-02', 'food', 'Alice'),
    ]
    const idx = buildIndexes(txs)
    const people = getPeopleFromIndex(idx)
    expect(people).toHaveLength(2)
    expect(people).toContain('alice')
    expect(people).toContain('bob')
  })
})
