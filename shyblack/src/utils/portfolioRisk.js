import { INVESTMENT_KINDS } from './investmentLots'

const KIND_TARGETS = {
  [INVESTMENT_KINDS.STOCK]: 35,
  [INVESTMENT_KINDS.MUTUAL_FUND]: 30,
  [INVESTMENT_KINDS.GOLD]: 12,
  [INVESTMENT_KINDS.CRYPTO]: 5,
  [INVESTMENT_KINDS.OTHER]: 18,
}

export function getPortfolioRiskCheck(portfolio) {
  const holdings = portfolio?.holdings || []
  const withValue = holdings.map((h) => ({
    ...h,
    value: h.currentValue != null ? h.currentValue : h.invested || 0,
  }))
  const total = withValue.reduce((s, h) => s + h.value, 0)

  if (total <= 0) {
    return {
      totalInvested: 0,
      byKind: [],
      concentrationAlerts: [],
      score: 0,
      suggestions: [],
      summary: { strong: 0, moderate: 0, good: 0 },
    }
  }

  const byKindMap = {}
  for (const h of withValue) {
    const kind = h.kind || INVESTMENT_KINDS.OTHER
    if (!byKindMap[kind]) byKindMap[kind] = { kind, value: 0, label: kind, pct: 0 }
    byKindMap[kind].value += h.value
  }
  const byKind = Object.values(byKindMap)
    .map((k) => {
      const target = KIND_TARGETS[k.kind]
      k.pct = Math.round((k.value / total) * 100)
      k.target = target != null ? target : null
      k.deviation = target != null ? k.pct - target : null
      return k
    })
    .sort((a, b) => b.value - a.value)

  const concentrationAlerts = withValue
    .map((h) => ({ name: h.name, pct: Math.round((h.value / total) * 100) }))
    .filter((h) => h.pct > 25)
    .sort((a, b) => b.pct - a.pct)

  const uniqueKinds = byKind.length
  const goodSpread = !concentrationAlerts.length
  const hasStocks = byKind.some((k) => k.kind === INVESTMENT_KINDS.STOCK)
  const hasFunds = byKind.some((k) => k.kind === INVESTMENT_KINDS.MUTUAL_FUND)
  const hasSafeHaven = byKind.some((k) => k.kind === INVESTMENT_KINDS.GOLD)
  const cryptoOverweight = (byKind.find((k) => k.kind === INVESTMENT_KINDS.CRYPTO)?.pct || 0) > 10

  let score = 0
  score += Math.min(30, uniqueKinds * 10)
  if (hasStocks && hasFunds) score += 25
  if (hasSafeHaven) score += 15
  if (goodSpread) score += 30
  else score += Math.max(0, 15 - concentrationAlerts.length * 5)
  if (cryptoOverweight) score -= 10
  score = Math.min(100, Math.max(0, Math.round(score)))

  const suggestions = []
  if (concentrationAlerts.length > 0) {
    suggestions.push({
      key: 'concentration',
      severity: 'high',
      names: concentrationAlerts.map((c) => c.name),
    })
  }
  if (uniqueKinds < 2) {
    suggestions.push({ key: 'diversify_kinds', severity: 'medium' })
  }
  if (cryptoOverweight) {
    suggestions.push({ key: 'crypto_overweight', severity: 'medium' })
  }
  for (const k of byKind) {
    if (k.deviation !== null && k.pct >= 1 && Math.abs(k.deviation) > 15) {
      suggestions.push({ key: 'rebalance', severity: 'low', kind: k.kind, deviation: k.deviation })
    }
  }

  return {
    totalInvested: Math.round(total),
    byKind,
    concentrationAlerts,
    score,
    suggestions,
    summary: {
      strong: score >= 75,
      moderate: score >= 45 && score < 75,
      good: score < 45,
    },
  }
}