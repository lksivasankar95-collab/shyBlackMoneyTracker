import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

const mockStorage = {}
vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    set: (key, value) => { mockStorage[key] = value; return true },
    remove: (key) => { delete mockStorage[key] },
  },
  STORAGE_KEYS: {
    BACKUPS: 'test_backups',
    SNAPSHOT: 'test_snapshot',
    TRANSACTIONS: 'test_transactions',
    DEBTS: 'test_debts',
    SAVINGS: 'test_savings',
    BUDGETS: 'test_budgets',
    RECURRING: 'test_recurring',
    TAGS: 'test_tags',
    EMIS: 'test_emis',
    NET_WORTH_ACCOUNTS: 'test_accounts',
    TRANSFERS: 'test_transfers',
    GOALS: 'test_goals',
    TEMPLATES: 'test_templates',
    DOCUMENTS: 'test_documents',
    DOCUMENT_FILES: 'test_doc_files',
    RELATIONSHIPS: 'test_relationships',
    ARCHIVE: 'test_archive',
    BUDGETS_V2: 'test_budgets_v2',
    RECEIPT_SCANS: 'test_receipts',
    WEALTH_ASSETS: 'test_wealth',
    SETTINGS: 'test_settings',
    SCHEMA: 'test_schema',
  },
}))

vi.mock('../utils/helpers', () => {
  let _counter = 0
  return {
    generateId: () => 'test-id-' + Date.now() + '-' + (_counter++),
  }
})

vi.mock('../utils/backupHealth', () => ({
  recordBackupEvent: vi.fn(),
  getBackupHealth: vi.fn(() => ({ status: 'good', message: 'OK', daysSinceLastBackup: 1 })),
  getBackupStats: vi.fn(() => ({ totalExports: 0, totalEncryptedExports: 0, totalRestores: 0 })),
}))

vi.mock('../utils/snapshotRecovery', () => ({
  saveSnapshot: vi.fn(),
  getSnapshotChain: vi.fn(() => []),
  findRecoverySnapshot: vi.fn(() => null),
}))

