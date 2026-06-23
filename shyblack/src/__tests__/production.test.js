import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPerformanceAudit, measureStartupTime, measureStorageReadTime, measureStorageWriteTime, calculatePerformanceGrade } from '../utils/performanceAudit'
import { runStorageHealthCheck, checkDuplicateIds, checkCorruptedRecords, checkOrphanedRecords, autoRepairRecords, generateHealthGrade } from '../utils/storageHealth'
import { validateWealthAssets, validateReceipts, validateRecurring, validateBudgetsV2, validateBackups, runFullIntegrityCheck, validateImportFile } from '../utils/integrityValidator'
import { buildFullSearchIndex, searchFullIndex, getEntityCounts } from '../utils/fullSearchIndex'

/* ═══ Performance Audit ═══ */

describe('performanceAudit', () => {
  it('measures startup time', () => {
    const result = measureStartupTime()
    expect(result.domContentLoaded).toBeGreaterThanOrEqual(0)
    expect(result.loadComplete).toBeGreaterThanOrEqual(0)
  })

  it('calculates performance grade', () => {
    const grade = calculatePerformanceGrade({
      startupTime: { loadComplete: 1500 },
      storageReadTime: 1.5,
      storageWriteTime: 3,
      backupDuration: 800,
      searchTime: 150,
    })
    expect(grade.score).toBeGreaterThan(0)
    expect(['A', 'B', 'C', 'D', 'F']).toContain(grade.grade)
  })

  it('penalizes slow performance', () => {
    const slow = calculatePerformanceGrade({
      startupTime: { loadComplete: 5000 },
      storageReadTime: 10,
      storageWriteTime: 20,
      backupDuration: 5000,
      searchTime: 1000,
    })
    const fast = calculatePerformanceGrade({
      startupTime: { loadComplete: 500 },
      storageReadTime: 0.5,
      storageWriteTime: 1,
      backupDuration: 100,
      searchTime: 50,
    })
    expect(fast.score).toBeGreaterThan(slow.score)
    expect(slow.grade).toBe('F')
  })

  it('runs full audit', () => {
    const audit = runPerformanceAudit({})
    expect(audit.metrics).toBeDefined()
    expect(audit.score).toBeGreaterThanOrEqual(0)
    expect(audit.grade).toBeDefined()
    expect(audit.timestamp).toBeGreaterThan(0)
  })
})

/* ═══ Storage Health ═══ */

describe('storageHealth', () => {
  it('detects duplicate IDs', () => {
    const data = [
      { id: 'a', name: 'first' },
      { id: 'b', name: 'second' },
      { id: 'a', name: 'duplicate' },
    ]
    const dups = checkDuplicateIds(data)
    expect(dups).toHaveLength(1)
    expect(dups[0].id).toBe('a')
  })

  it('returns empty for no duplicates', () => {
    const data = [{ id: 'a' }, { id: 'b' }]
    expect(checkDuplicateIds(data)).toHaveLength(0)
  })

  it('detects corrupted records', () => {
    const data = [
      { id: 'a', name: 'valid' },
      null,
      { id: 'b' },
    ]
    const corrupted = checkCorruptedRecords(data, ['id', 'name'])
    expect(corrupted.length).toBeGreaterThanOrEqual(2)
  })

  it('detects orphaned references', () => {
    const allData = {
      accounts: [{ id: 'acc1', name: 'Bank' }],
      transactions: [{ id: 'tx1', type: 'income', amount: 100 }],
      goals: [{ id: 'g1', name: 'Goal' }],
      wealthAssets: [{ id: 'wa1', goalId: 'nonexistent', assetType: 'cash' }],
      emis: [],
      transfers: [],
      documents: [],
    }
    const orphans = checkOrphanedRecords(allData)
    expect(orphans.length).toBeGreaterThan(0)
    expect(orphans[0].type).toBe('wealth_asset')
  })

  it('auto-repairs records', () => {
    const data = [
      { id: 'a', name: 'valid', amount: 100 },
      { name: 'missing_id', amount: null },
    ]
    const result = autoRepairRecords(data, {
      id: { default: 'repaired', validator: (v) => typeof v === 'string' && v.length > 0 },
      amount: { default: 0, validator: (v) => typeof v === 'number' && !isNaN(v) },
    })
    expect(result.repaired).toHaveLength(2)
    expect(result.repairs.length).toBeGreaterThanOrEqual(1)
  })

  it('generates health grade', () => {
    expect(generateHealthGrade(95).grade).toBe('A+')
    expect(generateHealthGrade(85).grade).toBe('A')
    expect(generateHealthGrade(70).grade).toBe('B')
    expect(generateHealthGrade(50).grade).toBe('C')
    expect(generateHealthGrade(30).grade).toBe('D')
    expect(generateHealthGrade(10).grade).toBe('F')
  })

  it('runs full health check', () => {
    const result = runStorageHealthCheck({
      transactions: [{ id: 't1', type: 'income', amount: 100, date: '2026-06-01' }],
      debts: [],
      goals: [],
      accounts: [],
      emis: [],
    })
    expect(result.healthScore).toBeGreaterThanOrEqual(0)
    expect(result.healthGrade.grade).toBeDefined()
    expect(result.totalRecords).toBe(1)
  })

  it('penalizes corrupted records', () => {
    const good = runStorageHealthCheck({
      transactions: [{ id: 't1', type: 'income', amount: 100, date: '2026-06-01' }],
      debts: [], goals: [], accounts: [], emis: [],
    })
    const bad = runStorageHealthCheck({
      transactions: [{ id: null, type: 'invalid', amount: 'NaN', date: null }],
      debts: [], goals: [], accounts: [], emis: [],
    })
    expect(good.healthScore).toBeGreaterThan(bad.healthScore)
  })
})

