import { Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import CategoryIcon from './CategoryIcon'

export default function TransactionItem({ transaction, onDelete, compact }) {
  const cat = ALL_CATEGORIES.find((c) => c.id === transaction.category)
  const isIncome = transaction.type === 'income'

  return (
    <div className="flex items-center gap-3 py-3 group hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-150 first:-mt-2 first:pt-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isIncome ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'
        }`}
      >
        <CategoryIcon icon={cat?.icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">
          {cat?.label || 'Unknown'}
        </p>
        {!compact && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {transaction.note && `${transaction.note} · `}
            {formatDate(transaction.date)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums leading-tight ${
              isIncome ? 'text-neon' : 'text-red-400'
            }`}
          >
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
          {compact && (
            <p className="text-[11px] text-gray-600 mt-0.5">
              {formatDate(transaction.date)}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150"
            aria-label="Delete transaction"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
