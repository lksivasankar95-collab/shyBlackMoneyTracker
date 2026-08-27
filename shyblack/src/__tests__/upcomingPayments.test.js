import { describe, it, expect } from 'vitest'
import { getDaysUntil, getUpcomingPayments } from '../utils/upcomingPayments'

function dayStr(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('upcomingPayments', () => {
  it('computes days until a date', () => {
    expect(getDaysUntil('2026-02-05', new Date('2026-02-01'))).toBe(4)
    expect(getDaysUntil('2026-02-01', new Date('2026-02-01'))).toBe(0)
    expect(getDaysUntil('2026-01-30', new Date('2026-02-01'))).toBe(-2)
    expect(getDaysUntil(null)).toBeNull()
  })

  it('merges bills and recurring payments within the window sorted by due date', () => {
    const bills = [
      { id: 'b1', name: 'Internet', amount: 799, dueDate: dayStr(2), active: true, paidDates: [] },
      { id: 'b2', name: 'Electricity', amount: 1200, dueDate: dayStr(20), active: true, paidDates: [] },
    ]
    const recurring = [
      { id: 'r1', note: 'Netflix', amount: 499, nextDate: dayStr(3), type: 'expense' },
      { id: 'r2', note: 'Gym', amount: 999, nextDate: dayStr(25), type: 'expense' },
    ]

    const items = getUpcomingPayments(bills, recurring, 7)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ kind: 'bill', name: 'Internet', daysLeft: 2 })
    expect(items[1]).toMatchObject({ kind: 'recurring', name: 'Netflix', daysLeft: 3 })
  })

  it('filters out everything outside the window', () => {
    const items = getUpcomingPayments(
      [{ id: 'b', name: 'Late', amount: 1, dueDate: dayStr(20), active: true, paidDates: [] }],
      [],
      7
    )
    expect(items).toHaveLength(0)
  })
})