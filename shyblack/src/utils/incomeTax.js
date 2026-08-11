/**
 * Income tax estimator (India) — slab logic for the old and new regimes.
 * Slab rates verified against FY 2026-27 (AY 2027-28): Budget 2026 kept the
 * Budget 2025 structure unchanged.
 *
 * New regime (default): 0-4L 0% · 4-8L 5% · 8-12L 10% · 12-16L 15% ·
 *   16-20L 20% · 20-24L 25% · >24L 30% — std. deduction ₹75k (salaried),
 *   87A rebate ₹60k up to ₹12L taxable income.
 * Old regime: 0-2.5L 0% · 2.5-5L 5% · 5-10L 20% · >10L 30% — std. deduction
 *   ₹50k, 87A rebate ₹12.5k up to ₹5L, plus 80C ₹1.5L and NPS ₹50k.
 * A 4% health & education cess applies in both regimes.
 */

export const FINANCIAL_YEARS = ['2026-27', '2025-26', '2024-25']

export const REGIME_NAMES = {
  new: 'New Regime (115BAC)',
  old: 'Old Regime (legacy)',
}

const NEW_REGIME_SLABS = [
  { upTo: 400000, rate: 0 },
  { upTo: 800000, rate: 0.05 },
  { upTo: 1200000, rate: 0.1 },
  { upTo: 1600000, rate: 0.15 },
  { upTo: 2000000, rate: 0.2 },
  { upTo: 2400000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
]

const OLD_REGIME_SLABS = [
  { upTo: 250000, rate: 0 },
  { upTo: 500000, rate: 0.05 },
  { upTo: 1000000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
]

const FY_PARAMS = {
  '2024-25': {
    newRegime: { stdDeduction: 75000, rebateLimit: 700000, rebateAmount: 25000 },
    oldRegime: { stdDeduction: 50000, rebateLimit: 500000, rebateAmount: 12500 },
  },
  '2025-26': {
    newRegime: { stdDeduction: 75000, rebateLimit: 1200000, rebateAmount: 60000 },
    oldRegime: { stdDeduction: 50000, rebateLimit: 500000, rebateAmount: 12500 },
  },
  '2026-27': {
    newRegime: { stdDeduction: 75000, rebateLimit: 1200000, rebateAmount: 60000 },
    oldRegime: { stdDeduction: 50000, rebateLimit: 500000, rebateAmount: 12500 },
  },
}

export const CESS_RATE = 0.04

const LIMIT_80C = 150000
const LIMIT_NPS = 50000

export function computeSlabTax(income, slabs) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of slabs) {
    if (income <= lower) break
    const band = Math.min(income, upTo) - lower
    if (band > 0) tax += band * rate
    lower = upTo
  }
  return Math.max(0, tax)
}

export function computeNewRegimeTax(taxableIncome, fy = '2026-27') {
  const p = FY_PARAMS[fy]?.newRegime || FY_PARAMS['2026-27'].newRegime
  const tax = computeSlabTax(taxableIncome, NEW_REGIME_SLABS)
  const rebateApplied = taxableIncome <= p.rebateLimit
  const afterRebate = rebateApplied ? Math.max(0, tax - p.rebateAmount) : tax
  const cess = afterRebate * CESS_RATE
  return {
    taxableIncome,
    taxBeforeRebate: tax,
    rebateApplied,
    rebateAmount: rebateApplied ? Math.min(tax, p.rebateAmount) : 0,
    tax: afterRebate,
    cess,
    total: afterRebate + cess,
  }
}

export function computeOldRegimeTax(taxableIncome, fy = '2026-27') {
  const p = FY_PARAMS[fy]?.oldRegime || FY_PARAMS['2026-27'].oldRegime
  const tax = computeSlabTax(taxableIncome, OLD_REGIME_SLABS)
  const rebateApplied = taxableIncome <= p.rebateLimit
  const afterRebate = rebateApplied ? Math.max(0, tax - p.rebateAmount) : tax
  const cess = afterRebate * CESS_RATE
  return {
    taxableIncome,
    taxBeforeRebate: tax,
    rebateApplied,
    rebateAmount: rebateApplied ? Math.min(tax, p.rebateAmount) : 0,
    tax: afterRebate,
    cess,
    total: afterRebate + cess,
  }
}

