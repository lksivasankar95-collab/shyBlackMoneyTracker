import { describe, it, expect } from 'vitest'
import {
  forecastCashflow,
  forecastGoal,
  getGoalHealthScore,
  getGoalRecommendations,
  forecastEmiPayoff,
  forecastWealth,
  predictBudgetRisk,
  getOverspendingDetection,
  calculateRetirement,
  calculateEmergencyFund,
  getEmergencyFundFromTransactions,
  forecastFinancialHealth,
  generateForecastRecommendations,
  simulateScenario,
  getBestScenarioLever,
} from '../utils/forecastEngine'

/* ── Sample data ── */

const now = new Date()
const y = now.getFullYear()
const m = String(now.getMonth() + 1).padStart(2, '0')
const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const prevY = prevDate.getFullYear()
const prevM = String(prevDate.getMonth() + 1).padStart(2, '0')

const sampleTxs = [
  { id: '1', type: 'income', amount: 50000, category: 'salary', date: `${y}-${m}-01`, createdAt: Date.now() - 86400000 * 5 },
  { id: '2', type: 'income', amount: 50000, category: 'salary', date: `${prevY}-${prevM}-01`, createdAt: Date.now() - 86400000 * 35 },
  { id: '3', type: 'income', amount: 50000, category: 'salary', date: `${prevY}-${prevM}-01`, createdAt: Date.now() - 86400000 * 65 },
  { id: '4', type: 'expense', amount: 5000, category: 'food', date: `${y}-${m}-03`, createdAt: Date.now() - 86400000 * 2 },
  { id: '5', type: 'expense', amount: 8000, category: 'rent', date: `${y}-${m}-02`, createdAt: Date.now() - 86400000 * 4 },
  { id: '6', type: 'expense', amount: 3000, category: 'food', date: `${prevY}-${prevM}-15`, createdAt: Date.now() - 86400000 * 25 },
  { id: '7', type: 'expense', amount: 8000, category: 'rent', date: `${prevY}-${prevM}-02`, createdAt: Date.now() - 86400000 * 38 },
  { id: '8', type: 'expense', amount: 2000, category: 'shopping', date: `${prevY}-${prevM}-20`, createdAt: Date.now() - 86400000 * 50 },
  { id: '9', type: 'expense', amount: 8000, category: 'rent', date: `${prevY}-${prevM}-02`, createdAt: Date.now() - 86400000 * 68 },
]

const sampleGoal = {
  id: 'g1',
  name: 'Emergency Fund',
  target: 200000,
  saved: 80000,
  monthlyContribution: 10000,
}

const sampleEmi = {
  id: 'e1',
  name: 'Home Loan',
  loanName: 'Home Loan',
  emiAmount: 15000,
  amount: 15000,
  remainingAmount: 500000,
  remainingMonths: 40,
  interestRate: 9.5,
  status: 'active',
  principalAmount: 800000,
}

const sampleEmi2 = {
  id: 'e2',
  name: 'Car Loan',
  loanName: 'Car Loan',
  emiAmount: 8000,
  amount: 8000,
  remainingAmount: 120000,
  remainingMonths: 18,
  interestRate: 11,
  status: 'active',
  principalAmount: 200000,
}

const sampleBudgets = {
  food: { limit: 5000, spent: 3900 },
  shopping: { limit: 3000, spent: 2000 },
}

/* ══════════════════
   Cashflow Forecast
   ══════════════════ */

describe('forecastCashflow', () => {
  it('returns periods for 30/60/90/180/365 days', () => {
    const result = forecastCashflow({ transactions: sampleTxs })
    expect(result.periods).toHaveLength(5)
    expect(result.periods[0].periodDays).toBe(30)
    expect(result.periods[4].periodDays).toBe(365)
    expect(result.currentBalance).toBeGreaterThan(0)
  })

  it('includes three scenarios per period', () => {
    const result = forecastCashflow({ transactions: sampleTxs })
    for (const p of result.periods) {
      expect(p).toHaveProperty('bestCase')
      expect(p).toHaveProperty('expectedCase')
      expect(p).toHaveProperty('worstCase')
      expect(p.bestCase.projectedBalance).toBeGreaterThanOrEqual(p.worstCase.projectedBalance)
    }
  })

  it('returns predictedMonthEndBalance', () => {
    const result = forecastCashflow({ transactions: sampleTxs })
    expect(result.predictedMonthEndBalance).toBeDefined()
    expect(typeof result.predictedMonthEndBalance).toBe('number')
  })

  it('returns confidenceScore', () => {
    const result = forecastCashflow({ transactions: sampleTxs })
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0)
    expect(result.confidenceScore).toBeLessThanOrEqual(100)
  })

  it('handles empty transactions', () => {
    const result = forecastCashflow({ transactions: [] })
    expect(result.periods).toHaveLength(5)
    expect(result.currentBalance).toBe(0)
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0)
  })

  it('generates low cash alerts when balance is low', () => {
    const lowCashTxs = [
      { id: 'l1', type: 'expense', amount: 1000, category: 'food', date: '2026-06-01', createdAt: Date.now() - 86400000 },
    ]
    const result = forecastCashflow({ transactions: lowCashTxs })
    expect(result.lowCashAlerts).toBeInstanceOf(Array)
  })
})

