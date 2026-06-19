import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  EMI_STATUS, FREQUENCIES, FREQUENCY_OPTIONS,
  getFrequencyLabel, calculateNextDueDate,
  getEmis, saveEmis, createEmi, recordEmiPayment,
  undoPayment, getEmiSummary, getEnhancedEmiSummary,
  getEmiDueDate, getEmiAmortizationSchedule,
} from '../utils/emi'

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
      EMIS: 'shyblack_emis',
    },
  }
})

vi.mock('../utils/helpers', () => ({
  generateId: () => 'test-id-' + Date.now() + '-' + Math.random().toString(36).slice(2),
}))

describe('FREQUENCIES', () => {
  it('defines all 6 frequencies', () => {
    expect(FREQUENCIES.DAILY).toBe('daily')
    expect(FREQUENCIES.WEEKLY).toBe('weekly')
    expect(FREQUENCIES.MONTHLY).toBe('monthly')
    expect(FREQUENCIES.QUARTERLY).toBe('quarterly')
    expect(FREQUENCIES.HALF_YEARLY).toBe('half-yearly')
    expect(FREQUENCIES.YEARLY).toBe('yearly')
  })
})

describe('FREQUENCY_OPTIONS', () => {
  it('has 6 options with value and label', () => {
    expect(FREQUENCY_OPTIONS).toHaveLength(6)
    FREQUENCY_OPTIONS.forEach((opt) => {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
    })
  })
})

describe('getFrequencyLabel', () => {
  it('returns correct labels for all frequencies', () => {
    expect(getFrequencyLabel('daily')).toBe('Daily')
    expect(getFrequencyLabel('weekly')).toBe('Weekly')
    expect(getFrequencyLabel('monthly')).toBe('Monthly')
    expect(getFrequencyLabel('quarterly')).toBe('Quarterly')
    expect(getFrequencyLabel('half-yearly')).toBe('Half-Yearly')
    expect(getFrequencyLabel('yearly')).toBe('Yearly')
  })

  it('returns Monthly for unknown frequency', () => {
    expect(getFrequencyLabel('unknown')).toBe('Monthly')
    expect(getFrequencyLabel(undefined)).toBe('Monthly')
  })
})

describe('calculateNextDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates daily due date', () => {
    const result = calculateNextDueDate('2024-01-01', 5, 'daily')
    expect(result).toBe('2024-01-06')
  })

  it('calculates weekly due date', () => {
    const result = calculateNextDueDate('2024-01-01', 2, 'weekly')
    expect(result).toBe('2024-01-15')
  })

  it('calculates monthly due date', () => {
    const result = calculateNextDueDate('2024-01-01', 2, 'monthly')
    expect(result).toBe('2024-03-01')
  })

  it('calculates quarterly due date', () => {
    const result = calculateNextDueDate('2024-01-01', 1, 'quarterly')
    expect(result).toBe('2024-04-01')
  })

  it('calculates half-yearly due date', () => {
    const result = calculateNextDueDate('2024-01-01', 1, 'half-yearly')
    expect(result).toBe('2024-07-01')
  })

  it('calculates yearly due date', () => {
    const result = calculateNextDueDate('2024-01-01', 1, 'yearly')
    expect(result).toBe('2025-01-01')
  })

  it('returns 0th installment as start date', () => {
    const result = calculateNextDueDate('2024-06-15', 0, 'monthly')
    expect(result).toBe('2024-06-15')
  })

  it('handles month-end edge case for monthly', () => {
    const result = calculateNextDueDate('2024-01-31', 1, 'monthly')
    expect(result).toBe('2024-02-29')
  })

  it('handles month-end edge case for quarterly', () => {
    const result = calculateNextDueDate('2024-01-31', 1, 'quarterly')
    expect(result).toBe('2024-04-30')
  })

  it('defaults to monthly for unknown frequency', () => {
    const result = calculateNextDueDate('2024-01-01', 2, 'unknown')
    expect(result).toBe('2024-03-01')
  })

  it('returns null for null startDate', () => {
    const result = calculateNextDueDate(null, 0, 'monthly')
    expect(result).toBeNull()
  })
})

