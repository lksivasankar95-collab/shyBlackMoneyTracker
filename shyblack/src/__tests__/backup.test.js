import { describe, it, expect, beforeEach } from 'vitest'

// localStorage stub (same pattern as schema tests)
const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}

const { validateBackupData, parseAndValidateBackup, BACKUP_SCHEMA_VERSION } =
  await import('../utils/backup.js')

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]) })

const validBackup = () => ({
  app: 'shyblack-finance',
  version: BACKUP_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  data: {
    transactions: [{ id: '1', type: 'income', amount: 1000 }],
    debts: [{ id: 'd1', personName: 'Alice', amount: 500 }],
    savingsGoal: { target: 10000, saved: 2000 },
  },
})

describe('validateBackupData', () => {
  it('accepts a valid backup', () => {
    const { valid } = validateBackupData(validBackup())
    expect(valid).toBe(true)
  })

  it('rejects null input', () => {
    expect(validateBackupData(null).valid).toBe(false)
  })

  it('rejects missing required top-level fields', () => {
    const bad = validBackup()
    delete bad.exportedAt
    expect(validateBackupData(bad).valid).toBe(false)
  })

  it('rejects wrong app identifier', () => {
    const bad = { ...validBackup(), app: 'other-app' }
    expect(validateBackupData(bad).valid).toBe(false)
  })

  it('rejects missing transactions section', () => {
    const bad = validBackup()
    delete bad.data.transactions
    expect(validateBackupData(bad).valid).toBe(false)
  })

  it('rejects invalid transaction shape (missing amount)', () => {
    const bad = validBackup()
    bad.data.transactions = [{ id: '1', type: 'income' }] // no amount
    expect(validateBackupData(bad).valid).toBe(false)
  })

  it('rejects invalid savingsGoal (missing saved)', () => {
    const bad = validBackup()
    bad.data.savingsGoal = { target: 1000 }
    expect(validateBackupData(bad).valid).toBe(false)
  })

  it('accepts additional optional sections (tags, budgets)', () => {
    const good = validBackup()
    good.data.tags = [{ id: '1', name: 'food' }]
    good.data.budgets = { food: { limit: 5000 } }
    expect(validateBackupData(good).valid).toBe(true)
  })
})

describe('parseAndValidateBackup', () => {
  it('parses and validates a valid JSON backup', () => {
    const result = parseAndValidateBackup(JSON.stringify(validBackup()))
    expect(result.success).toBe(true)
    expect(result.data.transactions).toHaveLength(1)
  })

  it('returns error for invalid JSON', () => {
    const result = parseAndValidateBackup('{not valid json')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Invalid JSON/)
  })

  it('returns error for wrong app identifier in JSON', () => {
    const bad = { ...validBackup(), app: 'wrong' }
    const result = parseAndValidateBackup(JSON.stringify(bad))
    expect(result.success).toBe(false)
  })

  it('returns error for empty string', () => {
    const result = parseAndValidateBackup('')
    expect(result.success).toBe(false)
  })
})

describe('encryptBackup / decryptBackup round-trip', () => {
  it('decrypts to the original backup with correct password', async () => {
    // Web Crypto is available in Node 18+
    const { encryptBackup, decryptBackup } = await import('../utils/backup.js')
    const original = validBackup()
    const encrypted = await encryptBackup(original, 'test-password-123')

    expect(encrypted.encrypted).toBe(true)
    expect(encrypted.salt).toBeDefined()
    expect(encrypted.iv).toBeDefined()

    const decrypted = await decryptBackup(encrypted, 'test-password-123')
    expect(decrypted.data.transactions).toEqual(original.data.transactions)
  })

  it('throws with wrong password', async () => {
    const { encryptBackup, decryptBackup } = await import('../utils/backup.js')
    const encrypted = await encryptBackup(validBackup(), 'correct-password')
    await expect(decryptBackup(encrypted, 'wrong-password')).rejects.toThrow()
  })

  it('parseAndValidateEncryptedBackup returns error for wrong password', async () => {
    const { encryptBackup, parseAndValidateEncryptedBackup } = await import('../utils/backup.js')
    const encrypted = await encryptBackup(validBackup(), 'secret')
    const json = JSON.stringify(encrypted)
    const result = await parseAndValidateEncryptedBackup(json, 'wrong')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Incorrect password/)
  })
})
