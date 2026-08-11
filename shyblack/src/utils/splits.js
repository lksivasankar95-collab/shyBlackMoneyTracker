import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'
import { getCurrencySettings, convertAmount, getBaseCurrencyCode } from './multiCurrency'

/**
 * Expense splitting engine for shared bills.
 * A split tracks a bill total split between participants; each participant can
 * be marked as paid individually. A split is settled when all shares are paid.
 */

export const SPLIT_STATUS = {
  ACTIVE: 'active',
  SETTLED: 'settled',
}

export function getSplits() {
  try {
    const data = safeStorage.get(STORAGE_KEYS.SPLITS, [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveSplits(splits) {
  return safeStorage.set(STORAGE_KEYS.SPLITS, splits)
}

function normalizeShares(totalAmount, participants) {
  const shareSum = participants.reduce((s, p) => s + (parseFloat(p.share) || 0), 0)
  if (shareSum <= 0) return participants
  return participants.map((p) => ({
    ...p,
    share: Math.round((parseFloat(p.share) || 0) * 100) / 100,
  }))
}

export function createSplit(data) {
  const totalAmount = parseFloat(data.totalAmount) || 0
  if (totalAmount <= 0) return null
  const names = (data.participants || []).map((p) => String(p.name || '').trim()).filter(Boolean)
  if (names.length === 0) return null

  let participants
  if (data.equalSplit) {
    participants = splitEqually(totalAmount, names)
  } else {
    participants = data.participants
      .filter((p) => String(p.name || '').trim())
      .map((p) => ({
        id: p.id || generateId(),
        name: String(p.name).trim(),
        share: Math.max(0, parseFloat(p.share) || 0),
        paid: 0,
        paidAt: null,
      }))
    participants = normalizeShares(totalAmount, participants)
  }

  const settings = getCurrencySettings()
  const currency = settings.enabled && data.currency && data.currency !== settings.base ? data.currency : undefined
  const baseAmount = convertAmount(totalAmount, currency || settings.base, settings)

  const split = {
    id: generateId(),
    title: String(data.title || '').trim() || 'Shared Expense',
    totalAmount,
    amountBase: Math.round(baseAmount * 100) / 100,
    currency,
    note: String(data.note || '').trim(),
    date: data.date || new Date().toISOString().split('T')[0],
    status: SPLIT_STATUS.ACTIVE,
    participants,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  saveSplits([split, ...getSplits()])
  return split
}

export function updateSplit(id, updates) {
  const splits = getSplits()
  const idx = splits.findIndex((s) => s.id === id)
  if (idx === -1) return null
  const updated = {
    ...splits[idx],
    ...updates,
    updatedAt: Date.now(),
  }
  if (updates.participants) {
    updated.participants = normalizeShares(updated.totalAmount, updates.participants).map((p) => ({
      ...p,
      paid: p.paid || 0,
    }))
  }
  updated.status = isSplitSettled(updated) ? SPLIT_STATUS.SETTLED : SPLIT_STATUS.ACTIVE
  splits[idx] = updated
  saveSplits(splits)
  return updated
}

export function deleteSplit(id) {
  const splits = getSplits().filter((s) => s.id !== id)
  saveSplits(splits)
  return splits
}

export function splitEqually(totalAmount, names) {
  const total = parseFloat(totalAmount) || 0
  const n = names.length
  if (n === 0 || total <= 0) return []
  const base = Math.floor((total / n) * 100) / 100
  const remainder = Math.round((total - base * n) * 100) / 100
  return names.map((name, i) => ({
    id: generateId(),
    name: String(name).trim(),
    share: i === 0 ? Math.round((base + remainder) * 100) / 100 : base,
    paid: 0,
    paidAt: null,
  }))
}

export function markParticipantPaid(splitId, participantId, amount = null) {
  const splits = getSplits()
  const idx = splits.findIndex((s) => s.id === splitId)
  if (idx === -1) return { success: false, error: 'Split not found' }
  const split = splits[idx]
  const pIdx = split.participants.findIndex((p) => p.id === participantId)
  if (pIdx === -1) return { success: false, error: 'Participant not found' }

  const participant = split.participants[pIdx]
  const share = participant.share || 0
  if (amount !== null) {
    const amt = Math.max(0, parseFloat(amount) || 0)
    const newPaid = Math.min(share, (participant.paid || 0) + amt)
    participant.paid = Math.round(newPaid * 100) / 100
  } else {
    participant.paid = share
  }
  participant.paidAt = participant.paid >= share - 0.005 ? Date.now() : participant.paidAt

  split.status = isSplitSettled(split) ? SPLIT_STATUS.SETTLED : SPLIT_STATUS.ACTIVE
  split.updatedAt = Date.now()
  saveSplits(splits)
  return { success: true, split: splits[idx], participant }
}

export function isSplitSettled(split) {
  if (!split || !split.participants || split.participants.length === 0) return false
  return split.participants.every((p) => (p.paid || 0) >= (p.share || 0) - 0.005)
}

export function getSplitSummary(splits) {
  const total = splits.length
  const settled = splits.filter((s) => s.status === SPLIT_STATUS.SETTLED).length
  const active = splits.filter((s) => s.status === SPLIT_STATUS.ACTIVE)
  const pendingTotal = active.reduce((sum, s) => {
    const paid = s.participants.reduce((x, p) => x + (p.paid || 0), 0)
    return sum + Math.max(0, s.totalAmount - paid)
  }, 0)
  return { total, settled, active: active.length, pendingTotal }
}

export function getSplitCurrencyInfo(split) {
  if (!split) return { code: getBaseCurrencyCode(), showOriginal: false }
  if (split.currency) {
    return { code: split.currency, showOriginal: true, baseAmount: split.amountBase }
  }
  return { code: getBaseCurrencyCode(), showOriginal: false }
}