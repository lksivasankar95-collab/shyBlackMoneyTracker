import { memo, useMemo } from 'react'
import { Landmark, ChevronRight, Clock } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'
import GlassCard from './GlassCard'

function getDaysFromNow(date) {
  const now = new Date()
  const target = date instanceof Date ? date : new Date(date)
  const diff = Math.ceil((target - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  return diff
}

const DashboardEmiWidget = memo(function DashboardEmiWidget({ emiSummary, onNavigate }) {
  const upcoming = emiSummary?.upcomingEmis || []

  const nextThree = useMemo(() => {
    return upcoming.slice(0, 3).map((emi) => ({
      ...emi,
      dueInDays: getDaysFromNow(emi.dueDate),
    }))
  }, [upcoming])

  if (nextThree.length === 0) return null

  return (
    <button onClick={() => onNavigate('emi-center')} className="w-full text-left">
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Landmark size={14} className="text-neon" />
          <h2 className="text-xs font-semibold text-gray-300">Upcoming EMIs</h2>
          <span className="text-[10px] text-gray-600 ml-auto">{emiSummary.totalActive} active</span>
        </div>
        <div className="space-y-2.5">
          {nextThree.map((emi) => (
            <div key={emi.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Clock size={15} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{emi.name}</p>
                <p className="text-[11px] text-gray-500">{formatCurrency(emi.amount)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold tabular-nums text-yellow-400">
                  {emi.dueInDays === 0 ? 'Today' : `Due in ${emi.dueInDays}d`}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end mt-2">
          <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
            View all <ChevronRight size={10} />
          </span>
        </div>
      </GlassCard>
    </button>
  )
})

export default DashboardEmiWidget