/* ══════════════════
   Goal Forecasting
   ══════════════════ */

describe('forecastGoal', () => {
  it('calculates months to goal', () => {
    const result = forecastGoal(sampleGoal)
    expect(result).not.toBeNull()
    expect(result.remaining).toBe(120000)
    expect(result.monthsToGoal).toBe(12)
    expect(result.progress).toBe(40)
    expect(result.targetLabel).toContain('2027')
  })

  it('returns null for invalid goal', () => {
    expect(forecastGoal(null)).toBeNull()
    expect(forecastGoal({})).toBeNull()
    expect(forecastGoal({ target: 0 })).toBeNull()
  })

  it('marks achieved goals', () => {
    const achieved = { ...sampleGoal, saved: 200000 }
    const result = forecastGoal(achieved)
    expect(result.isAchieved).toBe(true)
  })
})

describe('getGoalHealthScore', () => {
  it('returns score and status', () => {
    const result = getGoalHealthScore(sampleGoal)
    expect(result.score).toBeGreaterThan(0)
    expect(['on_track', 'slightly_delayed', 'high_risk', 'unachievable']).toContain(result.status)
    expect(result.level).toBeTruthy()
  })

  it('returns 100 for achieved goals', () => {
    const achieved = { ...sampleGoal, saved: 200000 }
    const result = getGoalHealthScore(achieved)
    expect(result.score).toBe(100)
    expect(result.status).toBe('achieved')
  })

  it('handles invalid goal', () => {
    expect(getGoalHealthScore(null).status).toBe('No Data')
  })
})

describe('getGoalRecommendations', () => {
  it('returns recommendations for high-risk goals', () => {
    const highRisk = { ...sampleGoal, monthlyContribution: 500, saved: 2000 }
    const recs = getGoalRecommendations(highRisk, sampleTxs)
    expect(recs.length).toBeGreaterThan(0)
  })

  it('returns empty for achieved goals', () => {
    const achieved = { ...sampleGoal, saved: 200000 }
    expect(getGoalRecommendations(achieved)).toEqual([])
  })
})

/* ══════════════════
   EMI Payoff Forecast
   ══════════════════ */

describe('forecastEmiPayoff', () => {
  it('calculates current payoff details', () => {
    const result = forecastEmiPayoff(sampleEmi)
    expect(result).not.toBeNull()
    expect(result.loanName).toBe('Home Loan')
    expect(result.current.monthsToClosure).toBeGreaterThan(0)
    expect(result.current.closureDate).toBeTruthy()
    expect(result.current.totalInterest).toBeGreaterThan(0)
  })

  it('calculates accelerated payoff with extra payment', () => {
    const result = forecastEmiPayoff(sampleEmi2, 2000)
    expect(result).not.toBeNull()
    expect(result.accelerated).not.toBeNull()
    expect(result.monthsSaved).toBeGreaterThan(0)
    expect(result.accelerated.extraMonthly).toBe(2000)
    expect(result.accelerated.monthsToClosure).toBeLessThan(result.current.monthsToClosure)
  })

  it('returns null for completed EMI', () => {
    const completed = { ...sampleEmi, remainingAmount: 0, status: 'completed' }
    expect(forecastEmiPayoff(completed)).toBeNull()
  })

  it('accelerated saves interest', () => {
    const result = forecastEmiPayoff(sampleEmi, 5000)
    expect(result.interestSaved).toBeGreaterThan(0)
  })
})

/* ══════════════════
   Wealth Forecast
   ══════════════════ */

describe('forecastWealth', () => {
  it('returns projected net worth across periods', () => {
    const result = forecastWealth({ transactions: sampleTxs })
    expect(result.periods).toHaveLength(5)
    expect(result.currentNetWorth).toBeDefined()
    expect(result.projectedNetWorth365d).toBeGreaterThanOrEqual(0)
  })

  it('supports different growth models', () => {
    const conservative = forecastWealth({ transactions: sampleTxs, model: 'conservative' })
    const aggressive = forecastWealth({ transactions: sampleTxs, model: 'aggressive' })
    expect(aggressive.projectedNetWorth365d).toBeGreaterThanOrEqual(conservative.projectedNetWorth365d)
  })

  it('handles empty data', () => {
    const result = forecastWealth({ transactions: [] })
    expect(result.periods).toHaveLength(5)
    expect(result.currentNetWorth).toBe(0)
  })
})

