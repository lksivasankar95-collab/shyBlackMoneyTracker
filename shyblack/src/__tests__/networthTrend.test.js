import { describe, it, expect, vi, afterEach } from 'vitest'
import { getNetWorthTrend } from '../utils/networth'

function entry(daysAgo, netWorth, dateStr) {
  return { date: dateStr, netWorth }
}

describe('getNetWorthTrend', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters history by the requested period', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-10T00:00:00'))

    const history = [
      entry(1, 100, '2026-02-09'),
      entry(20, 101, '2026-01-21'),
      entry(120, 102, '2025-10-13'),
      entry(400, 103, '2025-01-06'),
    ]

    expect(getNetWorthTrend(history, '7d').map((h) => h.date)).toEqual(['2026-02-09'])
    expect(getNetWorthTrend(history, '30d').map((h) => h.date)).toEqual(['2026-01-21', '2026-02-09'])
    expect(getNetWorthTrend(history, '6m').map((h) => h.date)).toEqual(['2025-10-13', '2026-01-21', '2026-02-09'])
    expect(getNetWorthTrend(history, '1y').map((h) => h.date)).toHaveLength(3)
    expect(getNetWorthTrend(history, 'all').map((h) => h.date)).toHaveLength(4)
  })

  it('returns entries sorted by date ascending', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-10T00:00:00'))
    const history = [
      entry(20, 100, '2026-01-21'),
      entry(1, 110, '2026-02-09'),
    ]
    const trend = getNetWorthTrend(history, '30d')
    expect(trend[0].date).toBe('2026-01-21')
    expect(trend[1].date).toBe('2026-02-09')
  })

  it('returns empty for empty history', () => {
    expect(getNetWorthTrend([], '6m')).toEqual([])
  })
})