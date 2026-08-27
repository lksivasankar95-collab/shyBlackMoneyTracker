import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockRels = []
let mockDocs = []
let mockEmis = []
let mockDebts = []

vi.mock('../utils/relationships', () => ({
  getRelationships: () => mockRels,
}))

vi.mock('../utils/documents', () => ({
  getDocuments: () => mockDocs,
  DOCUMENT_CATEGORIES: [
    { id: 'insurance', label: 'Insurance' },
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'loan', label: 'Loan' },
    { id: 'property', label: 'Property' },
  ],
}))

vi.mock('../utils/emi', () => ({
  getEmis: () => mockEmis,
}))

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => (key === 'shyblack_debts' ? mockDebts : fallback),
  },
  STORAGE_KEYS: { DEBTS: 'shyblack_debts' },
}))

vi.mock('../utils/debts', () => ({
  isOpenDebt: (d) => d && d.status !== 'closed',
}))

import { generateRelationshipInsights } from '../utils/relationshipInsights'

describe('generateRelationshipInsights', () => {
  beforeEach(() => {
    mockRels = []
    mockDocs = []
    mockEmis = []
    mockDebts = []
  })

  it('returns empty array when there is nothing to flag', () => {
    expect(generateRelationshipInsights()).toEqual([])
  })

  it('flags unlinked insurance documents', () => {
    mockDocs = [
      { id: 'd1', category: 'insurance', title: 'My insurance' },
    ]
    const insights = generateRelationshipInsights()
    const hit = insights.find((i) => i.text.includes('"My insurance"'))
    expect(hit).toBeDefined()
    expect(hit.type).toBe('info')
    expect(hit.icon).toBe('FileText')
  })

  it('does not flag insurance documents linked to a vehicle', () => {
    mockDocs = [
      { id: 'd1', category: 'insurance', title: 'Car insurance' },
      { id: 'd2', category: 'vehicle', title: 'Car' },
    ]
    const insights = generateRelationshipInsights()
    expect(insights.some((i) => i.text.includes('Car insurance'))).toBe(false)
  })

  it('flags unlinked documents of any category', () => {
    mockDocs = [
      { id: 'd1', category: 'property', title: 'Flat papers' },
    ]
    const insights = generateRelationshipInsights()
    expect(insights.some((i) => i.text.includes('1 Property document'))).toBe(true)
  })

  it('warns about active EMIs without a linked document', () => {
    mockEmis = [
      { id: 'e1', name: 'Car loan EMI', status: 'active' },
      { id: 'e2', name: 'Closed EMI', status: 'closed' },
    ]
    const insights = generateRelationshipInsights()
    const hit = insights.find((i) => i.text.includes('"Car loan EMI"'))
    expect(hit).toBeDefined()
    expect(hit.type).toBe('warning')
  })

  it('skips EMIs that already have a linked document', () => {
    mockEmis = [{ id: 'e1', name: 'Car loan EMI', status: 'active' }]
    mockDocs = [{ id: 'd1', category: 'loan', title: 'Agreement' }]
    mockRels = [
      { id: 'r1', sourceType: 'emi', sourceId: 'e1', targetType: 'document', targetId: 'd1' },
    ]
    const insights = generateRelationshipInsights()
    expect(insights.some((i) => i.text.includes('Car loan EMI'))).toBe(false)
  })

  it('flags open debts with no linked relationship', () => {
    mockDebts = [
      { id: 'b1', personName: 'Rajesh', amount: 5000, status: 'open' },
    ]
    const insights = generateRelationshipInsights()
    const hit = insights.find((i) => i.text.includes('"Rajesh"'))
    expect(hit).toBeDefined()
    expect(hit.type).toBe('info')
  })

  it('uses the correct linked-document labels', () => {
    mockDocs = [
      { id: 'd1', category: 'vehicle', title: 'Bike' },
      { id: 'd2', category: 'vehicle', title: 'Scooter' },
      { id: 'd3', category: 'loan', title: 'Loan papers' },
    ]
    const insights = generateRelationshipInsights()
    expect(insights.some((i) => i.text.includes('2 Vehicle documents'))).toBe(true)
    expect(insights.some((i) => i.text.includes('1 Loan document'))).toBe(true)
  })
})