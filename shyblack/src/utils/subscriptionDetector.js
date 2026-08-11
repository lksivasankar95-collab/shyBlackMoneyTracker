/**
 * Automatic subscription detector.
 * Scans transaction history for the same merchant charging a consistent
 * amount at a regular interval (weekly / monthly / yearly) and proposes
 * recurring subscription entries the user can one-tap to add.
 */

import { textSimilarity, normalizeNote } from './fuzzyDuplicates'

export const FREQUENCY_WINDOWS = {
  monthly: { min: 25, max: 35 },
  yearly: { min: 350, max: 380 },
  weekly: { min: 5, max: 9 },
}

const EXCLUDED_CATEGORIES = ['trading_deposit', 'trading_withdrawal', 'emi', 'borrow', 'lend']

export function merchantKey(note) {
  const key = normalizeNote(note)
  return key || null
}

function medianValue(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function classifyFrequency(intervals, toleranceDays) {
  const avg = intervals.reduce((s, i) => s + i, 0) / intervals.length
  for (const [freq, { min, max }] of Object.entries(FREQUENCY_WINDOWS)) {
    if (avg < min || avg > max) continue
    const maxDev = Math.max(...intervals.map((i) => Math.abs(i - avg)))
    if (maxDev <= toleranceDays + avg * 0.1) return freq
  }
  return null
}

export function advanceFrom(dateStr, frequency) {
  const d = new Date(dateStr + 'T00:00:00')
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Finds recurring-subscription patterns in expense history.
 * Returns candidates sorted by confidence, each with the metadata needed to
 * create a recurring entry directly.
 */
export function detectSubscriptionCandidates(transactions, existingRecurring = [], options = {}) {
  const {
    minOccurrences = 2,
    amountTolerancePct = 0.05,
    intervalToleranceDays = 4,
  } = options

  const groups = new Map()
  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'expense') continue
    if (EXCLUDED_CATEGORIES.includes(tx.category)) continue
    const key = merchantKey(tx.note)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(tx)
  }

  const existingNotes = (existingRecurring || [])
    .filter((r) => r && r.source === 'subscription')
    .map((r) => normalizeNote(r.note || r.subscriptionName || ''))

  const candidates = []
  for (const [key, txs] of groups) {
    if (txs.length < minOccurrences) continue
    const sorted = [...txs].sort((a, b) => (a.date > b.date ? 1 : -1))
    const times = sorted.map((t) => new Date(t.date + 'T00:00:00').getTime())
    const intervals = []
    for (let i = 1; i < times.length; i++) {
      intervals.push((times[i] - times[i - 1]) / 86400000)
    }
    if (intervals.some((i) => i < 1)) continue

    const frequency = classifyFrequency(intervals, intervalToleranceDays)
    if (!frequency) continue

    const amounts = sorted.map((t) => Math.abs(t.amount))
    const median = medianValue(amounts)
    const consistent = amounts.every((a) =>
      Math.abs(a - median) <= Math.max(1, median * amountTolerancePct)
    )
    if (!consistent) continue

    const sample = sorted[0]
    const alreadyTracked = existingNotes.some((n) => n && textSimilarity(n, normalizeNote(sample.note)) > 0.9)
    if (alreadyTracked) continue

    const confidence = Math.min(1, 0.4 + Math.min(txs.length, 6) * 0.12 + (frequency === 'monthly' ? 0.2 : 0.1))

    candidates.push({
      merchant: key,
      sampleNote: sample.note,
      category: sample.category || 'subscription',
      frequency,
      amount: Math.round(median * 100) / 100,
      occurrences: txs.length,
      firstDate: sorted[0].date,
      lastDate: sorted[sorted.length - 1].date,
      nextDate: advanceFrom(sorted[sorted.length - 1].date, frequency),
      avgIntervalDays: Math.round(intervals.reduce((s, i) => s + i, 0) / intervals.length),
      confidence: Math.round(confidence * 100),
      transactionIds: sorted.map((t) => t.id),
      estimatedMonthlyCost:
        frequency === 'monthly' ? median : frequency === 'weekly' ? median * 4.33 : median / 12,
    })
  }

  return candidates.sort((a, b) =>
    b.confidence - a.confidence || b.occurrences - a.occurrences || a.merchant.localeCompare(b.merchant)
  )
}
