import { useState, useMemo} from 'react'
import {
  ArrowLeft, TrendingUp, TrendingDown, Search, ArrowUpDown,
  X, Wallet, PieChart,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RePieChart, Pie, Cell,
} from 'recharts'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import { getCategoryDetail, getCategoryMonthlyTrend } from '../utils/categoryDrilldown'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'


let _selectedCategoryId = null
// eslint-disable-next-line react-refresh/only-export-components
export function setCategoryDetailId(id) { _selectedCategoryId = id }
// eslint-disable-next-line react-refresh/only-export-components
export function getCategoryDetailId() { return _selectedCategoryId }

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 text-xs shadow-lg">
        <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold tabular-nums" style={{ color: p.fill || p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function CategoryDetail({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const categoryId = getCategoryDetailId()
  const cat = useMemo(() => ALL_CATEGORIES.find((c) => c.id === categoryId), [categoryId])

  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewChart, setViewChart] = useState('monthly')

  const detail = useMemo(() => getCategoryDetail(transactions, categoryId), [transactions, categoryId])
  const trendData = useMemo(() => getCategoryMonthlyTrend(transactions, categoryId, 6), [transactions, categoryId])

  const categoryTransactions = useMemo(() => {
    if (!categoryId) return []
    let result = transactions.filter((t) => t.category === categoryId)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        t.note?.toLowerCase().includes(q) ||
        formatDate(t.date).toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      )
    }

    if (dateFrom) result = result.filter((t) => t.date >= dateFrom)
    if (dateTo) result = result.filter((t) => t.date <= dateTo)

    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.date.localeCompare(b.date) || a.amount - b.amount
      if (sortOrder === 'highest') return b.amount - a.amount
      return b.date.localeCompare(a.date) || b.amount - a.amount
    })

    return result
  }, [transactions, categoryId, search, dateFrom, dateTo, sortOrder])

  const isIncome = detail?.type === 'income'
  const accentColor = isIncome ? 'text-neon' : 'text-red-400'
  const accentBg = isIncome ? 'bg-neon/10' : 'bg-red-500/10'
  const accentBorder = isIncome ? 'border-neon/20' : 'border-red-500/20'

  if (!categoryId || !cat) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <GlassCard>
          <EmptyState title={t('categoryDetail.notFound')} description={t('categoryDetail.notFoundHint')} />
        </GlassCard>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <GlassCard>
          <EmptyState title={t('categoryDetail.noData')} description={t('categoryDetail.noDataHint', { label: cat.label })} />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-9 h-9 rounded-xl bg-matte-200 flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{cat.label}</h1>
          <p className="text-xs text-gray-500">{isIncome ? t('categoryDetail.incomeCategory') : t('categoryDetail.expenseCategory')}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center ${accentBorder} border`}>
          {isIncome ? <TrendingUp size={20} className={accentColor} /> : <TrendingDown size={20} className={accentColor} />}
        </div>
      </div>

      {/* ── Total & Change ── */}
      <GlassCard brand className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">{t('categoryDetail.total', { label: cat.label })}</span>
          <span className={`text-xs font-semibold flex items-center gap-1 ${
            detail.direction === 'up' && isIncome ? 'text-neon' :
            detail.direction === 'down' && !isIncome ? 'text-neon' :
            detail.direction !== 'same' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {detail.direction === 'up' ? '+' : detail.direction === 'down' ? '' : ''}{detail.percentageChange}%
            {detail.direction === 'up' ? <TrendingUp size={12} /> : detail.direction === 'down' ? <TrendingDown size={12} /> : null}
          </span>
        </div>
        <p className={`text-2xl font-extrabold tabular-nums ${accentColor}`}>{formatCurrency(detail.totalAmount)}</p>
      </GlassCard>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.thisMonth')}</p>
          <p className={`text-sm font-bold tabular-nums ${detail.currentMonthAmount > 0 ? accentColor : 'text-gray-400'}`}>
            {formatCurrency(detail.currentMonthAmount)}
          </p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.lastMonth')}</p>
          <p className="text-sm font-bold tabular-nums text-gray-300">{formatCurrency(detail.previousMonthAmount)}</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.transactions')}</p>
          <p className="text-sm font-bold tabular-nums">{detail.transactionCount}</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.avgTransaction')}</p>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(detail.averageTransaction)}</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.highest')}</p>
          <p className="text-sm font-bold tabular-nums text-green-400">{formatCurrency(detail.highestTransaction)}</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.lowest')}</p>
          <p className="text-sm font-bold tabular-nums text-orange-400">{formatCurrency(detail.lowestTransaction)}</p>
        </GlassCard>
        <GlassCard className="!p-3 col-span-2">
          <p className="text-[10px] text-gray-500 font-medium mb-1">{t('categoryDetail.categoryShare')}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isIncome ? 'bg-neon' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(detail.categoryShare, 100)}%` }}
                />
              </div>
            </div>
            <span className={`text-sm font-bold tabular-nums ${accentColor}`}>{detail.categoryShare}%</span>
          </div>
        </GlassCard>
      </div>

      {/* ── Charts ── */}
      <GlassCard brand className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">{t('categoryDetail.trends')}</h2>
          <div className="flex bg-matte-100 rounded-lg p-0.5">
            {['monthly', 'weekly'].map((v) => (
              <button
                key={v}
                onClick={() => setViewChart(v)}
                className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  viewChart === v ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
                }`}
              >
                {v === 'monthly' ? t('categoryDetail.monthly') : t('categoryDetail.weekly')}
              </button>
            ))}
          </div>
        </div>

        {viewChart === 'monthly' ? (
          <div className="h-48 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="amount" fill="#39ff14" radius={[4, 4, 0, 0]} maxBarSize={24} name={t('categoryDetail.amount')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.weeklyTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="amount" stroke="#39ff14" strokeWidth={2} dot={{ r: 3, fill: '#39ff14' }} name={t('categoryDetail.amount')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[10px] text-gray-600 mt-2">
          {viewChart === 'monthly' ? t('categoryDetail.last6Months') : t('categoryDetail.weeklyBreakdown')}
        </p>
      </GlassCard>

      {/* ── Category Share Pie ── */}
      {detail.categoryShare > 0 && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">{t('categoryDetail.categoryShare')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={[
                      { name: cat.label, value: detail.totalAmount },
                      { name: t('categoryDetail.otherCategories'), value: detail.totalAmount * ((100 - detail.categoryShare) / detail.categoryShare) || 1 },
                    ]}
                    cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value"
                  >
                    <Cell fill={isIncome ? '#39ff14' : '#ef4444'} />
                    <Cell fill="rgba(255,255,255,0.06)" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isIncome ? 'bg-neon' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{cat.label}</span>
                <span className={`text-xs font-semibold ml-auto tabular-nums ${accentColor}`}>{detail.categoryShare}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="text-xs text-gray-400">{t('categoryDetail.others')}</span>
                <span className="text-xs font-semibold ml-auto tabular-nums text-gray-500">{Math.round(100 - detail.categoryShare)}%</span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Transactions ── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">{t('categoryDetail.transactions')}</h2>
          <span className="text-[10px] text-gray-500">{t('categoryDetail.totalCount', { count: categoryTransactions.length })}</span>
        </div>

        {/* Search & Filters */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder={t('categoryDetail.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-matte-200 rounded-lg pl-8 pr-3 py-2 text-xs placeholder-gray-600 border border-white/[0.06] focus:border-neon/30 focus:outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-matte-200 rounded-lg px-2 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none"
              placeholder={t('common.from')}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-matte-200 rounded-lg px-2 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none"
              placeholder={t('common.to')}
            />
          </div>
          <button
            onClick={() => setSortOrder((o) => o === 'desc' ? 'asc' : o === 'asc' ? 'highest' : 'desc')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-matte-200 text-gray-500 hover:text-white border border-white/[0.06] transition-all whitespace-nowrap"
          >
            <ArrowUpDown size={11} />
            {sortOrder === 'desc' ? t('categoryDetail.newest') : sortOrder === 'asc' ? t('categoryDetail.oldest') : t('categoryDetail.highest')}
          </button>
        </div>

        {categoryTransactions.length === 0 ? (
          <EmptyState title={t('categoryDetail.noTransactions')} description={t('categoryDetail.noTransactionsHint')} />
        ) : (
          <div className="space-y-1">
            {categoryTransactions.slice(0, 100).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center shrink-0`}>
                  <Wallet size={14} className={accentColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {t.note || cat?.label || t.category}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {formatDate(t.date)}
                    {t.person?.name ? ` · ${t.person.name}` : ''}
                  </p>
                </div>
                <p className={`text-xs font-semibold tabular-nums ${isIncome ? 'text-neon' : 'text-red-400'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
              </div>
            ))}
            {categoryTransactions.length > 100 && (
              <p className="text-[10px] text-gray-600 text-center pt-2">
                {t('categoryDetail.showingLimited', { count: categoryTransactions.length })}
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
