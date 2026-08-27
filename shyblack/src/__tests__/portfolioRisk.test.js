import { describe, it, expect } from 'vitest'
import { getPortfolioRiskCheck } from '../utils/portfolioRisk'

const holding = (name, kind, value) => ({ name, kind, invested: value, currentValue: value })

describe('getPortfolioRiskCheck', () => {
  it('reports a safe score for a diversified portfolio', () => {
    const risk = getPortfolioRiskCheck({
      holdings: [
        holding('HDFC Index', 'mutual_fund', 25000),
        holding('Reliance', 'stock', 25000),
        holding('Digital Gold', 'gold', 25000),
        holding('BTC', 'crypto', 25000),
      ],
    })
    expect(risk.score).toBeGreaterThanOrEqual(60)
    expect(risk.concentrationAlerts).toHaveLength(0)
    expect(risk.totalInvested).toBe(100000)
  })

  it('flags a concentrated overweight holding', () => {
    const risk = getPortfolioRiskCheck({
      holdings: [holding('LamboCo', 'stock', 90000), holding('Fund A', 'mutual_fund', 10000)],
    })
    expect(risk.concentrationAlerts).toHaveLength(1)
    expect(risk.concentrationAlerts[0]).toMatchObject({ name: 'LamboCo', pct: 90 })
    expect(risk.score).toBeLessThan(60)
    expect(risk.suggestions.some((s) => s.key === 'concentration')).toBe(true)
  })

  it('flags a single-asset class portfolio and recommends diversification', () => {
    const risk = getPortfolioRiskCheck({ holdings: [holding('ABC', 'stock', 50000)] })
    expect(risk.suggestions.some((s) => s.key === 'diversify_kinds')).toBe(true)
    expect(risk.score).toBeLessThan(50)
  })

  it('computes allocation percentages per asset kind', () => {
    const risk = getPortfolioRiskCheck({
      holdings: [holding('Stock', 'stock', 6000), holding('Fund', 'mutual_fund', 4000)],
    })
    const stockAlloc = risk.byKind.find((k) => k.kind === 'stock')
    expect(stockAlloc.pct).toBe(60)
    expect(stockAlloc.target).toBe(35)
    expect(stockAlloc.deviation).toBe(25)
  })

  it('returns an empty profile when there is nothing invested', () => {
    const risk = getPortfolioRiskCheck({ holdings: [] })
    expect(risk.score).toBe(0)
    expect(risk.totalInvested).toBe(0)
    expect(risk.byKind).toEqual([])
  })
})