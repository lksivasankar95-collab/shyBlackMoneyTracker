import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft, Plus, Trash2, Edit3, TrendingUp, 
  Target, PieChart, Banknote, Building2,
  Landmark, CircleDot, Bitcoin, HelpCircle, X, Search,
  
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import { ASSET_TYPES, CRYPTO_COINS } from '../utils/constants'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'

const ASSET_TYPE_ICONS = {
  cash: Banknote, bank_account: Building2, fixed_deposit: Landmark,
  gold: CircleDot, silver: CircleDot, stocks: TrendingUp,
  mutual_funds: PieChart, crypto: Bitcoin, real_estate: Building2,
  other: HelpCircle,
}

const ASSET_COLORS = {
  cash: 'text-green-400', bank_account: 'text-blue-400', fixed_deposit: 'text-amber-400',
  gold: 'text-yellow-400', silver: 'text-gray-400', stocks: 'text-purple-400',
  mutual_funds: 'text-pink-400', crypto: 'text-orange-400', real_estate: 'text-cyan-400',
  other: 'text-gray-500',
}

const TAB_LABELS = ['Overview', 'Assets', 'Portfolio', 'Allocation', 'Health']

const emptyAssetForm = {
  assetType: 'bank_account',
  assetName: '',
  quantity: '',
  purchasePrice: '',
  currentValue: '',
  investedAmount: '',
  notes: '',
  goalId: '',
}

