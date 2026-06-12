import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon, title, description }) {
  const IconComponent = Icon || Inbox
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-matte-200 flex items-center justify-center mb-4">
        <IconComponent size={28} className="text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {description && (
        <p className="text-xs text-gray-600 mt-1 max-w-[200px]">{description}</p>
      )}
    </div>
  )
}