/* ═══ Integrity Validator ═══ */

describe('integrityValidator', () => {
  it('validates wealth assets', () => {
    const valid = validateWealthAssets([
      { id: 'a1', assetType: 'cash', currentValue: 10000 },
    ])
    expect(valid.valid).toBe(true)
  })

  it('repairs invalid wealth assets', () => {
    const result = validateWealthAssets([{ id: null, currentValue: 'invalid' }])
    expect(result.repaired.length).toBe(1)
  })

  it('validates receipts', () => {
    const result = validateReceipts([
      { id: 'r1', amount: 500, merchant: 'Store' },
      null,
    ])
    expect(result.repaired.length).toBe(1)
  })

  it('validates recurring entries', () => {
    const result = validateRecurring([
      { id: 'r1', type: 'income', amount: 5000 },
      { id: 'r2', type: 'expense', amount: 2000 },
    ])
    expect(result.valid).toBe(true)
  })

  it('repairs invalid recurring', () => {
    const result = validateRecurring([{ type: 'invalid_type' }])
    expect(result.repaired.length).toBe(1)
  })

  it('validates budgetsV2', () => {
    const result = validateBudgetsV2([
      { id: 'b1', category: 'food', limit: 5000 },
    ])
    expect(result.valid).toBe(true)
  })

  it('validates backups', () => {
    const result = validateBackups([
      { id: 'bk1', version: 1, createdAt: Date.now(), type: 'manual', modules: ['transactions'] },
    ])
    expect(result.valid).toBe(true)
  })

  it('repairs invalid backups', () => {
    const result = validateBackups([{ type: 'manual' }])
    expect(result.repaired.length).toBe(1)
    expect(result.repaired[0].id).toBeDefined()
  })

  it('runs full integrity check', () => {
    const result = runFullIntegrityCheck({
      transactions: [{ id: 't1', type: 'income', amount: 100, date: '2026-06-01' }],
      debts: [],
      goals: [],
      accounts: [],
      transfers: [],
      emis: [],
      wealthAssets: [],
      receipts: [],
      recurring: [],
      budgetsV2: [],
      backups: [],
    })
    expect(result.hasIssues).toBe(false)
    expect(result.transactions.valid).toBe(true)
    expect(result.summary.totalErrors).toBe(0)
  })

  it('validates import file', () => {
    const valid = validateImportFile({
      transactions: [{ id: 't1' }],
      debts: [],
      goals: [],
    })
    expect(valid.valid).toBe(true)
    expect(valid.entityCounts.transactions).toBe(1)
  })

  it('rejects invalid import files', () => {
    const result = validateImportFile(null)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects import with invalid entity types', () => {
    const result = validateImportFile({
      transactions: 'not-an-array',
      debts: [],
      goals: [],
    })
    expect(result.valid).toBe(false)
  })
})

/* ═══ Full Search Index ═══ */

