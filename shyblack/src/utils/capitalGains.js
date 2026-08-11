import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

/**
 * Capital gains & tax tracking (India).
 * FIFO lot-based tracker: buys create lots, sells realize gains from the
 * oldest lots, holding period classifies short/long term, and tax is
 * estimated with Indian rates (FY2026):
 *  - Equity STCG 15%, equity LTCG 10% above ₹1L exemption
 *  - Debt LTCG 20% (with indexation), debt STCG as per slab (default 30%)
 *  - Crypto: flat 30% on all gains
 */

export const ASSET_TAX_CLASSES = ['equity', 'debt', 'crypto', 'other']

export const TAX_RATES = {
  equity: { stcg: 0.15, ltcg: 0.10, ltcgExemption: 100000 },
  debt: { stcg: 0.30, ltcg: 0.20, ltcgExemption: 0 },
  crypto: { stcg: 0.30, ltcg: 0.30, ltcgExemption: 0 },
  other: { stcg: 0.30, ltcg: 0.20, ltcgExemption: 0 },
}

export const HOLDING_PERIOD_DAYS = { equity: 365, debt: 1095, crypto: 0, other: 1095 }

const EPSILON = 0.005

export function getPortfolio() {
  const raw = safeStorage.get(STORAGE_KEYS.CAPITAL_GAINS, { lots: [], realized: [] })
  if (!raw || typeof raw !== 'object') return { lots: [], realized: [] }
  return {
    lots: Array.isArray(raw.lots) ? raw.lots : [],
    realized: Array.isArray(raw.realized) ? raw.realized : [],
  }
}

export function savePortfolio(portfolio) {
  safeStorage.set(STORAGE_KEYS.CAPITAL_GAINS, {
    lots: Array.isArray(portfolio?.lots) ? portfolio.lots : [],
    realized: Array.isArray(portfolio?.realized) ? portfolio.realized : [],
  })
}

export function addLot(data) {
  const name = String(data?.name || '').trim()
  const qty = parseFloat(data?.quantity)
  const price = parseFloat(data?.buyPrice)
  if (!name || !qty || qty <= 0 || !price || price <= 0) return null
  const taxClass = ASSET_TAX_CLASSES.includes(data.taxClass) ? data.taxClass : 'other'
  const lot = {
    id: generateId(),
    name,
    taxClass,
    buyDate: data.buyDate || new Date().toISOString().split('T')[0],
    quantity: Math.round(qty * 10000) / 10000,
    buyPrice: Math.round(price * 100) / 100,
    fees: Math.max(0, parseFloat(data.fees) || 0),
  }
  const portfolio = getPortfolio()
  portfolio.lots.push(lot)
  savePortfolio(portfolio)
  return lot
}

function isLongTerm(taxClass, buyDate, sellDate) {
  if (!buyDate || !sellDate) return false
  const period = HOLDING_PERIOD_DAYS[taxClass] ?? HOLDING_PERIOD_DAYS.other
  if (period <= 0) return false
  const days = (new Date(sellDate) - new Date(buyDate)) / 86400000
  return days >= period
}

export function getOpenLots(name) {
  const portfolio = getPortfolio()
  return portfolio.lots.filter((l) => l && l.name === name && (l.quantity || 0) > EPSILON)
}

