import { useCallback, useMemo, useRef, useEffect } from 'react'
import { LayoutDashboard, PlusCircle, History, BarChart3, Settings } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function BottomNav({ active, onNavigate }) {
  const { t } = useTranslation()
  const navRef = useRef(null)

  const navItems = useMemo(() => [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'add', label: t('nav.add'), icon: PlusCircle },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ], [t])

  const handleKeyDown = useCallback((e) => {
    const currentIndex = navItems.findIndex((item) => item.id === active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % navItems.length
      onNavigate?.(navItems[nextIndex].id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + navItems.length) % navItems.length
      onNavigate?.(navItems[prevIndex].id)
    }
  }, [active, navItems, onNavigate])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-50" role="tablist" aria-label={t('nav.main_navigation')}>
      <div className="bg-glass backdrop-blur-xl border-t border-glass-border rounded-t-2xl shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 pt-2 pb-[max(env(safe-area-inset-bottom,8px),8px)]">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[64px] min-h-[48px] justify-center group focus-visible:outline-2 focus-visible:outline-neon/50"
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-neon rounded-full shadow-neon-sm animate-neon-pulse" />
                )}
                <Icon
                  size={isActive ? 22 : 20}
                  className={`transition-all duration-200 ${isActive ? 'text-neon' : 'text-gray-500 group-hover:text-gray-300 group-focus-visible:text-gray-300'}`}
                />
                <span className={`transition-all duration-200 ${
                  isActive ? 'text-[10px] font-semibold text-neon' : 'text-[10px] font-medium text-gray-500'
                }`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
