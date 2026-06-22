import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus, X, TrendingUp, Landmark, Users, Target, FolderOpen, ArrowLeftRight,
  FileText,
} from 'lucide-react'
import { useTranslation } from '../i18n'

export default function QuickActionCenter({ onNavigate }) {
  const { t } = useTranslation()
  const actions = [
    { id: 'add', label: t('quick_actions.transaction'), icon: TrendingUp, color: 'text-neon bg-neon/10' },
    { id: 'emi-center', label: t('quick_actions.emi'), icon: Landmark, color: 'text-purple-400 bg-purple-500/10' },
    { id: 'debts', label: t('quick_actions.ledger'), icon: Users, color: 'text-blue-400 bg-blue-500/10' },
    { id: 'goals', label: t('quick_actions.goal'), icon: Target, color: 'text-amber-400 bg-amber-500/10' },
    { id: 'documents', label: t('quick_actions.document'), icon: FolderOpen, color: 'text-neon bg-neon/10' },
    { id: 'transfers', label: t('quick_actions.transfer'), icon: ArrowLeftRight, color: 'text-cyan-400 bg-cyan-500/10' },
  ]
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    setTimeout(() => document.addEventListener('click', handler), 100)
    return () => document.removeEventListener('click', handler)
  }, [open])

  const handleAction = useCallback((id) => {
    setOpen(false)
    onNavigate(id)
  }, [onNavigate])

  return (
    <div ref={menuRef} className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="animate-fade-in space-y-2">
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl bg-matte border border-glass-border shadow-lg hover:border-neon/30 hover:bg-matte-200 transition-all group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="text-xs font-medium text-gray-300 group-hover:text-white whitespace-nowrap">{action.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>
                  <Icon size={15} />
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-12 h-12 rounded-full bg-neon text-black shadow-lg shadow-neon/20 hover:shadow-neon/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  )
}
