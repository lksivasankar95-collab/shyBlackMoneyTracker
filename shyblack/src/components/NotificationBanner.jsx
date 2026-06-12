import { AlertTriangle, X } from 'lucide-react'

export default function NotificationBanner({ notification, onDismiss }) {
  if (!notification) return null

  const severityStyles = {
    high: 'border-red-500/30 text-red-400',
    medium: 'border-yellow-500/30 text-yellow-400',
    low: 'border-neon/20 text-neon',
  }

  const bgStyles = {
    high: 'bg-red-500/8',
    medium: 'bg-yellow-500/8',
    low: 'bg-neon/8',
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border mb-4 animate-slide-in backdrop-blur-lg ${severityStyles[notification.severity] || severityStyles.medium} ${bgStyles[notification.severity] || bgStyles.medium}`}>
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <p className="text-xs flex-1 leading-relaxed">{notification.message}</p>
      <button onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}
