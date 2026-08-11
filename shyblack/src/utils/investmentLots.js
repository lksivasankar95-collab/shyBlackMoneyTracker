import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

/**
 * Investment lot & dividend tracker.
 * Average-cost basis per asset: buys accumulate cost basis, sells realize
 * P&L, dividends/interest are recorded as income events and market prices
 * can be updated manually for unrealized valuation.
 */

export const INVESTMENT_KINDS = {
  STOCK: 'stock',
  MUTUAL_FUND: 'mutual_fund',
  CRYPTO: 'crypto',
  GOLD: 'gold',
  OTHER: 'other',
}

const EPS = 0.005

export function getInvestments() {
  const raw = safeStorage.get(STORAGE_KEYS.INVESTMENTS, { assets: [], dividends: [], realized: [] })
  if (!raw || typeof raw !== 'object') return { assets: [], dividends: [], realized: [] }
  return {
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    dividends: Array.isArray(raw.dividends) ? raw.dividends : [],
    realized: Array.isArray(raw.realized) ? raw.realized : [],
  }
}

function saveInvestments(data) {
  safeStorage.set(STORAGE_KEYS.INVESTMENTS, {
    assets: Array.isArray(data?.assets) ? data.assets : [],
    dividends: Array.isArray(data?.dividends) ? data.dividends : [],
    realized: Array.isArray(data?.realized) ? data.realized : [],
  })
}

export function getAsset(name) {
  if (!name) return null
  const { assets } = getInvestments()
  return assets.find((a) => a.name === name) || null
}

function ensureAsset(name, kind) {
  const data = getInvestments()
  let asset = data.assets.find((a) => a.name === name)
  if (!asset) {
    asset = {
      id: generateId(),
      name,
      kind: INVESTMENT_KINDS[kind] || INVESTMENT_KINDS.OTHER,
      lots: [],
      lastPrice: null,
      createdAt: Date.now(),
    }
    data.assets.push(asset)
    saveInvestments(data)
  }
  return asset
}

export function addBuy(name, data) {
  const qty = parseFloat(data?.quantity)
  const price = parseFloat(data?.price)
  if (!name || !qty || qty <= 0 || !price || price <= 0) return null
  const asset = ensureAsset(name, data.kind)
  const buy = {
    id: generateId(),
    date: data.date || new Date().toISOString().split('T')[0],
    quantity: Math.round(qty * 10000) / 10000,
    price: Math.round(price * 100) / 100,
    fees: Math.round((Math.max(0, parseFloat(data.fees) || 0)) * 100) / 100,
  }
  asset.lots.push(buy)
  saveInvestments(getInvestments())
  return buy
}

export function addSell(name, data) {
  const qty = parseFloat(data?.quantity)
  const price = parseFloat(data?.price)
  if (!name || !qty || qty <= 0 || !price || price <= 0) return { success: false, error: 'invalid' }
  const dataState = getInvestments()
  const asset = dataState.assets.find((a) => a.name === name)
  if (!asset) return { success: false, error: 'not_found' }

  let held = 0
  let costBasis = 0
  let feesIncluded = 0
  for (const lot of asset.lots) {
    held += lot.quantity
    costBasis += lot.quantity * lot.price
    feesIncluded += lot.fees
  }
  if (held <= EPS || qty > held + EPS) return { success: false, error: 'insufficient' }

  const avgCost = costBasis / held
  const unitFees = feesIncluded / held
  const fees = Math.max(0, parseFloat(data.fees) || 0)
  const allocatedQty = Math.min(qty, held)
  const costForSold = allocatedQty * avgCost + unitFees * allocatedQty
  const revenue = allocatedQty * price - fees
  const gain = revenue - costForSold

  let remaining = allocatedQty
  for (const lot of asset.lots) {
    if (remaining <= EPS) break
    const fromLot = Math.min(lot.quantity, remaining)
    lot.quantity = Math.round((lot.quantity - fromLot) * 10000) / 10000
    remaining -= fromLot
  }
  asset.lots = asset.lots.filter((l) => l.quantity > EPS)

  const realized = {
    id: generateId(),
    name,
    date: data.date || new Date().toISOString().split('T')[0],
    quantity: Math.round(allocatedQty * 10000) / 10000,
    salePrice: price,
    cost: Math.round(costForSold * 100) / 100,
    proceeds: Math.round(revenue * 100) / 100,
    gain: Math.round(gain * 100) / 100,
    createdAt: Date.now(),
  }
  dataState.realized = [realized, ...dataState.realized]
  saveInvestments(dataState)
  return { success: true, realized }
}

