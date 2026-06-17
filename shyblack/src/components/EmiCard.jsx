import { memo } from 'react'
import { formatCurrency } from '../utils/helpers'

const statusStyles = {
  active: 'bg-neon/10 text-neon border-neon/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const EmiCard = memo(function EmiCard({ emi, onClick }) {
  const totalMonths = emi.tenure || emi.totalPaidCount + emi.remainingMonths
  const progressPct = totalMonths > 0 ? ((totalMonths - emi.remainingMonths) / totalMonths) * 100 : 0

  return (
    <button
      onClick={() => onClick?.(emi)}
      className="glass p-4 rounded-2xl w-full text-left hover:bg-glass-hover transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{emi.name}</h3>
            {emi.status !== 'active' && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${statusStyles[emi.status] || statusStyles.active}`}>
                {emi.status}
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(emi.amount)}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-gray-500 font-medium">
              Due: <span className="text-gray-300">{emi.dueDay}</span>
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              <span className="text-gray-300">{totalMonths - emi.remainingMonths}</span> / {totalMonths} Months Paid
            </span>
          </div>
        </div>
        {emi.lender && (
          <div className="shrink-0">
            <span className="text-[10px] text-gray-500 bg-matte-100 px-2 py-1 rounded-lg">
              {emi.lender}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 h-1 bg-matte-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            emi.status === 'closed' ? 'bg-gray-500' : 'bg-neon'
          }`}
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
    </button>
  )
})

export default EmiCard
