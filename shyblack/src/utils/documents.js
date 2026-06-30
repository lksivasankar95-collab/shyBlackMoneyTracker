import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export const DOCUMENT_CATEGORIES = [
  { id: 'loan', label: 'Loan', icon: 'FileText' },
  { id: 'emi', label: 'EMI', icon: 'Landmark' },
  { id: 'insurance', label: 'Insurance', icon: 'Shield' },
  { id: 'vehicle', label: 'Vehicle', icon: 'Car' },
  { id: 'gold', label: 'Gold', icon: 'CircleDollarSign' },
  { id: 'tax', label: 'Tax', icon: 'Receipt' },
  { id: 'salary', label: 'Salary', icon: 'Briefcase' },
  { id: 'utility', label: 'Utility', icon: 'Zap' },
  { id: 'receipt', label: 'Receipt', icon: 'ScrollText' },
  { id: 'property', label: 'Property', icon: 'Home' },
  { id: 'warranty', label: 'Warranty', icon: 'ShieldCheck' },
  { id: 'rental', label: 'Rental', icon: 'Key' },
  { id: 'other', label: 'Other', icon: 'FolderOpen' },
]

export const ENTITY_TYPES = [
  { id: 'emi', label: 'EMI' },
  { id: 'ledger', label: 'Borrow/Lend' },
  { id: 'transaction', label: 'Transaction' },
  { id: 'goal', label: 'Goal' },
  { id: 'vehicle-expense', label: 'Vehicle Expense' },
]

export const DOCUMENT_SORT_OPTIONS = [
  { id: 'title', label: 'Name' },
  { id: 'createdAt', label: 'Date Added' },
  { id: 'category', label: 'Category' },
  { id: 'updatedAt', label: 'Last Modified' },
]

export function getDocuments() {
  return safeStorage.get(STORAGE_KEYS.DOCUMENTS, [])
}

export function saveDocuments(docs) {
  return safeStorage.set(STORAGE_KEYS.DOCUMENTS, docs)
}

export function getDocumentFiles() {
  return safeStorage.get(STORAGE_KEYS.DOCUMENT_FILES, {})
}

export function saveDocumentFiles(files) {
  return safeStorage.set(STORAGE_KEYS.DOCUMENT_FILES, files)
}

export function createDocument(data) {
  const docs = getDocuments()
  const id = generateId()
  const now = Date.now()
  const doc = {
    id,
    title: (data.title || '').trim(),
    category: data.category || 'other',
    fileName: data.fileName || '',
    fileType: data.fileType || 'unknown',
    fileSize: data.fileSize || 0,
    fileDataId: null,
    notes: (data.notes || '').trim(),
    tags: Array.isArray(data.tags) ? data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
    relatedEntityType: data.relatedEntityType || null,
    relatedEntityId: data.relatedEntityId || null,
    createdAt: now,
    updatedAt: now,
    starred: false,
  }

  if (data.fileData) {
    const fileId = generateId()
    const files = getDocumentFiles()
    files[fileId] = data.fileData
    saveDocumentFiles(files)
    doc.fileDataId = fileId
  }

  docs.unshift(doc)
  saveDocuments(docs)
  return doc
}

export function updateDocument(id, updates) {
  const docs = getDocuments()
  const idx = docs.findIndex((d) => d.id === id)
  if (idx === -1) return null

  const allowed = ['title', 'category', 'notes', 'tags', 'relatedEntityType', 'relatedEntityId', 'starred', 'fileName', 'fileType', 'fileSize']
  for (const key of allowed) {
    if (key in updates) {
      if (key === 'tags') {
        docs[idx][key] = Array.isArray(updates[key])
          ? updates[key].map((t) => t.trim().toLowerCase()).filter(Boolean)
          : []
      } else if (key === 'title' || key === 'notes' || key === 'fileName') {
        docs[idx][key] = (updates[key] || '').trim()
      } else {
        docs[idx][key] = updates[key]
      }
    }
  }

  if (updates.fileData) {
    const fileId = generateId()
    const files = getDocumentFiles()
    files[fileId] = updates.fileData
    saveDocumentFiles(files)
    if (docs[idx].fileDataId) {
      const oldFiles = getDocumentFiles()
      delete oldFiles[docs[idx].fileDataId]
      saveDocumentFiles(oldFiles)
    }
    docs[idx].fileDataId = fileId
  }

  docs[idx].updatedAt = Date.now()
  saveDocuments(docs)
  return docs[idx]
}

