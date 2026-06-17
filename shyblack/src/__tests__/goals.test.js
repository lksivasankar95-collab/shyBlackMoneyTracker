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

const { createGoal, updateGoal, getGoalProjection, migrateLegacySavingsGoal } =
  await import('../utils/goals.js')

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]) })

describe('createGoal', () => {
  it('creates a goal with required fields', () => {
    const goal = createGoal({ name: 'Emergency Fund', target: 50000, saved: 5000, monthlyContribution: 5000 })
    expect(goal.name).toBe('Emergency Fund')
    expect(goal.target).toBe(50000)
    expect(goal.saved).toBe(5000)
    expect(goal.monthlyContribution).toBe(5000)
    expect(goal.id).toBeDefined()
    expect(goal.createdAt).toBeDefined()
    expect(goal.achievedAt).toBeNull()
  })
})

describe('updateGoal', () => {
  it('updates saved amount and sets achievedAt when target met', () => {
    const goal = createGoal({ name: 'Vacation', target: 10000, saved: 2000 })
    const updated = updateGoal(goal.id, { saved: 10000 })
    expect(updated.saved).toBe(10000)
    expect(updated.achievedAt).not.toBeNull()
  })

  it('does not set achievedAt when target not yet met', () => {
    const goal = createGoal({ name: 'Vacation', target: 10000, saved: 2000 })
    const updated = updateGoal(goal.id, { saved: 5000 })
    expect(updated.achievedAt).toBeNull()
  })
})

describe('getGoalProjection', () => {
  it('returns null for goal with no target', () => {
    expect(getGoalProjection({ name: 'test', target: 0 })).toBeNull()
  })

  it('calculates remaining and progress', () => {
    const proj = getGoalProjection({ target: 10000, saved: 2500, monthlyContribution: 1000 })
    expect(proj.remaining).toBe(7500)
    expect(proj.progress).toBe(25)
    expect(proj.monthsToGoal).toBe(8)
  })

  it('marks as achieved when saved >= target', () => {
    const proj = getGoalProjection({ target: 5000, saved: 5000, monthlyContribution: 0 })
    expect(proj.isAchieved).toBe(true)
    expect(proj.remaining).toBe(0)
    expect(proj.progress).toBe(100)
  })

  it('returns null monthsToGoal when no contribution', () => {
    const proj = getGoalProjection({ target: 10000, saved: 1000, monthlyContribution: 0 })
    expect(proj.monthsToGoal).toBeNull()
  })
})

describe('migrateLegacySavingsGoal', () => {
  it('creates goal from legacy savings object', () => {
    store['shyblack_savings'] = JSON.stringify({ target: 50000, saved: 10000 })
    const result = migrateLegacySavingsGoal()
    expect(result).not.toBeNull()
    expect(result.name).toBe('Savings Goal')
    expect(result.target).toBe(50000)
    expect(result.saved).toBe(10000)
  })

  it('returns null when legacy has no target', () => {
    store['shyblack_savings'] = JSON.stringify({ target: 0, saved: 0 })
    expect(migrateLegacySavingsGoal()).toBeNull()
  })
})
