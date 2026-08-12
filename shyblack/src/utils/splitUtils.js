/**
 * Category-level transaction splitting.
 * A single payment can be allocated across multiple categories. Splits are
 * stored as metadata on the parent transaction:
 *   { splits: [{ category, amount, note? }], splitTotal }
 * Totals stay intact (parent amount is the full payment); category-level
 * analytics expand the parent into its split lines.
 */

export const SPLIT_ROUNDING = 0.01

export function validateSplits(splits, totalAmount) {
  const lines = Array.isArray(splits) ? splits.filter(Boolean) : []
  if (lines.length === 0) return { valid: false, errors: ['no_lines'] }
  const errors = []
  let sum = 0
  for (const line of lines) {
    const amount = Number(line.amount)
    if (!line.category) {
      errors.push('missing_category')
      continue
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push('invalid_amount')
      continue
    }
    sum += amount
  }
  const total = Number(totalAmount)
  if (!Number.isFinite(total) || total <= 0) errors.push('invalid_total')
  else if (Math.abs(sum - total) > SPLIT_ROUNDING) errors.push('sum_mismatch')
  return { valid: errors.length === 0, errors, sum: Math.round(sum * 100) / 100 }
}

/**
 * Attaches split metadata to a transaction, rounding amounts to 2 decimals.
 * The parent keeps its own amount/category; splits describe the breakdown.
 */
export function attachSplits(transaction, splits) {
  if (!transaction || !Array.isArray(splits) || splits.length === 0) return transaction
  const lines = splits
    .filter((l) => l && l.category && Number(l.amount) > 0)
    .map((l) => ({
      category: l.category,
      amount: Math.round(Number(l.amount) * 100) / 100,
      note: l.note ? String(l.note).trim() : undefined,
    }))
  if (lines.length === 0) return transaction
  return {
    ...transaction,
    category: transaction.category || lines[0].category,
    splits: lines,
    splitTotal: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100,
  }
}

/**
 * Expands a transaction into its split lines for category-level views.
 * Returns [{ ...tx, splitCategory, splitAmount }] — one entry when no splits.
 */
export function getSplitLines(transaction) {
  if (!transaction) return []
  const lines = Array.isArray(transaction.splits) ? transaction.splits : []
  if (lines.length === 0) {
    return [{ ...transaction, splitCategory: transaction.category, splitAmount: transaction.amount }]
  }
  return lines.map((l) => ({
    ...transaction,
    splitCategory: l.category,
    splitAmount: l.amount,
    splitNote: l.note,
  }))
}

/**
 * Flattens a transaction list into split-aware rows, preserving order.
 */
export function expandSplitTransactions(transactions) {
  const rows = []
  for (const t of transactions || []) {
    rows.push(...getSplitLines(t))
  }
  return rows
}

/**
 * Sums expense totals per category, splitting parents across their lines.
 * Returns [{ category, amount }] sorted by amount desc.
 */
export function getSplitCategoryBreakdown(transactions, type = 'expense') {
  const grouped = {}
  for (const tx of transactions || []) {
    if (tx.type !== type) continue
    for (const line of getSplitLines(tx)) {
      const cat = line.splitCategory || tx.category || 'other'
      grouped[cat] = (grouped[cat] || 0) + line.splitAmount
    }
  }
  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * True when the transaction carries category splits.
 */
export function hasSplits(transaction) {
  return !!(transaction && Array.isArray(transaction.splits) && transaction.splits.length > 0)
}