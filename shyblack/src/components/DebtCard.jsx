import { memo, useState } from 'react'
import { User, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'

const DebtCard = memo(function DebtCard({ debt, onRepay, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const isLent = debt.type === 'lent'
  const isOverdue = debt.status === 'pending' && debt.dueDate && new Date(debt.dueDate) < new Date()
  const isPartial = debt.remainingAmount < debt.amount && debt.status === 'pending'
  const progress = debt.amount > 0 ? ((debt.amount - debt.remainingAmount) / debt.amount) * 100 : 0

  return (
    <div className="glass p-4 rounded-xl border border-glass-border hover:border-neon/20 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isLent ? 'bg-green-500/10' : 'bg-orange-500/10'
        }`}>
          <User size={18} className={isLent ? 'text-green-400' : 'text-orange-400'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{debt.personName}</h3>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              debt.status === 'paid'
                ? 'bg-green-500/10 text-green-400'
                : isOverdue
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              {debt.status === 'paid' ? (
                <><CheckCircle2 size={10} /> Paid</>
              ) : isOverdue ? (
                <><AlertTriangle size={10} /> Overdue</>
              ) : (
                <><Clock size={10} /> Pending</>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-1 mt-1 ${isLent ? 'text-green-400' : 'text-orange-400'}`}>
            {isLent ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            <span className="text-lg font-extrabold">{formatCurrency(debt.remainingAmount)}</span>
          </div>

          {isPartial && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              of {formatCurrency(debt.amount)} · <span className="text-neon">{Math.round(progress)}%</span> repaid
            </p>
          )}

          {debt.dueDate && (
            <p className={`text-[11px] mt-1.5 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              Due {formatDate(debt.dueDate)}
            </p>
          )}

          {debt.notes && (
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{debt.notes}</p>
          )}
        </div>

        <button
          onClick={() => setShowActions(!showActions)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all"
        >
          <ChevronRight size={14} className={`transition-transform ${showActions ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {showActions && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-glass-border animate-fade-in">
          {debt.status === 'pending' && (
            <button
              onClick={() => onRepay(debt)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-neon/10 text-neon hover:bg-neon/20 transition-all"
            >
              {isLent ? 'Record Repayment' : 'Make Payment'}
            </button>
          )}
          <button
            onClick={() => onDelete(debt.id)}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
})

export default DebtCard