export default function WealthCenterPage({ onNavigate }) {
  const { addToast } = useToast()
  const {
    wealthAssets, addWealthAsset, updateWealthAssetCb, deleteWealthAssetCb,
    netWorthData, assetAllocation, portfolioSummary, wealthScore,
    accounts, goals,
  } = useFinance()

  const [activeTab, setActiveTab] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ ...emptyAssetForm })
  const [search, setSearch] = useState('')
  const [viewType, setViewType] = useState('all')

  const filteredAssets = useMemo(() => {
    let items = wealthAssets
    if (viewType !== 'all') items = items.filter((a) => a.assetType === viewType)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((a) => a.assetName?.toLowerCase().includes(q) || a.assetType?.toLowerCase().includes(q))
    }
    return items
  }, [wealthAssets, viewType, search])

  const assetTypesWithAssets = useMemo(() => {
    const types = new Set(wealthAssets.map((a) => a.assetType))
    return ASSET_TYPES.filter((t) => types.has(t.id))
  }, [wealthAssets])

  const totalCurrent = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)

  const resetForm = useCallback(() => {
    setForm({ ...emptyAssetForm })
    setEditTarget(null)
  }, [])

  const openAdd = useCallback(() => {
    resetForm()
    setShowForm(true)
  }, [resetForm])

  const openEdit = useCallback((asset) => {
    setEditTarget(asset)
    setForm({
      assetType: asset.assetType,
      assetName: asset.assetName,
      quantity: asset.quantity?.toString() || '',
      purchasePrice: asset.purchasePrice?.toString() || '',
      currentValue: asset.currentValue?.toString() || '',
      investedAmount: asset.investedAmount?.toString() || '',
      notes: asset.notes || '',
      goalId: asset.goalId || '',
    })
    setShowForm(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const data = {
      assetType: form.assetType,
      assetName: form.assetName || `${form.assetType} Asset`,
      quantity: parseFloat(form.quantity) || 0,
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      currentValue: parseFloat(form.currentValue) || 0,
      investedAmount: parseFloat(form.investedAmount) || 0,
      notes: form.notes,
      goalId: form.goalId || null,
    }
    if (editTarget) {
      updateWealthAssetCb(editTarget.id, data)
      addToast('Asset updated', 'success')
    } else {
      addWealthAsset(data)
      addToast('Asset added', 'success')
    }
    setShowForm(false)
    resetForm()
  }, [form, editTarget, updateWealthAssetCb, addWealthAsset, addToast, resetForm])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteWealthAssetCb(deleteTarget.id)
    addToast('Asset deleted', 'success')
    setDeleteTarget(null)
  }, [deleteTarget, deleteWealthAssetCb, addToast])

  const netWorthChange = useMemo(() => {
    if (netWorthData.totalAssets + netWorthData.accountBalances - netWorthData.totalLiabilities === 0) return 0
    return netWorthData.netWorth
  }, [netWorthData])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Wealth Center</h1>
          <p className="text-xs text-gray-500">Manage your assets & net worth</p>
        </div>
        <button onClick={openAdd} className="p-2.5 rounded-xl bg-neon/10 text-neon hover:bg-neon/20 transition-colors">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none">
        {TAB_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === i ? 'bg-neon/10 text-neon' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <OverviewTab
          netWorthData={netWorthData}
          netWorthChange={netWorthChange}
          portfolioSummary={portfolioSummary}
          wealthScore={wealthScore}
          assetAllocation={assetAllocation}
          wealthAssets={wealthAssets}
          accounts={accounts}
          onNavigate={onNavigate}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 1 && (
        <AssetsTab
          assets={filteredAssets}
          assetTypesWithAssets={assetTypesWithAssets}
          viewType={viewType}
          setViewType={setViewType}
          search={search}
          setSearch={setSearch}
          onEdit={openEdit}
          onDelete={(a) => setDeleteTarget(a)}
          totalCurrent={totalCurrent}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 2 && (
        <PortfolioTab
          wealthAssets={wealthAssets}
          portfolioSummary={portfolioSummary}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 3 && (
        <AllocationTab
          allocation={assetAllocation}
          wealthAssets={wealthAssets}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 4 && (
        <HealthTab
          score={wealthScore}
          netWorthData={netWorthData}
          portfolioSummary={portfolioSummary}
          assetAllocation={assetAllocation}
          formatCurrency={formatCurrency}
        />
      )}

      {showForm && (
        <AssetFormModal
          form={form}
          setForm={setForm}
          editTarget={editTarget}
          onClose={() => { setShowForm(false); resetForm() }}
          onSubmit={handleSubmit}
          goals={goals}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          title="Delete Asset"
          message={`Delete "${deleteTarget.assetName}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function OverviewTab({ netWorthData, portfolioSummary, wealthScore, assetAllocation, wealthAssets, accounts, onNavigate, formatCurrency }) {
  const totalAssets = netWorthData.totalAssets + netWorthData.accountBalances
  return (
    <div className="space-y-3">
      <GlassCard className="!p-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Net Worth</p>
        <p className={`text-2xl font-extrabold tracking-tight ${netWorthData.netWorth >= 0 ? 'text-neon' : 'text-red-400'}`}>
          {formatCurrency(netWorthData.netWorth)}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/[0.04] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">Assets</p>
            <p className="text-sm font-bold text-green-400">{formatCurrency(totalAssets)}</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">Liabilities</p>
            <p className="text-sm font-bold text-red-400">{formatCurrency(netWorthData.totalLiabilities)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white/[0.04] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">Invested</p>
            <p className="text-sm font-bold text-white">{formatCurrency(portfolioSummary.totalInvested)}</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">P&L</p>
            <p className={`text-sm font-bold ${portfolioSummary.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(portfolioSummary.totalProfitLoss)}
              {portfolioSummary.profitLossPercent !== 0 && (
                <span className="text-[10px] ml-1">({portfolioSummary.profitLossPercent.toFixed(1)}%)</span>
              )}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-2">
        <GlassCard className="!p-3 !text-center">
          <p className="text-xs font-bold text-white">{wealthAssets.length}</p>
          <p className="text-[10px] text-gray-500">Assets</p>
        </GlassCard>
        <GlassCard className="!p-3 !text-center" onClick={() => onNavigate('networth')}>
          <p className="text-xs font-bold text-white">{accounts?.length || 0}</p>
          <p className="text-[10px] text-gray-500">Accounts</p>
        </GlassCard>
        <GlassCard className="!p-3 !text-center">
          <p className={`text-xs font-bold ${wealthScore.grade === 'N/A' ? 'text-gray-400' : 'text-neon'}`}>
            {wealthScore.overallScore || '-'}
          </p>
          <p className="text-[10px] text-gray-500">Score</p>
        </GlassCard>
      </div>

      {assetAllocation.length > 0 && (
        <GlassCard className="!p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Top Allocations</p>
          <div className="space-y-1.5">
            {assetAllocation.slice(0, 4).map((item) => {
              const AT = ASSET_TYPES.find((t) => t.id === item.type)
              const Icon = AT ? ASSET_TYPE_ICONS[item.type] || HelpCircle : HelpCircle
              const color = ASSET_COLORS[item.type] || 'text-gray-400'
              return (
                <div key={item.type} className="flex items-center gap-2">
                  <Icon size={12} className={color} />
                  <span className="text-xs text-gray-400 flex-1">{AT?.label || item.type}</span>
                  <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="text-xs text-white font-medium w-10 text-right">{item.percentage}%</span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}

function AssetsTab({ assets, assetTypesWithAssets, viewType, setViewType, search, setSearch, onEdit, onDelete, totalCurrent, formatCurrency }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-1.5 bg-white/[0.04] rounded-xl px-3 py-2">
          <Search size={14} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
          />
          {search && <X size={14} className="text-gray-500 cursor-pointer" onClick={() => setSearch('')} />}
        </div>
      </div>

      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
        <button onClick={() => setViewType('all')} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${viewType === 'all' ? 'bg-neon/10 text-neon' : 'bg-white/[0.04] text-gray-500'}`}>
          All ({totalCurrent > 0 ? formatCurrency(totalCurrent) : '0'})
        </button>
        {assetTypesWithAssets.map((t) => {
          const Icon = ASSET_TYPE_ICONS[t.id] || HelpCircle
          const color = ASSET_COLORS[t.id] || 'text-gray-400'
          return (
            <button key={t.id} onClick={() => setViewType(t.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${viewType === t.id ? 'bg-white/[0.08] text-white' : 'bg-white/[0.04] text-gray-500'}`}>
              <Icon size={10} className={color} />
              {t.label}
            </button>
          )
        })}
      </div>

      {assets.length === 0 ? (
        <EmptyState icon={Target} title="No assets" message="Add your first asset to start tracking wealth" />
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const AT = ASSET_TYPES.find((t) => t.id === asset.assetType)
            const Icon = AT ? ASSET_TYPE_ICONS[asset.assetType] || HelpCircle : HelpCircle
            const color = ASSET_COLORS[asset.assetType] || 'text-gray-400'
            const pl = (asset.currentValue || 0) - (asset.investedAmount || 0)
            return (
              <GlassCard key={asset.id} className="!p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{asset.assetName}</p>
                    <p className="text-[10px] text-gray-500">{AT?.label || asset.assetType}</p>
                    {asset.quantity > 0 && <p className="text-[10px] text-gray-600">Qty: {asset.quantity}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{formatCurrency(asset.currentValue || 0)}</p>
                    <p className={`text-[10px] ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 justify-end">
                  <button onClick={() => onEdit(asset)} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                    <Edit3 size={12} className="text-gray-400" />
                  </button>
                  <button onClick={() => onDelete(asset)} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PortfolioTab({ wealthAssets, portfolioSummary, formatCurrency }) {
  const cryptoAssets = wealthAssets.filter((a) => a.assetType === 'crypto')
  const stockAssets = wealthAssets.filter((a) => a.assetType === 'stocks')
  const mfAssets = wealthAssets.filter((a) => a.assetType === 'mutual_funds')
  const goldAssets = wealthAssets.filter((a) => a.assetType === 'gold' || a.assetType === 'silver')
  const fdAssets = wealthAssets.filter((a) => a.assetType === 'fixed_deposit')
  const otherAssets = wealthAssets.filter((a) => ['real_estate', 'cash', 'bank_account', 'other'].includes(a.assetType))

  return (
    <div className="space-y-3">
      <GlassCard className="!p-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Portfolio Summary</p>
        <div className="grid grid-cols-2 gap-2">
          <div><p className="text-[10px] text-gray-600">Invested</p><p className="text-sm font-bold text-white">{formatCurrency(portfolioSummary.totalInvested)}</p></div>
          <div><p className="text-[10px] text-gray-600">Current</p><p className="text-sm font-bold text-white">{formatCurrency(portfolioSummary.totalCurrent)}</p></div>
          <div><p className="text-[10px] text-gray-600">P&L</p><p className={`text-sm font-bold ${portfolioSummary.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(portfolioSummary.totalProfitLoss)}</p></div>
          <div><p className="text-[10px] text-gray-600">Return</p><p className={`text-sm font-bold ${portfolioSummary.profitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{portfolioSummary.profitLossPercent.toFixed(1)}%</p></div>
        </div>
      </GlassCard>

      {cryptoAssets.length > 0 && (
        <GlassCard className="!p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Bitcoin size={14} className="text-orange-400" />
            <p className="text-xs font-semibold text-white">Crypto Portfolio</p>
          </div>
          {cryptoAssets.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
              <div><p className="text-xs text-white">{a.assetName}</p><p className="text-[10px] text-gray-600">Qty: {a.quantity}</p></div>
              <div className="text-right">
                <p className="text-xs font-bold text-white">{formatCurrency(a.currentValue || 0)}</p>
                <p className={`text-[10px] ${(a.currentValue || 0) - (a.investedAmount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency((a.currentValue || 0) - (a.investedAmount || 0))}
                </p>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {stockAssets.length > 0 && (
        <GlassCard className="!p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-purple-400" />
            <p className="text-xs font-semibold text-white">Stock Portfolio</p>
          </div>
          {stockAssets.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
              <div><p className="text-xs text-white">{a.assetName}</p><p className="text-[10px] text-gray-600">Shares: {a.quantity}</p></div>
              <div className="text-right">
                <p className="text-xs font-bold text-white">{formatCurrency(a.currentValue || 0)}</p>
                <p className={`text-[10px] ${(a.currentValue || 0) - (a.investedAmount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency((a.currentValue || 0) - (a.investedAmount || 0))}
                </p>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {mfAssets.length > 0 && (
        <GlassCard className="!p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <PieChart size={14} className="text-pink-400" />
            <p className="text-xs font-semibold text-white">Mutual Funds</p>
          </div>
          {mfAssets.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
              <div><p className="text-xs text-white">{a.assetName}</p><p className="text-[10px] text-gray-600">Units: {a.quantity}</p></div>
              <div className="text-right">
                <p className="text-xs font-bold text-white">{formatCurrency(a.currentValue || 0)}</p>
                <p className={`text-[10px] ${(a.currentValue || 0) - (a.investedAmount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency((a.currentValue || 0) - (a.investedAmount || 0))}
                </p>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {goldAssets.length > 0 && (
        <GoldPortfolioSection assets={goldAssets} formatCurrency={formatCurrency} />
      )}

      {fdAssets.length > 0 && (
        <GlassCard className="!p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark size={14} className="text-amber-400" />
            <p className="text-xs font-semibold text-white">Fixed Deposits</p>
          </div>
          {fdAssets.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
              <div><p className="text-xs text-white">{a.assetName}</p><p className="text-[10px] text-gray-600">Principal: {formatCurrency(a.investedAmount || 0)}</p></div>
              <div className="text-right">
                <p className="text-xs font-bold text-white">{formatCurrency(a.currentValue || 0)}</p>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {otherAssets.length > 0 && (
        <GlassCard className="!p-3">
          <p className="text-xs font-semibold text-white mb-2">Other Assets</p>
          {otherAssets.map((a) => {
            const Icon = ASSET_TYPE_ICONS[a.assetType] || HelpCircle
            const color = ASSET_COLORS[a.assetType] || 'text-gray-400'
            return (
              <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2">
                  <Icon size={12} className={color} />
                  <div><p className="text-xs text-white">{a.assetName}</p></div>
                </div>
                <p className="text-xs font-bold text-white">{formatCurrency(a.currentValue || 0)}</p>
              </div>
            )
          })}
        </GlassCard>
      )}

      {wealthAssets.length === 0 && (
        <EmptyState icon={Target} title="No portfolio" message="Add assets to see portfolio breakdown" />
      )}
    </div>
  )
}

function GoldPortfolioSection({ assets, formatCurrency }) {
  return (
    <GlassCard className="!p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <CircleDot size={14} className="text-yellow-400" />
        <p className="text-xs font-semibold text-white">Gold / Silver</p>
      </div>
      {assets.map((a) => (
        <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
          <div><p className="text-xs text-white">{a.assetName}</p><p className="text-[10px] text-gray-600">Weight: {a.quantity}g</p></div>
          <div className="text-right">
            <p className="text-xs font-bold text-white">{formatCurrency(a.currentValue || 0)}</p>
            <p className={`text-[10px] ${(a.currentValue || 0) - (a.investedAmount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency((a.currentValue || 0) - (a.investedAmount || 0))}
            </p>
          </div>
        </div>
      ))}
    </GlassCard>
  )
}

function AllocationTab({ allocation, wealthAssets, formatCurrency }) {
  const total = wealthAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  return (
    <div className="space-y-3">
      <GlassCard className="!p-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Asset Allocation</p>
        {allocation.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">No assets to allocate</p>
        ) : (
          <div className="space-y-2">
            {allocation.map((item) => {
              const AT = ASSET_TYPES.find((t) => t.id === item.type)
              const Icon = AT ? ASSET_TYPE_ICONS[item.type] || HelpCircle : HelpCircle
              const color = ASSET_COLORS[item.type] || 'text-gray-400'
              const bgColor = color.replace('text-', 'bg-')
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} className={color} />
                      <span className="text-xs text-gray-400">{AT?.label || item.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-white font-medium">{formatCurrency(item.value)}</span>
                      <span className="text-[10px] text-gray-500 ml-2">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bgColor} transition-all duration-500`} style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {total > 0 && (
          <p className="text-[10px] text-gray-600 text-center mt-3">Total: {formatCurrency(total)}</p>
        )}
      </GlassCard>
    </div>
  )
}

function HealthTab({ score, netWorthData, portfolioSummary, assetAllocation, formatCurrency }) {
  const ratio = netWorthData.totalLiabilities > 0 && (netWorthData.totalAssets + netWorthData.accountBalances) > 0
    ? Math.round((netWorthData.totalLiabilities / (netWorthData.totalAssets + netWorthData.accountBalances)) * 100)
    : 0

  return (
    <div className="space-y-3">
      <GlassCard className="!p-4">
        <div className="text-center mb-3">
          <p className={`text-4xl font-extrabold ${score.grade === 'N/A' ? 'text-gray-500' : 'text-neon'}`}>
            {score.overallScore || '-'}
          </p>
          <p className="text-lg font-bold text-white">{score.grade}</p>
          <p className="text-[10px] text-gray-500">Portfolio Health Score</p>
        </div>

        <div className="space-y-2">
          {score.breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-gray-400">{item.label}</span>
                <span className="text-white font-medium">{item.score}/{item.max}</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.score >= 70 ? 'bg-green-400' : item.score >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="!p-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Metrics</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.04] rounded-lg p-2">
            <p className="text-[10px] text-gray-600">Debt Ratio</p>
            <p className={`text-sm font-bold ${ratio <= 30 ? 'text-green-400' : ratio <= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{ratio}%</p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2">
            <p className="text-[10px] text-gray-600">Asset Types</p>
            <p className="text-sm font-bold text-white">{assetAllocation.length}</p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2">
            <p className="text-[10px] text-gray-600">Total Invested</p>
            <p className="text-sm font-bold text-white">{formatCurrency(portfolioSummary.totalInvested)}</p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2">
            <p className="text-[10px] text-gray-600">Return Rate</p>
            <p className={`text-sm font-bold ${portfolioSummary.profitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{portfolioSummary.profitLossPercent.toFixed(1)}%</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

function AssetFormModal({ form, setForm, editTarget, onClose, onSubmit, goals }) {
  const goalOptions = goals || []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-matte rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">{editTarget ? 'Edit Asset' : 'Add Asset'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Asset Type</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {ASSET_TYPES.map((at) => {
                const Icon = ASSET_TYPE_ICONS[at.id] || HelpCircle
                const active = form.assetType === at.id
                return (
                  <button
                    key={at.id}
                    onClick={() => setForm((prev) => ({ ...prev, assetType: at.id }))}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs transition-colors ${
                      active ? 'bg-neon/10 text-neon border border-neon/20' : 'bg-white/[0.04] text-gray-400 border border-transparent'
                    }`}
                  >
                    <Icon size={12} />
                    {at.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Asset Name</label>
            <input
              value={form.assetName}
              onChange={(e) => setForm((prev) => ({ ...prev, assetName: e.target.value }))}
              placeholder="e.g. HDFC Bank Savings"
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1 placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1 placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Purchase Price</label>
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                placeholder="0"
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1 placeholder:text-gray-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Current Value</label>
              <input
                type="number"
                value={form.currentValue}
                onChange={(e) => setForm((prev) => ({ ...prev, currentValue: e.target.value }))}
                placeholder="0"
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1 placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Invested Amount</label>
              <input
                type="number"
                value={form.investedAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, investedAmount: e.target.value }))}
                placeholder="0"
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1 placeholder:text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1 placeholder:text-gray-600 resize-none"
            />
          </div>

          {goalOptions.length > 0 && (
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Link to Goal</label>
              <select
                value={form.goalId}
                onChange={(e) => setForm((prev) => ({ ...prev, goalId: e.target.value }))}
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white outline-none mt-1"
              >
                <option value="">No goal linked</option>
                {goalOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name || g.title}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onSubmit}
            className="w-full py-2.5 rounded-xl bg-neon text-matte font-bold text-sm hover:brightness-110 transition-all"
          >
            {editTarget ? 'Update Asset' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  )
}
