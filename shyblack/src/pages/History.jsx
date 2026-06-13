import { useState, useMemo, useCallback } from 'react'
import { Search, ArrowUpDown, X } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate, groupBy } from '../utils/helpers'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'
import GlassCard from '../components/GlassCard'
import ConfirmationModal from '../components/ConfirmationModal'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants'

export default function History() {
  const { transactions, deleteTransaction } = useFinance()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortOrder, setSortOrder] = useState('desc')
  const [pendingDelete, setPendingDelete] = useState(null)

  const allCategories = useMemo(() => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES], [])

  const toggleSort = useCallback(() => setSortOrder((o) => o === 'desc' ? 'asc' : 'desc'), [])

  const handleDeleteRequest = useCallback((id) => {
    setPendingDelete(id)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    deleteTransaction(pendingDelete)
    setPendingDelete(null)
  }, [pendingDelete, deleteTransaction])

  const filtered = useMemo(() => {
    let result = [...transactions]

    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType)
    }

    if (filterCategory) {
      result = result.filter((t) => t.category === filterCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => {
        const numMatch = !isNaN(Number(q)) && t.amount === Number(q)
        return numMatch || t.category?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q) || t.tags?.some((tag) => tag.toLowerCase().includes(q))
      })
    }

    result.sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date)
      return sortOrder === 'desc' ? diff : -diff
    })

    return result
  }, [transactions, filterType, filterCategory, search, sortOrder])

  const grouped = useMemo(() => groupBy(filtered, 'date'), [filtered])

  const clearFilters = useCallback(() => {
    setSearch('')
    setFilterCategory('')
    setFilterType('all')
    setSortOrder('desc')
  }, [])

  const hasFilters = search || filterCategory || filterType !== 'all'

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-5">Transaction History</h1>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by amount, category, or note..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 text-sm"
        />
      </div>

      <GlassCard className="mb-5 px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'income', 'expense'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-[32px] ${
                filterType === type ? 'bg-neon text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <span className="w-px h-5 bg-glass-border" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-transparent text-xs text-gray-400 border border-glass-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-neon/30 min-h-[32px]"
          >
            <option value="">All Categories</option>
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          <button
            onClick={toggleSort}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all min-h-[32px]"
          >
            <ArrowUpDown size={12} />
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </GlassCard>

      {hasFilters && (
        <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-neon transition-colors mb-4 pl-1 min-h-[28px]">
          <X size={12} /> Clear filters
        </button>
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
            title={hasFilters ? 'No matches found' : 'No transactions'}
            description={hasFilters ? 'Try adjusting your search or filters' : 'Add your first transaction to see it here'}
          />
        </GlassCard>
      ) : (
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
      )}
    </div>
  )
}
