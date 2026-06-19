import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Search, X, SlidersHorizontal, Calendar, ArrowUpDown, Filter,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate, groupBy, extractPeopleFromTransactions } from '../utils/helpers'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../utils/constants'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'
import GlassCard from '../components/GlassCard'
import ConfirmationModal from '../components/ConfirmationModal'

const PAGE_SIZE = 50

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'highest', label: 'Highest Amount' },
  { id: 'lowest', label: 'Lowest Amount' },
]

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
]

function getDateRange(preset) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (preset === 'today') return { dateFrom: today, dateTo: today }
  if (preset === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }
  }
  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }
  }
  return { dateFrom: '', dateTo: '' }
}

export default function History() {
  const { transactions, deleteTransaction } = useFinance()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [datePreset, setDatePreset] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortId, setSortId] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const allCategories = useMemo(() => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES], [])
  const categoriesForType = useMemo(() => {
    if (filterType === 'income') return INCOME_CATEGORIES
    if (filterType === 'expense') return EXPENSE_CATEGORIES
    return allCategories
  }, [filterType, allCategories])

  const handleDatePreset = useCallback((preset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const range = getDateRange(preset)
      setDateFrom(range.dateFrom)
      setDateTo(range.dateTo)
    }
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setFilterType('all')
    setFilterCategory('')
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
    setSortId('newest')
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search) count++
    if (filterType !== 'all') count++
    if (filterCategory) count++
    if (dateFrom || dateTo) count++
    if (minAmount || maxAmount) count++
    if (sortId !== 'newest') count++
    return count
  }, [search, filterType, filterCategory, dateFrom, dateTo, minAmount, maxAmount, sortId])

  const handleDeleteRequest = useCallback((id) => {
    setPendingDelete(id)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    deleteTransaction(pendingDelete)
    setPendingDelete(null)
  }, [pendingDelete, deleteTransaction])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, filterType, filterCategory, dateFrom, dateTo, minAmount, maxAmount, sortId])

  const filtered = useMemo(() => {
    let result = transactions

    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType)
    }

    if (filterCategory) {
      result = result.filter((t) => t.category === filterCategory)
    }

    if (dateFrom) {
      result = result.filter((t) => t.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((t) => t.date <= dateTo)
    }

    if (minAmount) {
      const min = Number(minAmount)
      if (!isNaN(min)) result = result.filter((t) => t.amount >= min)
    }
    if (maxAmount) {
      const max = Number(maxAmount)
      if (!isNaN(max)) result = result.filter((t) => t.amount <= max)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const qNum = Number(q)
      const isNumeric = !isNaN(qNum)
      result = result.filter((t) => {
        if (isNumeric && t.amount === qNum) return true
        if (t.note?.toLowerCase().includes(q)) return true
        if (t.category?.toLowerCase().includes(q)) return true
        if (t.source?.toLowerCase().includes(q)) return true
        if (t.person?.name?.toLowerCase().includes(q)) return true
        if (t.paymentMethod?.toLowerCase().includes(q)) return true
        const methodLabel = PAYMENT_METHODS.find((m) => m.id === t.paymentMethod)?.label?.toLowerCase()
        if (methodLabel?.includes(q)) return true
        if (t.tags?.some((tag) => tag.toLowerCase().includes(q))) return true
        return false
      })
    }

    result.sort((a, b) => {
      if (sortId === 'oldest') return a.date.localeCompare(b.date)
      if (sortId === 'highest') return b.amount - a.amount
      if (sortId === 'lowest') return a.amount - b.amount
      return b.date.localeCompare(a.date)
    })

    return result
  }, [transactions, filterType, filterCategory, dateFrom, dateTo, minAmount, maxAmount, search, sortId])

  const visibleFiltered = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const grouped = useMemo(() => groupBy(visibleFiltered, 'date'), [visibleFiltered])
  const hasMore = filtered.length > visibleCount

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Transaction History</h1>
        {filtered.length > 0 && (
          <span className="text-[10px] text-gray-600 bg-matte-200 px-2 py-1 rounded-lg">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search notes, category, person, amount..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-matte-200 rounded-xl pl-9 pr-9 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-neon/30 focus:outline-none transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Toggle + Active count */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-neon/10 text-neon border border-neon/30'
              : 'text-gray-500 border border-white/[0.06] hover:text-white'
          }`}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-neon text-black text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
          >
            <X size={10} />
            Clear all
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <GlassCard className="mb-4 !p-3 border-neon/10">
          {/* Date Presets */}
          <div className="mb-3">
            <label className="text-[10px] text-gray-500 font-medium mb-1.5 flex items-center gap-1">
              <Calendar size={11} />
              Date Range
            </label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleDatePreset(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    datePreset === p.id
                      ? 'bg-neon/10 text-neon border border-neon/30'
                      : 'text-gray-500 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 bg-matte-200 rounded-lg px-2 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 bg-matte-200 rounded-lg px-2 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none"
                  placeholder="To"
                />
              </div>
            )}
          </div>

          {/* Type + Category */}
          <div className="mb-3">
            <label className="text-[10px] text-gray-500 font-medium mb-1.5 flex items-center gap-1">
              <Filter size={11} />
              Transaction Type
            </label>
            <div className="flex gap-1.5 mb-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'income', label: 'Income' },
                { id: 'expense', label: 'Expense' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setFilterType(t.id); setFilterCategory('') }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    filterType === t.id
                      ? t.id === 'all'
                        ? 'bg-neon/10 text-neon border border-neon/30'
                        : t.id === 'income'
                          ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'text-gray-500 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-matte-200 rounded-lg px-2.5 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none text-gray-400"
            >
              <option value="">{filterType === 'all' ? 'All Categories' : filterType === 'income' ? 'All Income' : 'All Expenses'}</option>
              {categoriesForType.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="mb-3">
            <label className="text-[10px] text-gray-500 font-medium mb-1.5 flex items-center gap-1">
              <span className="text-[11px]">₹</span>
              Amount Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="flex-1 bg-matte-200 rounded-lg px-2.5 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none placeholder-gray-600"
                min="0"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="flex-1 bg-matte-200 rounded-lg px-2.5 py-1.5 text-[10px] border border-white/[0.06] focus:border-neon/30 focus:outline-none placeholder-gray-600"
                min="0"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-[10px] text-gray-500 font-medium mb-1.5 flex items-center gap-1">
              <ArrowUpDown size={11} />
              Sort By
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortId(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    sortId === opt.id
                      ? 'bg-neon/10 text-neon border border-neon/30'
                      : 'text-gray-500 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      <ConfirmationModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Transaction?"
        description="This will permanently remove this transaction from your records."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />

      {filtered.length === 0 ? (
        <GlassCard>
          <EmptyState
            title={activeFilterCount > 0 ? 'No matches found' : 'No transactions'}
            description={activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Add your first transaction to see it here'}
          />
        </GlassCard>
      ) : (
        <>
          {filtered.length > PAGE_SIZE && (
            <p className="text-[10px] text-gray-600 mb-3 px-1">
              Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} transactions
            </p>
          )}
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, txs]) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-semibold text-gray-500">{formatDate(date)}</p>
                  <p className="text-[10px] text-gray-600">{txs.length} {txs.length === 1 ? 'transaction' : 'transactions'}</p>
                </div>
                <GlassCard>
                  {txs.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} onDelete={handleDeleteRequest} />
                  ))}
                </GlassCard>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full mt-4 py-3 rounded-xl text-xs font-medium text-gray-400 border border-glass-border hover:text-white hover:border-neon/30 hover:bg-white/[0.02] transition-all"
            >
              Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
            </button>
          )}
        </>
      )}
    </div>
  )
}
