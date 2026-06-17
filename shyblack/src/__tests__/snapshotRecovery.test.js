import { describe, it, expect, beforeEach } from 'vitest'

const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}

const { saveSnapshot, getSnapshotChain, findLatestValidSnapshot, findRecoverySnapshot, detectCorruption } =
  await import('../utils/snapshotRecovery.js')

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]) })

function makeTx(id) {
  return { id, type: 'expense', amount: 100, category: 'food', date: '2024-06-15' }
}

describe('saveSnapshot / getSnapshotChain', () => {
  it('saves and retrieves a snapshot', () => {
    const txs = [makeTx('1'), makeTx('2')]
    saveSnapshot(txs, { target: 1000, saved: 500 })
    const chain = getSnapshotChain()
    expect(chain).toHaveLength(1)
    expect(chain[0].transactions).toHaveLength(2)
    expect(chain[0].savingsGoal).toEqual({ target: 1000, saved: 500 })
  })

  it('maintains at most MAX_SNAPSHOTS entries', () => {
    for (let i = 0; i < 10; i++) {
      saveSnapshot([makeTx(String(i))], { target: 0, saved: 0 })
    }
    const chain = getSnapshotChain()
    expect(chain.length).toBeLessThanOrEqual(5)
    expect(chain[0].transactions[0].id).toBe('9')
  })

  it('trims snapshots older than 30 days', () => {
    const oldSnap = {
      ts: Date.now() - 31 * 24 * 60 * 60 * 1000,
      transactions: [makeTx('old')],
      savingsGoal: { target: 0, saved: 0 },
    }
    store['shyblack_snapshot_chain'] = JSON.stringify([oldSnap])
    const chain = getSnapshotChain()
    expect(chain).toHaveLength(0)
  })

  it('ignores corrupt snapshot entries', () => {
    const valid = { ts: Date.now(), transactions: [makeTx('v')], savingsGoal: { target: 0, saved: 0 } }
    const corrupt = { ts: 'bad-date', transactions: null }
    store['shyblack_snapshot_chain'] = JSON.stringify([valid, corrupt])
    const chain = getSnapshotChain()
    expect(chain).toHaveLength(1)
    expect(chain[0].transactions[0].id).toBe('v')
  })
})

describe('findLatestValidSnapshot', () => {
  it('returns the most recent valid snapshot', () => {
    saveSnapshot([makeTx('a')], { target: 0, saved: 0 })
    const found = findLatestValidSnapshot()
    expect(found).not.toBeNull()
    expect(found.transactions[0].id).toBe('a')
  })

  it('returns null when no snapshots exist', () => {
    expect(findLatestValidSnapshot()).toBeNull()
  })
})

describe('findRecoverySnapshot', () => {
  it('returns null when transactions exist', () => {
    expect(findRecoverySnapshot([makeTx('1')])).toBeNull()
  })

  it('returns null when onboarding not completed', () => {
    expect(findRecoverySnapshot([])).toBeNull()
  })

  it('returns snapshot when transactions empty and onboarding done', () => {
    store['shyblack_onboarding'] = JSON.stringify({ hasCompletedOnboarding: true })
    saveSnapshot([makeTx('r')], { target: 0, saved: 0 })
    const found = findRecoverySnapshot([])
    expect(found).not.toBeNull()
    expect(found.transactions[0].id).toBe('r')
  })
})

describe('detectCorruption', () => {
  it('returns no issues for clean storage', () => {
    store['shyblack_transactions'] = JSON.stringify([makeTx('1')])
    const issues = detectCorruption()
    const mainIssues = issues.filter((i) => i.index === -1)
    expect(mainIssues).toHaveLength(0)
  })

  it('detects corrupted transaction JSON', () => {
    store['shyblack_transactions'] = '{broken json'
    const issues = detectCorruption()
    expect(issues.some((i) => i.reason.includes('corrupted'))).toBe(true)
  })

  it('detects non-array transactions', () => {
    store['shyblack_transactions'] = JSON.stringify({ not: 'an array' })
    const issues = detectCorruption()
    expect(issues.some((i) => i.reason.includes('not an array'))).toBe(true)
  })
})
