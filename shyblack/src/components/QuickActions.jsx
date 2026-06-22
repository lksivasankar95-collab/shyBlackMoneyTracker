import { Target, FileText, History, Calendar, Landmark } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function QuickActions({ onNavigate, compact }) {
  const { t } = useTranslation()
  const actions = [
    { id: 'budgets', label: t('quick_actions.budgets'), icon: Target },
    { id: 'reports', label: t('quick_actions.reports'), icon: FileText },
    { id: 'timeline', label: t('quick_actions.timeline'), icon: History },
    { id: 'calendar', label: t('quick_actions.calendar'), icon: Calendar },
    { id: 'emi-center', label: t('quick_actions.emis'), icon: Landmark },
  ]
  const items = compact ? actions.slice(0, 4) : actions

  return (
    <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-5'} gap-2`}>
      {items.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl glass hover:border-neon/20 hover:shadow-brand-sm active:scale-95 transition-all duration-200 group min-h-[64px]"
            aria-label={`Open ${action.label}`}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-matte-200 group-hover:bg-neon/10 transition-colors duration-200">
              <Icon size={18} className="text-gray-400 group-hover:text-neon transition-colors duration-200" />
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300 transition-colors duration-200">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