/**
 * Full estimate across both regimes.
 * income = { salary, freelance, investment, otherIncome } in ₹.
 * deductions80C and nps (₹) only matter for the old regime.
 * Returns both regime breakdowns plus a recommendation.
 */
export function estimateIncomeTax(input = {}) {
  const fy = input.fy || '2026-27'
  const salary = Math.max(0, input.salary || 0)
  const freelance = Math.max(0, input.freelance || 0)
  const investment = Math.max(0, input.investment || 0)
  const otherIncome = Math.max(0, input.otherIncome || 0)
  const gross = salary + freelance + investment + otherIncome

  const newParams = FY_PARAMS[fy]?.newRegime || FY_PARAMS['2026-27'].newRegime
  const newTaxable = Math.max(0, gross - (salary > 0 ? newParams.stdDeduction : 0))
  const newRegime = computeNewRegimeTax(newTaxable, fy)

  const d80c = Math.min(LIMIT_80C, Math.max(0, input.deductions80C || 0))
  const dNps = Math.min(LIMIT_NPS, Math.max(0, input.nps || 0))
  const oldParams = FY_PARAMS[fy]?.oldRegime || FY_PARAMS['2026-27'].oldRegime
  const oldTaxable = Math.max(0, gross - (salary > 0 ? oldParams.stdDeduction : 0) - d80c - dNps)
  const oldRegime = computeOldRegimeTax(oldTaxable, fy)

  const recommended = newRegime.total <= oldRegime.total ? 'new' : 'old'

  return {
    fy,
    gross,
    breakdown: {
      salary,
      freelance,
      investment,
      otherIncome,
    },
    deductions: { d80c: Math.round(d80c), nps: Math.round(dNps) },
    newRegime: {
      ...newRegime,
      effectiveRate: gross > 0 ? newRegime.total / gross : 0,
    },
    oldRegime: {
      ...oldRegime,
      effectiveRate: gross > 0 ? oldRegime.total / gross : 0,
    },
    recommended,
    savings: Math.abs(newRegime.total - oldRegime.total),
  }
}

/**
 * Financial year (Indian) of an ISO date string. '2026-03-31' -> '2025-26'.
 */
export function fyFromDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return month >= 4 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`
}

export function fyToYears(fy) {
  const start = Number(String(fy || '').slice(0, 4))
  if (!start) return null
  return { startYear: start, endYear: start + 1 }
}

/**
 * Aggregates income transactions for an Indian financial year by category.
 * trading_withdrawal counts as investment income.
 */
export function aggregateIncomeByFY(transactions, fy) {
  const years = fyToYears(fy)
  if (!years) return { salary: 0, freelance: 0, investment: 0, otherIncome: 0 }
  const start = new Date(years.startYear, 3, 1).getTime()
  const end = new Date(years.endYear, 2, 31, 23, 59, 59).getTime()

  const result = { salary: 0, freelance: 0, investment: 0, otherIncome: 0 }
  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'income') continue
    const ts = new Date(tx.date).getTime()
    if (isNaN(ts) || ts < start || ts > end) continue
    const amount = Math.abs(tx.amount) || 0
    if (tx.category === 'salary') result.salary += amount
    else if (tx.category === 'freelance') result.freelance += amount
    else if (tx.category === 'investment' || tx.category === 'trading_withdrawal') result.investment += amount
    else result.otherIncome += amount
  }
  return result
}

/**
 * Capital gains tax (approximate, FY 2024-25+): listed equity STCG taxed at
 * 20%, listed equity LTCG at 12.5%, both with a ₹1.25L annual exemption.
 * The 4% cess applies on top.
 */
export function estimateCapitalGainsTax(input = {}) {
  const equitySTCG = Math.max(0, input.equitySTCG || 0)
  const equityLTCG = Math.max(0, input.equityLTCG || 0)
  const tax = Math.max(0, (equitySTCG - 125000) * 0.2) + Math.max(0, (equityLTCG - 125000) * 0.125)
  const cess = tax * CESS_RATE
  return {
    equitySTCG,
    equityLTCG,
    exemption: 125000,
    tax,
    cess,
    total: tax + cess,
  }
}
