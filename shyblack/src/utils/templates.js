import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export function getTemplates() {
  return safeStorage.get(STORAGE_KEYS.TEMPLATES, [])
}

export function saveTemplates(templates) {
  safeStorage.set(STORAGE_KEYS.TEMPLATES, templates)
}

export function createTemplate(tx) {
  const templates = getTemplates()
  const template = {
    id: generateId(),
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    note: tx.note || '',
    person: tx.person ? { name: tx.person.name } : undefined,
    paymentMethod: tx.paymentMethod || undefined,
    source: tx.source || '',
    tags: tx.tags || [],
    label: `${tx.type === 'income' ? 'Receive' : 'Pay'} ${tx.person?.name || tx.category}`,
    uses: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  if (!templates.some((t) => isDuplicateTemplate(t, template))) {
    templates.unshift(template)
    saveTemplates(templates)
  }
  return template
}

function isDuplicateTemplate(a, b) {
  return a.type === b.type && a.category === b.category && a.amount === b.amount &&
    a.person?.name === b.person?.name && a.paymentMethod === b.paymentMethod
}

export function deleteTemplate(id) {
  const templates = getTemplates().filter((t) => t.id !== id)
  saveTemplates(templates)
}

export function incrementTemplateUse(id) {
  const templates = getTemplates().map((t) => {
    if (t.id !== id) return t
    return { ...t, uses: (t.uses || 0) + 1, updatedAt: Date.now() }
  })
  saveTemplates(templates)
}

export function getRecentTemplates(limit = 5) {
  return getTemplates().sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, limit)
}
