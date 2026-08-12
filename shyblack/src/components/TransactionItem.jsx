import { memo, useMemo } from 'react'
import { Trash2, Pencil, User, Smartphone, Check } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES, PAYMENT_METHODS } from '../utils/constants'
import CategoryIcon from './CategoryIcon'
import { useTranslation } from '../i18n'
import { getOriginalAmount, formatInCurrency, getBaseCurrencyCode } from '../utils/multiCurrency'

function getSubtitle(tx, t) {
  const parts = []
  if (tx.person?.name) {
    parts.push(tx.type === 'income'
      ? `${t('transactions.from_label')} ${tx.person.name}`
      : `${t('transactions.to_label')} ${tx.person.name}`)
  }
  if (tx.paymentMethod) {
    const method = PAYMENT_METHODS.find((m) => m.id === tx.paymentMethod)
    parts.push(`${t('transactions.via_label')} ${method?.label || tx.paymentMethod}`)
  }
  if (tx.note) parts.push(tx.note)
  parts.push(formatDate(tx.date))
  return parts.join(' · ')
}

const TransactionItem = memo(function TransactionItem({ transaction, onDelete, onEdit, compact, selectable, selected, onToggleSelect }) {
  const { t } = useTranslation()
  const cat = ALL_CATEGORIES.find((c) => c.id === transaction.category)
  const isIncome = transaction.type === 'income'
  const subtitle = useMemo(() => getSubtitle(transaction, t), [transaction, t])

  return (
    <div className={`flex items-center gap-3 py-3 group hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-150 first:-mt-2 first:pt-2 ${selected ? 'bg-neon/[0.04]' : ''}`}
      onClick={selectable ? () => onToggleSelect?.(transaction.id) : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect?.(transaction.id) } } : undefined}
    >
      {selectable && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(transaction.id) }}
          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            selected ? 'bg-neon border-neon text-black' : 'border-white/15 text-transparent'
          }`}
          aria-label="Select transaction"
        >
          <Check size={12} strokeWidth={3} />
        </button>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ${
          isIncome ? 'bg-neon/10 text-neon ring-neon/20' : 'bg-red-500/10 text-red-400 ring-red-500/20'
        }`}
      >
        <CategoryIcon icon={cat?.icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">
          {cat?.label || t('transactions.unknown_category')}
        </p>
        {!compact && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
        {transaction.tags && transaction.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {transaction.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-medium leading-none">
                #{tag}
              </span>
            ))}
          </div>
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
          {(() => {
            const orig = getOriginalAmount(transaction)
            if (!orig || orig.code === getBaseCurrencyCode()) return null
            return (
              <p className="text-[10px] text-gray-600 mt-0.5 whitespace-nowrap">
                ≈ {formatInCurrency(orig.amount, orig.code)}
              </p>
            )
          })()}
          {compact && (
            <p className="text-[11px] text-gray-600 mt-0.5">
              {formatDate(transaction.date)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(transaction.id) }}
              className="p-1.5 rounded-lg text-gray-600 hover:text-neon hover:bg-neon/10 transition-all duration-150"
              aria-label="Edit transaction"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(transaction.id) }}
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