describe('createEmi', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
    saveEmis([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a monthly EMI by default', () => {
    const emi = createEmi({
      name: 'Car Loan',
      amount: 10000,
      totalMonths: 12,
      totalAmount: 120000,
      startDate: '2024-01-01',
    })
    expect(emi.name).toBe('Car Loan')
    expect(emi.amount).toBe(10000)
    expect(emi.totalMonths).toBe(12)
    expect(emi.totalAmount).toBe(120000)
    expect(emi.frequency).toBe('monthly')
    expect(emi.status).toBe('active')
    expect(emi.id).toBeDefined()
    expect(emi.totalPaidCount).toBe(0)
    expect(emi.totalPaid).toBe(0)
    expect(emi.remainingAmount).toBe(120000)
  })

  it('creates EMI with custom frequency', () => {
    const emi = createEmi({
      name: 'Weekly Savings',
      amount: 2000,
      totalMonths: 52,
      totalAmount: 104000,
      frequency: 'weekly',
    })
    expect(emi.frequency).toBe('weekly')
    expect(emi.name).toBe('Weekly Savings')
  })

  it('creates EMI with all frequencies', () => {
    const frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly']
    frequencies.forEach((freq) => {
      const emi = createEmi({
        name: `Test ${freq}`,
        amount: 1000,
        totalMonths: 12,
        frequency: freq,
      })
      expect(emi.frequency).toBe(freq)
      expect(emi.status).toBe('active')
    })
  })

  it('creates EMI with lender and notes', () => {
    const emi = createEmi({
      name: 'Personal Loan',
      amount: 5000,
      totalMonths: 24,
      lender: 'HDFC Bank',
      notes: 'Home renovation',
    })
    expect(emi.lender).toBe('HDFC Bank')
    expect(emi.notes).toBe('Home renovation')
  })

  it('persists to storage', () => {
    createEmi({ name: 'Test', amount: 1000, totalMonths: 12 })
    const emis = getEmis()
    expect(emis).toHaveLength(1)
    expect(emis[0].name).toBe('Test')
  })
})

