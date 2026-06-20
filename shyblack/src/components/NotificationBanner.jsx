import { AlertTriangle, AlertOctagon, Info, X } from 'lucide-react'

const severityConfig = {
  high: { border: 'border-red-500/30', text: 'text-red-400', bg: 'bg-red-500/8', icon: AlertOctagon },
  medium: { border: 'border-yellow-500/30', text: 'text-yellow-400', bg: 'bg-yellow-500/8', icon: AlertTriangle },
  low: { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/8', icon: Info },
}

export default function NotificationBanner({ notification, onDismiss }) {
  if (!notification) return null

  const config = severityConfig[notification.severity] || severityConfig.medium
  const Icon = config.icon

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border mb-4 animate-slide-up backdrop-blur-lg ${config.border} ${config.text} ${config.bg}`}
      role="alert"
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <p className="text-xs flex-1 leading-relaxed">{notification.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}
