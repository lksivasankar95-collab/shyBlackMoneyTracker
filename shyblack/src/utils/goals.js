import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

export function getGoals() {
  return safeStorage.get(STORAGE_KEYS.GOALS, [])
}

export function saveGoals(goals) {
  safeStorage.set(STORAGE_KEYS.GOALS, goals)
}

export function createGoal(data) {
  const goals = getGoals()
  const goal = {
    id: generateId(),
    name: data.name.trim(),
    target: Math.abs(data.target) || 0,
    saved: Math.abs(data.saved) || 0,
    monthlyContribution: Math.abs(data.monthlyContribution) || 0,
    targetDate: data.targetDate || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    achievedAt: null,
  }
  goals.push(goal)
  saveGoals(goals)
  return goal
}

export function updateGoal(id, updates) {
  const goals = getGoals().map((g) => {
    if (g.id !== id) return g
    const merged = { ...g, ...updates }
    const isAchieved = merged.saved >= merged.target
    return { ...merged, updatedAt: Date.now(), achievedAt: isAchieved ? (g.achievedAt || Date.now()) : null }
  })
  saveGoals(goals)
  return goals.find((g) => g.id === id)
}

export function deleteGoal(id) {
  const goals = getGoals().filter((g) => g.id !== id)
  saveGoals(goals)
}

export function getGoalProjection(goal) {
  if (!goal || goal.target <= 0) return null
  const remaining = Math.max(0, goal.target - goal.saved)
  const contribution = goal.monthlyContribution || 0
  return {
    remaining,
    progress: Math.min(100, (goal.saved / goal.target) * 100),
    monthsToGoal: contribution > 0 ? Math.ceil(remaining / contribution) : null,
    isAchieved: goal.saved >= goal.target,
  }
}

export function migrateLegacySavingsGoal() {
  const legacy = safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })
  if (!legacy || legacy.target <= 0) return null
  const existing = getGoals()
  if (existing.some((g) => g.name === 'Savings Goal')) return null
  const goal = createGoal({ name: 'Savings Goal', target: legacy.target, saved: legacy.saved })
  safeStorage.set(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })
  return goal
}
