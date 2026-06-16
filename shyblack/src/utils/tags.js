import { safeStorage, STORAGE_KEYS } from './safeStorage'

export function getTags() {
  return safeStorage.get(STORAGE_KEYS.TAGS, [])
}

export function saveTags(tags) {
  safeStorage.set(STORAGE_KEYS.TAGS, tags)
}

export function addTag(name) {
  const tags = getTags()
  const trimmed = name.trim().toLowerCase()
  if (!trimmed || tags.find((t) => t.name === trimmed)) return tags
  const newTag = { name: trimmed, id: Date.now().toString(36) }
  tags.push(newTag)
  saveTags(tags)
  return tags
}

export function removeTag(id) {
  const tags = getTags().filter((t) => t.id !== id)
  saveTags(tags)
  return tags
}

const COMMON_TAGS = [
  'essential', 'luxury', 'work', 'personal', 'emergency',
  'gift', 'travel', 'health', 'education', 'entertainment',
]

export function getSuggestedTags() {
  return COMMON_TAGS
}
