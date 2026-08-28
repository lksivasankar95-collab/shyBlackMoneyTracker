function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function merchantMatches(receiptMerchant, txText) {
  const a = normalize(receiptMerchant)
  const b = normalize(txText)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true
  const aWords = a.split(' ').filter((w) => w.length > 3)
  const bWords = b.split(' ').filter((w) => w.length > 3)
  return aWords.some((w) => bWords.includes(w)) || bWords.some((w) => aWords.includes(w))
}

export function getReceiptMatchScore(receipt, tx) {
  if (!receipt || !tx || tx.type !== 'expense') return null
  if (!receipt.amount || receipt.amount <= 0) return null

  const days = Math.abs(new Date(receipt.date).getTime() - new Date(tx.date).getTime()) / 86400000
  if (days > 5) return null

  const amountDiffPct = Math.abs(receipt.amount - tx.amount) / Math.max(1, receipt.amount)
  if (amountDiffPct > 0.25) return null

  let score = 100
  score -= days * 8
  score -= amountDiffPct * 50

  const merchantHit = receipt.merchant ? merchantMatches(receipt.merchant, tx.note || tx.category || '') : false
  if (merchantHit) score += 15
  else if (receipt.merchant) score -= 12

  if (receipt.category && tx.category && receipt.category === tx.category) score += 5

  return Math.max(0, Math.round(score))
}

export function findReceiptMatchSuggestions(receipts = [], transactions = [], _maxPerReceipt = 1) {
  const unlinked = (receipts || []).filter((r) => !r.transactionId)
  const suggestions = []

  for (const receipt of unlinked) {
    let best = { tx: null, score: 0 }
    for (const tx of transactions) {
      const score = getReceiptMatchScore(receipt, tx)
      if (score === null) continue
      if (score > best.score) best = { tx, score }
    }
    if (best.tx && best.score >= 45) {
      suggestions.push({
        receipt,
        match: best.tx,
        score: best.score,
        daysDifference: Math.abs(new Date(receipt.date).getTime() - new Date(best.tx.date).getTime()) / 86400000,
        merchantMatched: receipt.merchant ? merchantMatches(receipt.merchant, best.tx.note || best.tx.category || '') : false,
      })
    }
  }

  suggestions.sort((a, b) => b.score - a.score)

  const seenTx = new Set()
  const result = []
  for (const s of suggestions) {
    if (result.length >= 6) break
    if (seenTx.has(s.match.id)) continue
    seenTx.add(s.match.id)
    result.push(s)
  }
  return result
}