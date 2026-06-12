import { LayoutDashboard, PlusCircle, History, BarChart3, Settings } from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'add', label: 'Add', icon: PlusCircle },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-glass backdrop-blur-xl border-t border-glass-border rounded-t-2xl shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 pt-2 pb-[max(env(safe-area-inset-bottom,8px),8px)]">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[64px] min-h-[44px] justify-center group"
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-neon rounded-full shadow-neon-sm" />
                )}
                <Icon
                  size={isActive ? 22 : 20}
                  className={`transition-all duration-200 ${isActive ? 'text-neon' : 'text-gray-500 group-hover:text-gray-300'}`}
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
