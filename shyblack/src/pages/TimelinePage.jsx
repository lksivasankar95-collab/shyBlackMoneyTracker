import { useState, useMemo } from 'react'
import {
  ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Send,
  ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, Filter,
  History, Sparkles, AlertTriangle,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { buildTimeline, filterTimeline, generateMonthlyInsights } from '../utils/timeline'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const ICON_MAP = {
  ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Send,
  ArrowUpRight, ArrowDownLeft, CheckCircle2,
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'trading', label: 'Trading' },
  { id: 'debts', label: 'Debts' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Income' },
]

const INSIGHT_ICONS = {
  positive: Sparkles,
  warning: AlertTriangle,
  info: History,
}

const INSIGHT_COLORS = {
  positive: 'text-neon border-neon/20 bg-neon/5',
  warning: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
  info: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
}

export default function TimelinePage() {
  const { transactions, debts } = useFinance()
  const [activeFilter, setActiveFilter] = useState('all')

  const timeline = useMemo(() => buildTimeline(transactions, debts), [transactions, debts])

  const filteredGroups = useMemo(() => {
    const result = {}
    timeline.groupOrder.forEach((key) => {
      const entries = timeline.groups[key]
      if (!entries) return
      const filtered = filterTimeline(entries, activeFilter)
      if (filtered.length > 0) {
        result[key] = filtered
      }
    })
    return result
  }, [timeline, activeFilter])

  const insights = useMemo(() => generateMonthlyInsights(transactions), [transactions])

  const hasAnyData = timeline.entries.length > 0
  const hasFilteredData = Object.keys(filteredGroups).length > 0

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <History size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">Smart Timeline</h1>
        {hasAnyData && (
          <span className="text-[10px] text-gray-500 font-medium ml-auto">{timeline.entries.length} events</span>
        )}
      </div>

      {insights.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-1 px-1">
          {insights.map((insight, i) => {
            const Icon = INSIGHT_ICONS[insight.type]
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border whitespace-nowrap text-xs font-medium ${INSIGHT_COLORS[insight.type]}`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{insight.text}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeFilter === f.id
                ? 'bg-neon/15 text-neon border border-neon/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white hover:border-gray-600'
            }`}
          >
            {f.id === 'all' && <Filter size={12} />}
            {f.label}
          </button>
        ))}
      </div>

      {!hasAnyData ? (
        <GlassCard>
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Your financial timeline will appear here as you add transactions, track debts, and trade"
          />
        </GlassCard>
      ) : !hasFilteredData ? (
        <GlassCard>
          <EmptyState
            icon={Filter}
            title="No matching events"
            description="Try a different filter to see more activity"
          />
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {timeline.groupOrder.map((key) => {
            const entries = filteredGroups[key]
            if (!entries) return null
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <p className="text-xs font-semibold text-gray-500">{timeline.groupLabels[key]}</p>
                  <span className="text-[10px] text-gray-600 font-medium">{entries.length}</span>
                </div>
                <GlassCard className="!p-0 divide-y divide-glass-border overflow-hidden">
                  {entries.map((entry) => {
                    const Icon = ICON_MAP[entry.style.icon] || Clock
                    const isPositive = entry.amount > 0 || entry.sourceType === 'income' || entry.sourceType === 'trading_profit' || entry.sourceType === 'borrowed'
                    const prefix = entry.amount > 0 ? '+' : ''
                    const showAmount = entry.type !== 'debt' || entry.sourceType !== 'debt_paid'

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-3 py-3 px-4 transition-colors duration-150 ${
                          entry.isLarge ? 'bg-neon/[0.02]' : ''
                        } ${entry.isOverdue ? 'bg-red-500/[0.03]' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ${entry.style.bg} ${entry.style.text} ${entry.style.ring}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate leading-tight">{entry.title}</p>
                            {entry.isLarge && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neon/10 text-neon leading-none">Notable</span>
                            )}
                            {entry.isOverdue && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/10 text-red-400 leading-none">Overdue</span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 leading-tight ${
                            entry.isOverdue ? 'text-red-400/70' : 'text-gray-600'
                          }`}>
                            {entry.subtitle}
                          </p>
                        </div>
                        <div className="text-right shrink-0 pt-0.5">
                          {showAmount && (
                            <p className={`text-sm font-bold tabular-nums leading-tight ${
                              isPositive ? 'text-neon' : 'text-red-400'
                            }`}>
                              {prefix}{formatCurrency(Math.abs(entry.amount))}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {formatDate(new Date(entry.timestamp).toISOString().split('T')[0])}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </GlassCard>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
