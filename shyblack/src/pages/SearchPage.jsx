import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Search, Filter, X, Calendar, ArrowUpDown, Tag,
  ChevronRight, TrendingUp, TrendingDown,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import { getArchivedTransactions, getArchiveStats } from '../utils/archiveEngine'
import { getTransfers } from '../utils/transfers'
import { getEmis } from '../utils/emi'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const SEARCH_TABS = [
  { id: 'all', label: 'All' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'debts', label: 'Debts' },
  { id: 'goals', label: 'Goals' },
  { id: 'emis', label: 'EMIs' },
  { id: 'transfers', label: 'Transfers' },
]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SearchPage({ onNavigate }) {
  const { transactions, debts, goals } = useFinance()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '', category: '', minAmount: '', maxAmount: '' })
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef(null)

  const debouncedQuery = useDebounce(query, 200)

  const emis = useMemo(() => getEmis(), [])
  const transfers = useMemo(() => getTransfers(), [])

  useEffect(() => { inputRef.current?.focus() }, [])

  const searchResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim()
    const results = { transactions: [], debts: [], goals: [], emis: [], transfers: [], total: 0 }

    const matchText = (text) => !q || (text && text.toLowerCase().includes(q))
    const matchAmount = (amt) => {
      if (amt === undefined || amt === null) return true
      const min = filters.minAmount ? Number(filters.minAmount) : null
      const max = filters.maxAmount ? Number(filters.maxAmount) : null
      if (min !== null && amt < min) return false
      if (max !== null && amt > max) return false
      return true
    }
    const matchDate = (date) => {
      if (!date) return !filters.dateFrom && !filters.dateTo
      if (filters.dateFrom && date < filters.dateFrom) return false
      if (filters.dateTo && date > filters.dateTo) return false
      return true
    }
    const matchType = (type) => !filters.type || type === filters.type
    const matchCategory = (cat) => !filters.category || cat === filters.category

    if (activeTab === 'all' || activeTab === 'transactions') {
      const archived = getArchivedTransactions(q || undefined)
      const allTxs = [...transactions, ...archived]
      results.transactions = allTxs.filter((t) => {
        if (q && !matchText(t.note) && !matchText(t.category) && !matchText(t.date)) return false
        if (!matchAmount(Math.abs(t.amount))) return false
        if (!matchDate(t.date)) return false
        if (!matchType(t.type)) return false
        if (!matchCategory(t.category)) return false
        return true
      }).slice(0, 100)
    }

    if (activeTab === 'all' || activeTab === 'debts') {
      results.debts = debts.filter((d) => {
        if (q && !matchText(d.personName) && !matchText(d.note)) return false
        if (!matchAmount(d.remainingAmount)) return false
        if (!matchDate(d.dueDate)) return false
        return true
      }).slice(0, 50)
    }

    if (activeTab === 'all' || activeTab === 'goals') {
      results.goals = goals.filter((g) => {
        if (q && !matchText(g.name) && !matchText(g.category)) return false
        if (!matchAmount(g.target)) return false
        return true
      }).slice(0, 50)
    }

    if (activeTab === 'all' || activeTab === 'emis') {
      results.emis = emis.filter((e) => {
        if (q && !matchText(e.name) && !matchText(e.lender)) return false
        if (!matchAmount(e.amount)) return false
        return true
      }).slice(0, 50)
    }

    if (activeTab === 'all' || activeTab === 'transfers') {
      results.transfers = transfers.filter((t) => {
        if (q && !matchText(t.note)) return false
        if (!matchAmount(t.amount)) return false
        if (!matchDate(t.date)) return false
        return true
      }).slice(0, 50)
    }

    results.total = results.transactions.length + results.debts.length + results.goals.length + results.emis.length + results.transfers.length
    return results
  }, [debouncedQuery, transactions, debts, goals, emis, transfers, activeTab, filters])

  const clearFilters = useCallback(() => {
    setFilters({ dateFrom: '', dateTo: '', type: '', category: '', minAmount: '', maxAmount: '' })
    setQuery('')
    inputRef.current?.focus()
  }, [])

  const hasActiveFilters = Object.values(filters).some((v) => v !== '') || query !== ''

  const archiveStats = useMemo(() => getArchiveStats(), [])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Search size={18} className="text-blue-400" />
        </div>
        <h1 className="text-xl font-bold">Search</h1>
      </div>

      {archiveStats.count > 0 && (
        <GlassCard className="mb-3 !p-2">
          <p className="text-[10px] text-gray-500 text-center">
            {archiveStats.count} archived transactions available in search
          </p>
        </GlassCard>
      )}

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search transactions, debts, goals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-matte-200 rounded-xl pl-9 pr-9 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-blue-400/30 focus:outline-none transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showFilters || Object.values(filters).some((v) => v !== '')
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'text-gray-500 border border-white/[0.06] hover:text-white'
          }`}
        >
          <Filter size={12} />
          Filters
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[10px] text-gray-600 hover:text-white transition-all">
            Clear all
          </button>
        )}
        <span className="text-[10px] text-gray-600 ml-auto">{searchResults.total} results</span>
      </div>

      {showFilters && (
        <GlassCard className="mb-3 border-blue-500/20 !p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Type</label>
              <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none">
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Category</label>
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none">
                <option value="">All</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Min Amount</label>
              <input type="number" placeholder="0" value={filters.minAmount} onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Max Amount</label>
              <input type="number" placeholder="∞" value={filters.maxAmount} onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
          </div>
        </GlassCard>
      )}

      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-none">
        {SEARCH_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {searchResults.total === 0 && debouncedQuery ? (
        <GlassCard>
          <EmptyState icon={Search} title="No results" description="Try different search terms or filters" />
        </GlassCard>
      ) : searchResults.total === 0 && !debouncedQuery ? (
        <GlassCard>
          <EmptyState icon={Search} title="Search all your data" description="Type to search transactions, debts, goals, EMIs, and transfers" />
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {(activeTab === 'all' || activeTab === 'transactions') && searchResults.transactions.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Transactions</p>}
              {searchResults.transactions.map((t) => (
                <GlassCard key={t.id}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {t.type === 'income' ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.note || ALL_CATEGORIES.find((c) => c.id === t.category)?.label || t.category}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(t.date)}</p>
                    </div>
                    <p className={`text-xs font-semibold tabular-nums ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'debts') && searchResults.debts.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">Debts</p>}
              {searchResults.debts.map((d) => (
                <GlassCard key={d.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{d.personName}</p>
                      <p className="text-[10px] text-gray-500">{d.note || d.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">{formatCurrency(d.remainingAmount)}</p>
                      <p className="text-[10px] text-gray-600">of {formatCurrency(d.amount)}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'goals') && searchResults.goals.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">Goals</p>}
              {searchResults.goals.map((g) => (
                <GlassCard key={g.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{g.name}</p>
                      <p className="text-[10px] text-gray-500">{g.category || 'Goal'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">{formatCurrency(g.saved || 0)}</p>
                      <p className="text-[10px] text-gray-600">of {formatCurrency(g.target)}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'emis') && searchResults.emis.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">EMIs</p>}
              {searchResults.emis.map((e) => (
                <GlassCard key={e.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.name}</p>
                      <p className="text-[10px] text-gray-500">{e.lender || 'EMI'} · {e.remainingMonths || 0}mo left</p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums">{formatCurrency(e.amount)}/mo</p>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'transfers') && searchResults.transfers.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">Transfers</p>}
              {searchResults.transfers.map((t) => (
                <GlassCard key={t.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ArrowUpDown size={14} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.fromName || 'Account'} → {t.toName || 'Account'}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(t.date)}</p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-amber-400">{formatCurrency(t.amount)}</p>
                  </div>
                </GlassCard>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
