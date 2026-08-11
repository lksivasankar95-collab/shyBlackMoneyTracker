import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

const mockStorage = {}

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    getRaw: (key) => mockStorage[key] !== undefined ? JSON.stringify(mockStorage[key]) : null,
    set: (key, value) => { mockStorage[key] = value; return true },
    remove: (key) => { delete mockStorage[key]; return true },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]) },
  },
  STORAGE_KEYS: {
    ONBOARDING: 'test_onboarding',
    CURRENCY_SETTINGS: 'test_currency_settings',
    AUTO_BACKUP: 'test_auto_backup',
    SPLITS: 'test_splits',
    TRANSACTIONS: 'test_transactions',
    BACKUPS: 'test_backups',
    SCHEMA: 'test_schema',
    SETTINGS: 'test_settings',
    SAVINGS: 'test_savings',
    BUDGETS: 'test_budgets',
    RECURRING: 'test_recurring',
    TAGS: 'test_tags',
    EMIS: 'test_emis',
    NET_WORTH_ACCOUNTS: 'test_accounts',
    TRANSFERS: 'test_transfers',
    GOALS: 'test_goals',
    TEMPLATES: 'test_templates',
    DOCUMENTS: 'test_documents',
    DOCUMENT_FILES: 'test_doc_files',
  },
}))

vi.mock('../utils/helpers', () => ({
  generateId: () => 'tid' + Math.floor(Math.random() * 1e9),
  formatCurrency: (v) => '₹' + (v || 0).toLocaleString('en-IN'),
  formatDate: (d) => String(d),
}))

describe('multiCurrency', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/multiCurrency')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('defaults to disabled with INR base', () => {
    expect(mod.getCurrencySettings().enabled).toBe(false)
    expect(mod.getBaseCurrencyCode()).toBe('INR')
  })

  it('converts amounts using configured rates', () => {
    const settings = { enabled: true, base: 'INR', rates: { INR: 1, USD: 83.5 } }
    expect(mod.convertAmount(10, 'USD', settings)).toBeCloseTo(835)
    expect(mod.convertAmount(10, 'INR', settings)).toBe(10)
    expect(mod.convertAmount(10, null, settings)).toBe(10)
  })

  it('applyCurrencyToTransaction passes through when disabled', () => {
    const tx = mod.applyCurrencyToTransaction({ type: 'expense' }, 100, 'USD')
    expect(tx.amount).toBe(100)
    expect(tx.currency).toBeUndefined()
  })

  it('applyCurrencyToTransaction converts when enabled', () => {
    mod.setMultiCurrencyEnabled(true)
    const applied = mod.applyCurrencyToTransaction({ type: 'expense' }, 100, 'USD')
    expect(applied.amount).toBeCloseTo(8350)
    expect(applied.originalAmount).toBe(100)
    expect(applied.currency).toBe('USD')
  })

  it('rejects invalid rates', () => {
    expect(mod.setCurrencyRate('USD', 0)).toBe(false)
    expect(mod.setCurrencyRate('USD', 'abc')).toBe(false)
    expect(mod.setCurrencyRate('USD', 83.5)).toBe(true)
    expect(mod.getCurrencySettings().rates.USD).toBe(83.5)
  })

  it('switching base currency resets its rate to 1', () => {
    mod.setMultiCurrencyEnabled(true)
    mod.setBaseCurrency('USD')
    expect(mod.getCurrencySettings().base).toBe('USD')
    expect(mod.getCurrencySettings().rates.USD).toBe(1)
  })

  it('formats amounts in target currency locale', () => {
    expect(mod.formatInCurrency(1000, 'USD')).toMatch(/\$/)
    expect(mod.formatInCurrency(1000, 'GBP')).toMatch(/£/)
  })
})

