import { getRelationships } from './relationships'
import { getDocuments, DOCUMENT_CATEGORIES } from './documents'
import { getEmis } from './emi'
import { safeStorage, STORAGE_KEYS } from './safeStorage'

export function generateRelationshipInsights() {
  const insights = []
  const rels = getRelationships()
  const docs = getDocuments()
  const emis = getEmis()

  for (const doc of docs) {
    if (doc.category === 'insurance') {
      const hasVehicleDoc = docs.some((d) => d.id !== doc.id && (d.category === 'vehicle' || d.category === 'loan'))
      if (!hasVehicleDoc) {
        insights.push({
          type: 'info',
          text: `"${doc.title}" is an insurance document. Consider linking it to related loan or vehicle documents.`,
          icon: 'FileText',
        })
      }
    }
  }

  const docTypes = {}
  docs.forEach((d) => {
    if (!docTypes[d.category]) docTypes[d.category] = []
    docTypes[d.category].push(d)
  })

  const linkedDocIds = new Set()
  rels.forEach((r) => {
    if (r.sourceType === 'document') linkedDocIds.add(r.sourceId)
    if (r.targetType === 'document') linkedDocIds.add(r.targetId)
  })

  for (const [cat, catDocs] of Object.entries(docTypes)) {
    const unlinked = catDocs.filter((d) => !linkedDocIds.has(d.id))
    if (unlinked.length > 0) {
      const catLabel = DOCUMENT_CATEGORIES.find((c) => c.id === cat)?.label || cat
      insights.push({
        type: 'info',
        text: `${unlinked.length} ${catLabel} document${unlinked.length !== 1 ? 's' : ''} not linked to any entity. Use the link feature to connect them.`,
        icon: 'Link',
      })
    }
  }

  const activeEmis = emis.filter((e) => e.status !== 'closed')
  for (const emi of activeEmis) {
    const emiRels = rels.filter(
      (r) => (r.sourceType === 'emi' && r.sourceId === emi.id) ||
             (r.targetType === 'emi' && r.targetId === emi.id)
    )
    const hasDoc = emiRels.some((r) => r.sourceType === 'document' || r.targetType === 'document')
    if (!hasDoc) {
      insights.push({
        type: 'warning',
        text: `"${emi.name}" has no linked documents. Consider adding the agreement or policy document.`,
        icon: 'FileWarning',
      })
    }
  }

  const debts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
  const activeDebts = debts.filter((d) => d.status !== 'settled')
  for (const debt of activeDebts) {
    const debtRels = rels.filter(
      (r) => (r.sourceType === 'ledger' && r.sourceId === debt.id) ||
             (r.targetType === 'ledger' && r.targetId === debt.id)
    )
    if (debtRels.length === 0) {
      insights.push({
        type: 'info',
        text: `"${debt.personName}" has no linked documents. Link receipts or agreements for easier tracking.`,
        icon: 'Users',
      })
    }
  }

  return insights
}
