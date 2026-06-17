import { describe, it, expect } from 'vitest'
import { createDebt, applyRepayment, DEBT_TYPES, DEBT_STATUS } from '../utils/debts.js'

describe('createDebt', () => {
  it('creates a debt with required fields', () => {
    const debt = createDebt({ personName: 'Alice', amount: 5000, type: DEBT_TYPES.LENT })
    expect(debt.personName).toBe('Alice')
    expect(debt.amount).toBe(5000)
    expect(debt.remainingAmount).toBe(5000)
    expect(debt.type).toBe('lent')
    expect(debt.status).toBe('pending')
    expect(debt.id).toBeDefined()
    expect(debt.createdAt).toBeDefined()
  })

  it('creates a borrowed debt', () => {
    const debt = createDebt({ personName: 'Bob', amount: 3000, type: DEBT_TYPES.BORROWED })
    expect(debt.type).toBe('borrowed')
    expect(debt.remainingAmount).toBe(3000)
  })

  it('normalizes amount to absolute value', () => {
    const debt = createDebt({ personName: 'Charlie', amount: -2000, type: DEBT_TYPES.LENT })
    expect(debt.amount).toBe(2000)
  })

  it('trims person name', () => {
    const debt = createDebt({ personName: '  David  ', amount: 1000, type: DEBT_TYPES.LENT })
    expect(debt.personName).toBe('David')
  })

  it('sets optional dueDate and notes', () => {
    const debt = createDebt({
      personName: 'Eve', amount: 5000, type: DEBT_TYPES.BORROWED,
      dueDate: '2024-12-31', notes: 'repay by year end',
    })
    expect(debt.dueDate).toBe('2024-12-31')
    expect(debt.notes).toBe('repay by year end')
  })
})

describe('applyRepayment', () => {
  it('reduces remaining amount', () => {
    const debt = createDebt({ personName: 'Alice', amount: 5000, type: DEBT_TYPES.LENT })
    const updated = applyRepayment(debt, 2000)
    expect(updated.remainingAmount).toBe(3000)
    expect(updated.status).toBe('pending')
  })

  it('marks as paid when fully repaid', () => {
    const debt = createDebt({ personName: 'Alice', amount: 5000, type: DEBT_TYPES.LENT })
    const updated = applyRepayment(debt, 5000)
    expect(updated.remainingAmount).toBe(0)
    expect(updated.status).toBe('paid')
  })

  it('handles over-repayment', () => {
    const debt = createDebt({ personName: 'Alice', amount: 5000, type: DEBT_TYPES.LENT })
    const updated = applyRepayment(debt, 6000)
    expect(updated.remainingAmount).toBe(0)
    expect(updated.status).toBe('paid')
  })

  it('handles zero repayment', () => {
    const debt = createDebt({ personName: 'Bob', amount: 3000, type: DEBT_TYPES.BORROWED })
    const updated = applyRepayment(debt, 0)
    expect(updated.remainingAmount).toBe(3000)
    expect(updated.status).toBe('pending')
  })

  it('handles partial multiple repayments', () => {
    const debt = createDebt({ personName: 'Charlie', amount: 10000, type: DEBT_TYPES.LENT })
    const first = applyRepayment(debt, 3000)
    expect(first.remainingAmount).toBe(7000)
    const second = applyRepayment(first, 4000)
    expect(second.remainingAmount).toBe(3000)
    const third = applyRepayment(second, 3000)
    expect(third.remainingAmount).toBe(0)
    expect(third.status).toBe('paid')
  })
})
