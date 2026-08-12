import { getInvestments } from './investmentLots'

/**
 * XIRR (extended internal rate of return) calculator.
 * Returns the annualized rate of return for irregular cash flows,
 * using Newton-Raphson with a bisection fallback.
 */

function round2(n) {
  return Math.round(n * 100) / 100
}

const DAYS_PER_YEAR = 365
const MAX_ITERATIONS = 100
const TOLERANCE = 1e-8

export function daysBetween(fromIso, toIso) {
  const a = new Date(fromIso).getTime()
  const b = new Date(toIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return (b - a) / (1000 * 60 * 60 * 24)
}

export function npv(rate, cashflows) {
  if (!Array.isArray(cashflows) || cashflows.length === 0) return 0
  const start = cashflows[0].date
  return cashflows.reduce((sum, cf) => {
    const years = daysBetween(start, cf.date) / DAYS_PER_YEAR
    return sum + cf.amount / Math.pow(1 + rate, years)
  }, 0)
}

function npvDerivative(rate, cashflows) {
  if (!Array.isArray(cashflows) || cashflows.length === 0) return 0
  const start = cashflows[0].date
  return cashflows.reduce((sum, cf) => {
    const years = daysBetween(start, cf.date) / DAYS_PER_YEAR
    return sum - years * cf.amount / Math.pow(1 + rate, years + 1)
  }, 0)
}

function hasOppositeSigns(cashflows) {
  if (!Array.isArray(cashflows)) return false
  const positives = cashflows.some((cf) => cf.amount > 0)
  const negatives = cashflows.some((cf) => cf.amount < 0)
  return positives && negatives
}

/**
 * Computes XIRR as a decimal fraction (e.g. 0.12 for 12%).
 * Returns null when the rate cannot be determined (fewer than 2 flows,
 * no direction change, or failed convergence).
 */
export function calculateXirr(cashflows, guess = 0.1) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return null
  if (!hasOppositeSigns(cashflows)) return null
  const flows = cashflows
    .filter((cf) => cf && typeof cf.amount === 'number' && cf.date)
    .sort((a, b) => daysBetween(b.date, a.date))

  let rate = guess
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const value = npv(rate, flows)
    if (Math.abs(value) < TOLERANCE) return rate
    const derivative = npvDerivative(rate, flows)
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break
    const next = rate - value / derivative
    if (!Number.isFinite(next)) break
    if (Math.abs(next - rate) < 1e-10) return next
    rate = next
  }

  let lo = -0.999999
  let hi = 10
  let fLo = npv(lo, flows)
  let fHi = npv(hi, flows)
  if (fLo * fHi > 0) {
    hi = 100
    fHi = npv(hi, flows)
    if (fLo * fHi > 0) return null
  }
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid, flows)
    if (Math.abs(fMid) < TOLERANCE) return mid
    if (fLo * fMid < 0) {
      hi = mid
      fHi = fMid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  const result = (lo + hi) / 2
  return Number.isFinite(result) ? result : null
}

/**
 * Builds an XIRR cash-flow series for a held investment lot.
 * Buys are negative flows, dividends and realized sale proceeds are
 * positive flows, and the current market value of remaining holdings
 * is treated as a terminal positive flow.
 * Returns the rate as a decimal or null if not computable.
 */
export function xirrForAsset(name, asOfDate) {
  const data = getInvestments()
  const asset = data.assets.find((a) => a.name === name)
  if (!asset || asset.lots.length === 0) return null
  const asOf = asOfDate || new Date().toISOString().split('T')[0]

  const flows = []
  for (const lot of asset.lots) {
    flows.push({ date: lot.date, amount: -(lot.quantity * lot.price + lot.fees) })
  }
  for (const d of data.dividends) {
    if (d.name === name) flows.push({ date: d.date, amount: d.amount })
  }
  for (const r of data.realized) {
    if (r.name === name) flows.push({ date: r.date, amount: r.proceeds })
  }
  let remainingQty = 0
  let remainingValue = 0
  for (const lot of asset.lots) {
    remainingQty += lot.quantity
    remainingValue += lot.quantity * (asset.lastPrice || lot.price)
  }
  if (remainingQty > 0) flows.push({ date: asOf, amount: remainingValue })

  const rate = calculateXirr(flows)
  return rate == null ? null : round2(rate * 100) / 100
}

/**
 * XIRR across all holdings, treating each asset's flows independently
 * concatenated into one series (portfolio-level annualized return).
 * Returns null when incomplete (missing market prices).
 */
export function xirrForPortfolio(asOfDate) {
  const data = getInvestments()
  const asOf = asOfDate || new Date().toISOString().split('T')[0]
  const flows = []
  for (const asset of data.assets) {
    if (asset.lots.length === 0) continue
    for (const lot of asset.lots) {
      flows.push({ date: lot.date, amount: -(lot.quantity * lot.price + lot.fees) })
    }
    let remainingQty = 0
    for (const lot of asset.lots) remainingQty += lot.quantity
    if (remainingQty > 0) {
      if (asset.lastPrice == null) return null
      flows.push({ date: asOf, amount: remainingQty * asset.lastPrice })
    }
  }
  for (const d of data.dividends) flows.push({ date: d.date, amount: d.amount })
  for (const r of data.realized) flows.push({ date: r.date, amount: r.proceeds })

  const rate = calculateXirr(flows)
  return rate == null ? null : round2(rate * 100) / 100
}