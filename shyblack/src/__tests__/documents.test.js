import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DOCUMENT_CATEGORIES, ENTITY_TYPES, DOCUMENT_SORT_OPTIONS, FILTER_DATE_OPTIONS,
  getDocuments, createDocument, updateDocument, deleteDocument,
  getDocumentById, getDocumentFileData,
  searchDocuments, filterDocuments, sortDocuments,
  linkDocument, unlinkDocument, getDocumentsForEntity,
  getDocumentStats,
} from '../utils/documents'

vi.mock('../utils/safeStorage', () => {
  let store = {}
  return {
    safeStorage: {
      get(key, fallback) {
        const val = store[key]
        return val !== undefined ? JSON.parse(val) : fallback
      },
      set(key, value) {
        store[key] = JSON.stringify(value)
        return true
      },
      remove(key) {
        delete store[key]
        return true
      },
      clear() {
        store = {}
        return true
      },
    },
    STORAGE_KEYS: {
      DOCUMENTS: 'shyblack_documents',
      DOCUMENT_FILES: 'shyblack_document_files',
    },
  }
})

import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'

vi.mock('../utils/helpers', () => ({
  generateId: () => 'test-id-' + Date.now() + '-' + Math.random().toString(36).slice(2),
}))

describe('Document Categories', () => {
  it('has predefined categories', () => {
    expect(DOCUMENT_CATEGORIES.length).toBeGreaterThan(0)
    const ids = DOCUMENT_CATEGORIES.map((c) => c.id)
    expect(ids).toContain('loan')
    expect(ids).toContain('emi')
    expect(ids).toContain('insurance')
    expect(ids).toContain('other')
  })

  it('each category has id, label, and icon', () => {
    DOCUMENT_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeDefined()
      expect(cat.label).toBeDefined()
      expect(cat.icon).toBeDefined()
    })
  })
})

describe('Entity Types', () => {
  it('has entity types for linking', () => {
    expect(ENTITY_TYPES.length).toBeGreaterThan(0)
    const ids = ENTITY_TYPES.map((e) => e.id)
    expect(ids).toContain('emi')
    expect(ids).toContain('ledger')
  })
})

describe('Sort Options', () => {
  it('provides sort options', () => {
    expect(DOCUMENT_SORT_OPTIONS.length).toBeGreaterThan(0)
  })
})

describe('Date Filter Options', () => {
  it('provides date filter options including all time', () => {
    expect(FILTER_DATE_OPTIONS.some((o) => o.id === 'all')).toBe(true)
  })
})

describe('createDocument', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
  })

  it('creates a document with required fields', () => {
    const doc = createDocument({ title: 'Test Document', category: 'loan' })
    expect(doc.id).toBeDefined()
    expect(doc.title).toBe('Test Document')
    expect(doc.category).toBe('loan')
    expect(doc.createdAt).toBeDefined()
    expect(doc.updatedAt).toBeDefined()
    expect(doc.fileDataId).toBeNull()
    expect(doc.relatedEntityType).toBeNull()
    expect(doc.relatedEntityId).toBeNull()
    expect(doc.tags).toEqual([])
    expect(doc.starred).toBe(false)
  })

  it('defaults to other category', () => {
    const doc = createDocument({ title: 'No Category' })
    expect(doc.category).toBe('other')
  })

  it('trims title', () => {
    const doc = createDocument({ title: '  My Doc  ' })
    expect(doc.title).toBe('My Doc')
  })

  it('saves tags as lowercase trimmed strings', () => {
    const doc = createDocument({ title: 'Tagged', tags: [' Insurance', 'CAR ', '  Tax  '] })
    expect(doc.tags).toEqual(['insurance', 'car', 'tax'])
  })

  it('stores file data separately and references by id', () => {
    const doc = createDocument({ title: 'With File', fileData: 'data:image/png;base64,abc123' })
    expect(doc.fileDataId).toBeDefined()
    const fileData = getDocumentFileData(doc.fileDataId)
    expect(fileData).toBe('data:image/png;base64,abc123')
  })

  it('adds to the storage', () => {
    createDocument({ title: 'Doc 1' })
    const docs = getDocuments()
    expect(docs.length).toBe(1)
    expect(docs[0].title).toBe('Doc 1')
  })

  it('prepends new documents', () => {
    createDocument({ title: 'First' })
    createDocument({ title: 'Second' })
    const docs = getDocuments()
    expect(docs[0].title).toBe('Second')
    expect(docs[1].title).toBe('First')
  })
})

