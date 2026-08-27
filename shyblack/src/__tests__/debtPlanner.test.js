import { describe, it, expect } from 'vitest'
import { getDebtPayoffPlan } from '../utils/debtPlanner'

const emi = (id, remaining, rate, monthsLeft, monthly, nextDueDate, status = 'active') => ({
  id,
  loanName: `Loan ${id}`,
  remainingAmount: remaining,
  principalAmount: remaining * 2,
  interestRate: rate,
  remainingMonths: monthsLeft,
  emiAmount: monthly,
  nextDueDate,
  status,
})

describe('getDebtPayoffPlan', () => {
  const plan = getDebtPayoffPlan({
    debts: [
      { id: 'd1', type: 'borrowed', personName: 'Ravi', remainingAmount: 5000, currentBalance: 5000, status: 'active' },
      { id: 'd2', type: 'lent', personName: 'Priya', remainingAmount: 9000, status: 'active' },
    ],
    emis: [
      emi('e1', 100000, 12, 20, 11000, '2026-03-01'),
      emi('e2', 50000, 8, 12, 4350, '2026-03-01'),
      emi('e3', 70000, 15, 6, 12500, '2026-03-01', 'closed'),
    ],
  })

  it('projects payoff for open EMIs only', () => {
    expect(plan.structured).toHaveLength(2)
    expect(plan.totalStructuredRemaining).toBe(150000)
    expect(plan.structured[0]).toMatchObject({ id: 'e1', monthsLeft: 20 })
  })

  it('excludes lent debts from the payoff pool', () => {
    expect(plan.borrowed).toHaveLength(1)
    expect(plan.borrowed[0]).toMatchObject({ id: 'd1', name: 'Ravi' })
    expect(plan.totalBorrowedOutstanding).toBe(5000)
  })

  it('orders by avalanche (highest rate) and snowball (smallest balance)', () => {
    expect(plan.avalanche[0].id).toBe('e1')
    expect(plan.avalanche.map((i) => i.id)).toEqual(['e1', 'e2'])
    expect(plan.snowball.map((i) => i.id)).toEqual(['e2', 'e1'])
  })

  it('computes remaining interest on each loan', () => {
    const e1 = plan.structured.find((i) => i.id === 'e1')
    expect(e1.totalPayments).toBe(220000)
    expect(e1.interestRemaining).toBe(120000)
  })

  it('returns zeros for empty input', () => {
    const empty = getDebtPayoffPlan({})
    expect(empty.totalStructuredRemaining).toBe(0)
    expect(empty.totalBorrowedOutstanding).toBe(0)
    expect(empty.maxMonthsToPayoff).toBe(0)
  })
})