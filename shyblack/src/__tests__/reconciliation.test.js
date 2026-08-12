import { describe, it, expect } from 'vitest'
import {
  scoreMatch,
  matchStatementToLedger,
  getReconciliationReport,
  getCandidatesForStatement,
  applyExplicitPairings,
  getClearedLedgerIds,
} from '../utils/reconciliation'

const statement = [
  { type: 'expense', amount: 250, date: '2026-07-01', note: 'UPI/A2B123456789 ZOMATO PAYMENTS' },
  { type: 'expense', amount: 4500, date: '2026-07-02', note: 'AMAZON IN' },
  { type: 'income', amount: 45000, date: '2026-07-01', note: 'NEFT INWARD SALARY' },
  { type: 'expense', amount: 99, date: '2026-07-10', note: 'SWIGGY' },
]

const ledger = [
  { id: 't1', type: 'expense', amount: 250, date: '2026-07-01', note: 'Zomato order' },
  { id: 't2', type: 'expense', amount: 4500, date: '2026-07-02', note: 'Amazon shopping' },
  { id: 't3', type: 'income', amount: 45000, date: '2026-07-01', note: 'Salary credit' },
  { id: 't4', type: 'expense', amount: 99, date: '2026-07-09', note: 'Swiggy order' },
  { id: 't5', type: 'expense', amount: 1200, date: '2026-07-15', note: 'Unrelated coffee' },
]

describe('scoreMatch', () => {
  it('scores an exact match', () => {
    const res = scoreMatch(statement[0], ledger[0])
    expect(res.confidence).toBe('exact')
    expect(res.score).toBeGreaterThan(0)
  })

  it('returns none for different types', () => {
    expect(scoreMatch(statement[0], ledger[2]).confidence).toBe('none')
  })

  it('returns none for wildly different amounts', () => {
    expect(scoreMatch({ type: 'expense', amount: 250, date: '2026-07-01', note: 'x' }, { type: 'expense', amount: 25000, date: '2026-07-01', note: 'x' }).confidence).toBe('none')
  })

  it('returns medium for same amount far-ish date', () => {
    expect(scoreMatch({ type: 'expense', amount: 250, date: '2026-07-03', note: 'something' }, ledger[0]).confidence).toBe('medium')
  })
})

describe('matchStatementToLedger', () => {
  it('pairs all four statement entries without reusing a ledger tx', () => {
    const pairs = matchStatementToLedger(statement, ledger)
    expect(pairs).toHaveLength(4)
    const matched = pairs.filter((p) => p.ledger)
    expect(matched).toHaveLength(4)
    const ids = matched.map((p) => p.ledger.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('matches the salary entry with exact confidence', () => {
    const pairs = matchStatementToLedger(statement, ledger)
    const salary = pairs.find((p) => p.statement.note.includes('SALARY'))
    expect(salary.confidence).toBe('exact')
    expect(salary.ledger.id).toBe('t3')
  })

  it('leaves statement entries unpaired when nothing is close', () => {
    const pairs = matchStatementToLedger([{ type: 'expense', amount: 99999, date: '2026-01-01', note: 'mystery' }], ledger)
    expect(pairs[0].ledger).toBeNull()
    expect(pairs[0].confidence).toBe('none')
  })
})

describe('getReconciliationReport', () => {
  it('computes totals and completeness', () => {
    const report = getReconciliationReport(statement, ledger)
    expect(report.unmatchedLedger).toHaveLength(1)
    expect(report.unmatchedLedger[0].id).toBe('t5')
    expect(report.totals.statementTotal).toBe(49849)
    expect(report.totals.matchedTotal + report.totals.unmatchedTotal).toBe(report.totals.statementTotal)
    expect(report.completeness).toBeGreaterThan(0.9)
  })

  it('handles empty inputs', () => {
    const report = getReconciliationReport([], [])
    expect(report.matched).toEqual([])
    expect(report.totals.statementTotal).toBe(0)
    expect(report.completeness).toBe(0)
  })
})

describe('getCandidatesForStatement', () => {
  it('ranks candidates best first', () => {
    const cands = getCandidatesForStatement(statement[0], ledger)
    expect(cands.length).toBeGreaterThan(0)
    expect(cands[0].ledger.id).toBe('t1')
    for (let i = 1; i < cands.length; i++) {
      expect(cands[i - 1].score).toBeGreaterThanOrEqual(cands[i].score)
    }
  })
})

describe('applyExplicitPairings', () => {
  it('overrides an auto match with a manual pick', () => {
    const pairs = applyExplicitPairings(
      statement,
      ledger,
      [{ statementIndex: 3, ledgerIndex: 4 }],
    )
    const swiggy = pairs.find((p) => p.statementIndex === 3)
    expect(swiggy.ledger.id).toBe('t5')
    expect(swiggy.confidence).toBe('manual')
  })

  it('does not double-assign a ledger entry', () => {
    const pairs = applyExplicitPairings(
      statement,
      ledger,
      [{ statementIndex: 0, ledgerIndex: 1 }, { statementIndex: 1, ledgerIndex: 1 }],
    )
    const assigned = pairs.filter((p) => p.ledger && p.ledger.id === 't2')
    expect(assigned).toHaveLength(1)
  })
})

describe('getClearedLedgerIds', () => {
  it('returns ledger ids from matched pairs only', () => {
    const pairs = matchStatementToLedger(statement, ledger)
    const ids = getClearedLedgerIds(pairs)
    expect(ids).toContain('t1')
    expect(ids).not.toContain('t5')
  })
})
