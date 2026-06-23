import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export function getReceipts() {
  const data = safeStorage.get(STORAGE_KEYS.RECEIPT_SCANS, [])
  return Array.isArray(data) ? data : []
}

export function saveReceipts(receipts) {
  safeStorage.set(STORAGE_KEYS.RECEIPT_SCANS, receipts)
}

export function createReceipt(data) {
  const receipts = getReceipts()
  const receipt = {
    id: generateId(),
    imageId: data.imageId || null,
    imageData: data.imageData || null,
    merchant: data.merchant || '',
    amount: data.amount || 0,
    category: data.category || 'other_expense',
    date: data.date || new Date().toISOString().split('T')[0],
    rawText: data.rawText || '',
    confidence: data.confidence || 0,
    notes: data.notes || '',
    transactionId: data.transactionId || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  receipts.unshift(receipt)
  saveReceipts(receipts)
  return receipt
}

export function updateReceipt(id, updates) {
  const receipts = getReceipts()
  const idx = receipts.findIndex((r) => r.id === id)
  if (idx === -1) return null
  receipts[idx] = { ...receipts[idx], ...updates, updatedAt: Date.now() }
  saveReceipts(receipts)
  return receipts[idx]
}

export function deleteReceipt(id) {
  const receipts = getReceipts().filter((r) => r.id !== id)
  saveReceipts(receipts)
}

export function getReceiptStats(receipts) {
  const thisMonth = receipts.filter((r) => {
    const d = new Date(r.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const categoryCount = {}
  receipts.forEach((r) => {
    const cat = r.category || 'other_expense'
    categoryCount[cat] = (categoryCount[cat] || 0) + 1
  })
  const mostScanned = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]
  const withConfidence = receipts.filter((r) => r.confidence > 0)
  const avgConfidence = withConfidence.length > 0
    ? Math.round(withConfidence.reduce((s, r) => s + r.confidence, 0) / withConfidence.length)
    : 0

  return {
    total: receipts.length,
    thisMonth: thisMonth.length,
    mostScannedCategory: mostScanned ? mostScanned[0] : null,
    avgConfidence,
  }
}