export function getHoldings() {
  const portfolio = getPortfolio()
  const byName = new Map()
  for (const lot of portfolio.lots) {
    if (!lot || (lot.quantity || 0) <= EPSILON) continue
    const key = lot.name
    if (!byName.has(key)) byName.set(key, { name: key, taxClass: lot.taxClass, quantity: 0, cost: 0, averageCost: 0 })
    const h = byName.get(key)
    h.quantity += lot.quantity
    h.cost += (lot.quantity * lot.buyPrice) + lot.fees
  }
  const result = [...byName.values()].map((h) => ({
    ...h,
    quantity: Math.round(h.quantity * 10000) / 10000,
    cost: Math.round(h.cost * 100) / 100,
    averageCost: Math.round((h.cost / h.quantity) * 100) / 100,
  }))
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

export function sellLots(name, data) {
  const quantity = parseFloat(data?.quantity)
  const price = parseFloat(data?.price)
  if (!name || !quantity || quantity <= 0 || !price || price <= 0) return { success: false, error: 'invalid' }
  const sellDate = data.date || new Date().toISOString().split('T')[0]
  const fees = Math.max(0, parseFloat(data.fees) || 0)

  const portfolio = getPortfolio()
  const open = portfolio.lots
    .filter((l) => l && l.name === name && (l.quantity || 0) > EPSILON)
    .sort((a, b) => String(a.buyDate).localeCompare(String(b.buyDate)))

  let remaining = quantity
  const allocations = []
  for (const lot of open) {
    if (remaining <= EPSILON) break
    const fromLot = Math.min(lot.quantity, remaining)
    allocations.push({ lot, quantity: fromLot })
    remaining -= fromLot
  }
  if (remaining > EPSILON) {
    return { success: false, error: 'insufficient_holdings' }
  }

  const allocationsWithFees = allocateFees(allocations, fees)
  const realized = allocationsWithFees.map(({ lot, quantity: q, feeShare }) => {
    const saleProceeds = q * price - feeShare
    const cost = lot.buyPrice * q
    const gain = saleProceeds - cost
    const longTerm = isLongTerm(lot.taxClass, lot.buyDate, sellDate)
    return {
      id: generateId(),
      name,
      taxClass: lot.taxClass,
      buyDate: lot.buyDate,
      sellDate,
      quantity: q,
      buyPrice: lot.buyPrice,
      sellPrice: price,
      cost,
      proceeds: saleProceeds,
      gain: Math.round(gain * 100) / 100,
      holdingDays: Math.round((new Date(sellDate) - new Date(lot.buyDate)) / 86400000),
      isLongTerm: longTerm,
      lotId: lot.id,
      createdAt: Date.now(),
    }
  })

  for (const { lot, quantity: q } of allocations) {
    lot.quantity = Math.round((lot.quantity - q) * 10000) / 10000
  }
  portfolio.lots = portfolio.lots.filter((l) => (l.quantity || 0) > EPSILON)
  portfolio.realized = [...realized, ...(portfolio.realized || [])]
  savePortfolio(portfolio)
  return { success: true, realized }
}

function allocateFees(allocations, totalFees) {
  const totalQty = allocations.reduce((s, a) => s + a.quantity, 0)
  if (!totalFees || totalQty <= 0) return allocations.map((a) => ({ ...a, feeShare: 0 }))
  return allocations.map((a, i) => {
    if (i === allocations.length - 1) {
      const used = allocations.slice(0, -1).reduce((s, x) => s + Math.round((x.quantity / totalQty) * totalFees * 100) / 100, 0)
      return { ...a, feeShare: Math.round((totalFees - used) * 100) / 100 }
    }
    return { ...a, feeShare: Math.round((a.quantity / totalQty) * totalFees * 100) / 100 }
  })
}

export function getTaxSummary() {
  const { realized } = getPortfolio()
  const perClass = {}
  let totalGain = 0
  let totalTax = 0
  for (const r of realized) {
    if (!perClass[r.taxClass]) {
      perClass[r.taxClass] = { stcg: 0, ltcg: 0, tax: 0 }
    }
    const bucket = perClass[r.taxClass]
    if (r.isLongTerm) {
      bucket.ltcg += r.gain
    } else {
      bucket.stcg += r.gain
    }
    totalGain += r.gain
  }

  for (const [cls, bucket] of Object.entries(perClass)) {
    const rate = TAX_RATES[cls] || TAX_RATES.other
    let tax = 0
    if (bucket.stcg > 0) tax += bucket.stcg * rate.stcg
    const taxableLtcg = Math.max(0, bucket.ltcg - rate.ltcgExemption)
    if (taxableLtcg > 0) tax += taxableLtcg * rate.ltcg
    bucket.tax = Math.round(tax * 100) / 100
    totalTax += bucket.tax
  }

  return {
    perClass,
    totalGain: Math.round(totalGain * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    trades: realized.length,
    ltcgExemptionRemaining: Math.max(0, 100000 - (perClass.equity ? perClass.equity.ltcg : 0)),
  }
}

export function deleteLot(lotId) {
  const portfolio = getPortfolio()
  const before = portfolio.lots.length
  portfolio.lots = portfolio.lots.filter((l) => l.id !== lotId)
  savePortfolio(portfolio)
  return portfolio.lots.length < before
}

export function clearRealizedGains() {
  const portfolio = getPortfolio()
  portfolio.realized = []
  savePortfolio(portfolio)
  return true
}

/** 80C / deductions estimator from transactions (ELSS, PPF, EPF, FD, insurance, NPS). */
const DEDUCTION_KEYWORDS = ['elss', 'ppf', 'epf', 'nps', 'tax saving', 'tax-saving', 'sukanya', 'insurance premium', 'life insurance', 'mutual fund sip', 'fixed deposit']

export function estimate80CDeductions(transactions) {
  if (!Array.isArray(transactions)) return { eligible: 0, items: [], capReached: false }
  const items = []
  let eligible = 0
  for (const tx of transactions) {
    if (!tx || tx.type !== 'expense') continue
    const note = String(tx.note || '').toLowerCase()
    if (!DEDUCTION_KEYWORDS.some((k) => note.includes(k))) continue
    const amount = tx.amount || 0
    eligible += amount
    items.push({ note: tx.note, amount, date: tx.date })
  }
  const capped = Math.min(eligible, 150000)
  return {
    eligible: Math.round(capped * 100) / 100,
    invested: Math.round(eligible * 100) / 100,
    items,
    capReached: eligible > 150000,
  }
}

export function resetCapitalGainsStore() {
  savePortfolio({ lots: [], realized: [] })
}