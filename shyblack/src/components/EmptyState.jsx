import { memo } from 'react'
import { Inbox } from 'lucide-react'

const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action }) {
  const IconComponent = Icon || Inbox
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-matte-200 flex items-center justify-center mb-4 ring-1 ring-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon/[0.04] to-transparent" />
        <IconComponent size={26} className="text-neon/50" />
      </div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {description && (
        <p className="text-xs text-gray-600 mt-1.5 max-w-[220px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
})

export default EmptyState