/* ══════════════════
   Budget Risk Prediction
   ══════════════════ */

describe('predictBudgetRisk', () => {
  it('calculates breach probability', () => {
    const result = predictBudgetRisk('food', sampleTxs, sampleBudgets)
    expect(result).not.toBeNull()
    expect(result.categoryId).toBe('food')
    expect(result.breachProbability).toBeGreaterThan(0)
    expect(result.budget).toBe(5000)
    expect(result.currentSpend).toBeGreaterThan(0)
  })

  it('returns null for missing budget', () => {
    expect(predictBudgetRisk('nonexistent', sampleTxs, {})).toBeNull()
  })
})

describe('getOverspendingDetection', () => {
  it('returns categories at risk', () => {
    const result = getOverspendingDetection(sampleTxs, sampleBudgets)
    expect(result).toBeInstanceOf(Array)
  })

  it('returns empty when no budgets', () => {
    expect(getOverspendingDetection(sampleTxs, {})).toEqual([])
  })
})

/* ══════════════════
   Retirement Planner
   ══════════════════ */

describe('calculateRetirement', () => {
  it('calculates retirement corpus and income', () => {
    const result = calculateRetirement({
      currentAge: 30,
      retirementAge: 60,
      monthlyInvestment: 10000,
      currentSavings: 500000,
      expectedReturn: 8,
    })
    expect(result.retirementCorpus).toBeGreaterThan(0)
    expect(result.monthlyRetirementIncome).toBeGreaterThan(0)
    expect(result.readinessScore).toBeGreaterThan(0)
    expect(result.readinessLevel).toBeTruthy()
    expect(result.yearsToRetirement).toBe(30)
  })

  it('returns default readiness for minimal input', () => {
    const result = calculateRetirement({})
    expect(result.retirementCorpus).toBe(0)
    expect(result.yearsToRetirement).toBeGreaterThanOrEqual(1)
  })
})

/* ══════════════════
   Emergency Fund Planner
   ══════════════════ */

describe('calculateEmergencyFund', () => {
  it('calculates fund requirements', () => {
    const result = calculateEmergencyFund({ monthlyExpenses: 20000, currentSavings: 50000 })
    expect(result.recommendedFund).toBe(120000)
    expect(result.monthsCovered).toBe(2.5)
    expect(result.gap).toBe(70000)
    expect(result.coveragePercent).toBe(42)
    expect(result.status).toBe('underfunded')
  })

  it('detects fully funded', () => {
    const result = calculateEmergencyFund({ monthlyExpenses: 20000, currentSavings: 150000 })
    expect(result.coveragePercent).toBeGreaterThanOrEqual(100)
    expect(result.status).toBe('fully_funded')
  })
})

describe('getEmergencyFundFromTransactions', () => {
  it('calculates from transactions', () => {
    const result = getEmergencyFundFromTransactions(sampleTxs, 50000)
    expect(result.recommendedFund).toBeGreaterThan(0)
    expect(result.monthsCovered).toBeGreaterThan(0)
  })
})

/* ══════════════════
   Financial Health Forecast
   ══════════════════ */

describe('forecastFinancialHealth', () => {
  it('forecasts health score across periods', () => {
    const result = forecastFinancialHealth({ transactions: sampleTxs })
    expect(result.periods).toHaveLength(5)
    expect(result.currentScore).toBeGreaterThanOrEqual(0)
    expect(['improving', 'declining', 'stable']).toContain(result.trend)
  })

  it('handles empty data', () => {
    const result = forecastFinancialHealth({ transactions: [] })
    expect(result.periods).toHaveLength(5)
  })
})

/* ══════════════════
   Recommendation Engine
   ══════════════════ */

describe('generateForecastRecommendations', () => {
  it('generates recommendations based on data', () => {
    const recs = generateForecastRecommendations({
      transactions: sampleTxs,
      goals: [sampleGoal],
      emis: [sampleEmi],
      budgets: sampleBudgets,
    })
    expect(recs).toBeInstanceOf(Array)
    recs.forEach((r) => {
      expect(r).toHaveProperty('type')
      expect(r).toHaveProperty('text')
      expect(r).toHaveProperty('impact')
    })
  })

  it('returns empty array for minimal data', () => {
    const recs = generateForecastRecommendations({ transactions: [] })
    expect(recs).toBeInstanceOf(Array)
  })
})

