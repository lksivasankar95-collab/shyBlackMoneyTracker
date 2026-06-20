import { memo } from 'react'
import { Inbox } from 'lucide-react'

const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action, hint }) {
  const IconComponent = Icon || Inbox
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
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
})

export function getEmptyStateConfig(page) {
  const configs = {
    transactions: {
      title: 'No transactions yet',
      description: 'Start tracking your finances by adding your first income or expense.',
      hint: 'Tap the + button below to add a transaction. It only takes a few seconds.',
    },
    emi: {
      title: 'No EMIs tracked',
      description: 'Track loans and installment payments so you never miss a due date.',
      hint: 'Add an EMI to see payment schedules, remaining balances, and due dates.',
    },
    documents: {
      title: 'No documents yet',
      description: 'Store bills, agreements, receipts, and financial statements securely.',
      hint: 'Upload PDFs or images to keep all your important documents in one place.',
    },
    budgets: {
      title: 'No budgets set',
      description: 'Create budgets to track spending across different categories.',
      hint: 'Set monthly limits for categories like Food, Fuel, and Shopping.',
    },
    goals: {
      title: 'No financial goals',
      description: 'Set savings goals and track your progress over time.',
      hint: 'Goals help you stay motivated and focused on what matters most.',
    },
    debts: {
      title: 'No borrow or lend entries',
      description: 'Track money you\'ve borrowed from or lent to friends and family.',
      hint: 'Keep a clear record of who owes what and when it\'s due.',
    },
    default: {
      title: 'Nothing here yet',
      description: 'This section will populate as you use the app.',
      hint: 'Explore other features to get started.',
    },
  }
  return configs[page] || configs.default
}

export default EmptyState