describe('updateDocument', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
  })

  it('updates allowed fields', () => {
    const doc = createDocument({ title: 'Original', category: 'loan' })
    const updated = updateDocument(doc.id, { title: 'Updated', notes: 'New notes' })
    expect(updated.title).toBe('Updated')
    expect(updated.notes).toBe('New notes')
    expect(updated.category).toBe('loan')
    expect(typeof updated.updatedAt).toBe('number')
  })

  it('returns null for non-existent id', () => {
    const result = updateDocument('non-existent', { title: 'Nope' })
    expect(result).toBeNull()
  })

  it('updates tags', () => {
    const doc = createDocument({ title: 'Tags', tags: ['a', 'b'] })
    const updated = updateDocument(doc.id, { tags: ['c', ' d '] })
    expect(updated.tags).toEqual(['c', 'd'])
  })

  it('updates file data and removes old file data', () => {
    const doc = createDocument({ title: 'File', fileData: 'data:image/png;base64,old' })
    const oldFileId = doc.fileDataId
    const updated = updateDocument(doc.id, { fileData: 'data:image/png;base64,new' })
    expect(updated.fileDataId).not.toBe(oldFileId)
    expect(getDocumentFileData(oldFileId)).toBeNull()
    expect(getDocumentFileData(updated.fileDataId)).toBe('data:image/png;base64,new')
  })

  it('updates linked entity', () => {
    const doc = createDocument({ title: 'Linkable' })
    const updated = updateDocument(doc.id, { relatedEntityType: 'emi', relatedEntityId: 'emi-123' })
    expect(updated.relatedEntityType).toBe('emi')
    expect(updated.relatedEntityId).toBe('emi-123')
  })

  it('updates starred status', () => {
    const doc = createDocument({ title: 'Star' })
    const updated = updateDocument(doc.id, { starred: true })
    expect(updated.starred).toBe(true)
  })
})

describe('deleteDocument', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
  })

  it('deletes a document and its file data', () => {
    const doc = createDocument({ title: 'To Delete', fileData: 'data:image/png;base64,del' })
    const fileId = doc.fileDataId
    expect(deleteDocument(doc.id)).toBe(true)
    expect(getDocuments().length).toBe(0)
    expect(getDocumentFileData(fileId)).toBeNull()
  })

  it('returns false for non-existent id', () => {
    expect(deleteDocument('non-existent')).toBe(false)
  })

  it('deletes document without file data', () => {
    const doc = createDocument({ title: 'No File' })
    expect(deleteDocument(doc.id)).toBe(true)
  })
})

describe('getDocumentById', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
  })

  it('finds a document by id', () => {
    const doc = createDocument({ title: 'Find Me' })
    const found = getDocumentById(doc.id)
    expect(found.title).toBe('Find Me')
  })

  it('returns null for missing id', () => {
    expect(getDocumentById('missing')).toBeNull()
  })
})

describe('searchDocuments', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    createDocument({ title: 'Car Insurance', category: 'insurance', tags: ['vehicle', 'honda'], notes: 'Policy 2024' })
    createDocument({ title: 'Home Loan Agreement', category: 'loan', tags: ['bank', 'home'], notes: 'SBI loan' })
    createDocument({ title: 'Salary Slip Jan', category: 'salary', tags: ['income'], notes: 'January 2024 salary' })
  })

  it('returns all documents for empty query', () => {
    expect(searchDocuments('').length).toBe(3)
  })

  it('searches by title', () => {
    const results = searchDocuments('Car')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Car Insurance')
  })

  it('searches by notes', () => {
    const results = searchDocuments('SBI')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Home Loan Agreement')
  })

  it('searches by tags', () => {
    const results = searchDocuments('honda')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Car Insurance')
  })

  it('searches by category', () => {
    const results = searchDocuments('salary')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Salary Slip Jan')
  })

  it('returns empty array for no match', () => {
    expect(searchDocuments('xyz').length).toBe(0)
  })

  it('is case insensitive', () => {
    expect(searchDocuments('CAR').length).toBe(1)
    expect(searchDocuments('HOME').length).toBe(1)
  })
})

describe('filterDocuments', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    createDocument({ title: 'Loan Doc', category: 'loan' })
    createDocument({ title: 'Insurance Doc', category: 'insurance' })
    createDocument({ title: 'Salary Doc', category: 'salary' })
  })

  it('returns all for no filters', () => {
    const docs = getDocuments()
    expect(filterDocuments(docs, {}).length).toBe(3)
  })

  it('filters by category', () => {
    const docs = getDocuments()
    const result = filterDocuments(docs, { category: 'loan' })
    expect(result.length).toBe(1)
    expect(result[0].category).toBe('loan')
  })

  it('returns all for category all', () => {
    const docs = getDocuments()
    expect(filterDocuments(docs, { category: 'all' }).length).toBe(3)
  })
})