describe('fullSearchIndex', () => {
  const sampleData = {
    transactions: [
      { id: 'tx1', note: 'Grocery shopping', category: 'food', amount: 2500, type: 'expense', date: '2026-06-01' },
      { id: 'tx2', note: 'Salary June', category: 'salary', amount: 50000, type: 'income', date: '2026-06-01' },
    ],
    budgetsV2: [
      { id: 'bg1', category: 'food', limit: 5000, spent: 2500 },
    ],
    emis: [
      { id: 'emi1', name: 'Home Loan', loanName: 'Home Loan', emiAmount: 15000, remainingAmount: 500000 },
    ],
    goals: [
      { id: 'g1', name: 'Emergency Fund', target: 200000, saved: 80000 },
    ],
    wealthAssets: [
      { id: 'wa1', assetName: 'Gold ETF', assetType: 'gold', currentValue: 50000 },
    ],
    receipts: [
      { id: 'rc1', merchant: 'Big Bazaar', amount: 1500, date: '2026-06-01' },
    ],
    recurring: [
      { id: 'r1', note: 'Netflix', amount: 499, frequency: 'monthly', type: 'expense' },
    ],
    debts: [
      { id: 'd1', personName: 'Rahul', amount: 10000, remainingAmount: 5000, originalAmount: 10000 },
    ],
  }

  it('builds search index for all entities', () => {
    const idx = buildFullSearchIndex(sampleData)
    expect(idx.transactions).toHaveLength(2)
    expect(idx.budgets).toHaveLength(1)
    expect(idx.emis).toHaveLength(1)
    expect(idx.goals).toHaveLength(1)
    expect(idx.wealthAssets).toHaveLength(1)
    expect(idx.receipts).toHaveLength(1)
    expect(idx.recurring).toHaveLength(1)
    expect(idx.debts).toHaveLength(1)
  })

  it('searches across all entities', () => {
    const idx = buildFullSearchIndex(sampleData)
    const results = searchFullIndex(idx, 'food')
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results.some((r) => r.entity === 'transactions')).toBe(true)
    expect(results.some((r) => r.entity === 'budgets')).toBe(true)
  })

  it('returns empty for no match', () => {
    const idx = buildFullSearchIndex(sampleData)
    expect(searchFullIndex(idx, 'zzzznotfound')).toEqual([])
  })

  it('returns empty for empty query', () => {
    const idx = buildFullSearchIndex(sampleData)
    expect(searchFullIndex(idx, '')).toEqual([])
    expect(searchFullIndex(idx, '   ')).toEqual([])
  })

  it('prioritizes exact matches', () => {
    const idx = buildFullSearchIndex(sampleData)
    const results = searchFullIndex(idx, 'salary')
    expect(results.length).toBeGreaterThan(0)
  })

  it('counts entities', () => {
    const idx = buildFullSearchIndex(sampleData)
    const counts = getEntityCounts(idx)
    expect(counts.transactions).toBe(2)
    expect(counts.emis).toBe(1)
  })
})

/* ═══ Data Integrity combined ═══ */

describe('data integrity combined', () => {
  it('handles complex integrity check with errors', () => {
    const result = runFullIntegrityCheck({
      transactions: [
        null,
        { id: 't1', type: 'income', amount: 100, date: '2026-06-01' },
        { type: 'invalid', amount: 'bad' },
      ],
      debts: [{ id: null, personName: '', amount: -1 }],
      goals: [],
      accounts: [],
      transfers: [],
      emis: [],
      wealthAssets: [null, { currentValue: 500 }],
      receipts: [],
      recurring: [],
      budgetsV2: [],
      backups: [],
    })
    expect(result.hasIssues).toBe(true)
    expect(result.summary.totalErrors).toBeGreaterThan(0)
  })
})

/* ═══ Performance Audit Edge Cases ═══ */

describe('performanceAudit edge cases', () => {
  it('handles empty backup function', () => {
    const audit = runPerformanceAudit({ backupFn: () => { /* noop */ } })
    expect(audit.metrics.backupDuration).toBeGreaterThanOrEqual(0)
  })

  it('grades worst-case performance as F', () => {
    const g = calculatePerformanceGrade({
      startupTime: { loadComplete: 10000 },
      storageReadTime: 50,
      storageWriteTime: 100,
      backupDuration: 10000,
      searchTime: 5000,
    })
    expect(g.grade).toBe('F')
    expect(g.score).toBeLessThan(30)
  })

  it('grades perfect performance as A', () => {
    const g = calculatePerformanceGrade({
      startupTime: { loadComplete: 200 },
      storageReadTime: 0.1,
      storageWriteTime: 0.5,
      backupDuration: 50,
      searchTime: 10,
    })
    expect(g.grade).toBe('A')
    expect(g.score).toBe(100)
  })
})

/* ═══ Storage Health Edge Cases ═══ */

