import { normalizeNote } from './fuzzyDuplicates'
import { getSplitLines } from './splitUtils'

/**
 * Merchant analytics.
 * Groups expenses by their merchant (normalized note) and aggregates totals,
 * averages, monthly trends and weekday patterns.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const REF_PATTERN = /\b(?:order|bill|inv|receipt|pay|ref|utr|rrn|txn|id|no)\b[:\s#]*[\w.-]{2,}/g
const GENERIC_WORDS = new Set([
  'plan', 'renewal', 'subscription', 'recharge', 'topup', 'top', 'payment', 'fee',
  'charge', 'charges', 'deposit', 'withdrawal', 'transfer', 'sent', 'recv',
  'credited', 'debited', 'spent', 'paid', 'purchase', 'buy',
])
const DIGITS = /\b\d{2,}\b/g

/**
 * Extracts a merchant key from a note by stripping references, numbers and
 * generic payment words (e.g. "Swiggy order #123" → "swiggy",
 * "Netflix plan" / "Netflix renewal" → "netflix").
 */
export function extractMerchant(note) {
  const normalized = normalizeNote(note)
  if (!normalized) return null
  const cleaned = normalized
    .replace(REF_PATTERN, ' ')
    .replace(DIGITS, ' ')
    .split(/\s+/)
    .filter((w) => w && !GENERIC_WORDS.has(w))
  return cleaned.length ? cleaned.join(' ') : null
}

function monthBucket(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function weekdayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d.getTime()) ? -1 : d.getDay()
}

function lastMonths(count) {
  const buckets = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return buckets
}

/**
 * Groups transactions (expenses by default) by merchant and returns a stats
 * array sorted by total spend (desc). Each entry:
 *   { merchant, total, count, avg, max, firstDate, lastDate,
 *     topCategory, monthly: [{ bucket, amount }], weekday: [7 amounts] }
 */
export function getMerchantStats(transactions, options = {}) {
  const { type = 'expense', months = 6, minCount = 1 } = options
  const buckets = lastMonths(months)
  const map = new Map()

  for (const tx of transactions || []) {
    if (tx.type !== type) continue
    for (const line of getSplitLines(tx)) {
      const key = extractMerchant(line.note || '')
      if (!key) continue
      let entry = map.get(key)
      if (!entry) {
        entry = {
          merchant: key,
          sample: (line.note || '').trim(),
          total: 0,
          count: 0,
          max: 0,
          firstDate: line.date,
          lastDate: line.date,
          categoryCounts: {},
          monthly: new Map(),
          weekday: [0, 0, 0, 0, 0, 0, 0],
        }
        map.set(key, entry)
      }
      const amount = Math.abs(line.splitAmount || line.amount || 0)
      entry.total += amount
      entry.count += 1
      entry.max = Math.max(entry.max, amount)
      if (!entry.firstDate || line.date < entry.firstDate) entry.firstDate = line.date
      if (!entry.lastDate || line.date > entry.lastDate) entry.lastDate = line.date
      const cat = line.splitCategory || line.category || 'other'
      entry.categoryCounts[cat] = (entry.categoryCounts[cat] || 0) + 1
      const b = monthBucket(line.date)
      if (b) entry.monthly.set(b, (entry.monthly.get(b) || 0) + amount)
      const wd = weekdayOf(line.date)
      if (wd >= 0) entry.weekday[wd] += amount
    }
  }

  const result = [...map.values()]
    .filter((e) => e.count >= minCount)
    .map((e) => {
      const monthly = buckets.map((b) => ({ bucket: b, amount: Math.round((e.monthly.get(b) || 0) * 100) / 100 }))
      const topCategory = Object.entries(e.categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || undefined
      return {
        merchant: e.merchant,
        sample: e.sample,
        total: Math.round(e.total * 100) / 100,
        count: e.count,
        avg: Math.round((e.total / e.count) * 100) / 100,
        max: Math.round(e.max * 100) / 100,
        firstDate: e.firstDate,
        lastDate: e.lastDate,
        topCategory,
        monthly,
        weekday: e.weekday,
        weeklyLabels: WEEKDAYS,
      }
    })
    .sort((a, b) => b.total - a.total)

  return result
}

export function getMerchantSummary(transactions, options = {}) {
  const stats = getMerchantStats(transactions, options)
  const total = stats.reduce((s, m) => s + m.total, 0)
  return {
    merchantCount: stats.length,
    totalMerchantSpend: Math.round(total * 100) / 100,
    topMerchant: stats[0]?.merchant || null,
    topMerchantSpend: stats[0]?.total || 0,
    avgPerMerchant: stats.length ? Math.round((total / stats.length) * 100) / 100 : 0,
    stats,
  }
}