import { memo } from 'react'
import GlassCard from './GlassCard'

const StatCard = memo(function StatCard({ icon: Icon, label, value, color = 'text-white', subtext, onClick }) {
  const hasNeonColor = color && (color.includes('neon') || color === 'text-neon')
  return (
    <GlassCard className="flex flex-col gap-1.5 flex-1 min-w-0" onClick={onClick}>
      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
        {Icon && <Icon size={13} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <span className={`text-xl font-extrabold tracking-tight transition-all duration-200 number-tabular ${color} ${hasNeonColor ? 'glow-neon-sm' : ''}`}>{value}</span>
      {subtext && <span className="text-[11px] text-gray-600">{subtext}</span>}
    </GlassCard>
  )
})

export default StatCard