export function deleteDocument(id) {
  const docs = getDocuments()
  const idx = docs.findIndex((d) => d.id === id)
  if (idx === -1) return false

  if (docs[idx].fileDataId) {
    const files = getDocumentFiles()
    delete files[docs[idx].fileDataId]
    saveDocumentFiles(files)
  }

  docs.splice(idx, 1)
  saveDocuments(docs)
  return true
}

export function getDocumentById(id) {
  const docs = getDocuments()
  const doc = docs.find((d) => d.id === id)
  if (!doc) return null
  return doc
}

export function getDocumentFileData(fileDataId) {
  if (!fileDataId) return null
  const files = getDocumentFiles()
  return files[fileDataId] || null
}

export function searchDocuments(query) {
  const docs = getDocuments()
  const q = query.toLowerCase().trim()
  if (!q) return docs
  return docs.filter((d) => {
    const inTitle = d.title.toLowerCase().includes(q)
    const inNotes = (d.notes || '').toLowerCase().includes(q)
    const inTags = (d.tags || []).some((t) => t.toLowerCase().includes(q))
    const inCategory = d.category.toLowerCase().includes(q)
    return inTitle || inNotes || inTags || inCategory
  })
}

export const FILTER_DATE_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'Last 3 Months' },
  { id: 'year', label: 'This Year' },
]

export function filterDocuments(docs, { category, dateRange } = {}) {
  let filtered = [...docs]

  if (category && category !== 'all') {
    filtered = filtered.filter((d) => d.category === category)
  }

  if (dateRange && dateRange !== 'all') {
    const now = Date.now()
    const ranges = {
      today: now - 86400000,
      week: now - 7 * 86400000,
      month: now - 30 * 86400000,
      quarter: now - 90 * 86400000,
      year: now - 365 * 86400000,
    }
    const cutoff = ranges[dateRange]
    if (cutoff) {
      filtered = filtered.filter((d) => d.createdAt >= cutoff)
    }
  }

  return filtered
}

export function sortDocuments(docs, sortBy = 'createdAt', order = 'desc') {
  const sorted = [...docs]
  sorted.sort((a, b) => {
    let cmp = 0
    if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title)
    } else if (sortBy === 'category') {
      cmp = (a.category || '').localeCompare(b.category || '')
    } else {
      cmp = (a[sortBy] || 0) - (b[sortBy] || 0)
    }
    return order === 'desc' ? -cmp : cmp
  })
  return sorted
}

export function linkDocument(docId, entityType, entityId) {
  return updateDocument(docId, { relatedEntityType: entityType, relatedEntityId: entityId })
}

export function unlinkDocument(docId) {
  return updateDocument(docId, { relatedEntityType: null, relatedEntityId: null })
}

export function getDocumentsForEntity(entityType, entityId) {
  const docs = getDocuments()
  return docs.filter((d) => d.relatedEntityType === entityType && d.relatedEntityId === entityId)
}

export function getDocumentStats() {
  const docs = getDocuments()
  const total = docs.length
  const totalFileSize = docs.reduce((s, d) => s + (d.fileSize || 0), 0)
  const now = new Date()
  const thisMonth = docs.filter((d) => {
    const c = new Date(d.createdAt)
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  }).length
  const byCategory = {}
  for (const d of docs) {
    const cat = d.category || 'other'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  }
  const recent = [...docs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  return { total, totalFileSize, thisMonth, byCategory, recent }
}
