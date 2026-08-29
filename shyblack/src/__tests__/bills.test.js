import { describe, expect, it, vi } from 'vitest'

const storageState = vi.hoisted(() => ({ bills: [] }))

vi.mock('../utils/safeStorage', () => ({
  STORAGE_KEYS: { BILLS: 'shyblack_bills' },
  safeStorage: {
    get: () => storageState.bills,
    set: (_, bills) => {
      storageState.bills = bills
      return true
    },
  },
}))

const { markBillPaid } = await import('../utils/bills.js')

describe('bill payment records', () => {
  it('stores the due cycle, actual payment details, and transaction link', () => {
    storageState.bills = [{ id: 'bill-1', paidDates: [], payments: [] }]

    const bill = markBillPaid('bill-1', '2026-08-31', {
      paymentDate: '2026-08-29',
      amount: 1450,
      accountId: 'bank-1',
      transactionId: 'tx-1',
    })

    expect(bill.paidDates).toEqual(['2026-08-31'])
    expect(bill.payments).toHaveLength(1)
    expect(bill.payments[0]).toMatchObject({
      dueDate: '2026-08-31',
      date: '2026-08-29',
      amount: 1450,
      accountId: 'bank-1',
      transactionId: 'tx-1',
    })
  })

  it('does not duplicate a payment for the same due cycle', () => {
    storageState.bills = [{ id: 'bill-1', paidDates: [], payments: [] }]

    markBillPaid('bill-1', '2026-08-31', { amount: 100 })
    const bill = markBillPaid('bill-1', '2026-08-31', { amount: 125 })

    expect(bill.paidDates).toEqual(['2026-08-31'])
    expect(bill.payments).toHaveLength(1)
    expect(bill.payments[0].amount).toBe(100)
  })
})