describe('backup system - generations', () => {
  let backup

  beforeAll(async () => {
    backup = await import('../utils/backup')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('returns empty generations initially', () => {
    expect(backup.getBackupGenerations()).toEqual([])
  })

  it('creates a backup record', async () => {
    mockStorage['test_transactions'] = [{ id: 'tx1', type: 'expense', amount: 100 }]
    mockStorage['test_debts'] = []
    const record = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions', 'debts'])
    expect(record.type).toBe('manual')
    expect(record.id).toBeDefined()
    expect(record.version).toBe(1)
    expect(record.createdAt).toBeGreaterThan(0)
    expect(record.checksum).toBeDefined()
    expect(record.size).toBeGreaterThan(0)
    expect(record.modules).toContain('transactions')
    expect(record.modules).toContain('debts')
  })

  it('keeps max 10 generations (rotation)', async () => {
    for (let i = 0; i < 15; i++) {
      await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions', 'debts'])
    }
    const gens = backup.getBackupGenerations()
    expect(gens.length).toBeLessThanOrEqual(10)
  })

  it('generates checksum', async () => {
    const cs1 = await backup.generateChecksum({ foo: 'bar' })
    const cs2 = await backup.generateChecksum({ foo: 'bar' })
    expect(cs1).toBe(cs2)
    const cs3 = await backup.generateChecksum({ foo: 'baz' })
    expect(cs1).not.toBe(cs3)
  })

  it('computes simple checksum', () => {
    const cs1 = backup.computeSimpleChecksum('hello')
    const cs2 = backup.computeSimpleChecksum('hello')
    expect(cs1).toBe(cs2)
    expect(cs1.length).toBe(8)
  })

  it('finds backup by id', async () => {
    const record = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    const found = backup.getBackupById(record.id)
    expect(found).not.toBeNull()
    expect(found.id).toBe(record.id)
  })

  it('returns null for non-existent id', () => {
    expect(backup.getBackupById('nonexistent')).toBeNull()
  })

  it('deletes a backup', async () => {
    const r1 = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    const r2 = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    expect(backup.getBackupGenerations()).toHaveLength(2)
    backup.deleteBackup(r1.id)
    expect(backup.getBackupGenerations()).toHaveLength(1)
  })

  it('clears all backups', async () => {
    await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    backup.clearAllBackups()
    expect(backup.getBackupGenerations()).toHaveLength(0)
  })

  it('creates different backup types', async () => {
    const manual = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    expect(manual.type).toBe('manual')
    const emergency = await backup.createBackupRecord(backup.BACKUP_TYPES.EMERGENCY, ['transactions'])
    expect(emergency.type).toBe('emergency')
    const scheduled = await backup.createBackupRecord(backup.BACKUP_TYPES.SCHEDULED, ['transactions'])
    expect(scheduled.type).toBe('scheduled')
    const preImport = await backup.createBackupRecord(backup.BACKUP_TYPES.PRE_IMPORT, ['transactions'])
    expect(preImport.type).toBe('pre_import')
  })
})

describe('backup verification', () => {
  let backup

  beforeAll(async () => {
    backup = await import('../utils/backup')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('verifies valid backup integrity', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    const record = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions', 'debts'])
    const result = await backup.verifyBackupIntegrity(record)
    expect(result.valid).toBe(true)
  })

  it('detects corrupted backup', async () => {
    const record = await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    record.data.transactions = 'corrupted'
    const result = await backup.verifyBackupIntegrity(record)
    expect(result.valid).toBe(false)
  })

  it('validates backup for restore', () => {
    const valid = backup.validateBackupForRestore({ version: 1, appVersion: 0, modules: ['transactions'] })
    expect(valid.valid).toBe(true)
  })

  it('rejects incompatible version', () => {
    const result = backup.validateBackupForRestore({ version: 99, appVersion: 0, modules: ['transactions'] })
    expect(result.valid).toBe(false)
  })

  it('rejects backup with no modules', () => {
    const result = backup.validateBackupForRestore({ version: 1, appVersion: 0, modules: [] })
    expect(result.valid).toBe(false)
  })
})

describe('selective restore', () => {
  let backup

  beforeAll(async () => {
    backup = await import('../utils/backup')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('restores selected modules', () => {
    const backupData = { transactions: [{ id: 'tx1', type: 'expense', amount: 100 }], debts: [] }
    const result = backup.restoreSelectedModules(backupData, ['transactions'])
    expect(result.restored).toContain('transactions')
    const stored = mockStorage['test_transactions']
    expect(stored).toEqual(backupData.transactions)
  })

  it('skips non-existent modules', () => {
    const backupData = { transactions: [] }
    const result = backup.restoreSelectedModules(backupData, ['non_existent_module'])
    expect(result.skipped).toContain('non_existent_module')
  })
})

describe('rollback system', () => {
  let backup

  beforeAll(async () => {
    backup = await import('../utils/backup')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('finds rollback target', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    const target = backup.getRollbackTarget(backup.getBackupGenerations())
    expect(target).not.toBeNull()
  })

  it('returns null for single backup', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    const target = backup.getRollbackTarget(backup.getBackupGenerations())
    expect(target).toBeNull()
  })

  it('verifies backup health score', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    const score = backup.getBackupHealthScore([])
    expect(score.score).toBe(0)
    expect(score.grade).toBe('F')
    expect(score.status).toBe('critical')
  })

  it('calculates health score with backups', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    for (let i = 0; i < 5; i++) {
      await backup.createBackupRecord(backup.BACKUP_TYPES.MANUAL, ['transactions'])
    }
    const score = backup.getBackupHealthScore(backup.getBackupGenerations())
    expect(score.score).toBeGreaterThan(0)
    expect(score.grade).toBeDefined()
    expect(score.backupCount).toBe(5)
  })
})

describe('backup manager', () => {
  let manager

  beforeAll(async () => {
    manager = await import('../utils/backupManager')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('creates manual backup via manager', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    const record = await manager.createManualBackup()
    expect(record.type).toBe('manual')
  })

  it('creates emergency backup', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    const record = await manager.createEmergencyBackup()
    expect(record.type).toBe('emergency')
  })

  it('creates backup with type', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    const { BACKUP_TYPES } = await import('../utils/backup')
    const record = await manager.createBackupWithType(BACKUP_TYPES.EMERGENCY)
    expect(record.type).toBe('emergency')
  })

  it('manages auto snapshots', () => {
    manager.snapshotBeforeImport()
    const snaps = manager.getAutoSnapshots()
    expect(snaps).toHaveLength(1)
    expect(snaps[0].label).toBe('Before Import')
  })

  it('restores from auto snapshot', () => {
    mockStorage['test_transactions'] = [{ id: 'tx1', type: 'expense', amount: 100 }]
    manager.snapshotBeforeImport()
    mockStorage['test_transactions'] = [{ id: 'tx2', type: 'income', amount: 200 }]
    const snaps = manager.getAutoSnapshots()
    const result = manager.restoreAutoSnapshot(snaps[0].id)
    expect(result.success).toBe(true)
  })

  it('deletes auto snapshot', () => {
    manager.snapshotBeforeImport()
    expect(manager.getAutoSnapshots()).toHaveLength(1)
    const snaps = manager.getAutoSnapshots()
    manager.deleteAutoSnapshot(snaps[0].id)
    expect(manager.getAutoSnapshots()).toHaveLength(0)
  })

  it('verifies backup via manager', async () => {
    mockStorage['test_transactions'] = []
    mockStorage['test_debts'] = []
    const record = await manager.createManualBackup()
    const result = await manager.verifyBackup(record.id)
    expect(result.valid).toBe(true)
    expect(result.integrity).toBeDefined()
  })

  it('get backup health score', () => {
    const health = manager.getBackupHealth()
    expect(health.score).toBeDefined()
  })

  it('get dashboard stats', () => {
    const stats = manager.getBackupDashboardStats()
    expect(stats.backupCount).toBe(0)
    expect(stats.healthStatus).toBeDefined()
  })
})
