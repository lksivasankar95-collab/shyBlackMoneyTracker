import { describe, it, expect, beforeEach } from 'vitest'
import {
  getWeekKey,
  buildWeeklyDigest,
  formatDigestAmount,
  buildWeeklyDigestBody,
  wasWeeklyDigestSent,
  markWeeklyDigestSent,
} from '../utils/weeklyDigest'

const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]) })

function dayStr(offset) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('weeklyDigest', () => {
  it('computes a weekly summary of the last 7 days', () => {
    const digest = buildWeeklyDigest([
      { type: 'income', amount: 30000, date: dayStr(1), category: 'salary' },
      { type: 'expense', amount: 2000, date: dayStr(2), category: 'food' },
      { type: 'expense', amount: 1500, date: dayStr(3), category: 'food' },
      { type: 'expense', amount: 800, date: dayStr(30), category: 'old' },
    ])
    expect(digest.income).toBe(30000)
    expect(digest.expense).toBe(3500)
    expect(digest.savings).toBe(26500)
    expect(digest.txCount).toBe(3)
    expect(digest.expenseCategories[0]).toEqual({ category: 'food', amount: 3500 })
  })

  it('flags budget overspending within the week', () => {
    const digest = buildWeeklyDigest(
      [{ type: 'expense', amount: 5000, date: dayStr(1), category: 'food' }],
      { food: { limit: 3000 } }
    )
    expect(digest.overspentCategories).toEqual([{ category: 'food', overspent: 2000 }])
  })

  it('builds a readable notification body', () => {
    const digest = buildWeeklyDigest([
      { type: 'income', amount: 30000, date: dayStr(1) },
      { type: 'expense', amount: 2000, date: dayStr(1), category: 'food' },
    ])
    const body = buildWeeklyDigestBody(digest)
    expect(body).toContain('Spent ₹2k')
    expect(body).toContain('Earned ₹30k')
    expect(body).toContain('food')
  })

  it('tracks whether the weekly digest was already sent', () => {
    expect(wasWeeklyDigestSent('2030-W01')).toBe(false)
    markWeeklyDigestSent('2030-W01')
    expect(wasWeeklyDigestSent('2030-W01')).toBe(true)
  })

  it('formats week key and amounts', () => {
    expect(getWeekKey(new Date('2026-02-05T12:00:00'))).toMatch(/^\d{4}-W\d{2}$/)
    expect(formatDigestAmount(150000)).toBe('1.5L')
    expect(formatDigestAmount(4500)).toBe('5k')
    expect(formatDigestAmount(999)).toBe('999')
  })
})