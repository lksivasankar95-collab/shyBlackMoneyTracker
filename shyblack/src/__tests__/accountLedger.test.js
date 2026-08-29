import { describe, expect, it } from 'vitest'
import { calculateNetWorth, getAccountBalance, getAccountBalances } from '../utils/networth'

describe('account-linked transaction ledger', () => {
  const account = { id: 'bank-1', name: 'Main Bank', type: 'bank', balance: 10000 }

  it('adds linked income and subtracts linked expenses from the stored balance', () => {
    const transactions = [
      { id: 'income-1', accountId: 'bank-1', type: 'income', amount: 2500 },
      { id: 'expense-1', accountId: 'bank-1', type: 'expense', amount: 1200 },
      { id: 'other-1', accountId: 'cash-1', type: 'expense', amount: 800 },
    ]

    expect(getAccountBalance(account, transactions)).toBe(11300)
  })

  it('returns calculated balances for every account', () => {
    const balances = getAccountBalances(
      [account, { id: 'cash-1', type: 'cash', balance: 500 }],
      [{ accountId: 'cash-1', type: 'expense', amount: 50 }],
    )

    expect(balances.map((item) => item.calculatedBalance)).toEqual([10000, 450])
  })

  it('uses linked movements in net worth and treats wallets as cash', () => {
    const result = calculateNetWorth(
      [{ accountId: 'wallet-1', type: 'income', amount: 1000 }],
      [],
      [{ id: 'wallet-1', type: 'wallet', balance: 200 }],
    )

    expect(result.cashAndBank).toBe(1200)
    expect(result.netWorth).toBe(1200)
  })
})
