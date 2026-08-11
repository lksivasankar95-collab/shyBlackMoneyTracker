import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

const mockStorage = {}

vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    getRaw: (key) => mockStorage[key] !== undefined ? JSON.stringify(mockStorage[key]) : null,
    set: (key, value) => { mockStorage[key] = value; return true },
    remove: (key) => { delete mockStorage[key]; return true },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]) },
  },
  STORAGE_KEYS: {
    RULES: 'test_rules',
    TRANSACTIONS: 'test_transactions',
  },
}))

vi.mock('../utils/helpers', () => ({
  generateId: () => 'rid' + Math.floor(Math.random() * 1e9),
}))

describe('rules engine', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/rules')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  it('rejects invalid rules', () => {
    expect(mod.createRule({ match: '', category: 'food' })).toBeNull()
    expect(mod.createRule({ match: 'ok', category: '' })).toBeNull()
    expect(mod.createRule({ match: '(', mode: 'regex', category: 'food' })).toBeNull()
  })

  it('creates and persists a rule', () => {
    const rule = mod.createRule({ match: 'zomato', category: 'food', tags: ['delivery'] })
    expect(rule.id).toBeTruthy()
    expect(mod.getRules()).toHaveLength(1)
    expect(mod.getRules()[0].category).toBe('food')
    expect(mod.getRules()[0].tags).toEqual(['delivery'])
  })

  it('toggles and deletes rules', () => {
    const rule = mod.createRule({ match: 'swiggy', category: 'food' })
    expect(mod.toggleRule(rule.id, false).enabled).toBe(false)
    expect(mod.deleteRule(rule.id)).toBe(true)
    expect(mod.getRules()).toHaveLength(0)
  })

  it('matches by substring against note or merchant', () => {
    mod.createRule({ match: 'uber', category: 'fuel' })
    expect(mod.findMatchingRule({ note: 'Uber ride to airport' }).category).toBe('fuel')
    expect(mod.findMatchingRule({ note: 'Uber ride to airport', merchant: 'nothing' }).category).toBe('fuel')
    expect(mod.findMatchingRule({ note: 'bus ticket' })).toBeNull()
  })

  it('applies category and tags to a transaction', () => {
    const rule = mod.createRule({ match: 'amazon', category: 'shopping', tags: ['online'] })
    const tx = mod.applyRulesToTransaction({ note: 'amazon parcel', type: 'expense' })
    expect(tx.category).toBe('shopping')
    expect(tx.tags).toContain('online')
    expect(tx.ruleId).toBe(rule.id)
    expect(tx.ruleApplied).toBe(true)
  })

  it('does not overwrite an explicit user category', () => {
    mod.createRule({ match: 'amazon', category: 'shopping' })
    const tx = mod.applyRulesToTransaction({ note: 'amazon', category: 'family' })
    expect(tx.category).toBe('family')
  })

  it('flags transactions instead of categorizing when rule type is flag', () => {
    mod.createRule({ match: 'mystery', category: 'other_expense', type: 'flag' })
    const tx = mod.applyRulesToTransaction({ note: 'mystery charge' })
    expect(tx.flagged).toBe(true)
  })

  it('supports regex matching', () => {
    mod.createRule({ match: '^upi[.-]?[0-9]{6}', mode: 'regex', category: 'other_expense' })
    expect(mod.findMatchingRule({ note: 'UPI-483920 refund' })).toBeTruthy()
    expect(mod.findMatchingRule({ note: 'plain text' })).toBeNull()
  })

  it('records usage counts', () => {
    const rule = mod.createRule({ match: 'flipkart', category: 'shopping' })
    mod.recordRuleUsage(rule.id)
    mod.recordRuleUsage(rule.id)
    expect(mod.getRuleStats().totalUses).toBe(2)
    expect(mod.getRuleStats().lastAppliedAt).toBeTruthy()
  })

  it('suggests rules from transaction history', () => {
    const txs = Array.from({ length: 6 }, (_, i) => ({
      note: i % 2 === 0 ? 'Zomato order' : 'Zomato dining',
      category: 'food',
    }))
    txs.push({ note: 'Zomato payment', category: 'other_expense' })
    const suggestions = mod.suggestRulesFromTransactions(txs)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].match).toBe('zomato')
    expect(suggestions[0].category).toBe('food')
  })

  it('only applies enabled rules', () => {
    const rule = mod.createRule({ match: 'netflix', category: 'subscription' })
    mod.toggleRule(rule.id, false)
    expect(mod.findMatchingRule({ note: 'netflix bill' })).toBeNull()
  })
})