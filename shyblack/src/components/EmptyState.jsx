import { memo } from 'react'
import { Inbox, Search, FileText, Target, AlertCircle, PiggyBank } from 'lucide-react'
import i18n from 'i18next'

const variantIcons = {
  default: Inbox,
  search: Search,
  document: FileText,
  goal: Target,
  alert: AlertCircle,
  savings: PiggyBank,
}

const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action, hint, tip, variant, compact }) {
  const IconComponent = variant ? (variantIcons[variant] || Inbox) : (Icon || Inbox)
  if (compact) {
    return (
      <div className="flex items-center gap-3 py-3 px-2 text-center animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-matte-200 flex items-center justify-center shrink-0 ring-1 ring-white/5">
          <IconComponent size={18} className="text-neon/40" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-gray-400">{title}</p>
          {description && (
            <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-matte-200 flex items-center justify-center mb-4 ring-1 ring-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon/[0.04] to-transparent" />
        <IconComponent size={28} className="text-neon/40" />
      </div>
      <p className="text-sm font-semibold text-gray-400">{title}</p>
      {description && (
        <p className="text-xs text-gray-600 mt-2 max-w-[280px] leading-relaxed">{description}</p>
      )}
      {hint && (
        <p className="text-[10px] text-gray-700 mt-2 max-w-[260px] leading-relaxed">{hint}</p>
      )}
      {tip && (
        <p className="text-[10px] text-neon/60 mt-2 max-w-[260px] leading-relaxed flex items-center gap-1">
          <span>💡</span> {tip}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
})

// eslint-disable-next-line react-refresh/only-export-components
export function getEmptyStateConfig(page) {
  const configs = {
    transactions: {
      title: i18n.t('empty_states.transactions_title'),
      description: i18n.t('empty_states.transactions_desc'),
      hint: i18n.t('empty_states.transactions_hint'),
    },
    emi: {
      title: i18n.t('empty_states.emi_title'),
      description: i18n.t('empty_states.emi_desc'),
      hint: i18n.t('empty_states.emi_hint'),
    },
    documents: {
      title: i18n.t('empty_states.documents_title'),
      description: i18n.t('empty_states.documents_desc'),
      hint: i18n.t('empty_states.documents_hint'),
    },
    budgets: {
      title: i18n.t('empty_states.budgets_title'),
      description: i18n.t('empty_states.budgets_desc'),
      hint: i18n.t('empty_states.budgets_hint'),
    },
    goals: {
      title: i18n.t('empty_states.goals_title'),
      description: i18n.t('empty_states.goals_desc'),
      hint: i18n.t('empty_states.goals_hint'),
    },
    debts: {
      title: i18n.t('empty_states.debts_title'),
      description: i18n.t('empty_states.debts_desc'),
      hint: i18n.t('empty_states.debts_hint'),
    },
    default: {
      title: i18n.t('empty_states.default_title'),
      description: i18n.t('empty_states.default_desc'),
      hint: i18n.t('empty_states.default_hint'),
    },
  }
  return configs[page] || configs.default
}

export default EmptyState
