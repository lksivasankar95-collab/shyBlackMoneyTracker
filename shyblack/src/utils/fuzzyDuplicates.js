/**
 * Fuzzy duplicate detection for transactions.
 * Layered on top of exact-hash dedupe: matches same merchant/note patterns
 * within a date + amount window using Levenshtein-based text similarity.
 */

export function levenshteinDistance(a, b) {
  const s = String(a || '')
  const t = String(b || '')
  if (s === t) return 0
  if (!s.length) return t.length
  if (!t.length) return s.length

  let prev = new Array(t.length + 1)
  let curr = new Array(t.length + 1)
  for (let j = 0; j <= t.length; j++) prev[j] = j

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[t.length]
}

export function textSimilarity(a, b) {
  const s = String(a || '').toLowerCase().trim()
  const t = String(b || '').toLowerCase().trim()
  if (!s.length && !t.length) return 1
  if (!s.length || !t.length) return 0
  const maxLen = Math.max(s.length, t.length)
  return 1 - levenshteinDistance(s, t) / maxLen
}

/**
 * Normalizes transaction notes so "UPI/ZOMATO PAYMENTS", "Zomato - UPI" and
 * "zomato ref 41203" all collapse to the same merchant key.
 */
export function normalizeNote(note) {
  return String(note || '')
    .toLowerCase()
    .replace(/\b(upi|gpay|phonepe|paytm|bhim|netbanking|neft|imps|rtgs|intrabank)\b/g, ' ')
    .replace(/\b(?:ref|utr|rrn|txn|id|no)[:\s#]*[a-z0-9.-]{4,}\b/g, ' ')
    .replace(/@\w+(?:\.\w+)*/g, ' ')
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function dateDiffDays(a, b) {
  const ta = new Date(a || 0).getTime()
  const tb = new Date(b || 0).getTime()
  if (isNaN(ta) || isNaN(tb)) return Infinity
  return Math.abs(ta - tb) / 86400000
}

export function amountTolerance(a, b, tolerancePct, toleranceAbs) {
  const pct = Math.max(Math.abs(a), Math.abs(b)) * (tolerancePct || 0)
  return Math.max(toleranceAbs || 0, pct)
}

const DEFAULT_OPTIONS = {
  similarityThreshold: 0.85,
  dateWindowDays: 3,
  amountTolerancePct: 0.02,
  amountToleranceAbs: 5,
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Finds pairs of near-duplicate transactions inside a single list.
 * Returns an array of { tx, duplicateOf, similarity, score, amountDiff, dateDiffDays }.
 * Optimized: entries are sorted by amount and compared inside a sliding
 * tolerance window, so typical datasets stay near O(n · bucket).
 */
export function findFuzzyDuplicates(transactions, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const list = (transactions || [])
    .filter((t) => t && typeof t.amount === 'number')
    .map((t) => ({ t, abs: Math.abs(t.amount), note: normalizeNote(t.note) }))
    .sort((a, b) => a.abs - b.abs)

  const duplicates = []
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]
      const diff = b.abs - a.abs
      // Window bound grows with b.abs (which is monotonic in j), so once
      // exceeded we can break out of the inner loop.
      const windowBound = b.abs * opts.amountTolerancePct + opts.amountToleranceAbs + 1
      if (diff > windowBound) break
      if (a.t.type !== b.t.type) continue

      const amountDiff = Math.abs(a.t.amount - b.t.amount)
      if (amountDiff > amountTolerance(a.t.amount, b.t.amount, opts.amountTolerancePct, opts.amountToleranceAbs)) continue

      const dateDiff = dateDiffDays(a.t.date, b.t.date)
      if (dateDiff > opts.dateWindowDays) continue

      const sim = textSimilarity(a.note, b.note)
      if (sim < opts.similarityThreshold) continue

      duplicates.push({
        tx: b.t,
        duplicateOf: a.t,
        similarity: round2(sim),
        score: Math.round(sim * 100),
        amountDiff: round2(amountDiff),
        dateDiffDays: round2(dateDiff),
      })
    }
  }
  return duplicates
}

/**
 * Filters imported candidates against existing transactions, dropping any that
 * look like a fuzzy match (same merchant, amount and date window).
 * Returns { result, duplicates } where duplicates carry match metadata.
 */
export function filterFuzzyDuplicates(candidates, existingTransactions, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const existing = (existingTransactions || [])
    .filter((t) => t && typeof t.amount === 'number')
    .map((ex) => ({ ex, note: normalizeNote(ex.note), abs: Math.abs(ex.amount) }))
  const result = []
  const duplicates = []
  for (const candidate of candidates || []) {
    let best = null
    let bestSim = 0
    const candNote = normalizeNote(candidate.note)
    const candAbs = Math.abs(candidate.amount)
    for (const { ex, note, abs } of existing) {
      if (ex.type !== candidate.type) continue
      if (Math.abs(candAbs - abs) > amountTolerance(candidate.amount, ex.amount, opts.amountTolerancePct, opts.amountToleranceAbs)) continue
      const dateDiff = dateDiffDays(candidate.date, ex.date)
      if (dateDiff > opts.dateWindowDays) continue
      const sim = textSimilarity(candNote, note)
      if (sim < opts.similarityThreshold) continue
      if (sim > bestSim) {
        bestSim = sim
        best = { tx: ex, similarity: sim, amountDiff: Math.abs(candidate.amount - ex.amount), dateDiffDays: dateDiff }
      }
    }
    if (best) {
      duplicates.push({
        tx: candidate,
        duplicateOf: best.tx,
        similarity: round2(best.similarity),
        score: Math.round(best.similarity * 100),
        amountDiff: round2(best.amountDiff),
        dateDiffDays: round2(best.dateDiffDays),
      })
    } else {
      result.push(candidate)
    }
  }
  return { result, duplicates }
}

/**
 * Exact-hash dedupe (as used by the importers) plus a fuzzy pass.
 * Returns { result, duplicates, fuzzyDuplicates }.
 */
export function dedupeWithFuzzy(list, existingTransactions, options = {}) {
  const exactKeys = new Set()
  for (const tx of existingTransactions || []) {
    if (tx && tx.date && tx.amount && tx.type && tx.note) {
      exactKeys.add(`${tx.type}|${tx.date}|${tx.amount}|${String(tx.note).toLowerCase().slice(0, 40)}`)
    }
  }
  const exactResult = []
  let exactDuplicates = 0
  for (const tx of list || []) {
    const key = `${tx.type}|${tx.date}|${tx.amount}|${String(tx.note || '').toLowerCase().slice(0, 40)}`
    if (exactKeys.has(key)) {
      exactDuplicates++
      continue
    }
    exactKeys.add(key)
    exactResult.push(tx)
  }
  const fuzzy = filterFuzzyDuplicates(exactResult, existingTransactions, options)
  return {
    result: fuzzy.result,
    duplicates: exactDuplicates + fuzzy.duplicates.length,
    fuzzyDuplicates: fuzzy.duplicates,
    exactDuplicates,
  }
}
