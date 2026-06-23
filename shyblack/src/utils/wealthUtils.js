import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { generateId } from './helpers'

/* ── Asset CRUD ── */

export function getWealthAssets() {
  const data = safeStorage.get(STORAGE_KEYS.WEALTH_ASSETS, [])
  return Array.isArray(data) ? data : []
}

export function saveWealthAssets(items) {
  safeStorage.set(STORAGE_KEYS.WEALTH_ASSETS, items)
}

export function createWealthAsset(data) {
  const items = getWealthAssets()
  const asset = {
    id: generateId(),
    assetType: data.assetType || 'other',
    assetName: data.assetName || '',
    quantity: data.quantity ?? 0,
    purchasePrice: data.purchasePrice ?? 0,
    currentValue: data.currentValue ?? 0,
    investedAmount: data.investedAmount ?? 0,
    profitLoss: (data.currentValue ?? 0) - (data.investedAmount ?? 0),
    notes: data.notes || '',
    goalId: data.goalId || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  items.push(asset)
  saveWealthAssets(items)
  return asset
}

export function updateWealthAsset(id, updates) {
  const items = getWealthAssets()
  const idx = items.findIndex((a) => a.id === id)
  if (idx === -1) return null
  const updated = { ...items[idx], ...updates, id: items[idx].id, createdAt: items[idx].createdAt, updatedAt: Date.now() }
  if (updates.currentValue !== undefined || updates.investedAmount !== undefined) {
    updated.profitLoss = (updated.currentValue ?? 0) - (updated.investedAmount ?? 0)
  }
  items[idx] = updated
  saveWealthAssets(items)
  return updated
}

export function deleteWealthAsset(id) {
  saveWealthAssets(getWealthAssets().filter((a) => a.id !== id))
}

/* ── Net Worth ── */

export function calculateNetWorth(wealthAssets, accounts, emis, debts) {
  const totalAssets = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const accountBalances = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0)
  const cash = wealthAssets.filter((a) => a.assetType === 'cash').reduce((s, a) => s + (a.currentValue || 0), 0)

  const emiLiabilities = (emis || []).reduce((s, e) => s + ((e.remainingAmount ?? e.principalAmount ?? e.totalAmount ?? 0) - (e.paidAmount || 0)), 0)
  const debtLiabilities = (debts || []).filter((d) => d.type === 'borrowed' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
  const totalLiabilities = emiLiabilities + debtLiabilities

  const netWorth = totalAssets + accountBalances - totalLiabilities

  return { totalAssets, totalLiabilities, netWorth, accountBalances, cash }
}

export function getNetWorthHistory(wealthAssets, accounts, emis, debts, months = 12) {
  const history = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    history.push({
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      netWorth: 0,
    })
  }
  const current = calculateNetWorth(wealthAssets, accounts, emis, debts)
  if (history.length > 0) {
    history[history.length - 1].netWorth = current.netWorth
  }
  return history
}

/* ── Portfolio Calculations ── */

export function getAssetAllocation(wealthAssets) {
  const total = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  if (total === 0) return []
  const groups = {}
  wealthAssets.forEach((a) => {
    const type = a.assetType || 'other'
    groups[type] = (groups[type] || 0) + (a.currentValue || 0)
  })
  return Object.entries(groups).map(([type, value]) => ({
    type,
    value,
    percentage: Math.round((value / total) * 100),
  })).sort((a, b) => b.percentage - a.percentage)
}

export function getPortfolioByType(wealthAssets, assetType) {
  return wealthAssets.filter((a) => a.assetType === assetType)
}

export function getPortfolioSummary(wealthAssets) {
  const totalInvested = wealthAssets.reduce((s, a) => s + (a.investedAmount || 0), 0)
  const totalCurrent = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const totalProfitLoss = totalCurrent - totalInvested
  const profitLossPercent = totalInvested > 0 ? ((totalProfitLoss / totalInvested) * 100) : 0
  return { totalInvested, totalCurrent, totalProfitLoss, profitLossPercent }
}

/* ── Portfolio Health Score ── */

