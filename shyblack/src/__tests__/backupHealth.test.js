import { describe, it, expect, vi, beforeEach } from 'vitest'

let healthStore = null
let dismissStore = false

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    getRaw: (k, fb) => (k === 'backup_health' ? (healthStore ? JSON.stringify(healthStore) : null) : fb),
    set: (k, v) => {
      if (k === 'backup_health') healthStore = v
      if (k === 'backup_banner_dismissed') dismissStore = true
    },
    get: (k, fb) => (k === 'backup_banner_dismissed' ? dismissStore : fb),
  },
}))

const DAY = 86400000

import {
  getBackupHealth,
  hasRecentBackup,
  shouldShowBackupBanner,
  isBackupBannerDismissed,
  dismissBackupBanner,
  recordBackupEvent,
} from '../utils/backupHealth'

function withBackupAt(daysAgo) {
  return { lastBackupAt: Date.now() - daysAgo * DAY, totalExports: 1 }
}

describe('getBackupHealth', () => {
  beforeEach(() => {
    healthStore = null
    dismissStore = false
  })

  it('reports never when no record exists', () => {
    const health = getBackupHealth()
    expect(health.status).toBe('never')
    expect(health.daysSinceLastBackup).toBeNull()
  })

  it('reports good for a recent backup', () => {
    healthStore = withBackupAt(2)
    expect(getBackupHealth().status).toBe('good')
  })

  it('reports overdue after warning window', () => {
    healthStore = withBackupAt(20)
    expect(getBackupHealth().status).toBe('overdue')
  })

  it('reports critical after 30 days', () => {
    healthStore = withBackupAt(40)
    expect(getBackupHealth().status).toBe('critical')
  })

  it('tracks export events', () => {
    const rec = recordBackupEvent('export', true)
    expect(rec.totalExports).toBe(1)
    expect(rec.lastBackupAt).toBeGreaterThan(0)
  })
})

describe('backup banner', () => {
  beforeEach(() => {
    healthStore = null
    dismissStore = false
  })

  it('shows when no backup ever made', () => {
    expect(shouldShowBackupBanner()).toBe(true)
  })

  it('hides when backup is recent', () => {
    healthStore = withBackupAt(3)
    expect(shouldShowBackupBanner()).toBe(false)
  })

  it('shows when backup is overdue or critical', () => {
    healthStore = withBackupAt(16)
    expect(shouldShowBackupBanner()).toBe(true)
  })

  it('hasRecentBackup reflects fresh backups', () => {
    healthStore = withBackupAt(3)
    expect(hasRecentBackup()).toBe(true)
    healthStore = withBackupAt(40)
    expect(hasRecentBackup()).toBe(false)
  })

  it('honours dismissal', () => {
    expect(isBackupBannerDismissed()).toBe(false)
    dismissBackupBanner()
    expect(isBackupBannerDismissed()).toBe(true)
  })
})