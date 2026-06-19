import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'
import { getEmis } from './emi'
import { getDocuments } from './documents'
import { getGoals } from './goals'

export const ENTITY_TYPES = [
  { id: 'transaction', label: 'Transaction', icon: 'ArrowUpDown' },
  { id: 'emi', label: 'EMI', icon: 'Landmark' },
  { id: 'ledger', label: 'Borrow/Lend', icon: 'Users' },
  { id: 'goal', label: 'Goal', icon: 'Target' },
  { id: 'account', label: 'Account', icon: 'Wallet' },
  { id: 'document', label: 'Document', icon: 'FileText' },
]

export function getRelationships() {
  return safeStorage.get(STORAGE_KEYS.RELATIONSHIPS, [])
}

export function saveRelationships(rels) {
  return safeStorage.set(STORAGE_KEYS.RELATIONSHIPS, rels)
}

export function createRelationship(sourceType, sourceId, targetType, targetId, label) {
  const rels = getRelationships()
  const existing = rels.find(
    (r) => r.sourceType === sourceType && r.sourceId === sourceId && r.targetType === targetType && r.targetId === targetId
  )
  if (existing) return existing

  const rel = {
    id: generateId(),
    sourceType, sourceId, targetType, targetId,
    label: label || '',
    createdAt: Date.now(),
  }
  rels.push(rel)
  saveRelationships(rels)
  return rel
}

export function deleteRelationship(id) {
  const rels = getRelationships()
  const idx = rels.findIndex((r) => r.id === id)
  if (idx === -1) return false
  rels.splice(idx, 1)
  saveRelationships(rels)
  return true
}

export function getRelationshipsForEntity(entityType, entityId) {
  const rels = getRelationships()
  return rels.filter(
    (r) => (r.sourceType === entityType && r.sourceId === entityId) ||
           (r.targetType === entityType && r.targetId === entityId)
  )
}

export function getRelatedEntities(entityType, entityId) {
  const rels = getRelationshipsForEntity(entityType, entityId)
  return rels.map((r) => {
    const isSource = r.sourceType === entityType && r.sourceId === entityId
    return {
      relationshipId: r.id,
      label: r.label,
      relatedType: isSource ? r.targetType : r.sourceType,
      relatedId: isSource ? r.targetId : r.sourceId,
      createdAt: r.createdAt,
    }
  })
}

export function getEntityLabel(type, id) {
  if (!id) return null
  try {
    if (type === 'emi') {
      const emis = getEmis()
      const e = emis.find((x) => x.id === id)
      return e ? e.name : null
    }
    if (type === 'document') {
      const docs = getDocuments()
      const d = docs.find((x) => x.id === id)
      return d ? d.title : null
    }
    if (type === 'goal') {
      const goals = getGoals()
      const g = goals.find((x) => x.id === id)
      return g ? g.name : null
    }
    if (type === 'ledger') {
      const debts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
      const d = debts.find((x) => x.id === id)
      return d ? d.personName : null
    }
    if (type === 'account') {
      const accts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
      const a = accts.find((x) => x.id === id)
      return a ? a.name : null
    }
    if (type === 'transaction') {
      const txs = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
      const t = txs.find((x) => x.id === id)
      return t ? (t.note || t.category || 'Transaction') : null
    }
    return null
  } catch {
    return null
  }
}

export function getAllEntitiesByType(type) {
  try {
    if (type === 'emi') return getEmis().map((e) => ({ id: e.id, label: e.name, sublabel: e.lender }))
    if (type === 'document') return getDocuments().map((d) => ({ id: d.id, label: d.title, sublabel: d.category }))
    if (type === 'goal') return getGoals().map((g) => ({ id: g.id, label: g.name, sublabel: g.category }))
    if (type === 'ledger') {
      const debts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
      return debts.map((d) => ({ id: d.id, label: d.personName, sublabel: d.type }))
    }
    if (type === 'account') {
      const accts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
      return accts.map((a) => ({ id: a.id, label: a.name, sublabel: a.type }))
    }
    if (type === 'transaction') {
      const txs = safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])
      return txs.slice(0, 200).map((t) => ({ id: t.id, label: t.note || t.category || 'Transaction', sublabel: `${t.type} · ${t.date}` }))
    }
    return []
  } catch {
    return []
  }
}
