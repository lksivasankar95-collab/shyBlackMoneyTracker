import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

/**
 * Smart categorization rules engine.
 * Users define rules (substring or regex over note/merchant) that are
 * applied to transactions on entry, auto-assigning category / tags / type.
 */

export const RULE_MATCH_MODES = {
  CONTAINS: 'contains',
  REGEX: 'regex',
}

export const RULE_SCOPES = {
  NOTE: 'note',
  MERCHANT: 'merchant',
  NOTE_OR_MERCHANT: 'note_or_merchant',
}

export const RULE_TYPES = {
  AUTO_CATEGORIZE: 'auto_categorize',
  FLAG: 'flag',
}

const MAX_RULES = 200

export function getRules() {
  const raw = safeStorage.get(STORAGE_KEYS.RULES, [])
  return Array.isArray(raw) ? raw : []
}

export function saveRules(rules) {
  safeStorage.set(STORAGE_KEYS.RULES, Array.isArray(rules) ? rules.slice(0, MAX_RULES) : [])
}

export function createRule(data) {
  if (!data || !data.category) return null
  const match = String(data.match || '').trim()
  if (!match) return null
  if (match.length > 200) return null

  const mode = data.mode === RULE_MATCH_MODES.REGEX ? RULE_MATCH_MODES.REGEX : RULE_MATCH_MODES.CONTAINS
  if (mode === RULE_MATCH_MODES.REGEX) {
    try {
      new RegExp(match, 'i')
    } catch {
      return null
    }
  }

  const rule = {
    id: generateId(),
    match,
    mode,
    scope: RULE_SCOPES[data.scope] || RULE_SCOPES.NOTE_OR_MERCHANT,
    category: data.category,
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).slice(0, 10) : [],
    type: data.type === RULE_TYPES.FLAG ? RULE_TYPES.FLAG : RULE_TYPES.AUTO_CATEGORIZE,
    note: String(data.note || '').trim(),
    enabled: data.enabled !== false,
    createdAt: Date.now(),
    usageCount: 0,
  }
  saveRules([rule, ...getRules()])
  return rule
}

export function updateRule(id, updates) {
  const rules = getRules()
  const idx = rules.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const next = { ...rules[idx], ...updates, id }
  rules[idx] = next
  saveRules(rules)
  return next
}

export function deleteRule(id) {
  saveRules(getRules().filter((r) => r.id !== id))
  return true
}

export function toggleRule(id, enabled) {
  const rules = getRules()
  const idx = rules.findIndex((r) => r.id === id)
  if (idx === -1) return null
  rules[idx] = { ...rules[idx], enabled: enabled !== false }
  saveRules(rules)
  return rules[idx]
}

function matchRule(rule, text) {
  if (!text) return false
  if (rule.mode === RULE_MATCH_MODES.REGEX) {
    try {
      return new RegExp(rule.match, 'i').test(text)
    } catch {
      return false
    }
  }
  return text.toLowerCase().includes(String(rule.match).toLowerCase())
}

function getRuleTarget(rule, transaction) {
  const note = String(transaction.note || transaction.description || '').toLowerCase()
  const merchant = String(transaction.merchant || '').toLowerCase()
  if (rule.scope === RULE_SCOPES.NOTE) return note
  if (rule.scope === RULE_SCOPES.MERCHANT) return merchant
  return `${note} ${merchant}`
}

export function findMatchingRule(transaction, rules = getRules()) {
  if (!transaction) return null
  const sorted = [...rules]
    .filter((r) => r && r.enabled)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  for (const rule of sorted) {
    if (matchRule(rule, getRuleTarget(rule, transaction))) {
      return rule
    }
  }
  return null
}

export function applyRulesToTransaction(transaction, rules = getRules(), options = {}) {
  if (!transaction) return transaction
  const rule = findMatchingRule(transaction, rules)
  if (!rule) return transaction
  if (rule.type === RULE_TYPES.FLAG) {
    return { ...transaction, flagged: true, ruleId: rule.id }
  }
  if (transaction.category && !options.override) return transaction
  const next = {
    ...transaction,
    category: rule.category,
    tags: rule.tags.length || transaction.tags ? [...new Set([...(transaction.tags || []), ...rule.tags])] : transaction.tags,
    ruleId: rule.id,
    ruleApplied: true,
  }
  if (rule.note && !transaction.note) next.note = rule.note
  return next
}

export function recordRuleUsage(ruleId) {
  const rules = getRules()
  const idx = rules.findIndex((r) => r.id === ruleId)
  if (idx === -1) return
  rules[idx] = { ...rules[idx], usageCount: (rules[idx].usageCount || 0) + 1, lastUsedAt: Date.now() }
  saveRules(rules)
}

export function getRuleStats() {
  const rules = getRules()
  const enabled = rules.filter((r) => r.enabled).length
  return {
    total: rules.length,
    enabled,
    disabled: rules.length - enabled,
    totalUses: rules.reduce((s, r) => s + (r.usageCount || 0), 0),
    lastAppliedAt: rules.reduce((m, r) => (r.lastUsedAt > m ? r.lastUsedAt : m), 0) || null,
  }
}

export function suggestRulesFromTransactions(transactions, maxSuggestions = 5) {
  if (!Array.isArray(transactions)) return []
  const buckets = new Map()
  for (const tx of transactions) {
    if (!tx || !tx.note || !tx.category || tx.note.trim().length < 3) continue
    const words = String(tx.note).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)
    for (const w of words) {
      if (['the', 'and', 'for', 'with', 'from', 'this', 'that', 'paid', 'via', 'by', 'at'].includes(w)) continue
      const key = w
      if (!buckets.has(key)) buckets.set(key, { match: w, categories: new Map() })
      const bucket = buckets.get(key)
      const catCount = bucket.categories.get(tx.category) || 0
      bucket.categories.set(tx.category, catCount + 1)
    }
  }
  const scored = [...buckets.values()]
    .map((b) => {
      const cats = [...b.categories.entries()].sort((x, y) => y[1] - x[1])
      const [category, count] = cats[0]
      const total = cats.reduce((s, [, c]) => s + c, 0)
      return { match: b.match, category, confidence: total === 0 ? 0 : count / total, uses: total }
    })
    .filter((s) => s.uses >= 2 && s.confidence >= 0.7)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, maxSuggestions)
  return scored
}

/** Reset usage counters (for testing conventions). */
export function resetRuleStore() {
  saveRules([])
}