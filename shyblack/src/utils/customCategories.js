import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './constants'

const CUSTOM_PREFIX = 'custom_'
const DEFAULT_ICON = 'Tag'

export function getCustomCategories() {
  const list = safeStorage.get(STORAGE_KEYS.CUSTOM_CATEGORIES, [])
  return Array.isArray(list) ? list : []
}

export function isCustomCategory(id) {
  return typeof id === 'string' && id.startsWith(CUSTOM_PREFIX)
}

export function addCustomCategory({ label, type = 'expense', icon = DEFAULT_ICON, color = '#10b981' }) {
  const name = (label || '').trim()
  if (!name) return null
  const list = getCustomCategories()
  const id = `${CUSTOM_PREFIX}${type}_${Date.now().toString(36)}`
  const entry = { id, label: name, type, icon, color }
  safeStorage.set(STORAGE_KEYS.CUSTOM_CATEGORIES, [...list, entry])
  return entry
}

export function removeCustomCategory(id) {
  const list = getCustomCategories()
  safeStorage.set(STORAGE_KEYS.CUSTOM_CATEGORIES, list.filter((c) => c.id !== id))
}

export function updateCustomCategory(id, patch) {
  const list = getCustomCategories()
  const entry = list.find((c) => c.id === id)
  if (!entry) return null
  const updated = { ...entry, ...patch }
  if (patch.label) updated.label = patch.label.trim()
  safeStorage.set(STORAGE_KEYS.CUSTOM_CATEGORIES, list.map((c) => (c.id === id ? updated : c)))
  return updated
}

export function getCategoriesForType(type) {
  const base = type === 'income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES]
  const custom = getCustomCategories().filter((c) => c.type === type)
  return custom.length > 0 ? [...base, ...custom] : base
}

export function getCategoryById(id, type) {
  if (!id) return null
  if (isCustomCategory(id)) {
    return getCustomCategories().find((c) => c.id === id) || null
  }
  const all = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
  return all.find((c) => c.id === id) || null
}