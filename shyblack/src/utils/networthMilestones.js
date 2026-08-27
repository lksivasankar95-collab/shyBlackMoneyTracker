import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const NET_WORTH_MILESTONES = [
  { id: '10k', value: 10000, label: '₹10K' },
  { id: '50k', value: 50000, label: '₹50K' },
  { id: '1l', value: 100000, label: '₹1L' },
  { id: '2l', value: 200000, label: '₹2L' },
  { id: '5l', value: 500000, label: '₹5L' },
  { id: '10l', value: 1000000, label: '₹10L' },
  { id: '25l', value: 2500000, label: '₹25L' },
  { id: '50l', value: 5000000, label: '₹50L' },
  { id: '1cr', value: 10000000, label: '₹1Cr' },
]

export function getLatestMilestone(netWorth) {
  if (typeof netWorth !== 'number' || netWorth < NET_WORTH_MILESTONES[0].value) return null
  let latest = null
  for (const m of NET_WORTH_MILESTONES) {
    if (netWorth >= m.value) latest = m
  }
  return latest
}

export function getNextMilestone(netWorth) {
  if (typeof netWorth !== 'number') return NET_WORTH_MILESTONES[0]
  return NET_WORTH_MILESTONES.find((m) => m.value > netWorth) || null
}

export function getMilestoneProgress(netWorth) {
  const next = getNextMilestone(netWorth)
  const current = getLatestMilestone(netWorth)
  if (!next || !current) return { current, next, progress: 0 }
  const base = current.value
  const span = next.value - base
  const progress = span > 0 ? Math.round(((netWorth - base) / span) * 100) : 100
  return { current, next, progress: Math.min(100, Math.max(0, progress)) }
}

export function getStoredLastMilestone() {
  const data = safeStorage.get(STORAGE_KEYS.NET_WORTH_MILESTONE, {})
  return data && typeof data.value === 'number' ? data.value : null
}

export function saveLastMilestoneValue(value) {
  safeStorage.set(STORAGE_KEYS.NET_WORTH_MILESTONE, { value, updatedAt: Date.now() })
}

export function getNewMilestone(netWorth, lastMilestoneValue) {
  const latest = getLatestMilestone(netWorth)
  if (!latest) return null
  const last = typeof lastMilestoneValue === 'number' ? lastMilestoneValue : 0
  if (latest.value > last) return latest
  return null
}