import { describe, it, expect } from 'vitest'
import { createDefaultBudgets, rolloverBudgets } from '../utils/budgets'

const budgets = {
  food: { limit: 5000, spent: 2000 },
  shopping: { limit: 3000, spent: 3500 },
  fuel: { limit: 1000, spent: 1000 },
}

describe('rolloverBudgets', () => {
  it('carries over 50% of positive leftover and resets spent', () => {
    const rolled = rolloverBudgets([], budgets)
    expect(rolled.food.rollover).toBe(1500)
    expect(rolled.food.spent).toBe(0)
  })

  it('resets spent for every category', () => {
    const rolled = rolloverBudgets([], budgets)
    expect(rolled.shopping.spent).toBe(0)
  })

  it('gives zero rollover when nothing is left', () => {
    const rolled = rolloverBudgets([], budgets)
    expect(rolled.fuel.rollover).toBe(0)
    expect(rolled.shopping.rollover).toBe(0)
  })

  it('does not mutate the input budgets', () => {
    const original = JSON.stringify(budgets)
    rolloverBudgets([], budgets)
    expect(JSON.stringify(budgets)).toBe(original)
  })
})

describe('createDefaultBudgets', () => {
  it('defines the standard category limits', () => {
    const defaults = createDefaultBudgets()
    expect(defaults.food.limit).toBe(5000)
    expect(defaults.bills.limit).toBe(8000)
    expect(Object.keys(defaults)).toHaveLength(5)
  })
})