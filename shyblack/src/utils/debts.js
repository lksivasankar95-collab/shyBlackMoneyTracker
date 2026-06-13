import { storage, keys } from './storage'
import { generateId } from './helpers'

const DEBT_TYPES = {
  LENT: 'lent',
  BORROWED: 'borrowed',
}

const DEBT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
}

export { DEBT_TYPES, DEBT_STATUS }

export function getDebts() {
  return storage.get(keys.DEBTS, [])
}

export function saveDebts(debts) {
  return storage.set(keys.DEBTS, debts)
}

export function createDebt({ personName, amount, type, dueDate, notes }) {
  return {
    id: generateId(),
    personName: personName.trim(),
    amount: Math.abs(amount),
    remainingAmount: Math.abs(amount),
    type,
    status: DEBT_STATUS.PENDING,
    dueDate,
    notes: (notes || '').trim(),
    createdAt: Date.now(),
  }
}

export function applyRepayment(debt, repaymentAmount) {
  const newRemaining = Math.max(0, debt.remainingAmount - Math.abs(repaymentAmount))
  return {
    ...debt,
    remainingAmount: newRemaining,
    status: newRemaining === 0 ? DEBT_STATUS.PAID : debt.status,
  }
}
