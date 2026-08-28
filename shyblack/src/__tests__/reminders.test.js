import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let reminderStore = {}

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => (key === 'shyblack_reminder' ? reminderStore : fallback),
    set: (key, value) => {
      if (key === 'shyblack_reminder') reminderStore = value
    },
  },
  STORAGE_KEYS: { REMINDER: 'shyblack_reminder', REVIEW: 'shyblack_review' },
}))

vi.mock('../utils/notifications', () => ({
  sendNotification: vi.fn().mockResolvedValue(1),
  cancelNotifications: vi.fn().mockResolvedValue(true),
  checkNotificationPermission: vi.fn().mockResolvedValue({ granted: true }),
  requestNotificationPermission: vi.fn().mockResolvedValue({ granted: true }),
  getPendingNotifications: vi.fn().mockResolvedValue([]),
  NOTIF_TYPES: {},
}))

vi.mock('../utils/debts', () => ({
  isOpenDebt: (d) => d && d.status !== 'closed',
}))

import { shouldShowReviewBanner, checkBillReminders } from '../utils/reminders'

function janTxs(count) {
  return Array.from({ length: count }, (_, i) => ({ id: i, date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, amount: 100 }))
}

describe('shouldShowReviewBanner', () => {
  beforeEach(() => {
    reminderStore = {}
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('always shows during the first days of the month', () => {
    vi.setSystemTime(new Date('2026-02-02T10:00:00'))
    expect(shouldShowReviewBanner([])).toBe(true)
  })

  it('shows when the previous month has at least 3 transactions', () => {
    vi.setSystemTime(new Date('2026-02-10T10:00:00'))
    expect(shouldShowReviewBanner(janTxs(3))).toBe(true)
  })

  it('hides when the previous month has fewer than 3 transactions', () => {
    vi.setSystemTime(new Date('2026-02-10T10:00:00'))
    expect(shouldShowReviewBanner(janTxs(2))).toBe(false)
  })

  it('ignores transactions from other months', () => {
    vi.setSystemTime(new Date('2026-02-10T10:00:00'))
    const txs = Array.from({ length: 5 }, (_, i) => ({ id: i, date: `2025-12-${String((i % 28) + 1).padStart(2, '0')}`, amount: 100 }))
    expect(shouldShowReviewBanner(txs)).toBe(false)
  })

  it('hides once the monthly recap notification was already sent', () => {
    vi.setSystemTime(new Date('2026-02-10T10:00:00'))
    reminderStore = { recap_2026_1: true }
    expect(shouldShowReviewBanner(janTxs(5))).toBe(false)
  })
})
describe('checkBillReminders', () => {
  const bill = (id, name, dueDate, active = true) => ({
    id, name, amount: 2500, dueDate, active, paidDates: [],
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when there are no bills', async () => {
    const { sendNotification } = await import('../utils/notifications')
    await checkBillReminders([])
    expect(sendNotification).not.toHaveBeenCalled()
  })

it('does nothing when notification permission is denied', async () => {
    const { sendNotification, checkNotificationPermission } = await import('../utils/notifications')
    checkNotificationPermission.mockResolvedValueOnce({ granted: false })
    await checkBillReminders([bill('b1', 'Internet', '2026-06-14')])
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('schedules overdue, due-today and upcoming bill notifications', async () => {
    const { sendNotification } = await import('../utils/notifications')
    await checkBillReminders([
      bill('b1', 'Internet', '2026-06-13'),
      bill('b2', 'Electricity', '2026-06-15'),
      bill('b3', 'Rent', '2026-06-18'),
      bill('b4', 'Far Bill', '2026-07-10'),
      bill('b5', 'Paused', '2026-06-16', false),
    ])

    const called = sendNotification.mock.calls.map((c) => c[1])
    expect(called.length).toBeGreaterThanOrEqual(3)

    const overdue = called.find((c) => String(c.id).startsWith('700000'))
    expect(overdue).toBeTruthy()
    expect(overdue.body).toContain('Internet')

    const dueToday = called.find((c) => String(c.id).startsWith('700100'))
    expect(dueToday).toBeTruthy()
    expect(dueToday.body).toContain('Electricity')

    const upcoming = called.filter((c) => String(c.id).startsWith('7002'))
    expect(upcoming.some((c) => c.body.includes('Rent'))).toBe(true)
    expect(upcoming.some((c) => c.body.includes('due in'))).toBe(true)

    const bodies = called.map((c) => c.body).join(' ')
    expect(bodies).not.toContain('Far Bill')
    expect(bodies).not.toContain('Paused')
  })
})
