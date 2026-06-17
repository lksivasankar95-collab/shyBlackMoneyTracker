import { useState, useMemo } from 'react'
import { Landmark, Plus, ArrowLeft } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import EmiCard from '../components/EmiCard'

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
]

export default function EmiCenter({ onNavigate }) {
  const { emis, emiSummary } = useFinance()
  const [activeFilter, setActiveFilter] = useState('active')

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return emis
    return emis.filter((e) => e.status === activeFilter)
  }, [emis, activeFilter])

  const handleEmiClick = (emi) => {
    onNavigate(`emi-detail/${emi.id}`)
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-9 h-9 rounded-xl bg-matte-100 flex items-center justify-center hover:bg-matte-200 transition-all shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Landmark size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">EMI Center</h1>
        </div>
        <button
          onClick={() => onNavigate('add-emi')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all shrink-0"
        >
          <Plus size={14} />
          Add EMI
        </button>
      </div>

      {emis.length > 0 && emiSummary && (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <GlassCard className="!p-3">
            <div className="text-[10px] text-gray-500 mb-1 font-medium">Total Monthly</div>
            <p className="text-sm font-extrabold text-white tabular-nums">{formatCurrency(emiSummary.totalMonthly)}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <div className="text-[10px] text-gray-500 mb-1 font-medium">Active EMIs</div>
            <p className="text-sm font-extrabold text-neon tabular-nums">{emiSummary.totalActive}</p>
          </GlassCard>
          {emiSummary.upcomingCount > 0 && (
            <GlassCard className="!p-3">
              <div className="text-[10px] text-gray-500 mb-1 font-medium">Upcoming</div>
              <p className="text-sm font-extrabold text-yellow-400 tabular-nums">{emiSummary.upcomingCount}</p>
            </GlassCard>
          )}
          {emiSummary.missedCount > 0 && (
            <GlassCard className="!p-3 border-red-500/20">
              <div className="text-[10px] text-gray-500 mb-1 font-medium">Missed</div>
              <p className="text-sm font-extrabold text-red-400 tabular-nums">{emiSummary.missedCount}</p>
            </GlassCard>
          )}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeFilter === f.id
                ? 'bg-neon/15 text-neon border border-neon/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white hover:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={emis.length === 0 ? 'No EMIs set up' : 'No matching EMIs'}
          description={emis.length === 0
            ? 'Track your monthly EMI obligations in one place'
            : 'Try a different filter'
          }
          action={emis.length === 0 ? (
            <button
              onClick={() => onNavigate('add-emi')}
              className="btn-primary text-xs !px-4 !py-2"
            >
              Add Your First EMI
            </button>
          ) : null}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((emi) => (
            <EmiCard
              key={emi.id}
              emi={emi}
              onClick={handleEmiClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
