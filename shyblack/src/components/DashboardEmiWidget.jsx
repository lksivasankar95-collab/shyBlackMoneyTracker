import { memo, useMemo } from 'react'
import { Landmark, ChevronRight, Clock, AlertTriangle, Calendar } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'
import GlassCard from './GlassCard'

const DashboardEmiWidget = memo(function DashboardEmiWidget({ emiSummary, onNavigate }) {
  const overdue = emiSummary?.overdue || []
  const dueToday = emiSummary?.dueToday || []
  const dueTomorrow = emiSummary?.dueTomorrow || []
  const upcoming = emiSummary?.upcoming || []
  const dueWithin7 = emiSummary?.dueWithin7 || []

  const nextDueItems = useMemo(() => {
    const items = [
      ...overdue.map((e) => ({ ...e, _priority: 0, _label: 'Overdue' })),
      ...dueToday.map((e) => ({ ...e, _priority: 1, _label: 'Due Today' })),
      ...dueTomorrow.map((e) => ({ ...e, _priority: 2, _label: 'Due Tomorrow' })),
      ...dueWithin7.filter((e) => !e.isDueToday && !e.isDueTomorrow).map((e) => ({
        ...e, _priority: 3,
        _label: `Due in ${e.dueInDays}d`,
      })),
    ]
    items.sort((a, b) => a._priority - b._priority)
    return items.slice(0, 5)
  }, [overdue, dueToday, dueTomorrow, dueWithin7])

  const hasData = emiSummary && (emiSummary.totalActive > 0 || nextDueItems.length > 0)

  if (!hasData) return null

  return (
    <div className="mb-4">
      <button onClick={() => onNavigate('emi-center')} className="w-full text-left">
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={14} className="text-purple-400" />
            <h2 className="text-xs font-semibold text-gray-300">EMI Summary</h2>
            <span className="text-[10px] text-gray-600 ml-auto">{emiSummary.totalActive} active</span>
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className="text-sm font-extrabold text-white">{emiSummary.totalActive}</p>
              <p className="text-[9px] text-gray-500">Active</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className={`text-sm font-extrabold ${dueToday.length > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                {dueToday.length}
              </p>
              <p className="text-[9px] text-gray-500">Today</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className={`text-sm font-extrabold ${overdue.length > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                {overdue.length}
              </p>
              <p className="text-[9px] text-gray-500">Overdue</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className="text-sm font-extrabold text-amber-400">{dueWithin7.length}</p>
              <p className="text-[9px] text-gray-500">7 days</p>
            </div>
          </div>

          {/* Upcoming items */}
          {nextDueItems.length > 0 && (
            <div className="space-y-1.5">
              {nextDueItems.map((emi) => (
                <div key={emi.id} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    emi._label === 'Overdue' ? 'bg-red-500/10' : emi._label === 'Due Today' ? 'bg-yellow-500/10' : 'bg-amber-500/10'
                  }`}>
                    {emi._label === 'Overdue' ? (
                      <AlertTriangle size={12} className="text-red-400" />
                    ) : emi._label === 'Due Today' ? (
                      <Clock size={12} className="text-yellow-400" />
                    ) : (
                      <Calendar size={12} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{emi.name}</p>
                    <p className="text-[10px] text-gray-500">{formatCurrency(emi.amount)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[10px] font-semibold ${
                      emi._label === 'Overdue' ? 'text-red-400' : emi._label === 'Due Today' ? 'text-yellow-400' : 'text-amber-400'
                    }`}>
                      {emi._label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end mt-2">
            <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
              View all EMIs <ChevronRight size={10} />
            </span>
          </div>
        </GlassCard>
      </button>
    </div>
  )
})

export default DashboardEmiWidget