export function addDividend(name, data) {
  const amount = parseFloat(data?.amount)
  if (!name || !amount || amount <= 0) return null
  const dataState = getInvestments()
  const entry = {
    id: generateId(),
    name,
    date: data.date || new Date().toISOString().split('T')[0],
    amount: Math.round(amount * 100) / 100,
    kind: data.kind === 'interest' ? 'interest' : 'dividend',
    createdAt: Date.now(),
  }
  dataState.dividends = [entry, ...dataState.dividends]
  saveInvestments(dataState)
  return entry
}

export function updateMarketPrice(name, price) {
  const p = parseFloat(price)
  if (!name || !p || p <= 0) return null
  const dataState = getInvestments()
  const asset = dataState.assets.find((a) => a.name === name)
  if (!asset) return null
  asset.lastPrice = Math.round(p * 100) / 100
  saveInvestments(dataState)
  return asset
}

export function getInvestmentSummary(name) {
  const asset = getAsset(name)
  if (!asset) return null
  let quantity = 0
  let invested = 0
  for (const lot of asset.lots) {
    quantity += lot.quantity
    invested += lot.quantity * lot.price + lot.fees
  }
  const currentValue = asset.lastPrice ? quantity * asset.lastPrice : null
  return {
    name,
    kind: asset.kind,
    quantity: Math.round(quantity * 10000) / 10000,
    invested: Math.round(invested * 100) / 100,
    averageCost: quantity > EPS ? Math.round((invested / quantity) * 100) / 100 : 0,
    lastPrice: asset.lastPrice,
    currentValue: currentValue != null ? Math.round(currentValue * 100) / 100 : null,
    unrealizedGain: currentValue != null ? Math.round((currentValue - invested) * 100) / 100 : null,
    dividendIncome: getInvestments().dividends
      .filter((d) => d.name === name)
      .reduce((s, d) => s + d.amount, 0),
  }
}

export function getPortfolioSummary() {
  const dataState = getInvestments()
  const assets = dataState.assets
    .map((a) => getInvestmentSummary(a.name))
    .filter(Boolean)
  const invested = assets.reduce((s, a) => s + a.invested, 0)
  const valued = assets.filter((a) => a.currentValue != null)
  const marketValue = valued.reduce((s, a) => s + a.currentValue, 0)
  return {
    assets: assets.length,
    holdings: assets,
    invested: Math.round(invested * 100) / 100,
    marketValue: marketValue != null ? Math.round(marketValue * 100) / 100 : null,
    unrealized: marketValue != null ? Math.round((marketValue - invested) * 100) / 100 : null,
    dividends: Math.round(dataState.dividends.reduce((s, d) => s + d.amount, 0) * 100) / 100,
    realizedGain: Math.round(dataState.realized.reduce((s, r) => s + r.gain, 0) * 100) / 100,
    trades: dataState.realized.length,
  }
}

export function deleteAsset(name) {
  const dataState = getInvestments()
  const before = dataState.assets.length
  dataState.assets = dataState.assets.filter((a) => a.name !== name)
  saveInvestments(dataState)
  return dataState.assets.length < before
}

export function resetInvestmentStore() {
  saveInvestments({ assets: [], dividends: [], realized: [] })
}