/* ══════════════════
   What-If Scenarios
   ══════════════════ */

describe('simulateScenario', () => {
  it('simulates salary increase', () => {
    const result = simulateScenario(sampleTxs, { salaryIncrease: 20 })
    expect(result.monthlySurplus).toBeGreaterThan(0)
    expect(result.summary).toContain('Salary +20%')
    expect(result.periods).toHaveLength(5)
  })

  it('simulates EMI reduction', () => {
    const result = simulateScenario(sampleTxs, { emiReduction: 3000 })
    expect(result.monthlySurplus).toBeGreaterThan(0)
    expect(result.summary).toContain('EMI')
  })

  it('simulates savings increase', () => {
    const result = simulateScenario(sampleTxs, { savingsIncrease: 5000 })
    expect(result.monthlySurplus).toBeGreaterThan(0)
    expect(result.summary).toContain('Savings')
  })

  it('handles empty scenario', () => {
    const result = simulateScenario(sampleTxs, {})
    expect(result.periods).toHaveLength(5)
    expect(result.monthlySurplus).toBeDefined()
  })

  it('returns annual savings', () => {
    const result = simulateScenario(sampleTxs, { savingsIncrease: 5000 })
    expect(result.annualSavings).toBeGreaterThan(0)
  })
})

/* ══════════════════
   Edge Cases
   ══════════════════ */

describe('forecastEngine edge cases', () => {
  it('forecastCashflow handles recurring and emis', () => {
    const result = forecastCashflow({
      transactions: sampleTxs,
      recurring: [
        { id: 'r1', type: 'income', amount: 10000, active: true },
        { id: 'r2', type: 'expense', amount: 2000, active: true },
      ],
      emis: [sampleEmi],
      debts: [],
      budgets: { food: { limit: 5000 } },
    })
    expect(result.periods).toHaveLength(5)
  })

  it('forecastGoal works with zero monthly contribution', () => {
    const zeroContrib = { ...sampleGoal, monthlyContribution: 0 }
    const result = forecastGoal(zeroContrib)
    expect(result.monthsToGoal).toBeNull()
    expect(result.targetDate).toBeNull()
  })

  it('simulateScenario with all adjustments combined', () => {
    const result = simulateScenario(sampleTxs, {
      salaryIncrease: 10,
      emiReduction: 2000,
      savingsIncrease: 3000,
    })
    expect(result.monthlySurplus).toBeGreaterThan(0)
    expect(result.periods.length).toBe(5)
  })

  it('simulateScenario baseline surplus is stable with zero levers', () => {
    const result = simulateScenario(sampleTxs, {})
    const baseline = simulateScenario(sampleTxs, {})
    expect(result.baselineSurplus).toBeDefined()
    expect(result.improvement).toBe(0)
    expect(Math.abs(result.annualSavings - result.baselineSurplus * 12)).toBeLessThanOrEqual(12)
    expect(result.projectedBalance365d).toBeDefined()
    expect(baseline.baselineSurplus).toBe(result.baselineSurplus)
  })

  it('simulateScenario handles expense reduction', () => {
    const result = simulateScenario(sampleTxs, { expenseReduction: 3000 })
    expect(result.improvement).toBe(3000)
    expect(result.monthlySurplus).toBe(result.baselineSurplus + 3000)
    expect(result.summary).toContain('Expense -₹')
  })

  it('simulateScenario adds lump sum to current balance', () => {
    const base = simulateScenario(sampleTxs, {})
    const result = simulateScenario(sampleTxs, { lumpSum: 50000 })
    expect(result.currentBalance).toBe(base.currentBalance + 50000)
    expect(result.monthlySurplus).toBe(base.monthlySurplus)
    expect(result.summary).toContain('Lump sum')
  })
})

describe('getBestScenarioLever', () => {
  it('picks a lever with positive gain', () => {
    const best = getBestScenarioLever(sampleTxs)
    expect(best).not.toBeNull()
    expect(best.key).toBeDefined()
    expect(best.gain).toBeGreaterThan(0)
    expect(best.annualSavings).toBeGreaterThan(0)
  })

  it('respects custom levers and returns the max gain one', () => {
    const best = getBestScenarioLever(sampleTxs, [
      { key: 'a', label: 'Lever A', scenario: { savingsIncrease: 1000 } },
      { key: 'b', label: 'Lever B', scenario: { savingsIncrease: 5000 } },
    ])
    expect(best.key).toBe('b')
    expect(best.gain).toBe(5000 * 12)
  })

  it('returns null for empty transactions and empty levers', () => {
    expect(getBestScenarioLever([], [])).toBeNull()
  })
})