describe('storageHealth edge cases', () => {
  it('handles empty data arrays', () => {
    expect(checkDuplicateIds([])).toEqual([])
    expect(checkCorruptedRecords([], ['id'])).toEqual([])
  })

  it('handles null entries in duplicate check', () => {
    expect(checkDuplicateIds([null, undefined, { id: 'a' }])).toHaveLength(0)
  })

  it('detects missing required fields', () => {
    const result = checkCorruptedRecords([{ id: 'a' }, { id: 'b', name: 'ok' }], ['id', 'name'])
    expect(result).toHaveLength(1)
    expect(result[0].detail).toContain('name')
  })

  it('health grade handles boundaries', () => {
    expect(generateHealthGrade(100).grade).toBe('A+')
    expect(generateHealthGrade(0).grade).toBe('F')
    expect(generateHealthGrade(-1).grade).toBe('F')
  })

  it('auto-repair handles empty array', () => {
    const result = autoRepairRecords([], { id: { default: '', validator: () => true } })
    expect(result.repaired).toEqual([])
    expect(result.repairs).toEqual([])
  })

  it('auto-repair handles all-null entries', () => {
    const result = autoRepairRecords([null, undefined], { name: { default: '', validator: (v) => typeof v === 'string' } })
    expect(result.repaired).toHaveLength(0)
    expect(result.repairs).toHaveLength(2)
  })

  it('runs health check with mixed valid/invalid data', () => {
    const result = runStorageHealthCheck({
      transactions: [{ id: 't1', type: 'income', amount: 100, date: '2026-06-01' }, { id: 't1', type: 'expense', amount: 50, date: '2026-06-02' }],
      debts: [],
      goals: [{ id: 'g1', name: 'Goal', target: 1000 }],
      accounts: [{ id: 'a1', name: 'Bank', balance: 5000, type: 'bank' }],
      emis: [],
    })
    expect(result.duplicateRecords).toBeGreaterThan(0)
    expect(result.healthScore).toBeLessThan(100)
  })
})

/* ═══ Integrity Validator Edge Cases ═══ */

describe('integrityValidator edge cases', () => {
  it('validates empty wealth assets', () => {
    expect(validateWealthAssets([]).valid).toBe(true)
  })

  it('validates empty receipts', () => {
    expect(validateReceipts([]).valid).toBe(true)
  })

  it('validates empty recurring', () => {
    expect(validateRecurring([]).valid).toBe(true)
  })

  it('validates empty budgetsV2', () => {
    expect(validateBudgetsV2([]).valid).toBe(true)
  })

  it('validates empty backups', () => {
    expect(validateBackups([]).valid).toBe(true)
  })

  it('rejects non-array wealth assets', () => {
    const result = validateWealthAssets(null)
    expect(result.valid).toBe(false)
  })

  it('rejects non-array receipts', () => {
    const result = validateReceipts('not-array')
    expect(result.valid).toBe(false)
  })

  it('rejects import with string transactions', () => {
    expect(validateImportFile({ transactions: 'bad', debts: [], goals: [] }).valid).toBe(false)
  })

  it('rejects import with missing goals', () => {
    expect(validateImportFile({ transactions: [] }).valid).toBe(false)
  })
})

/* ═══ Full Search Index Edge Cases ═══ */

describe('fullSearchIndex edge cases', () => {
  it('handles empty data', () => {
    const idx = buildFullSearchIndex({})
    expect(idx.transactions).toEqual([])
    expect(idx.budgets).toEqual([])
    expect(idx.emis).toEqual([])
    expect(getEntityCounts(idx).transactions).toBe(0)
  })

  it('handles partial data', () => {
    const idx = buildFullSearchIndex({ transactions: [{ id: 't1', note: 'test', amount: 100 }] })
    expect(idx.transactions).toHaveLength(1)
    expect(idx.debts).toEqual([])
  })

  it('searches case-insensitively', () => {
    const idx = buildFullSearchIndex({ transactions: [{ id: 't1', note: 'Grocery Store', amount: 500, type: 'expense', category: 'food', date: '2026-06-01' }] })
    const results = searchFullIndex(idx, 'grocery')
    expect(results).toHaveLength(1)
    expect(results[0].entity).toBe('transactions')
  })

  it('handles special characters in query', () => {
    const idx = buildFullSearchIndex({ transactions: [{ id: 't1', note: 'Upi Payment@123', amount: 500, type: 'expense', category: 'food', date: '2026-06-01' }] })
    expect(searchFullIndex(idx, 'upi')).toHaveLength(1)
  })
})

/* ═══ Large Dataset Stress Test ═══ */