describe('sortDocuments', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
  })

  it('sorts by title ascending', () => {
    createDocument({ title: 'B Document' })
    createDocument({ title: 'A Document' })
    const docs = getDocuments()
    const sorted = sortDocuments(docs, 'title', 'asc')
    expect(sorted[0].title).toBe('A Document')
    expect(sorted[1].title).toBe('B Document')
  })

  it('sorts by title descending', () => {
    createDocument({ title: 'A Document' })
    createDocument({ title: 'B Document' })
    const docs = getDocuments()
    const sorted = sortDocuments(docs, 'title', 'desc')
    expect(sorted[0].title).toBe('B Document')
    expect(sorted[1].title).toBe('A Document')
  })
})

describe('linkDocument / unlinkDocument', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
  })

  it('links a document to an entity', () => {
    const doc = createDocument({ title: 'Linkable' })
    const linked = linkDocument(doc.id, 'emi', 'emi-001')
    expect(linked.relatedEntityType).toBe('emi')
    expect(linked.relatedEntityId).toBe('emi-001')
  })

  it('unlinks a document', () => {
    const doc = createDocument({ title: 'Linkable', relatedEntityType: 'emi', relatedEntityId: 'emi-001' })
    const unlinked = unlinkDocument(doc.id)
    expect(unlinked.relatedEntityType).toBeNull()
    expect(unlinked.relatedEntityId).toBeNull()
  })
})

describe('getDocumentsForEntity', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    createDocument({ title: 'EMI Doc 1', relatedEntityType: 'emi', relatedEntityId: 'emi-001' })
    createDocument({ title: 'EMI Doc 2', relatedEntityType: 'emi', relatedEntityId: 'emi-001' })
    createDocument({ title: 'Other Doc', relatedEntityType: 'ledger', relatedEntityId: 'ledger-001' })
  })

  it('finds documents linked to an entity', () => {
    const docs = getDocumentsForEntity('emi', 'emi-001')
    expect(docs.length).toBe(2)
  })

  it('returns empty array for entity with no documents', () => {
    const docs = getDocumentsForEntity('emi', 'nonexistent')
    expect(docs.length).toBe(0)
  })
})

describe('getDocumentStats', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
  })

  it('returns zero stats for no documents', () => {
    const stats = getDocumentStats()
    expect(stats.total).toBe(0)
    expect(stats.totalFileSize).toBe(0)
    expect(stats.thisMonth).toBe(0)
    expect(stats.byCategory).toEqual({})
    expect(stats.recent).toEqual([])
  })

  it('returns correct total count', () => {
    createDocument({ title: 'A', category: 'loan', fileData: 'data:,' })
    createDocument({ title: 'B', category: 'insurance' })
    const stats = getDocumentStats()
    expect(stats.total).toBe(2)
    expect(stats.byCategory.loan).toBe(1)
    expect(stats.byCategory.insurance).toBe(1)
  })

  it('returns recent documents sorted by update time', () => {
    createDocument({ title: 'First' })
    createDocument({ title: 'Second' })
    const stats = getDocumentStats()
    expect(stats.recent.length).toBe(2)
    expect(stats.recent[0].title).toBe('Second')
  })
})

describe('Backup inclusion', () => {
  beforeEach(() => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
  })

  it('documents are stored in STORAGE_KEYS.DOCUMENTS', () => {
    createDocument({ title: 'Backup Test' })
    const stored = safeStorage.get(STORAGE_KEYS.DOCUMENTS, [])
    expect(stored.length).toBe(1)
    expect(stored[0].title).toBe('Backup Test')
  })

  it('document files are stored in STORAGE_KEYS.DOCUMENT_FILES', () => {
    createDocument({ title: 'File Test', fileData: 'data:image/png;base64,test123' })
    const files = safeStorage.get(STORAGE_KEYS.DOCUMENT_FILES, {})
    expect(Object.keys(files).length).toBe(1)
  })
})

describe('Migration safety', () => {
  it('documents key initializes as empty array', () => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENTS)
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
    const docs = getDocuments()
    expect(Array.isArray(docs)).toBe(true)
    expect(docs.length).toBe(0)
  })

  it('document files key initializes as empty object', () => {
    safeStorage.remove(STORAGE_KEYS.DOCUMENT_FILES)
    const files = safeStorage.get(STORAGE_KEYS.DOCUMENT_FILES, {})
    expect(typeof files).toBe('object')
  })
})
