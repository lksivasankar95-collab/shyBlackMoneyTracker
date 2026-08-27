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

import { shouldShowReviewBanner } from '../utils/reminders'

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