import { findFuzzyDuplicates } from './fuzzyDuplicates'

export function checkMissingCategories(transactions) {
  return transactions
    .filter((t) => !t.category || t.category === '' || t.category === 'other')
    .map((t) => ({
      id: t.id,
      date: t.date,
      note: t.note || 'No description',
      amount: t.amount,
      type: t.type,
      issue: 'Missing category',
      severity: 'medium',
    }))
}

export function checkDuplicateTransactions(transactions) {
  const duplicates = []
  const seen = new Map()
  for (const t of transactions) {
    const key = `${t.date}|${t.amount}|${t.type}|${(t.note || '').toLowerCase()}`
    if (seen.has(key)) {
      duplicates.push({
        id: t.id,
        date: t.date,
        note: t.note || 'No description',
        amount: t.amount,
        type: t.type,
        duplicateOf: seen.get(key),
        issue: 'Possible duplicate transaction',
        severity: 'low',
      })
    } else {
      seen.set(key, t.id)
    }
  }
  return duplicates
}

export function checkSimilarTransactions(transactions) {
  const pairs = findFuzzyDuplicates(transactions, { similarityThreshold: 0.82, dateWindowDays: 5 })
  return pairs.map((p) => ({
    id: p.tx.id,
    date: p.tx.date,
    note: p.tx.note || 'No description',
    amount: p.tx.amount,
    type: p.tx.type,
    duplicateOf: p.duplicateOf.id,
    issue: `Similar to "${(p.duplicateOf.note || '').slice(0, 40)}" (${p.score}% match)`,
    severity: 'low',
  }))
}

export function checkOrphanedDocuments(documents, transactions, debts, emis) {
  const orphaned = []
  const linkedIds = new Set()
  transactions.forEach((t) => { if (t.documentId) linkedIds.add(t.documentId) })
  debts.forEach((d) => { if (d.documentId) linkedIds.add(d.documentId) })
  emis.forEach((e) => { if (e.documentId) linkedIds.add(e.documentId) })
  for (const doc of documents) {
    if (!linkedIds.has(doc.id) && (doc.linkedTo && doc.linkedTo.length === 0 || !doc.linkedTo)) {
      orphaned.push({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        issue: 'Orphaned document (not linked to any entity)',
        severity: 'low',
      })
    }
  }
  return orphaned
}

export function checkInactiveAccounts(accounts, transactions, transferCount) {
  const inactive = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  for (const acct of accounts) {
    const hasRecentTx = transactions.some((t) => t.accountId === acct.id && new Date(t.date) >= sixMonthsAgo)
    if (!hasRecentTx) {
      inactive.push({
        id: acct.id,
        name: acct.name,
        balance: acct.balance || 0,
        issue: 'No activity in 6+ months',
        severity: 'medium',
      })
    }
  }
  return inactive
}

export function checkBrokenRelationships(relationships, allEntityIds) {
  const broken = []
  for (const rel of relationships || []) {
    if (!allEntityIds.has(rel.sourceId)) {
      broken.push({
        id: rel.id,
        label: rel.label || 'Unnamed',
        issue: `Broken relationship: source ${rel.sourceType} "${rel.sourceId}" not found`,
        severity: 'medium',
      })
    }
    if (!allEntityIds.has(rel.targetId)) {
      broken.push({
        id: rel.id,
        label: rel.label || 'Unnamed',
        issue: `Broken relationship: target ${rel.targetType} "${rel.targetId}" not found`,
        severity: 'medium',
      })
    }
  }
  return broken
}

export function checkInvalidDates(transactions) {
  const invalid = []
  const now = Date.now()
  for (const t of transactions) {
    const ts = new Date(t.date).getTime()
    if (isNaN(ts) || ts > now + 86400000) {
      invalid.push({
        id: t.id,
        date: t.date,
        note: t.note || 'No description',
        amount: t.amount,
        issue: isNaN(ts) ? 'Invalid date' : 'Future date',
        severity: 'medium',
      })
    }
  }
  return invalid
}

export function runAllDataChecks(transactions, documents, debts, emis, accounts, relationships, transfers) {
  const allEntityIds = new Set()
  transactions.forEach((t) => allEntityIds.add(t.id))
  documents.forEach((d) => allEntityIds.add(d.id))
  debts.forEach((d) => allEntityIds.add(d.id))
  emis.forEach((e) => allEntityIds.add(e.id))
  accounts.forEach((a) => allEntityIds.add(a.id))

  const results = [
    ...checkMissingCategories(transactions).map((r) => ({ ...r, check: 'Missing Categories' })),
    ...checkDuplicateTransactions(transactions).map((r) => ({ ...r, check: 'Duplicate Transactions' })),
    ...checkSimilarTransactions(transactions).map((r) => ({ ...r, check: 'Similar Transactions' })),
    ...checkOrphanedDocuments(documents, transactions, debts, emis).map((r) => ({ ...r, check: 'Orphaned Documents' })),
    ...checkInactiveAccounts(accounts, transactions, transfers?.length || 0).map((r) => ({ ...r, check: 'Inactive Accounts' })),
    ...checkBrokenRelationships(relationships || [], allEntityIds).map((r) => ({ ...r, check: 'Broken Relationships' })),
    ...checkInvalidDates(transactions).map((r) => ({ ...r, check: 'Invalid Dates' })),
  ]

  return {
    issues: results,
    total: results.length,
    bySeverity: {
      low: results.filter((r) => r.severity === 'low').length,
      medium: results.filter((r) => r.severity === 'medium').length,
      high: results.filter((r) => r.severity === 'high').length,
    },
    byCheck: results.reduce((acc, r) => {
      acc[r.check] = (acc[r.check] || 0) + 1
      return acc
    }, {}),
  }
}