export function calculateWealthScore(wealthAssets, accounts, emis, debts) {
  const allocation = getAssetAllocation(wealthAssets)
  const portfolio = getPortfolioSummary(wealthAssets)
  const nw = calculateNetWorth(wealthAssets, accounts, emis, debts)

  if (wealthAssets.length === 0 && nw.totalLiabilities === 0) {
    return { diversificationScore: 0, liquidityScore: 0, debtRatio: 0, investmentRatio: 0, overallScore: 0, grade: 'N/A', breakdown: [] }
  }

  const typeCount = allocation.length
  const diversificationScore = Math.min(100, typeCount * 20)

  const liquidTypes = ['cash', 'bank_account', 'stocks', 'mutual_funds']
  const liquidValue = wealthAssets.filter((a) => liquidTypes.includes(a.assetType)).reduce((s, a) => s + (a.currentValue || 0), 0)
  const totalAssetValue = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const liquidityScore = totalAssetValue > 0 ? Math.min(100, Math.round((liquidValue / totalAssetValue) * 100)) : 0

  const debtRatio = nw.totalLiabilities > 0 && nw.totalAssets + nw.accountBalances > 0
    ? Math.min(100, Math.round((nw.totalLiabilities / (nw.totalAssets + nw.accountBalances)) * 100))
    : 0
  const debtScore = Math.max(0, 100 - debtRatio)

  const investmentRatio = portfolio.totalInvested > 0
    ? Math.min(100, Math.round((portfolio.totalCurrent / portfolio.totalInvested) * 100))
    : 0

  const overallScore = Math.round((diversificationScore * 0.2 + liquidityScore * 0.25 + debtScore * 0.3 + investmentRatio * 0.25))

  let grade
  if (overallScore >= 90) grade = 'A+'
  else if (overallScore >= 80) grade = 'A'
  else if (overallScore >= 65) grade = 'B'
  else if (overallScore >= 45) grade = 'C'
  else grade = 'D'

  return {
    diversificationScore,
    liquidityScore,
    debtRatio: debtScore,
    investmentRatio,
    overallScore,
    grade,
    breakdown: [
      { label: 'Diversification', score: diversificationScore, max: 100 },
      { label: 'Liquidity', score: liquidityScore, max: 100 },
      { label: 'Debt Management', score: debtScore, max: 100 },
      { label: 'Investment Growth', score: investmentRatio, max: 100 },
    ],
  }
}

/* ── Dashboard Stats ── */

export function getWealthDashboardStats(wealthAssets, accounts, emis, debts) {
  const nw = calculateNetWorth(wealthAssets, accounts, emis, debts)
  const summary = getPortfolioSummary(wealthAssets)
  const score = calculateWealthScore(wealthAssets, accounts, emis, debts)
  const allocation = getAssetAllocation(wealthAssets)
  return {
    netWorth: nw.netWorth,
    totalAssets: nw.totalAssets + nw.accountBalances,
    totalLiabilities: nw.totalLiabilities,
    totalInvested: summary.totalInvested,
    totalCurrent: summary.totalCurrent,
    totalProfitLoss: summary.totalProfitLoss,
    profitLossPercent: summary.profitLossPercent,
    assetCount: wealthAssets.length,
    wealthScore: score.overallScore,
    wealthGrade: score.grade,
    topAllocation: allocation.slice(0, 3),
  }
}

/* ── Goal Linking ── */

export function linkAssetToGoal(assetId, goalId) {
  return updateWealthAsset(assetId, { goalId })
}

export function unlinkAssetFromGoal(assetId) {
  return updateWealthAsset(assetId, { goalId: null })
}

export function getAssetsByGoal(goalId) {
  return getWealthAssets().filter((a) => a.goalId === goalId)
}

/* ── Migration (from legacy storage) ── */

export function migrateWealthAssets(oldKey) {
  const existing = getWealthAssets()
  if (existing.length > 0) return existing
  const old = safeStorage.get(oldKey, null)
  if (!old || !Array.isArray(old)) return existing
  const migrated = old.map((item) => ({
    id: item.id || generateId(),
    assetType: item.assetType || item.type || 'other',
    assetName: item.assetName || item.name || '',
    quantity: item.quantity ?? 0,
    purchasePrice: item.purchasePrice ?? 0,
    currentValue: item.currentValue ?? item.value ?? 0,
    investedAmount: item.investedAmount ?? item.purchasePrice ?? 0,
    profitLoss: (item.currentValue ?? item.value ?? 0) - (item.investedAmount ?? item.purchasePrice ?? 0),
    notes: item.notes || '',
    goalId: item.goalId || null,
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || Date.now(),
  }))
  saveWealthAssets(migrated)
  return migrated
}
