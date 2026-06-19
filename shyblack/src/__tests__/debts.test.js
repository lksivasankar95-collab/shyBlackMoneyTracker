import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEBT_TYPES, DEBT_STATUS, LEDGER_STATUS,
  createDebt, applyRepayment,
  getDebts, saveDebts, createLedger, addPayment,
  undoLastPayment, editPayment, deletePayment,
  settleLedger, getLedgerSummary, getLedgerStatement,
  getLedgerInsights, searchLedgers, filterLedgers,
  sortLedgers, SORT_OPTIONS, generateLedgerExportData,
  isLedger,
} from '../utils/debts'

vi.mock('../utils/safeStorage', () => {
  let store = {}
  return {
    safeStorage: {
      get(key, fallback) {
        const val = store[key]
        return val !== undefined ? JSON.parse(val) : fallback
      },
      set(key, value) {
        store[key] = JSON.stringify(value)
        return true
      },
      remove(key) {
        delete store[key]
        return true
      },
      clear() {
        store = {}
        return true
      },
    },
    STORAGE_KEYS: {
      DEBTS: 'shyblack_debts',
    },
  }
})

vi.mock('../utils/helpers', () => ({
  generateId: () => 'test-id-' + Date.now() + '-' + Math.random().toString(36).slice(2),
}))

function seedLedger(overrides = {}) {
  return createLedger({
    personName: 'Test Person',
    amount: 10000,
    type: 'lent',
    notes: '',
    ...overrides,
  })
}

