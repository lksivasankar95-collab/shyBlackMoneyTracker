import { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Clock, AlertTriangle } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { getUpcomingEvents } from '../utils/calendar'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const VIEW_DAYS = [7, 30]

export default function FinancialCalendar() {
  const { transactions, recurring, debts, emis } = useFinance()
  const [viewDays, setViewDays] = useState(30)

  const { events, groups, total } = useMemo(
    () => getUpcomingEvents(transactions, recurring, debts, viewDays, emis),
    [transactions, recurring, debts, viewDays, emis],
  )

  const dateKeys = Object.keys(groups).sort()

  const summary = useMemo(() => {
    const income = events.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const expense = events.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    return { income, expense, net: income - expense }
  }, [events])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Calendar size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">Financial Calendar</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {VIEW_DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setViewDays(d)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewDays === d ? 'bg-neon/15 text-neon border border-neon/30' : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white'
            }`}
          >
            Next {d} Days
          </button>
        ))}
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium">Events</p>
            <p className="text-sm font-extrabold tabular-nums">{total}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium">Inflow</p>
            <p className="text-sm font-extrabold text-neon tabular-nums">{formatCurrency(summary.income)}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium">Outflow</p>
            <p className="text-sm font-extrabold text-red-400 tabular-nums">{formatCurrency(summary.expense)}</p>
          </GlassCard>
        </div>
      )}

      {total === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Calendar}
            title="No upcoming events"
            description="Add recurring transactions, subscriptions, or debt due dates to see them here"
          />
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {dateKeys.map((dateKey) => {
            const dayEvents = groups[dateKey]
            const d = new Date(dateKey)
            const isToday = dateKey === new Date().toISOString().split('T')[0]
            const dayLabel = isToday ? 'Today' : formatDate(dateKey)
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <p className={`text-xs font-semibold ${isToday ? 'text-neon' : 'text-gray-500'}`}>{dayLabel}</p>
                  <span className="text-[10px] text-gray-600">{dayEvents.length}</span>
                </div>
                <GlassCard className="!p-0 divide-y divide-glass-border overflow-hidden">
                  {dayEvents.map((e) => (
                    <div key={e.id} className={`flex items-center gap-3 py-3 px-4 ${e.isOverdue ? 'bg-red-500/[0.03]' : ''}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        e.type === 'income' ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {e.type === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          {e.isOverdue && <AlertTriangle size={10} className="text-red-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-600 truncate">{e.subtitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${e.type === 'income' ? 'text-neon' : 'text-red-400'}`}>
                          {e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount)}
                        </p>
                        {e.source && (
                          <p className="text-[10px] text-gray-600">{e.source}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
