import { memo, useMemo } from 'react'
import { Trash2, Pencil, User, Smartphone } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES, PAYMENT_METHODS } from '../utils/constants'
import CategoryIcon from './CategoryIcon'

function getSubtitle(tx) {
  const parts = []
  if (tx.person?.name) {
    parts.push(tx.type === 'income' ? `from ${tx.person.name}` : `to ${tx.person.name}`)
  }
  if (tx.paymentMethod) {
    const method = PAYMENT_METHODS.find((m) => m.id === tx.paymentMethod)
    parts.push(`via ${method?.label || tx.paymentMethod}`)
  }
  if (tx.note) parts.push(tx.note)
  parts.push(formatDate(tx.date))
  return parts.join(' · ')
}

const TransactionItem = memo(function TransactionItem({ transaction, onDelete, onEdit, compact }) {
  const cat = ALL_CATEGORIES.find((c) => c.id === transaction.category)
  const isIncome = transaction.type === 'income'
  const subtitle = useMemo(() => getSubtitle(transaction), [transaction])

  return (
    <div className="flex items-center gap-3 py-3 group hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-150 first:-mt-2 first:pt-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ${
          isIncome ? 'bg-neon/10 text-neon ring-neon/20' : 'bg-red-500/10 text-red-400 ring-red-500/20'
        }`}
      >
        <CategoryIcon icon={cat?.icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">
          {cat?.label || 'Unknown'}
        </p>
        {!compact && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
        {transaction.person?.name && compact && (
          <p className="text-[11px] text-gray-600 mt-0.5 truncate flex items-center gap-1">
            <User size={10} className="shrink-0" />
            {transaction.person.name}
            {transaction.paymentMethod && (
              <>
                <span className="text-gray-700">·</span>
                <Smartphone size={10} className="shrink-0" />
                {PAYMENT_METHODS.find((m) => m.id === transaction.paymentMethod)?.label || transaction.paymentMethod}
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums leading-tight ${
              isIncome ? 'text-neon glow-neon-sm' : 'text-red-400'
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
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction.id)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-neon hover:bg-neon/10 transition-all duration-150"
              aria-label="Edit transaction"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
              aria-label="Delete transaction"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default TransactionItem
