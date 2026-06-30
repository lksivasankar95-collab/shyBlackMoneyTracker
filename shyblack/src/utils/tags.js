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

export function renameTag(id, newName) {
  const tags = getTags()
  const trimmed = newName.trim().toLowerCase()
  if (!trimmed) return tags
  const tag = tags.find((t) => t.id === id)
  if (!tag) return tags
  if (tags.find((t) => t.name === trimmed && t.id !== id)) return tags
  tag.name = trimmed
  saveTags(tags)
  return tags
}

export function mergeTags(sourceName, targetName, transactions) {
  const tags = getTags()
  const source = sourceName.toLowerCase()
  const target = targetName.toLowerCase()
  if (!source || !target || source === target) return { tags, transactions }

  const updatedTags = tags.filter((t) => t.name !== source)
  saveTags(updatedTags)

  const updatedTxs = transactions.map((tx) => {
    if (!tx.tags || !tx.tags.includes(source)) return tx
    return {
      ...tx,
      tags: [...new Set(tx.tags.map((t) => (t === source ? target : t)))],
    }
  })

  return { tags: updatedTags, transactions: updatedTxs }
}

export function tagUsageStats(transactions) {
  const stats = {}
  transactions.forEach((tx) => {
    if (tx.tags && Array.isArray(tx.tags)) {
      tx.tags.forEach((tag) => {
        stats[tag] = (stats[tag] || 0) + 1
      })
    }
  })
  return Object.entries(stats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

const STOP_WORDS = new Set([
  'the','a','an','is','was','for','to','of','in','on','at','by','with',
  'from','and','or','but','not','this','that','it','be','are','has','had',
  'have','its','all','can','will','would','could','should','may','been',
  'some','than','then','each','very','just','about','also','after',
])

export function getTagSuggestionsFromNotes(transactions, max = 20) {
  const wordFreq = {}
  transactions.forEach((tx) => {
    if (!tx.note) return
    const words = tx.note.toLowerCase().split(/\s+/)
    words.forEach((word) => {
      const clean = word.replace(/[^a-z0-9#]/g, '')
      if (clean.length >= 3 && !STOP_WORDS.has(clean)) {
        wordFreq[clean] = (wordFreq[clean] || 0) + 1
      }
    })
  })
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word)
}

const COMMON_TAGS = [
  'essential', 'luxury', 'work', 'personal', 'emergency',
  'gift', 'travel', 'health', 'education', 'entertainment',
  'food', 'shopping', 'bills', 'rent', 'groceries',
  'subscription', 'transport', 'utilities', 'insurance', 'savings',
]

export function getCommonTags() {
  return COMMON_TAGS
}

export function getSuggestedTags() {
  const tags = getTags()
  const existingNames = new Set(tags.map((t) => t.name))
  const combined = new Set([...COMMON_TAGS, ...existingNames])
  return [...combined]
}
