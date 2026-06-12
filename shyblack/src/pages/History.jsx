import { useState, useMemo } from 'react'
import { Search, Filter, X, ArrowUpDown, Calendar } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { TRANSACTION_TYPES, ALL_CATEGORIES } from '../utils/constants'
import TransactionItem from '../components/TransactionItem'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

export default function History() {
  const { transactions, deleteTransaction } = useFinance()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let result = [...transactions]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => {
        const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
        return (
          cat?.label.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q))
        )
      })
    }

    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType)
    }

    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory)
    }

    result.sort((a, b) => {
      const da = new Date(a.date).getTime()
      const db = new Date(b.date).getTime()
      return sortOrder === 'newest' ? db - da : da - db
    })

    return result
  }, [transactions, search, filterType, filterCategory, sortOrder])

  const clearFilters = () => {
    setSearch('')
    setFilterType('all')
    setFilterCategory('all')
    setSortOrder('newest')
  }

  const hasFilters = search || filterType !== 'all' || filterCategory !== 'all'

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">History</h1>

      {/* Search & Filter Bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="input-field pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary px-3 ${showFilters ? 'border-neon/30 text-neon' : ''}`}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <GlassCard className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Filters</span>
            <button
              onClick={clearFilters}
              className="text-xs text-neon/70 hover:text-neon"
            >
              Reset
            </button>
          </div>

          <div className="flex gap-2">
            {['all', 'income', 'expense'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === t
                    ? t === 'income'
                      ? 'bg-neon/10 text-neon border border-neon/30'
                      : t === 'expense'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-white/10 text-white border border-white/20'
                    : 'bg-matte-100 text-gray-500 border border-transparent'
                }`}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === 'all'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-matte-100 text-gray-500 border border-transparent'
              }`}
            >
              All Categories
            </button>
            {ALL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterCategory === c.id
                    ? 'border-neon/30 text-neon bg-neon/10'
                    : 'bg-matte-100 text-gray-500 border border-transparent'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
          >
            <ArrowUpDown size={12} />
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </GlassCard>
      )}

      {/* Transaction List */}
      <GlassCard>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={hasFilters ? 'No matching transactions' : 'No transactions yet'}
            description={hasFilters ? 'Try adjusting your search or filters' : 'Add your first transaction'}
          />
        ) : (
          <div className="divide-y divide-glass-border">
            {filtered.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onDelete={deleteTransaction}
              />
            ))}
          </div>
        )}
      </GlassCard>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-600 mt-3 text-center">
          Showing {filtered.length} of {transactions.length} transactions
        </p>
      )}
    </div>
  )
}
