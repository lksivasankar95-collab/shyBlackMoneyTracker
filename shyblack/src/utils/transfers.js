import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export const TRANSFER_CATEGORIES = {
  CASH_TO_BANK: 'cash_to_bank',
  CASH_TO_TRADING: 'cash_to_trading',
  BANK_TO_CASH: 'bank_to_cash',
  BANK_TO_TRADING: 'bank_to_trading',
  TRADING_TO_CASH: 'trading_to_cash',
  TRADING_TO_BANK: 'trading_to_bank',
}

export const TRANSFER_LABELS = {
  cash_to_bank: 'Cash → Bank',
  cash_to_trading: 'Cash → Trading',
  bank_to_cash: 'Bank → Cash',
  bank_to_trading: 'Bank → Trading',
  trading_to_cash: 'Trading → Cash',
  trading_to_bank: 'Trading → Bank',
}

export function getTransfers() {
  return safeStorage.get(STORAGE_KEYS.TRANSFERS, [])
}

export function saveTransfers(transfers) {
  safeStorage.set(STORAGE_KEYS.TRANSFERS, transfers)
}

export function createTransfer({ fromAccountId, toAccountId, amount, note }) {
  const transfers = getTransfers()
  const transfer = {
    id: generateId(),
    fromAccountId,
    toAccountId,
    amount: Math.abs(amount),
    note: (note || '').trim(),
    date: new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
  }
  transfers.push(transfer)
  const maxTransfers = 1000
  if (transfers.length > maxTransfers) {
    transfers.splice(0, transfers.length - maxTransfers)
  }
  saveTransfers(transfers)
  return transfer
}

export function executeTransfer(fromAccountId, toAccountId, amount, accounts, availableAccounts = accounts) {
  if (fromAccountId === toAccountId) {
    return { success: false, error: 'Cannot transfer to the same account' }
  }
  if (amount <= 0) {
    return { success: false, error: 'Transfer amount must be positive' }
  }

  const fromIdx = accounts.findIndex((a) => a.id === fromAccountId)
  const toIdx = accounts.findIndex((a) => a.id === toAccountId)

  if (fromIdx === -1) return { success: false, error: 'Source account not found' }
  if (toIdx === -1) return { success: false, error: 'Destination account not found' }

  if (availableAccounts[fromIdx].balance < amount) {
    return { success: false, error: 'Insufficient balance in source account' }
  }

  const updatedAccounts = [...accounts]
  updatedAccounts[fromIdx] = {
    ...updatedAccounts[fromIdx],
    balance: updatedAccounts[fromIdx].balance - amount,
    updatedAt: Date.now(),
  }
  updatedAccounts[toIdx] = {
    ...updatedAccounts[toIdx],
    balance: updatedAccounts[toIdx].balance + amount,
    updatedAt: Date.now(),
  }

  const transfer = createTransfer({ fromAccountId, toAccountId, amount, note: '' })

  return { success: true, accounts: updatedAccounts, transfer }
}

export function getTransferHistory(accounts) {
  const transfers = getTransfers()
  return transfers
    .map((t) => {
      const fromAcc = accounts.find((a) => a.id === t.fromAccountId)
      const toAcc = accounts.find((a) => a.id === t.toAccountId)
      return {
        ...t,
        fromName: fromAcc?.name || 'Deleted Account',
        toName: toAcc?.name || 'Deleted Account',
      }
    })
    .reverse()
}