describe('csvImport', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/csvImport')
  })

  it('parses CSV with quoted fields', () => {
    const { headers, rows } = mod.parseCsv('date,note,amount\n2024-01-05,"coffee, lunch",120\n2024-01-06,plain,50')
    expect(headers).toEqual(['date', 'note', 'amount'])
    expect(rows).toHaveLength(2)
    expect(rows[0][1]).toBe('coffee, lunch')
  })

  it('builds column map from aliased headers', () => {
    const map = mod.buildColumnMap(['Trans Date', 'Particulars', 'Debit', 'Credit'])
    expect(map.date).toBe(0)
    expect(map.note).toBe(1)
    expect(map.debit).toBe(2)
    expect(map.credit).toBe(3)
  })

  it('normalizes common date formats', () => {
    expect(mod.normalizeDate('05/01/2024')).toBe('2024-01-05')
    expect(mod.normalizeDate('2024-03-15')).toBe('2024-03-15')
    expect(mod.normalizeDate('15-12-2023')).toBe('2023-12-15')
    expect(mod.normalizeDate('not-a-date')).toBeNull()
  })

  it('extracts transactions from bank-style debit/credit CSV', () => {
    const csv = 'Date,Particulars,Debit,Credit\n01/04/2024,Zomato,250,\n02/04/2024,Salary,,50000\n'
    const result = mod.convertCsvToTransactions(csv, [])
    expect(result.errors).toHaveLength(0)
    expect(result.candidates).toHaveLength(2)
    const expense = result.candidates[0]
    expect(expense.type).toBe('expense')
    expect(expense.amount).toBe(250)
    expect(expense.date).toBe('2024-04-01')
    const income = result.candidates[1]
    expect(income.type).toBe('income')
    expect(income.amount).toBe(50000)
    expect(income.source).toBe('csv_import')
  })

  it('detects type from type keywords', () => {
    const csv = 'date,type,amount,note\n2024-05-01,Income,1000,Bonus\n2024-05-02,Expense,300,Food\n'
    const result = mod.convertCsvToTransactions(csv, [])
    expect(result.candidates.map((c) => c.type)).toEqual(['income', 'expense'])
  })

  it('matches categories by label', () => {
    expect(mod.matchCategory('Food')).toBe('food')
    expect(mod.matchCategory('Transport')).toBeNull()
  })

  it('dedupes against existing transactions', () => {
    const existing = [{ date: '2024-06-01', amount: 100, type: 'expense', note: 'lunch' }]
    const csv = 'date,amount,type,note\n2024-06-01,100,expense,lunch\n2024-06-02,200,expense,dinner\n'
    const result = mod.convertCsvToTransactions(csv, existing)
    expect(result.skipped).toBe(1)
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].note).toBe('dinner')
  })

  it('flags rows without resolvable amount as invalid', () => {
    const csv = 'date,note\n2024-06-01,no amount here\n'
    const result = mod.convertCsvToTransactions(csv, [])
    expect(result.invalid).toBeGreaterThan(0)
  })

  it('detects missing required columns', () => {
    const csv = 'note,other\nhello,world\n'
    const result = mod.convertCsvToTransactions(csv, [])
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('autoBackup', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/autoBackup')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('defaults to disabled weekly', () => {
    const s = mod.getAutoBackupSettings()
    expect(s.enabled).toBe(false)
    expect(s.frequency).toBe('weekly')
  })

  it('is not due when disabled', () => {
    expect(mod.isAutoBackupDue({ enabled: false })).toBe(false)
  })

  it('is due when enabled and never run', () => {
    expect(mod.isAutoBackupDue({ enabled: true, frequency: 'weekly', lastRunAt: null })).toBe(true)
  })

  it('is not due before the interval elapses', () => {
    const now = Date.now()
    expect(mod.isAutoBackupDue({ enabled: true, frequency: 'weekly', lastRunAt: now - 2 * 3600 * 1000 }, now)).toBe(false)
    expect(mod.isAutoBackupDue({ enabled: true, frequency: 'weekly', lastRunAt: now - 8 * 24 * 3600 * 1000 }, now)).toBe(true)
  })

  it('persists settings round trip', () => {
    mod.saveAutoBackupSettings({ enabled: true, frequency: 'daily' })
    const s = mod.getAutoBackupSettings()
    expect(s.enabled).toBe(true)
    expect(s.frequency).toBe('daily')
  })

  it('runs a backup when due and records lastRunAt', async () => {
    mod.saveAutoBackupSettings({ enabled: true, frequency: 'daily', lastRunAt: null })
    const result = await mod.runAutoBackupIfDue()
    expect(result.ran).toBe(true)
    const updated = mod.getAutoBackupSettings()
    expect(updated.lastRunAt).toBeTruthy()
  })

  it('does not run when not due', async () => {
    mod.saveAutoBackupSettings({ enabled: true, frequency: 'daily', lastRunAt: Date.now() })
    const result = await mod.runAutoBackupIfDue()
    expect(result.ran).toBe(false)
  })
})

