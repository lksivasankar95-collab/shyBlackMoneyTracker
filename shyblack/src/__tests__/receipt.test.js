import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getReceipts, createReceipt, updateReceipt, deleteReceipt, getReceiptStats } from '../utils/receiptUtils'

const mockStorage = {}
vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    set: (key, value) => { mockStorage[key] = value },
    remove: (key) => { delete mockStorage[key] },
  },
  STORAGE_KEYS: {
    RECEIPT_SCANS: 'test_receipt_scans',
  },
}))

describe('receiptUtils', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('returns empty array initially', () => {
    expect(getReceipts()).toEqual([])
  })

  it('creates a receipt', () => {
    const r = createReceipt({ merchant: 'Test Store', amount: 450, category: 'food' })
    expect(r.merchant).toBe('Test Store')
    expect(r.amount).toBe(450)
    expect(r.category).toBe('food')
    expect(r.id).toBeDefined()
    expect(r.transactionId).toBeNull()
  })

  it('creates receipt with transaction link', () => {
    const r = createReceipt({ merchant: 'Store', amount: 1000, transactionId: 'tx-123' })
    expect(r.transactionId).toBe('tx-123')
  })

  it('creates receipt with image data', () => {
    const r = createReceipt({ merchant: 'Store', amount: 500, imageData: 'data:image/png;base64,abc' })
    expect(r.imageData).toBe('data:image/png;base64,abc')
  })

  it('updates a receipt', () => {
    const r = createReceipt({ merchant: 'Old Name', amount: 100 })
    const updated = updateReceipt(r.id, { merchant: 'New Name', amount: 200 })
    expect(updated.merchant).toBe('New Name')
    expect(updated.amount).toBe(200)
  })

  it('returns null updating non-existent receipt', () => {
    expect(updateReceipt('non-existent', { merchant: 'X' })).toBeNull()
  })

  it('deletes a receipt', () => {
    const r = createReceipt({ merchant: 'Delete Me', amount: 50 })
    expect(getReceipts()).toHaveLength(1)
    deleteReceipt(r.id)
    expect(getReceipts()).toHaveLength(0)
  })

  it('calculates receipt stats', () => {
    createReceipt({ merchant: 'A', amount: 100, category: 'food', confidence: 90 })
    createReceipt({ merchant: 'B', amount: 200, category: 'shopping', confidence: 80 })
    createReceipt({ merchant: 'C', amount: 300, category: 'food', confidence: 70 })
    const stats = getReceiptStats(getReceipts())
    expect(stats.total).toBe(3)
    expect(stats.mostScannedCategory).toBe('food')
    expect(stats.avgConfidence).toBe(80)
  })

  it('handles empty stats', () => {
    const stats = getReceiptStats([])
    expect(stats.total).toBe(0)
    expect(stats.thisMonth).toBe(0)
    expect(stats.mostScannedCategory).toBeNull()
    expect(stats.avgConfidence).toBe(0)
  })
})

describe('receiptParser - merchant detection', () => {
  it('detects Swiggy as food', async () => {
    const parser = await import('../utils/receiptParser')
    expect(parser.detectCategory('Swiggy', 'Swiggy order #1234 total 299')).toBe('food')
  })
})

describe('receiptParser - amount extraction', () => {
  it('extracts ₹ amount', async () => {
    const parser = await import('../utils/receiptParser')
    const { extractAmount } = parser
    expect(extractAmount('Total ₹450')).toBe(450)
    expect(extractAmount('Amount: ₹1,200')).toBe(1200)
    expect(extractAmount('Rs 999')).toBe(999)
    expect(extractAmount('INR 2500')).toBe(2500)
    expect(extractAmount('No numbers here')).toBe(0)
    expect(extractAmount('₹50.50')).toBe(50.5)
  })
})

describe('receiptParser - category detection', () => {
  it('detects food merchants', async () => {
    const parser = await import('../utils/receiptParser')
    const { detectCategory } = parser
    expect(detectCategory('Swiggy', '')).toBe('food')
    expect(detectCategory('Zomato', '')).toBe('food')
    expect(detectCategory('Amazon', '')).toBe('shopping')
    expect(detectCategory('Uber', '')).toBe('fuel')
    expect(detectCategory('Apollo Pharmacy', '')).toBe('family')
    expect(detectCategory('Unknown Store', 'some random text')).toBe('other_expense')
  })

  it('detects category from text keywords', async () => {
    const parser = await import('../utils/receiptParser')
    const { detectCategory } = parser
    expect(detectCategory('Store', 'restaurant bill')).toBe('food')
    expect(detectCategory('Store', 'medical expenses')).toBe('family')
    expect(detectCategory('Store', 'electricity bill')).toBe('bills')
    expect(detectCategory('Store', 'clothing purchase')).toBe('shopping')
  })
})

describe('receiptParser - date extraction', () => {
  it('extracts dates from text', async () => {
    const parser = await import('../utils/receiptParser')
    const { extractDate } = parser
    const d1 = extractDate('Date: 15/03/2024')
    expect(d1).toBe('2024-03-15')
    const d2 = extractDate('2024-03-15')
    expect(d2).toBe('2024-03-15')
    const d3 = extractDate('No dates here')
    const today = new Date().toISOString().split('T')[0]
    expect(d3).toBe(today)
  })
})
