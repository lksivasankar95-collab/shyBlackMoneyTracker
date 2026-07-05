import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Search, Filter, X, ArrowUpDown, Tag,
  TrendingUp, TrendingDown, FolderOpen, Wallet,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import { getArchivedTransactions, getArchiveStats } from '../utils/archiveEngine'
import { getTransfers } from '../utils/transfers'
import { getEmis } from '../utils/emi'
import { getDocuments } from '../utils/documents'
import { getAccounts } from '../utils/networth'
import { getTags } from '../utils/tags'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const SEARCH_TABS = [
  { id: 'all', label: 'search.tabAll' },
  { id: 'transactions', label: 'search.tabTransactions' },
  { id: 'debts', label: 'search.tabDebts' },
  { id: 'goals', label: 'search.tabGoals' },
  { id: 'emis', label: 'search.tabEmis' },
  { id: 'transfers', label: 'search.tabTransfers' },
  { id: 'documents', label: 'search.tabDocuments' },
  { id: 'accounts', label: 'search.tabAccounts' },
]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SearchPage({ _onNavigate }) {
  const { t } = useTranslation()
  const { transactions, debts, goals } = useFinance()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '', category: '', minAmount: '', maxAmount: '', person: '', account: '', tags: [], sortBy: 'date-desc' })
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef(null)

  const debouncedQuery = useDebounce(query, 200)

  useEffect(() => { inputRef.current?.focus() }, [])

  const searchResults = useMemo(() => {
    const emis = getEmis()
    const transfers = getTransfers()
    const q = debouncedQuery.toLowerCase().trim()
    const results = { transactions: [], debts: [], goals: [], emis: [], transfers: [], documents: [], accounts: [], total: 0 }

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
    const matchPerson = (person) => !filters.person || (person?.name && person.name.toLowerCase().includes(filters.person.toLowerCase()))
    const allAccts = getAccounts()
    const matchAccount = (tx) => {
      if (!filters.account) return true
      const aq = filters.account.toLowerCase()
      return allAccts.some((a) => a.name.toLowerCase().includes(aq)) && (tx.account || tx.source || '').toLowerCase().includes(aq)
    }
    const matchTags = (txTags) => {
      if (!filters.tags || filters.tags.length === 0) return true
      const txTagSet = new Set((txTags || []).map((t) => t.toLowerCase()))
      return filters.tags.some((tag) => txTagSet.has(tag.toLowerCase()))
    }
    const sortResults = (arr) => {
      if (!filters.sortBy) return arr
      return [...arr].sort((a, b) => {
        switch (filters.sortBy) {
          case 'date-asc': return a.date?.localeCompare(b.date)
          case 'date-desc': return b.date?.localeCompare(a.date)
          case 'amount-asc': return (Math.abs(a.amount) || 0) - (Math.abs(b.amount) || 0)
          case 'amount-desc': return (Math.abs(b.amount) || 0) - (Math.abs(a.amount) || 0)
          default: return 0
        }
      })
    }

    if (activeTab === 'all' || activeTab === 'transactions') {
      const archived = getArchivedTransactions(q || undefined)
      const allTxs = [...transactions, ...archived]
      results.transactions = sortResults(allTxs.filter((t) => {
        if (q && !matchText(t.note) && !matchText(t.category) && !matchText(t.date) && !matchText(t.tags?.join(' ')) && !matchText(t.person?.name)) return false
        if (!matchAmount(Math.abs(t.amount))) return false
        if (!matchDate(t.date)) return false
        if (!matchType(t.type)) return false
        if (!matchCategory(t.category)) return false
        if (!matchPerson(t.person)) return false
        if (!matchAccount(t)) return false
        if (!matchTags(t.tags)) return false
        return true
      })).slice(0, 100)
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

    if (activeTab === 'all' || activeTab === 'documents') {
      const allDocs = getDocuments()
      results.documents = allDocs.filter((d) => {
        if (q && !matchText(d.title) && !matchText(d.notes) && !matchText(d.category)) return false
        return true
      }).slice(0, 50)
    }

    if (activeTab === 'all' || activeTab === 'accounts') {
      const allAccts = getAccounts()
      results.accounts = allAccts.filter((a) => {
        if (q && !matchText(a.name) && !matchText(a.type)) return false
        return true
      }).slice(0, 50)
    }

    results.total = results.transactions.length + results.debts.length + results.goals.length + results.emis.length + results.transfers.length + results.documents.length + results.accounts.length
    return results
  }, [debouncedQuery, transactions, debts, goals, activeTab, filters])

  const clearFilters = useCallback(() => {
    setFilters({ dateFrom: '', dateTo: '', type: '', category: '', minAmount: '', maxAmount: '', person: '', account: '', tags: [], sortBy: 'date-desc' })
    setQuery('')
    inputRef.current?.focus()
  }, [])

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== 'sortBy' && (Array.isArray(v) ? v.length > 0 : v !== '')) || query !== ''

  const archiveStats = useMemo(() => getArchiveStats(), [])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Search size={18} className="text-blue-400" />
        </div>
        <h1 className="text-xl font-bold">{t('search.title')}</h1>
      </div>

      {archiveStats.count > 0 && (
        <GlassCard className="mb-3 !p-2">
          <p className="text-[10px] text-gray-500 text-center">
            {t('search.archivedCount', { count: archiveStats.count })}
          </p>
        </GlassCard>
      )}

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t('search.placeholder')}
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
            showFilters || Object.entries(filters).some(([k, v]) => k !== 'sortBy' && (Array.isArray(v) ? v.length > 0 : v !== ''))
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'text-gray-500 border border-white/[0.06] hover:text-white'
          }`}
        >
          <Filter size={12} />
          {t('search.filters')}
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[10px] text-gray-600 hover:text-white transition-all">
            {t('search.clearAll')}
          </button>
        )}
        <span className="text-[10px] text-gray-600 ml-auto">{t('search.results', { count: searchResults.total })}</span>
      </div>

      {showFilters && (
        <GlassCard className="mb-3 border-blue-500/20 !p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">{t('search.dateFrom')}</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">{t('search.dateTo')}</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">{t('search.type')}</label>
              <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none">
                <option value="">{t('search.all')}</option>
                <option value="income">{t('search.income')}</option>
                <option value="expense">{t('search.expense')}</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">{t('search.category')}</label>
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none">
                <option value="">{t('search.all')}</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Person</label>
              <input type="text" placeholder="Filter by person" value={filters.person} onChange={(e) => setFilters({ ...filters, person: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">Account</label>
              <input type="text" placeholder="Filter by account" value={filters.account} onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">{t('search.minAmount')}</label>
              <input type="number" placeholder={t('search.minPlaceholder')} value={filters.minAmount} onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 block mb-0.5">{t('search.maxAmount')}</label>
              <input type="number" placeholder={t('search.maxPlaceholder')} value={filters.maxAmount} onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none" />
            </div>
          </div>
          <div className="mt-2">
            <label className="text-[9px] text-gray-600 block mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {getTags().map((tag) => {
                const selected = filters.tags.includes(tag.name)
                return (
                  <button
                    key={tag.id}
                    onClick={() => setFilters({ ...filters, tags: selected ? filters.tags.filter((t) => t !== tag.name) : [...filters.tags, tag.name] })}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      selected ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/[0.04] text-gray-500 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
              {getTags().length === 0 && <span className="text-[10px] text-gray-600">No tags found</span>}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <label className="text-[9px] text-gray-600 block mb-1">Sort by</label>
            <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full bg-matte-200 rounded-lg px-2 py-1.5 text-xs border border-white/[0.06] focus:border-blue-400/30 focus:outline-none">
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (highest)</option>
              <option value="amount-asc">Amount (lowest)</option>
            </select>
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
            {t(tab.label)}
          </button>
        ))}
      </div>

      {searchResults.total === 0 && debouncedQuery ? (
        <GlassCard>
          <EmptyState icon={Search} title={t('search.noResults')} description={t('search.noResultsHint')} />
        </GlassCard>
      ) : searchResults.total === 0 && !debouncedQuery ? (
        <GlassCard>
          <EmptyState icon={Search} title={t('search.searchAll')} description={t('search.searchAllHint')} />
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {(activeTab === 'all' || activeTab === 'transactions') && searchResults.transactions.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('search.sectionTransactions')}</p>}
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
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">{t('search.sectionDebts')}</p>}
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
                      <p className="text-[10px] text-gray-600">{t('search.of', { amount: formatCurrency(d.amount) })}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'goals') && searchResults.goals.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">{t('search.sectionGoals')}</p>}
              {searchResults.goals.map((g) => (
                <GlassCard key={g.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{g.name}</p>
                      <p className="text-[10px] text-gray-500">{g.category || t('search.defaultGoal')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">{formatCurrency(g.saved || 0)}</p>
                      <p className="text-[10px] text-gray-600">{t('search.of', { amount: formatCurrency(g.target) })}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'emis') && searchResults.emis.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">{t('search.sectionEmis')}</p>}
              {searchResults.emis.map((e) => (
                <GlassCard key={e.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.name}</p>
                      <p className="text-[10px] text-gray-500">{e.lender || t('search.defaultEmi')} · {t('search.monthsLeft', { count: e.remainingMonths || 0 })}</p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums">{formatCurrency(e.amount)}{t('search.perMonth')}</p>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'transfers') && searchResults.transfers.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">{t('search.sectionTransfers')}</p>}
              {searchResults.transfers.map((transfer) => (
                <GlassCard key={transfer.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ArrowUpDown size={14} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{transfer.fromName || t('search.defaultAccount')} → {transfer.toName || t('search.defaultAccount')}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(transfer.date)}</p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-amber-400">{formatCurrency(transfer.amount)}</p>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'documents') && searchResults.documents.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">{t('search.sectionDocuments')}</p>}
              {searchResults.documents.map((d) => (
                <GlassCard key={d.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center shrink-0">
                      <FolderOpen size={14} className="text-neon" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-gray-500">{d.category || t('search.defaultDocument')} · {d.type || t('search.defaultFile')}</p>
                    </div>
                    <p className="text-[10px] text-gray-500">{formatDate(d.date || d.createdAt)}</p>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'accounts') && searchResults.accounts.length > 0 && (
            <>
              {activeTab === 'all' && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-2">{t('search.sectionAccounts')}</p>}
              {searchResults.accounts.map((a) => (
                <GlassCard key={a.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Wallet size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.name}</p>
                      <p className="text-[10px] text-gray-500">{a.type || t('search.defaultAccount')} · {a.institution || ''}</p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-cyan-400">{formatCurrency(a.balance || 0)}</p>
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
