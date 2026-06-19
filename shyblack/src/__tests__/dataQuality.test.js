import { describe, it, expect } from 'vitest'
import { runAllDataChecks, checkMissingCategories, checkDuplicateTransactions, checkOrphanedDocuments, checkInactiveAccounts, checkBrokenRelationships, checkInvalidDates } from '../utils/dataQuality'

describe('runAllDataChecks', () => {
  const baseTx = [
    { id: '1', date: '2025-01-15', amount: 100, type: 'expense', note: 'Test', category: 'food' },
    { id: '2', date: '2025-01-16', amount: 200, type: 'expense', note: 'Test 2', category: 'transport' },
  ]

  it('returns empty results for clean data', () => {
    const result = runAllDataChecks(baseTx, [], [], [], [], [], [])
    expect(result.total).toBe(0)
    expect(result.issues).toEqual([])
  })

  it('detects missing categories', () => {
    const tx = [
      ...baseTx,
      { id: '3', date: '2025-01-17', amount: 50, type: 'expense', category: '', note: 'Missing cat' },
    ]
    const result = runAllDataChecks(tx, [], [], [], [], [], [])
    expect(result.byCheck['Missing Categories']).toBe(1)
  })

  it('detects duplicate transactions', () => {
    const tx = [
      { id: '1', date: '2025-01-15', amount: 100, type: 'expense', note: 'Coffee', category: 'food' },
      { id: '2', date: '2025-01-15', amount: 100, type: 'expense', note: 'Coffee', category: 'food' },
    ]
    const result = runAllDataChecks(tx, [], [], [], [], [], [])
    expect(result.byCheck['Duplicate Transactions']).toBe(1)
  })

  it('detects orphaned documents', () => {
    const docs = [
      { id: 'd1', title: 'Receipt', category: 'bills', linkedTo: [] },
    ]
    const result = runAllDataChecks(baseTx, docs, [], [], [], [], [])
    expect(result.byCheck['Orphaned Documents']).toBe(1)
  })

  it('detects invalid dates', () => {
    const tx = [
      ...baseTx,
      { id: '3', date: 'not-a-date', amount: 50, type: 'expense', note: 'Bad date', category: 'food' },
    ]
    const result = runAllDataChecks(tx, [], [], [], [], [], [])
    expect(result.byCheck['Invalid Dates']).toBe(1)
  })

  it('categorizes by severity', () => {
    const tx = [
      { id: '1', date: '2025-01-15', amount: 100, type: 'expense', note: 'Test', category: '' },
    ]
    const result = runAllDataChecks(tx, [], [], [], [], [], [])
    expect(result.bySeverity.medium).toBe(1)
  })
})

describe('checkMissingCategories', () => {
  it('flags transactions with empty category', () => {
    const tx = [{ id: '1', date: '2025-01-01', amount: 50, type: 'expense', category: '', note: 'No cat' }]
    expect(checkMissingCategories(tx)).toHaveLength(1)
  })

  it('flags transactions with "other" category', () => {
    const tx = [{ id: '1', date: '2025-01-01', amount: 50, type: 'expense', category: 'other', note: 'Other' }]
    expect(checkMissingCategories(tx)).toHaveLength(1)
  })

  it('ignores transactions with valid categories', () => {
    const tx = [{ id: '1', date: '2025-01-01', amount: 50, type: 'expense', category: 'food', note: 'Food' }]
    expect(checkMissingCategories(tx)).toHaveLength(0)
  })
})

describe('checkDuplicateTransactions', () => {
  it('detects exact duplicates', () => {
    const tx = [
      { id: '1', date: '2025-01-01', amount: 100, type: 'expense', note: 'Coffee' },
      { id: '2', date: '2025-01-01', amount: 100, type: 'expense', note: 'Coffee' },
    ]
    expect(checkDuplicateTransactions(tx)).toHaveLength(1)
  })

  it('does not flag different transactions', () => {
    const tx = [
      { id: '1', date: '2025-01-01', amount: 100, type: 'expense', note: 'Coffee' },
      { id: '2', date: '2025-01-02', amount: 100, type: 'expense', note: 'Coffee' },
    ]
    expect(checkDuplicateTransactions(tx)).toHaveLength(0)
  })
})

describe('checkOrphanedDocuments', () => {
  it('flags documents not linked to any entity', () => {
    const docs = [{ id: 'd1', title: 'Unlinked', category: 'other', linkedTo: [] }]
    expect(checkOrphanedDocuments(docs, [], [], [])).toHaveLength(1)
  })
})

describe('checkInactiveAccounts', () => {
  it('flags accounts with no recent activity', () => {
    const accounts = [{ id: 'a1', name: 'Old Account', balance: 100 }]
    const recentDate = new Date()
    recentDate.setFullYear(recentDate.getFullYear() - 1)
    const tx = [{ id: '1', date: recentDate.toISOString().split('T')[0], accountId: 'a1', amount: 50, type: 'expense' }]
    expect(checkInactiveAccounts(accounts, tx, 0)).toHaveLength(1)
  })
})

describe('checkBrokenRelationships', () => {
  it('flags relationships with missing source', () => {
    const rels = [{ id: 'r1', sourceType: 'transaction', sourceId: 'nonexistent', targetType: 'document', targetId: 'd1', label: 'Test' }]
    const ids = new Set(['d1'])
    const result = checkBrokenRelationships(rels, ids)
    expect(result).toHaveLength(1)
    expect(result[0].issue).toContain('source')
  })
})

describe('checkInvalidDates', () => {
  it('flags invalid date strings', () => {
    const tx = [{ id: '1', date: 'not-a-date', amount: 50, type: 'expense', note: 'Bad' }]
    expect(checkInvalidDates(tx)).toHaveLength(1)
  })
})