describe('createDebt (backward compat)', () => {
  it('creates a debt with required fields matching old format', () => {
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

describe('applyRepayment (backward compat)', () => {
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

describe('createLedger', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('creates a ledger with correct fields', () => {
    const ledger = createLedger({ personName: 'Ravi', amount: 20000, type: 'lent' })
    expect(ledger.personName).toBe('Ravi')
    expect(ledger.originalAmount).toBe(20000)
    expect(ledger.currentBalance).toBe(20000)
    expect(ledger.type).toBe('lent')
    expect(ledger.status).toBe('active')
    expect(ledger.payments).toEqual([])
    expect(ledger.settlementDate).toBeNull()
    expect(ledger.createdDate).toBeDefined()
  })

  it('creates borrowed ledger', () => {
    const ledger = createLedger({ personName: 'Priya', amount: 15000, type: 'borrowed' })
    expect(ledger.type).toBe('borrowed')
    expect(ledger.currentBalance).toBe(15000)
  })

  it('persists to storage', () => {
    createLedger({ personName: 'X', amount: 5000, type: 'lent' })
    expect(getDebts()).toHaveLength(1)
  })
})

describe('addPayment', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('records a payment and reduces balance', () => {
    const ledger = seedLedger()
    const result = addPayment(ledger.id, 3000)
    expect(result.success).toBe(true)
    expect(result.ledger.currentBalance).toBe(7000)
    expect(result.ledger.payments).toHaveLength(1)
    expect(result.payment.amount).toBe(3000)
    expect(result.payment.id).toBeDefined()
  })

  it('settles ledger when balance reaches zero', () => {
    const ledger = seedLedger({ amount: 5000 })
    addPayment(ledger.id, 5000)
    const updated = getDebts().find((l) => l.id === ledger.id)
    expect(updated.currentBalance).toBe(0)
    expect(updated.status).toBe('settled')
    expect(updated.settlementDate).toBeDefined()
  })

  it('rejects payment exceeding balance', () => {
    const ledger = seedLedger({ amount: 1000 })
    const result = addPayment(ledger.id, 2000)
    expect(result.success).toBe(false)
    expect(result.error).toContain('exceeds')
  })

  it('rejects zero/negative payment', () => {
    const ledger = seedLedger()
    expect(addPayment(ledger.id, 0).success).toBe(false)
    expect(addPayment(ledger.id, -100).success).toBe(false)
  })

  it('returns error for non-existent ledger', () => {
    const result = addPayment('nonexistent', 500)
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('undoLastPayment', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('undoes the last payment', () => {
    const ledger = seedLedger()
    addPayment(ledger.id, 3000)
    const result = undoLastPayment(ledger.id)
    expect(result.success).toBe(true)
    expect(result.ledger.currentBalance).toBe(10000)
    expect(result.ledger.payments).toHaveLength(0)
  })

  it('reactivates a settled ledger', () => {
    const ledger = seedLedger({ amount: 5000 })
    addPayment(ledger.id, 5000)
    const result = undoLastPayment(ledger.id)
    expect(result.success).toBe(true)
    expect(result.ledger.status).toBe('active')
    expect(result.ledger.settlementDate).toBeNull()
  })

  it('returns error when no payments exist', () => {
    const ledger = seedLedger()
    const result = undoLastPayment(ledger.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No payments')
  })

  it('returns error for non-existent ledger', () => {
    const result = undoLastPayment('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('editPayment', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('updates payment amount', () => {
    const ledger = seedLedger()
    addPayment(ledger.id, 2000)
    const paymentId = getDebts().find((l) => l.id === ledger.id).payments[0].id
    const result = editPayment(ledger.id, paymentId, { amount: 3000 })
    expect(result.success).toBe(true)
    expect(result.ledger.currentBalance).toBe(7000)
    expect(result.ledger.payments[0].amount).toBe(3000)
  })

  it('settles ledger after editing to full amount', () => {
    const ledger = seedLedger({ amount: 5000 })
    addPayment(ledger.id, 3000)
    const paymentId = getDebts().find((l) => l.id === ledger.id).payments[0].id
    const result = editPayment(ledger.id, paymentId, { amount: 5000 })
    expect(result.ledger.status).toBe('settled')
    expect(result.ledger.currentBalance).toBe(0)
  })

  it('returns error for non-existent ledger', () => {
    const result = editPayment('nonexistent', 'pid', { amount: 1000 })
    expect(result.success).toBe(false)
  })
})

describe('deletePayment', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('deletes a payment and restores balance', () => {
    const ledger = seedLedger()
    addPayment(ledger.id, 3000)
    const paymentId = getDebts().find((l) => l.id === ledger.id).payments[0].id
    const result = deletePayment(ledger.id, paymentId)
    expect(result.success).toBe(true)
    expect(result.ledger.currentBalance).toBe(10000)
    expect(result.ledger.payments).toHaveLength(0)
  })

  it('returns error for non-existent payment', () => {
    const ledger = seedLedger()
    const result = deletePayment(ledger.id, 'nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('settleLedger', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('settles a ledger with zero balance', () => {
    const ledger = seedLedger({ amount: 5000 })
    addPayment(ledger.id, 5000)
    const settled = getDebts().find((l) => l.id === ledger.id)
    expect(settled.status).toBe('settled')
  })

  it('rejects settling a ledger with non-zero balance', () => {
    const ledger = seedLedger()
    const result = settleLedger(ledger.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('balance is not zero')
  })

  it('rejects settling already settled ledger', () => {
    const ledger = seedLedger({ amount: 5000 })
    addPayment(ledger.id, 5000)
    const result = settleLedger(ledger.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Already settled')
  })

  it('returns error for non-existent ledger', () => {
    const result = settleLedger('nonexistent')
    expect(result.success).toBe(false)
  })
})

describe('getLedgerSummary', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('returns zeros for empty ledgers', () => {
    const summary = getLedgerSummary([])
    expect(summary.totalLent).toBe(0)
    expect(summary.totalBorrowed).toBe(0)
    expect(summary.totalReceivable).toBe(0)
    expect(summary.totalPayable).toBe(0)
    expect(summary.totalActive).toBe(0)
    expect(summary.totalSettled).toBe(0)
  })

  it('calculates totals correctly', () => {
    createLedger({ personName: 'A', amount: 10000, type: 'lent' })
    createLedger({ personName: 'B', amount: 20000, type: 'lent' })
    createLedger({ personName: 'C', amount: 15000, type: 'borrowed' })
    const ledgers = getDebts()
    const summary = getLedgerSummary(ledgers)
    expect(summary.totalLent).toBe(30000)
    expect(summary.totalBorrowed).toBe(15000)
    expect(summary.totalReceivable).toBe(30000)
    expect(summary.totalPayable).toBe(15000)
    expect(summary.totalActive).toBe(3)
    expect(summary.totalSettled).toBe(0)
  })
})

describe('getLedgerStatement', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('returns statement with computed fields', () => {
    createLedger({ personName: 'Ravi', amount: 20000, type: 'lent' })
    const ledger = getDebts()[0]
    addPayment(ledger.id, 8000)
    const updated = getDebts()[0]
    const stmt = getLedgerStatement(updated)
    expect(stmt.personName).toBe('Ravi')
    expect(stmt.originalAmount).toBe(20000)
    expect(stmt.totalPaid).toBe(8000)
    expect(stmt.currentBalance).toBe(12000)
    expect(stmt.progress).toBe(40)
    expect(stmt.paymentCount).toBe(1)
    expect(stmt.status).toBe('active')
  })

  it('returns null for null input', () => {
    expect(getLedgerStatement(null)).toBeNull()
  })
})

describe('getLedgerInsights', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('provides insights about owed amounts', () => {
    createLedger({ personName: 'Bank', amount: 50000, type: 'borrowed' })
    const insights = getLedgerInsights(getDebts())
    expect(insights.some((i) => i.includes('owe'))).toBe(true)
  })

  it('provides insights about receivable amounts', () => {
    createLedger({ personName: 'Ravi', amount: 10000, type: 'lent' })
    const insights = getLedgerInsights(getDebts())
    expect(insights.some((i) => i.includes('owed'))).toBe(true)
  })

  it('provides repayment progress insights', () => {
    const ledger = createLedger({ personName: 'Ravi', amount: 10000, type: 'lent' })
    addPayment(ledger.id, 5000)
    const insights = getLedgerInsights(getDebts())
    expect(insights.some((i) => i.includes('repaid'))).toBe(true)
  })
})

describe('searchLedgers', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('filters by person name', () => {
    createLedger({ personName: 'Ravi', amount: 10000, type: 'lent' })
    createLedger({ personName: 'Priya', amount: 5000, type: 'lent' })
    const result = searchLedgers(getDebts(), 'ravi')
    expect(result).toHaveLength(1)
    expect(result[0].personName).toBe('Ravi')
  })

  it('returns all for empty query', () => {
    createLedger({ personName: 'Ravi', amount: 10000, type: 'lent' })
    const result = searchLedgers(getDebts(), '')
    expect(result).toHaveLength(1)
  })

  it('is case-insensitive', () => {
    createLedger({ personName: 'Ravi Kumar', amount: 10000, type: 'lent' })
    expect(searchLedgers(getDebts(), 'RAVI')).toHaveLength(1)
    expect(searchLedgers(getDebts(), 'kumar')).toHaveLength(1)
  })
})

describe('filterLedgers', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('filters by type', () => {
    createLedger({ personName: 'A', amount: 10000, type: 'lent' })
    createLedger({ personName: 'B', amount: 5000, type: 'borrowed' })
    expect(filterLedgers(getDebts(), { type: 'lent' })).toHaveLength(1)
    expect(filterLedgers(getDebts(), { type: 'borrowed' })).toHaveLength(1)
    expect(filterLedgers(getDebts(), { type: 'all' })).toHaveLength(2)
  })

  it('filters by status', () => {
    const l = createLedger({ personName: 'A', amount: 5000, type: 'lent' })
    addPayment(l.id, 5000)
    createLedger({ personName: 'B', amount: 3000, type: 'lent' })
    expect(filterLedgers(getDebts(), { status: 'active' })).toHaveLength(1)
    expect(filterLedgers(getDebts(), { status: 'settled' })).toHaveLength(1)
    expect(filterLedgers(getDebts(), { status: 'all' })).toHaveLength(2)
  })
})

describe('sortLedgers', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('sorts by name ascending', () => {
    createLedger({ personName: 'Z', amount: 10000, type: 'lent' })
    createLedger({ personName: 'A', amount: 5000, type: 'lent' })
    const sorted = sortLedgers(getDebts(), SORT_OPTIONS.NAME_ASC)
    expect(sorted[0].personName).toBe('A')
    expect(sorted[1].personName).toBe('Z')
  })

  it('sorts by amount descending', () => {
    createLedger({ personName: 'A', amount: 5000, type: 'lent' })
    createLedger({ personName: 'B', amount: 10000, type: 'lent' })
    const sorted = sortLedgers(getDebts(), SORT_OPTIONS.AMOUNT_DESC)
    expect(sorted[0].originalAmount).toBe(10000)
    expect(sorted[1].originalAmount).toBe(5000)
  })

  it('sorts by date descending by default', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
    createLedger({ personName: 'A', amount: 5000, type: 'lent' })
    vi.setSystemTime(new Date('2024-06-02'))
    createLedger({ personName: 'B', amount: 10000, type: 'lent' })
    vi.useRealTimers()
    const sorted = sortLedgers(getDebts(), SORT_OPTIONS.DATE_DESC)
    expect(sorted[0].personName).toBe('B')
    expect(sorted[1].personName).toBe('A')
  })
})

describe('generateLedgerExportData', () => {
  beforeEach(() => {
    saveDebts([])
  })

  it('generates export data for a ledger', () => {
    const ledger = createLedger({ personName: 'Ravi', amount: 20000, type: 'lent' })
    addPayment(ledger.id, 5000)
    const updated = getDebts()[0]
    const data = generateLedgerExportData(updated)
    expect(data.personName).toBe('Ravi')
    expect(data.originalAmount).toBe(20000)
    expect(data.totalPaid).toBe(5000)
    expect(data.currentBalance).toBe(15000)
    expect(data.progress).toBe(25)
    expect(data.payments).toHaveLength(1)
  })

  it('returns null for null input', () => {
    expect(generateLedgerExportData(null)).toBeNull()
  })
})

describe('isLedger', () => {
  it('detects V2 ledger by originalAmount field', () => {
    expect(isLedger({ originalAmount: 5000 })).toBe(true)
    expect(isLedger({ amount: 5000 })).toBe(false)
    expect(isLedger(null)).toBe(false)
    expect(isLedger(undefined)).toBe(false)
  })
})

describe('LEDGER_STATUS', () => {
  it('has active and settled', () => {
    expect(LEDGER_STATUS.ACTIVE).toBe('active')
    expect(LEDGER_STATUS.SETTLED).toBe('settled')
  })
})
