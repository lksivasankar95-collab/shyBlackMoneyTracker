/**
 * Bank statement reconciliation engine.
 * Matches parsed statement entries against the existing transaction ledger
 * using amount, date proximity and note similarity. Pure functions — the UI
 * drives pairing overrides and imports separately.
 */

import { textSimilarity, normalizeNote, dateDiffDays, amountTolerance } from './fuzzyDuplicates'

const DEFAULT_OPTIONS = {
  dateWindowDays: 3,
  amountTolerancePct: 0.02,
  amountToleranceAbs: 5,
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Scores a (statement entry, ledger tx) pair.
 * Returns { score, confidence } where confidence ∈ exact | high | medium | none.
 *  - exact: same type, same amount, same date (notes can't be trusted to match)
 *  - high:  same type + amount, date within 1 day, note similarity ≥ 0.4
 *  - medium: same type + amount, date within window
 */
export function scoreMatch(statementTx, ledgerTx, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  if (!statementTx || !ledgerTx) return { score: 0, confidence: 'none' }
  if (statementTx.type !== ledgerTx.type) return { score: 0, confidence: 'none' }

  const amountDiff = Math.abs(statementTx.amount - ledgerTx.amount)
  const tol = amountTolerance(statementTx.amount, ledgerTx.amount, opts.amountTolerancePct, opts.amountToleranceAbs)
  if (amountDiff > tol) return { score: 0, confidence: 'none' }

  const dateDiff = dateDiffDays(statementTx.date, ledgerTx.date)
  if (dateDiff > opts.dateWindowDays) return { score: 0, confidence: 'none' }

  const sNote = normalizeNote(statementTx.note)
  const lNote = normalizeNote(ledgerTx.note)
  const noteSim = textSimilarity(sNote, lNote)

  if (amountDiff === 0 && dateDiff <= 0.5) {
    return { score: round2(100 + noteSim * 10), confidence: 'exact', noteSim: round2(noteSim), amountDiff: round2(amountDiff), dateDiffDays: round2(dateDiff) }
  }
  if (dateDiff <= 1 && noteSim >= 0.4) {
    return { score: round2(80 + noteSim * 20), confidence: 'high', noteSim: round2(noteSim), amountDiff: round2(amountDiff), dateDiffDays: round2(dateDiff) }
  }
  return { score: round2(50 + (1 - amountDiff / tol) * 20), confidence: 'medium', noteSim: round2(noteSim), amountDiff: round2(amountDiff), dateDiffDays: round2(dateDiff) }
}

/**
 * Greedy best-pairing: each statement entry picks its best-scoring unused
 * ledger tx. Returns array of { statement, ledger, score, confidence, ... }.
 */
export function matchStatementToLedger(statementTxs, ledgerTxs, options = {}) {
  const statement = (statementTxs || []).map((s, i) => ({ ...s, __idx: i }))
  const ledger = (ledgerTxs || []).map((t) => t)
  const used = new Set()
  const pairs = []

  for (const s of statement) {
    let best = null
    for (let j = 0; j < ledger.length; j++) {
      if (used.has(j)) continue
      const score = scoreMatch(s, ledger[j], options)
      if (score.confidence === 'none') continue
      if (!best || score.score > best.score) best = { index: j, ...score }
    }
    if (best) {
      used.add(best.index)
      pairs.push({ statement: s, ledger: ledger[best.index], statementIndex: s.__idx, ledgerIndex: best.index, ...best })
    } else {
      pairs.push({ statement: s, ledger: null, statementIndex: s.__idx, ledgerIndex: null, score: 0, confidence: 'none' })
    }
  }
  return pairs
}

/**
 * Builds the full reconciliation report.
 * Returns { matched, unmatchedStatement, unmatchedLedger, totals, completeness }.
 * totals: { statementTotal, matchedTotal, unmatchedTotal, ledgerMatchedTotal }
 * completeness: 0..1 share of statement value matched.
 */
export function getReconciliationReport(statementTxs, ledgerTxs, options = {}) {
  const pairs = matchStatementToLedger(statementTxs, ledgerTxs, options)
  const matched = pairs.filter((p) => p.ledger)
  const matchedLedgerIndexes = new Set(matched.map((p) => p.ledgerIndex))
  const unmatchedStatement = pairs.filter((p) => !p.ledger).map((p) => p.statement)
  const unmatchedLedger = ledgerTxs.filter((_, i) => !matchedLedgerIndexes.has(i))

  const statementTotal = round2((statementTxs || []).reduce((sum, s) => sum + Math.abs(s.amount), 0))
  const matchedTotal = round2(matched.reduce((sum, p) => sum + Math.abs(p.statement.amount), 0))
  const unmatchedTotal = round2(unmatchedStatement.reduce((sum, s) => sum + Math.abs(s.amount), 0))

  return {
    matched,
    unmatchedStatement,
    unmatchedLedger,
    totals: { statementTotal, matchedTotal, unmatchedTotal },
    completeness: statementTotal > 0 ? round2(matchedTotal / statementTotal) : 0,
  }
}

/**
 * Re-pairs one statement entry against all ledger transactions, returning
 * ranked candidates (best first) so the user can override an auto-match.
 */
export function getCandidatesForStatement(statementTx, ledgerTxs, options = {}) {
  return ledgerTxs
    .map((t, i) => ({ ledger: t, ledgerIndex: i, ...scoreMatch(statementTx, t, options) }))
    .filter((c) => c.confidence !== 'none')
    .sort((a, b) => b.score - a.score)
}

/**
 * Applies a user-chosen pairing set on top of auto-matching.
 * explicit: array of { statementIndex, ledgerIndex } overrides.
 * Returns a new pairs array (same shape as matchStatementToLedger).
 */
export function applyExplicitPairings(statementTxs, ledgerTxs, explicit = [], options = {}) {
  const pairs = matchStatementToLedger(statementTxs, ledgerTxs, options)
  const used = new Set(pairs.filter((p) => p.ledger).map((p) => p.ledgerIndex))
  for (const override of explicit) {
    if (override == null || override.statementIndex == null || override.ledgerIndex == null) continue
    const stIdx = override.statementIndex
    if (used.has(override.ledgerIndex)) continue
    const existing = pairs.find((p) => p.statementIndex === stIdx)
    if (!existing) continue
    if (existing.ledger) used.delete(existing.ledgerIndex)
    const ledger = ledgerTxs[override.ledgerIndex]
    const score = scoreMatch(statementTxs[stIdx], ledger, options)
    existing.statement = statementTxs[stIdx]
    existing.ledger = ledger
    existing.ledgerIndex = override.ledgerIndex
    existing.confidence = score.confidence && score.confidence !== 'none' ? score.confidence : 'manual'
    existing.score = score.score
    existing.amountDiff = score.amountDiff
    existing.dateDiffDays = score.dateDiffDays
    existing.noteSim = score.noteSim
    used.add(override.ledgerIndex)
  }
  return pairs
}

/**
 * Convenience: converts matched pairs into "cleared" ledger ids for the UI.
 */
export function getClearedLedgerIds(pairs) {
  return pairs.filter((p) => p.ledger).map((p) => p.ledger.id || p.ledger._id).filter(Boolean)
}
