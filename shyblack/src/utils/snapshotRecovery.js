import { safeStorage, STORAGE_KEYS } from './safeStorage'

const SNAPSHOT_KEY = `${STORAGE_KEYS.SNAPSHOT}_chain`
const MAX_SNAPSHOTS = 0
const SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function isValidTransaction(t) {
  return t && typeof t === 'object' && typeof t.id === 'string' && typeof t.type === 'string' && typeof t.amount === 'number'
}

function isValidSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return false
  if (typeof snap.ts !== 'number') return false
  if (snap.ts <= 0 || snap.ts > Date.now() + 86400000) return false
  if (!Array.isArray(snap.transactions)) return false
  if (snap.transactions.length > 0 && !snap.transactions.every(isValidTransaction)) return false
  return true
}

function pruneSnapshots(chain) {
  const valid = chain.filter((s) => {
    if (!isValidSnapshot(s)) return false
    if (Date.now() - s.ts > SNAPSHOT_MAX_AGE_MS) return false
    return true
  })
  valid.sort((a, b) => b.ts - a.ts)
  if (MAX_SNAPSHOTS > 0) return valid.slice(0, MAX_SNAPSHOTS)
  return valid
}

export function getSnapshotChain() {
  try {
    const raw = safeStorage.getRaw(SNAPSHOT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return pruneSnapshots(parsed)
  } catch {
    return []
  }
}

export function saveSnapshot(transactions, savingsGoal) {
  try {
    const chain = getSnapshotChain()
    const isTruncated = transactions.length > 200
    const snapshot = {
      ts: Date.now(),
      transactions: transactions.slice(0, 200),
      totalTransactionCount: transactions.length,
      truncated: isTruncated,
      savingsGoal: savingsGoal || { target: 0, saved: 0 },
    }
    chain.unshift(snapshot)
    const pruned = pruneSnapshots(chain)
    safeStorage.set(SNAPSHOT_KEY, pruned)
    return pruned.length
  } catch {
    return 0
  }
}

export function findLatestValidSnapshot() {
  const chain = getSnapshotChain()
  for (const snap of chain) {
    if (isValidSnapshot(snap)) return snap
  }
  return null
}

export function findRecoverySnapshot(transactions) {
  if (transactions.length > 0) return null
  const onboarding = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
  if (!onboarding?.hasCompletedOnboarding) return null
  return findLatestValidSnapshot()
}

export function getRecoveryChainSummary() {
  const chain = getSnapshotChain()
  return {
    total: chain.length,
    snapshots: chain.map((s) => ({
      age: Date.now() - s.ts,
      ageDays: Math.round((Date.now() - s.ts) / 86400000),
      txCount: s.transactions.length,
      totalTransactionCount: s.totalTransactionCount ?? s.transactions.length,
      truncated: s.truncated || false,
      valid: isValidSnapshot(s),
    })),
    newest: chain.length > 0 ? chain[0].ts : null,
    oldest: chain.length > 0 ? chain[chain.length - 1].ts : null,
  }
}

export function clearSnapshotChain() {
  try {
    safeStorage.remove(SNAPSHOT_KEY)
    return true
  } catch {
    return false
  }
}

export function detectCorruption() {
  const issues = []
  const chain = getSnapshotChain()
  for (let i = 0; i < chain.length; i++) {
    if (!isValidSnapshot(chain[i])) {
      issues.push({ index: i, reason: 'invalid snapshot structure' })
    }
  }
  const main = safeStorage.getRaw(STORAGE_KEYS.TRANSACTIONS)
  if (main !== null) {
    try {
      const parsed = JSON.parse(main)
      if (!Array.isArray(parsed)) {
        issues.push({ index: -1, reason: 'main storage transactions is not an array' })
      }
    } catch {
      issues.push({ index: -1, reason: 'main storage transactions is corrupted JSON' })
    }
  }
  return issues
}
