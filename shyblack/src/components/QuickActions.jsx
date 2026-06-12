import { Plus, TrendingUp, Target, BarChart3, FileText } from 'lucide-react'

const actions = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export default function QuickActions({ onNavigate, compact }) {
  const items = compact ? actions.slice(0, 4) : actions

  return (
    <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-5'} gap-2`}>
      {items.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl glass hover:border-neon/20 hover:shadow-brand-sm active:scale-95 transition-all duration-200 group"
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
