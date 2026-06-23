import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

const mockStorage = {}
vi.mock('../utils/safeStorage', () => ({
  safeStorage: {
    get: (key, fallback) => mockStorage[key] !== undefined ? mockStorage[key] : fallback,
    set: (key, value) => { mockStorage[key] = value },
    remove: (key) => { delete mockStorage[key] },
  },
  STORAGE_KEYS: {
    WEALTH_ASSETS: 'test_wealth_assets',
  },
}))

vi.mock('../utils/helpers', () => ({
  generateId: () => 'test-id-' + Date.now(),
  formatCurrency: (v) => '₹' + (v || 0).toLocaleString('en-IN'),
}))

describe('wealthUtils', () => {
  let mod

  beforeAll(async () => {
    mod = await import('../utils/wealthUtils')
  })

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  describe('Asset CRUD', () => {
    it('returns empty array initially', () => {
      expect(mod.getWealthAssets()).toEqual([])
    })

    it('creates an asset', () => {
      const a = mod.createWealthAsset({
        assetType: 'stocks',
        assetName: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currentValue: 1800,
        investedAmount: 1500,
      })
      expect(a.assetType).toBe('stocks')
      expect(a.assetName).toBe('AAPL')
      expect(a.quantity).toBe(10)
      expect(a.currentValue).toBe(1800)
      expect(a.investedAmount).toBe(1500)
      expect(a.profitLoss).toBe(300)
      expect(a.id).toBeDefined()
      expect(a.createdAt).toBeDefined()
    })

    it('creates asset with default values', () => {
      const a = mod.createWealthAsset({ assetName: 'Cash' })
      expect(a.assetType).toBe('other')
      expect(a.quantity).toBe(0)
      expect(a.currentValue).toBe(0)
    })

    it('creates multiple assets', () => {
      mod.createWealthAsset({ assetType: 'cash', currentValue: 5000 })
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 10000 })
      expect(mod.getWealthAssets()).toHaveLength(2)
    })

    it('updates an asset', () => {
      const a = mod.createWealthAsset({ assetName: 'Gold', currentValue: 50000, investedAmount: 45000 })
      const updated = mod.updateWealthAsset(a.id, { currentValue: 55000 })
      expect(updated.currentValue).toBe(55000)
      expect(updated.profitLoss).toBe(10000)
    })

    it('returns null updating non-existent asset', () => {
      expect(mod.updateWealthAsset('non-existent', { currentValue: 100 })).toBeNull()
    })

    it('deletes an asset', () => {
      const a = mod.createWealthAsset({ assetName: 'Delete Me' })
      expect(mod.getWealthAssets()).toHaveLength(1)
      mod.deleteWealthAsset(a.id)
      expect(mod.getWealthAssets()).toHaveLength(0)
    })

    it('recalculates profitLoss on update', () => {
      const a = mod.createWealthAsset({ assetName: 'MF', currentValue: 1000, investedAmount: 800 })
      expect(a.profitLoss).toBe(200)
      const u = mod.updateWealthAsset(a.id, { currentValue: 1200 })
      expect(u.profitLoss).toBe(400)
    })
  })

  describe('Net Worth', () => {
    it('calculates net worth with assets only', () => {
      mod.createWealthAsset({ assetType: 'cash', currentValue: 10000 })
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 50000 })
      const nw = mod.calculateNetWorth(mod.getWealthAssets(), [], [], [])
      expect(nw.totalAssets).toBe(60000)
      expect(nw.totalLiabilities).toBe(0)
      expect(nw.netWorth).toBe(60000)
    })

    it('includes account balances', () => {
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 30000 })
      const nw = mod.calculateNetWorth(mod.getWealthAssets(), [{ balance: 25000 }], [], [])
      expect(nw.accountBalances).toBe(25000)
      expect(nw.netWorth).toBe(55000)
    })

    it('subtracts EMI liabilities', () => {
      mod.createWealthAsset({ assetType: 'cash', currentValue: 100000 })
      const emis = [{ remainingAmount: 20000 }]
      const nw = mod.calculateNetWorth(mod.getWealthAssets(), [], emis, [])
      expect(nw.totalLiabilities).toBe(20000)
      expect(nw.netWorth).toBe(80000)
    })

    it('subtracts debt liabilities', () => {
      mod.createWealthAsset({ assetType: 'cash', currentValue: 50000 })
      const debts = [{ type: 'borrowed', status: 'active', currentBalance: 15000 }]
      const nw = mod.calculateNetWorth(mod.getWealthAssets(), [], [], debts)
      expect(nw.totalLiabilities).toBe(15000)
      expect(nw.netWorth).toBe(35000)
    })

    it('handles empty data', () => {
      const nw = mod.calculateNetWorth([], [], [], [])
      expect(nw.totalAssets).toBe(0)
      expect(nw.totalLiabilities).toBe(0)
      expect(nw.netWorth).toBe(0)
    })

    it('generates net worth history', () => {
      mod.createWealthAsset({ assetType: 'cash', currentValue: 50000 })
      const history = mod.getNetWorthHistory(mod.getWealthAssets(), [], [], [], 3)
      expect(history).toHaveLength(3)
      expect(history[history.length - 1].netWorth).toBe(50000)
      expect(history[0].month).toBeDefined()
    })
  })

  describe('Portfolio Calculations', () => {
    it('calculates asset allocation', () => {
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 60000 })
      mod.createWealthAsset({ assetType: 'gold', currentValue: 30000 })
      mod.createWealthAsset({ assetType: 'cash', currentValue: 10000 })
      const alloc = mod.getAssetAllocation(mod.getWealthAssets())
      expect(alloc).toHaveLength(3)
      const stocks = alloc.find((a) => a.type === 'stocks')
      expect(stocks.percentage).toBe(60)
    })

    it('returns empty allocation for no assets', () => {
      expect(mod.getAssetAllocation([])).toEqual([])
    })

    it('calculates portfolio summary', () => {
      mod.createWealthAsset({ assetName: 'A', currentValue: 3000, investedAmount: 2000 })
      mod.createWealthAsset({ assetName: 'B', currentValue: 7000, investedAmount: 5000 })
      const ps = mod.getPortfolioSummary(mod.getWealthAssets())
      expect(ps.totalInvested).toBe(7000)
      expect(ps.totalCurrent).toBe(10000)
      expect(ps.totalProfitLoss).toBe(3000)
      expect(ps.profitLossPercent).toBe(42.857142857142854)
    })

    it('handles zero invested portfolio', () => {
      mod.createWealthAsset({ assetName: 'A', currentValue: 5000 })
      const ps = mod.getPortfolioSummary(mod.getWealthAssets())
      expect(ps.profitLossPercent).toBe(0)
    })

    it('filters portfolio by type', () => {
      mod.createWealthAsset({ assetType: 'stocks', assetName: 'S1', currentValue: 100 })
      mod.createWealthAsset({ assetType: 'gold', assetName: 'G1', currentValue: 200 })
      const stocks = mod.getPortfolioByType(mod.getWealthAssets(), 'stocks')
      expect(stocks).toHaveLength(1)
      expect(stocks[0].assetName).toBe('S1')
    })
  })

  describe('Wealth Score', () => {
    it('returns N/A for empty assets', () => {
      const score = mod.calculateWealthScore([], [], [], [])
      expect(score.grade).toBe('N/A')
      expect(score.overallScore).toBe(0)
    })

    it('calculates score with assets', () => {
      mod.createWealthAsset({ assetType: 'cash', currentValue: 10000, investedAmount: 10000 })
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 50000, investedAmount: 40000 })
      mod.createWealthAsset({ assetType: 'gold', currentValue: 30000, investedAmount: 28000 })
      const score = mod.calculateWealthScore(mod.getWealthAssets(), [], [], [])
      expect(score.overallScore).toBeGreaterThan(0)
      expect(score.grade).toBeDefined()
      expect(score.breakdown).toHaveLength(4)
    })

    it('includes all breakdown categories', () => {
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 1000, investedAmount: 1000 })
      const score = mod.calculateWealthScore(mod.getWealthAssets(), [], [], [])
      const labels = score.breakdown.map((b) => b.label)
      expect(labels).toContain('Diversification')
      expect(labels).toContain('Liquidity')
      expect(labels).toContain('Debt Management')
      expect(labels).toContain('Investment Growth')
    })
  })

  describe('Dashboard Stats', () => {
    it('returns formatted dashboard stats', () => {
      mod.createWealthAsset({ assetType: 'stocks', currentValue: 80000, investedAmount: 60000 })
      const ds = mod.getWealthDashboardStats(mod.getWealthAssets(), [{ balance: 20000 }], [], [])
      expect(ds.assetCount).toBe(1)
      expect(ds.netWorth).toBe(100000)
      expect(ds.totalAssets).toBe(100000)
      expect(ds.wealthScore).toBeGreaterThan(0)
      expect(ds.topAllocation).toBeDefined()
    })
  })

  describe('Goal Linking', () => {
    it('links asset to goal', () => {
      const a = mod.createWealthAsset({ assetName: 'Emergency Fund' })
      const linked = mod.linkAssetToGoal(a.id, 'goal-123')
      expect(linked.goalId).toBe('goal-123')
    })

    it('unlinks asset from goal', () => {
      const a = mod.createWealthAsset({ assetName: 'Fund', goalId: 'goal-123' })
      const unlinked = mod.unlinkAssetFromGoal(a.id)
      expect(unlinked.goalId).toBeNull()
    })

    it('gets assets by goal ID', () => {
      mod.createWealthAsset({ assetName: 'A1', goalId: 'g1' })
      mod.createWealthAsset({ assetName: 'A2', goalId: 'g1' })
      mod.createWealthAsset({ assetName: 'A3', goalId: 'g2' })
      const g1Assets = mod.getAssetsByGoal('g1')
      expect(g1Assets).toHaveLength(2)
    })
  })

  describe('Migration', () => {
    it('migrates from legacy storage', () => {
      mockStorage['legacy_investments'] = [
        { id: 'old1', type: 'stocks', name: 'Old Stock', value: 5000 },
      ]
      const migrated = mod.migrateWealthAssets('legacy_investments')
      expect(migrated).toHaveLength(1)
      expect(migrated[0].assetType).toBe('stocks')
      expect(migrated[0].currentValue).toBe(5000)
    })

    it('skips migration if assets exist', () => {
      mod.createWealthAsset({ assetName: 'Existing' })
      mockStorage['legacy'] = [{ name: 'Old', value: 100 }]
      const migrated = mod.migrateWealthAssets('legacy')
      expect(migrated).toHaveLength(1)
      expect(migrated[0].assetName).toBe('Existing')
    })
  })
})
