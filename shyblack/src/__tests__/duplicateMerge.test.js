import { describe, it, expect } from 'vitest'
import { mergeDuplicateTransactions, mergeDuplicatesInList, mergeAllSimilarTransactions } from '../utils/duplicateMerge'
import { applyUndoEntry, applyRedoEntry } from '../utils/undoManager'

describe('duplicate merge', () => {
  it('merges metadata from duplicate into primary', () => {
    const primary = { id: 'a', date: '2026-01-05', amount: -500, type: 'expense', category: 'food', note: 'Swiggy' }
    const dup = { id: 'b', date: '2026-01-04', amount: -500, type: 'expense', category: 'food', note: 'Swiggy - UPI 1234567890@ybl', tags: ['food'], paymentMethod: 'upi', personName: 'Me' }
    const merged = mergeDuplicateTransactions(primary, dup)
    expect(merged.id).toBe('a')
    expect(merged.amount).toBe(-500)
    expect(merged.note).toBe('Swiggy - UPI 1234567890@ybl')
    expect(merged.tags).toEqual(['food'])
    expect(merged.paymentMethod).toBe('upi')
    expect(merged.personName).toBe('Me')
    expect(merged.mergedFrom).toEqual(['b'])
    expect(merged.mergedCount).toBe(1)
  })

  it('keeps existing metadata on the primary', () => {
    const primary = { id: 'a', amount: -100, type: 'expense', note: 'x', paymentMethod: 'cash', tags: ['t1'] }
    const dup = { id: 'b', amount: -100, type: 'expense', note: 'y', paymentMethod: 'upi', tags: ['t2'] }
    const merged = mergeDuplicateTransactions(primary, dup)
    expect(merged.paymentMethod).toBe('cash')
    expect(merged.tags).toEqual(['t1', 't2'])
  })

  it('merges pairs in a list and removes duplicates', () => {
    const list = [
      { id: 'a', date: '2026-01-05', amount: -500, type: 'expense', note: 'Swiggy' },
      { id: 'b', date: '2026-01-04', amount: -500, type: 'expense', note: 'Swiggy order' },
      { id: 'c', date: '2026-01-06', amount: -300, type: 'expense', note: 'Zomato' },
    ]
    const pairs = [
      { tx: list[1], duplicateOf: list[0] },
    ]
    const result = mergeDuplicatesInList(list, pairs)
    expect(result.mergedCount).toBe(1)
    expect(result.transactions).toHaveLength(2)
    expect(result.transactions.some((t) => t.id === 'b')).toBe(false)
    const kept = result.transactions.find((t) => t.id === 'a')
    expect(kept.note).toBe('Swiggy order')
  })

  it('skips pairs referencing already-merged transactions', () => {
    const list = [
      { id: 'a', amount: -100, type: 'expense', note: 'same' },
      { id: 'b', amount: -100, type: 'expense', note: 'same x' },
      { id: 'c', amount: -100, type: 'expense', note: 'same y' },
    ]
    const pairs = [
      { tx: list[1], duplicateOf: list[0] },
      { tx: list[2], duplicateOf: list[1] },
    ]
    const result = mergeDuplicatesInList(list, pairs)
    expect(result.mergedCount).toBe(1)
    expect(result.transactions).toHaveLength(2)
  })

  it('mergeAllSimilarTransactions works end-to-end', () => {
    const list = [
      { id: 'a', date: '2026-02-01', amount: -120, type: 'expense', note: 'Netflix renewal' },
      { id: 'b', date: '2026-02-02', amount: -120, type: 'expense', note: 'Netflix renew' },
      { id: 'c', date: '2026-02-03', amount: -9999, type: 'expense', note: 'rent transfer' },
    ]
    const result = mergeAllSimilarTransactions(list, { similarityThreshold: 0.6, dateWindowDays: 5 })
    expect(result.pairs.length).toBeGreaterThan(0)
    expect(result.mergedCount).toBeGreaterThan(0)
    expect(result.transactions.length).toBeLessThan(list.length)
  })

  it('merge entry is undoable and redoable', () => {
    const keep = { id: 'a', amount: -100, type: 'expense', note: 'x' }
    const dup = { id: 'b', amount: -100, type: 'expense', note: 'longer note' }
    const merged = mergeDuplicateTransactions(keep, dup)
    const after = [merged, { id: 'c' }]
    const entry = { kind: 'merge', id: 'a', dupTx: dup, index: 1, before: keep, after: merged }

    const restored = applyUndoEntry(entry, after)
    expect(restored).toHaveLength(3)
    expect(restored.find((t) => t.id === 'a')).toEqual(keep)
    expect(restored.find((t) => t.id === 'b')).toEqual(dup)

    const reapplied = applyRedoEntry(entry, restored)
    expect(reapplied).toHaveLength(2)
    expect(reapplied.find((t) => t.id === 'a').note).toBe('longer note')
    expect(reapplied.some((t) => t.id === 'b')).toBe(false)
  })
})