describe('splits', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/splits')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('rejects invalid splits', () => {
    expect(mod.createSplit({ totalAmount: 0, participants: [] })).toBeNull()
    expect(mod.createSplit({ totalAmount: 100, participants: [] })).toBeNull()
  })

  it('creates a split with explicit shares', () => {
    const split = mod.createSplit({
      title: 'Dinner',
      totalAmount: 1000,
      participants: [{ name: 'A', share: 600 }, { name: 'B', share: 400 }],
    })
    expect(split).not.toBeNull()
    expect(split.status).toBe('active')
    expect(split.participants.reduce((s, p) => s + p.share, 0)).toBe(1000)
  })

  it('splits equally with remainder handled', () => {
    const shares = mod.splitEqually(1000, ['A', 'B', 'C'])
    expect(shares).toHaveLength(3)
    const total = shares.reduce((s, p) => s + p.share, 0)
    expect(total).toBe(1000)
    expect(shares[0].share).toBe(333.34)
    expect(shares[1].share).toBe(333.33)
  })

  it('creates an equal split from names', () => {
    const split = mod.createSplit({ title: 'Trip', totalAmount: 300, equalSplit: true, participants: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })
    expect(split.participants.map((p) => p.share)).toEqual([100, 100, 100])
  })

  it('marks a participant paid and settles when all pay', () => {
    const split = mod.createSplit({ title: 'Bill', totalAmount: 200, equalSplit: true, participants: [{ name: 'A' }, { name: 'B' }] })
    const r1 = mod.markParticipantPaid(split.id, split.participants[0].id)
    expect(r1.success).toBe(true)
    expect(r1.split.status).toBe('active')
    const r2 = mod.markParticipantPaid(split.id, split.participants[1].id)
    expect(r2.split.status).toBe('settled')
  })

  it('supports partial payments', () => {
    const split = mod.createSplit({ title: 'Bill', totalAmount: 100, equalSplit: true, participants: [{ name: 'A' }, { name: 'B' }] })
    const p = split.participants[0]
    mod.markParticipantPaid(split.id, p.id, 30)
    const after = mod.getSplits().find((s) => s.id === split.id)
    expect(after.participants[0].paid).toBe(30)
    expect(after.status).toBe('active')
  })

  it('summarizes splits', () => {
    const a = mod.createSplit({ title: 'A', totalAmount: 100, equalSplit: true, participants: [{ name: 'X' }, { name: 'Y' }] })
    mod.createSplit({ title: 'B', totalAmount: 200, equalSplit: true, participants: [{ name: 'X' }, { name: 'Y' }] })
    mod.markParticipantPaid(a.id, a.participants[0].id)
    mod.markParticipantPaid(a.id, a.participants[1].id)
    const summary = mod.getSplitSummary(mod.getSplits())
    expect(summary.total).toBe(2)
    expect(summary.settled).toBe(1)
    expect(summary.active).toBe(1)
    expect(summary.pendingTotal).toBe(200)
  })

  it('deletes a split', () => {
    const split = mod.createSplit({ title: 'X', totalAmount: 50, equalSplit: true, participants: [{ name: 'A' }, { name: 'B' }] })
    mod.deleteSplit(split.id)
    expect(mod.getSplits()).toHaveLength(0)
  })
})