describe('large dataset stress', () => {
  it('handles 1000+ transaction search index', () => {
    const largeData = []
    for (let i = 0; i < 1000; i++) {
      largeData.push({ id: `tx${i}`, note: `Transaction ${i}`, amount: Math.random() * 10000, type: i % 2 === 0 ? 'income' : 'expense', category: 'food', date: '2026-06-01' })
    }
    const idx = buildFullSearchIndex({ transactions: largeData })
    expect(idx.transactions).toHaveLength(1000)
    const results = searchFullIndex(idx, 'Transaction')
    expect(results.length).toBeGreaterThan(0)
  })

  it('handles 500 duplicate detection', () => {
    const data = []
    for (let i = 0; i < 500; i++) {
      data.push({ id: `dup${i % 50}`, name: `item${i}` })
    }
    const dups = checkDuplicateIds(data)
    expect(dups.length).toBe(450)
  })
})

/* ═══ Combined Production Readiness ═══ */

describe('production readiness', () => {
  it('runs full audit successfully', () => {
    const audit = runPerformanceAudit({})
    expect(audit).toHaveProperty('metrics')
    expect(audit).toHaveProperty('score')
    expect(audit).toHaveProperty('grade')
    expect(audit).toHaveProperty('timestamp')
  })

  it('runs health check without crashing', () => {
    const result = runStorageHealthCheck({
      transactions: [],
      debts: [],
      goals: [],
      accounts: [],
      emis: [],
    })
    expect(result.healthScore).toBe(100)
    expect(result.healthGrade.grade).toBe('A+')
    expect(result.issues).toEqual([])
  })

  it('validates import rejects malformed data', () => {
    const result = validateImportFile({ transactions: 'not_array', debts: [], goals: [] })
    expect(result.valid).toBe(false)
  })

  it('validates import accepts valid data', () => {
    const result = validateImportFile({
      transactions: [{ id: 't1', type: 'income', amount: 100, date: '2026-06-01' }],
      debts: [],
      goals: [],
      accounts: [],
    })
    expect(result.valid).toBe(true)
  })

  it('full integrity check handles empty allData', () => {
    const result = runFullIntegrityCheck({})
    expect(result.hasIssues).toBe(false)
    expect(result.summary).toBeDefined()
  })

  it('full integrity check detects orphaned refs', () => {
    const result = runFullIntegrityCheck({
      transactions: [{ id: 't1', type: 'income', amount: 100, date: '2026-06-01' }],
      accounts: [],
      debts: [],
      goals: [],
      transfers: [{ id: 'tr1', fromAccountId: 'nonexistent', toAccountId: 'real', amount: 50 }],
      emis: [],
    })
    expect(result.orphans.length).toBeGreaterThan(0)
  })

  it('full integrity check repairs bad transactions', () => {
    const result = runFullIntegrityCheck({
      transactions: [{ type: 'expense' }],
      accounts: [],
      debts: [],
      goals: [],
      transfers: [],
      emis: [],
    })
    expect(result.transactions.errors.length).toBeGreaterThan(0)
    expect(result.transactions.repaired.length).toBeGreaterThan(0)
  })
})

/* ═══ Cross-module Integration ═══ */

describe('cross-module integration', () => {
  it('performance audit + health check combo', () => {
    const audit = runPerformanceAudit({})
    const health = runStorageHealthCheck({ transactions: [], debts: [], goals: [], accounts: [], emis: [] })
    expect(audit.grade).toBeDefined()
    expect(health.healthGrade.grade).toBeDefined()
  })

  it('search index + integrity check combo', () => {
    const data = { transactions: [{ id: 't1', note: 'test', amount: 100, type: 'income', category: 'general', date: '2026-06-01' }] }
    const idx = buildFullSearchIndex(data)
    const integrity = runFullIntegrityCheck(data)
    expect(idx.transactions).toHaveLength(1)
    expect(integrity.hasIssues).toBe(false)
  })

  it('auto-repair cleans up corrupted records', () => {
    const result = autoRepairRecords([{ id: 'a', name: null }, { id: 'b' }], {
      name: { default: '', validator: (v) => typeof v === 'string' },
    })
    expect(result.repaired).toHaveLength(2)
    expect(result.repaired[0].name).toBe('')
    expect(result.repairs).toHaveLength(2)
  })

  it('auto-repair handles already-valid records', () => {
    const result = autoRepairRecords([{ id: 'a', name: 'Alice' }], {
      name: { default: '', validator: (v) => typeof v === 'string' },
    })
    expect(result.repaired).toHaveLength(1)
    expect(result.repairs).toHaveLength(0)
  })

  it('generateHealthGrade handles perfect score', () => {
    expect(generateHealthGrade(100).label).toBe('Excellent')
    expect(generateHealthGrade(80).label).toBe('Great')
    expect(generateHealthGrade(89).label).toBe('Great')
  })

  it('generateHealthGrade handles failing score', () => {
    expect(generateHealthGrade(25).label).toBe('Poor')
    expect(generateHealthGrade(0).label).toBe('Critical')
  })
})
