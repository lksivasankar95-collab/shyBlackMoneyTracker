import { safeStorage, STORAGE_KEYS } from './safeStorage'

const ARCHIVE_CUTOFF_MONTHS = 24

export function getArchiveMeta() {
  return safeStorage.get(STORAGE_KEYS.ARCHIVE, { version: 1, transactions: [], archivedAt: null })
}

function saveArchiveMeta(meta) {
  safeStorage.set(STORAGE_KEYS.ARCHIVE, meta)
}

export function archiveOldTransactions(transactions) {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - ARCHIVE_CUTOFF_MONTHS, 1)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const active = []
  const toArchive = []

  for (const tx of transactions) {
    if (tx.date < cutoffStr) {
      toArchive.push(tx)
    } else {
      active.push(tx)
    }
  }

  if (toArchive.length === 0) {
    return { active, archivedCount: 0 }
  }

  const meta = getArchiveMeta()
  const existingIds = new Set(meta.transactions.map((t) => t.id))
  const newArchived = toArchive.filter((t) => !existingIds.has(t.id))
  meta.transactions.push(...newArchived)
  meta.archivedAt = Date.now()

  if (meta.transactions.length > 10000) {
    meta.transactions = meta.transactions.slice(-10000)
  }

  saveArchiveMeta(meta)
  return { active, archivedCount: newArchived.length }
}

export function getArchivedTransactions(searchTerm) {
  const meta = getArchiveMeta()
  if (!searchTerm) return meta.transactions

  const q = searchTerm.toLowerCase()
  return meta.transactions.filter((t) => {
    if (t.note && t.note.toLowerCase().includes(q)) return true
    if (t.category && t.category.toLowerCase().includes(q)) return true
    if (t.date && t.date.includes(q)) return true
    if (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))) return true
    return false
  })
}

export function restoreFromArchive(ids) {
  const meta = getArchiveMeta()
  const idsSet = new Set(ids)
  const restored = []
  const remaining = []

  for (const tx of meta.transactions) {
    if (idsSet.has(tx.id)) {
      restored.push(tx)
    } else {
      remaining.push(tx)
    }
  }

  if (restored.length === 0) return { restored: [] }

  meta.transactions = remaining
  saveArchiveMeta(meta)
  return { restored }
}

export function restoreAllArchived() {
  const meta = getArchiveMeta()
  const restored = meta.transactions
  meta.transactions = []
  saveArchiveMeta(meta)
  return { restored }
}

export function getArchiveStats() {
  const meta = getArchiveMeta()
  const count = meta.transactions.length
  if (count === 0) return { count: 0, oldestDate: null, newestDate: null, dateRange: null }

  let oldest = meta.transactions[0].date
  let newest = meta.transactions[0].date
  for (const tx of meta.transactions) {
    if (tx.date < oldest) oldest = tx.date
    if (tx.date > newest) newest = tx.date
  }

  return {
    count,
    oldestDate: oldest,
    newestDate: newest,
    dateRange: `${oldest} — ${newest}`,
    archivedAt: meta.archivedAt ? new Date(meta.archivedAt).toISOString().split('T')[0] : null,
  }
}

export function estimateArchiveableCount(transactions) {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - ARCHIVE_CUTOFF_MONTHS, 1)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return transactions.filter((t) => t.date < cutoffStr).length
}
