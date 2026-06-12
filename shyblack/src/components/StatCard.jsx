import { memo } from 'react'
import GlassCard from './GlassCard'

const StatCard = memo(function StatCard({ icon: Icon, label, value, color = 'text-white', subtext }) {
  return (
    <GlassCard className="flex flex-col gap-1.5 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
        {Icon && <Icon size={13} className={color.includes('neon') ? '' : ''} />}
        <span className="truncate">{label}</span>
      </div>
      <span className={`text-xl font-extrabold tracking-tight ${color} ${color === 'text-neon' ? 'glow-neon-sm' : ''}`}>{value}</span>
      {subtext && <span className="text-[11px] text-gray-600">{subtext}</span>}
    </GlassCard>
  )
})

export default StatCard
