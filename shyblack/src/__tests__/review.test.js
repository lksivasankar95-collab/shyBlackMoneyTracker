import { describe, it, expect, vi, beforeEach } from 'vitest'

let store = {}

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => (key === 'shyblack_review' ? store : fallback),
    set: (key, value) => {
      if (key === 'shyblack_review') store = value
    },
  },
  STORAGE_KEYS: { REVIEW: 'shyblack_review' },
}))

import {
  wasReviewGenerated,
  markReviewGenerated,
  isMonthlyReviewBannerDismissed,
  dismissMonthlyReviewBanner,
} from '../utils/review'

describe('review generator persistence', () => {
  beforeEach(() => {
    store = {}
  })

  it('returns false when no review was generated', () => {
    expect(wasReviewGenerated(2026, 6)).toBe(false)
  })

  it('tracks the month a review was generated', () => {
    markReviewGenerated(2026, 6)
    expect(wasReviewGenerated(2026, 6)).toBe(true)
  })

  it('does not leak between months', () => {
    markReviewGenerated(2025, 11)
    expect(wasReviewGenerated(2026, 0)).toBe(false)
  })
})

describe('monthly review banner dismissal', () => {
  beforeEach(() => {
    store = {}
  })

  it('is not dismissed by default', () => {
    expect(isMonthlyReviewBannerDismissed(2026, 6)).toBe(false)
  })

  it('dismisses for the current banner month only', () => {
    dismissMonthlyReviewBanner(2026, 6)
    expect(isMonthlyReviewBannerDismissed(2026, 6)).toBe(true)
    expect(isMonthlyReviewBannerDismissed(2026, 7)).toBe(false)
  })

  it('uses a separate key from the generated-review marker', () => {
    markReviewGenerated(2026, 6)
    expect(isMonthlyReviewBannerDismissed(2026, 6)).toBe(false)
    dismissMonthlyReviewBanner(2026, 6)
    expect(wasReviewGenerated(2026, 6)).toBe(true)
    expect(isMonthlyReviewBannerDismissed(2026, 6)).toBe(true)
  })
})