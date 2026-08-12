import { findFuzzyDuplicates } from './fuzzyDuplicates'

/**
 * Merges a duplicate transaction into a primary one, keeping the primary's
 * identity/amount while enriching it with metadata from the duplicate
 * (better note, extra tags, payment method / person / account fallbacks).
 */

export function mergeDuplicateTransactions(primary, duplicate) {
  const base = { ...primary }
  const dup = duplicate || {}

  const pick = (key) => (base[key] ? base[key] : dup[key])

  const merged = {
    ...base,
    note: pickNote(base.note, dup.note),
    tags: mergeTags(base.tags, dup.tags),
    paymentMethod: pick('paymentMethod'),
    personName: pick('personName'),
    accountId: pick('accountId'),
    source: pick('source'),
    mergedFrom: Array.from(new Set([...(base.mergedFrom || []), ...(dup.mergedFrom || []), dup.id].filter(Boolean))),
    mergedCount: (base.mergedCount || 0) + (dup.mergedCount || 0) + 1,
    updatedAt: Date.now(),
  }
  return merged
}

function pickNote(a, b) {
  const na = String(a || '').trim()
  const nb = String(b || '').trim()
  if (!na) return nb
  if (!nb) return na
  return nb.length > na.length ? nb : na
}

function mergeTags(a, b) {
  const all = Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]))
  return all.length ? all : undefined
}

/**
 * Merges a list of duplicate pairs (from findFuzzyDuplicates) into one
 * transaction list. Pairs are [{ tx, duplicateOf }]. Returns the new list
 * and the count of merged transactions.
 */
export function mergeDuplicatesInList(transactions, pairs) {
  const working = transactions.map((t) => ({ ...t }))
  const removed = new Set()
  let mergedCount = 0

  for (const pair of pairs || []) {
    if (!pair || !pair.tx || !pair.duplicateOf) continue
    if (removed.has(pair.tx.id) || removed.has(pair.duplicateOf.id)) continue
    const index = working.findIndex((t) => t.id === pair.duplicateOf.id)
    if (index === -1) continue
    const dupIndex = working.findIndex((t) => t.id === pair.tx.id)
    if (dupIndex === -1) continue
    const dup = working[dupIndex]
    working[index] = mergeDuplicateTransactions(working[index], dup)
    working.splice(dupIndex, 1)
    removed.add(dup.id)
    mergedCount += 1
  }

  return { transactions: working, mergedCount }
}

/**
 * Finds similar pairs among a list and merges them automatically.
 * Returns { transactions, mergedCount, pairs } for convenience.
 */
export function mergeAllSimilarTransactions(transactions, options = {}) {
  const pairs = findFuzzyDuplicates(transactions, options)
  const result = mergeDuplicatesInList(transactions, pairs)
  return { ...result, pairs }
}