describe('recordEmiPayment', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
    saveEmis([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records a payment for monthly EMI', () => {
    const emi = createEmi({
      name: 'Car Loan',
      amount: 10000,
      totalMonths: 12,
      totalAmount: 120000,
      startDate: '2024-01-01',
    })
    const result = recordEmiPayment(emi.id)
    expect(result.success).toBe(true)
    expect(result.emi.totalPaidCount).toBe(1)
    expect(result.emi.totalPaid).toBe(10000)
    expect(result.emi.remainingAmount).toBe(110000)
    expect(result.emi.remainingMonths).toBe(11)
  })

  it('marks EMI as completed when fully paid', () => {
    const emi = createEmi({
      name: 'Small Loan',
      amount: 5000,
      totalMonths: 2,
      totalAmount: 10000,
    })
    recordEmiPayment(emi.id)
    const result = recordEmiPayment(emi.id)
    expect(result.success).toBe(true)
    expect(result.emi.status).toBe('completed')
    expect(result.emi.remainingAmount).toBe(0)
    expect(result.emi.remainingMonths).toBe(0)
  })

  it('returns error for completed EMI', () => {
    const emi = createEmi({ name: 'Test', amount: 5000, totalMonths: 1, totalAmount: 5000 })
    recordEmiPayment(emi.id)
    const result = recordEmiPayment(emi.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('completed')
  })

  it('returns error for non-existent EMI', () => {
    const result = recordEmiPayment('nonexistent-id')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('records payment with extra amount', () => {
    const emi = createEmi({ name: 'Test', amount: 5000, totalMonths: 12, totalAmount: 60000 })
    const result = recordEmiPayment(emi.id, 2000)
    expect(result.success).toBe(true)
    expect(result.payment.amount).toBe(7000)
    expect(result.payment.extraAmount).toBe(2000)
    expect(result.emi.totalPaid).toBe(7000)
  })
})

describe('undoPayment', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
    saveEmis([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('undoes the last payment via payments array', () => {
    const emi = createEmi({ name: 'Test', amount: 5000, totalMonths: 12, totalAmount: 60000 })
    recordEmiPayment(emi.id)
    const result = undoPayment(emi.id)
    expect(result.success).toBe(true)
    expect(result.emi.totalPaidCount).toBe(0)
    expect(result.emi.totalPaid).toBe(0)
    expect(result.emi.remainingAmount).toBe(60000)
    expect(result.emi.remainingMonths).toBe(12)
    expect(result.emi.status).toBe('active')
  })

  it('returns error when no payments to undo', () => {
    const emi = createEmi({ name: 'Test', amount: 5000, totalMonths: 12 })
    const result = undoPayment(emi.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No payments')
  })

  it('returns error for non-existent EMI', () => {
    const result = undoPayment('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('allows re-recording payment after undo', () => {
    const emi = createEmi({ name: 'Test', amount: 5000, totalMonths: 12, totalAmount: 60000 })
    recordEmiPayment(emi.id)
    undoPayment(emi.id)
    const result = recordEmiPayment(emi.id)
    expect(result.success).toBe(true)
    expect(result.emi.totalPaidCount).toBe(1)
  })
})

describe('getEmiSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
    saveEmis([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns zeros for empty EMIs', () => {
    const summary = getEmiSummary([])
    expect(summary.totalActive).toBe(0)
    expect(summary.totalCompleted).toBe(0)
    expect(summary.totalMonthly).toBe(0)
    expect(summary.totalRemaining).toBe(0)
    expect(summary.totalPaid).toBe(0)
  })

  it('summarizes active EMIs', () => {
    createEmi({ name: 'A', amount: 5000, totalMonths: 12, totalAmount: 60000, startDate: '2024-01-01' })
    createEmi({ name: 'B', amount: 3000, totalMonths: 24, totalAmount: 72000, startDate: '2024-01-01' })
    const emis = getEmis()
    const summary = getEmiSummary(emis)
    expect(summary.totalActive).toBe(2)
    expect(summary.totalMonthly).toBe(8000)
    expect(summary.totalRemaining).toBe(132000)
  })
})

describe('getEnhancedEmiSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    saveEmis([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns due tracking info', () => {
    const emi = createEmi({
      name: 'Test EMI',
      amount: 5000,
      totalMonths: 12,
      totalAmount: 60000,
      startDate: '2024-01-01',
    })
    recordEmiPayment(emi.id)
    const emis = getEmis()
    const summary = getEnhancedEmiSummary(emis)
    expect(summary.totalActive).toBe(1)
    expect(summary.activeWithDue).toHaveLength(1)
    expect(summary.activeWithDue[0].nextDueDate).toBeDefined()
    expect(summary.activeWithDue[0].completionPercentage).toBeGreaterThan(0)
    expect(summary.activeWithDue[0].remainingBalance).toBeDefined()
    expect(summary.activeWithDue[0].remainingInstallments).toBeDefined()
  })

  it('detects overdue EMIs', () => {
    const emi = createEmi({
      name: 'Old EMI',
      amount: 5000,
      totalMonths: 6,
      totalAmount: 30000,
      startDate: '2024-01-01',
    })
    const emis = getEmis()
    const summary = getEnhancedEmiSummary(emis)
    expect(summary.overdue.length).toBeGreaterThan(0)
    expect(summary.activeWithDue[0].isOverdue).toBe(true)
  })

  it('returns empty arrays when no EMIs', () => {
    const summary = getEnhancedEmiSummary([])
    expect(summary.totalActive).toBe(0)
    expect(summary.dueToday).toEqual([])
    expect(summary.dueTomorrow).toEqual([])
    expect(summary.dueWithin7).toEqual([])
    expect(summary.overdue).toEqual([])
    expect(summary.upcoming).toEqual([])
  })

  it('correctly counts completed EMIs', () => {
    const emi = createEmi({ name: 'Test', amount: 5000, totalMonths: 1, totalAmount: 5000 })
    recordEmiPayment(emi.id)
    const emis = getEmis()
    const summary = getEnhancedEmiSummary(emis)
    expect(summary.totalCompleted).toBe(1)
    expect(summary.totalActive).toBe(0)
  })
})

describe('getEmiDueDate (backward compat)', () => {
  it('works with new frequency field', () => {
    const emi = {
      startDate: '2024-01-01',
      totalPaidCount: 2,
      frequency: 'monthly',
    }
    const due = getEmiDueDate(emi)
    expect(due).toBe('2024-03-01')
  })

  it('defaults to monthly for legacy EMIs', () => {
    const emi = {
      startDate: '2024-01-01',
      totalPaidCount: 2,
    }
    const due = getEmiDueDate(emi)
    expect(due).toBe('2024-03-01')
  })

  it('returns null for null EMI', () => {
    expect(getEmiDueDate(null)).toBeNull()
  })
})

describe('getEmiAmortizationSchedule', () => {
  it('generates schedule for EMI without interest', () => {
    const emi = {
      totalAmount: 120000,
      amount: 10000,
      totalMonths: 12,
      totalPaidCount: 0,
      remainingMonths: 12,
      interestRate: 0,
    }
    const schedule = getEmiAmortizationSchedule(emi)
    expect(schedule).toHaveLength(12)
    expect(schedule[0].payment).toBe(10000)
    expect(schedule[0].interest).toBe(0)
    expect(schedule[11].balance).toBe(0)
  })
})

describe('EMI_STATUS backward compat', () => {
  it('has all expected statuses', () => {
    expect(EMI_STATUS.ACTIVE).toBe('active')
    expect(EMI_STATUS.COMPLETED).toBe('completed')
    expect(EMI_STATUS.DEFAULTED).toBe('defaulted')
    expect(EMI_STATUS.CLOSED).toBe('closed')
    expect(EMI_STATUS.PAUSED).toBe('paused')
  })
})
