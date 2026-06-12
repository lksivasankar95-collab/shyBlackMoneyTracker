import GlassCard from './GlassCard'

export default function StatCard({ icon: Icon, label, value, color = 'text-white', subtext }) {
  return (
    <GlassCard className="flex flex-col gap-1 flex-1 min-w-[120px]">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wider">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      {subtext && <span className="text-xs text-gray-500">{subtext}</span>}
    </GlassCard>
  )
}
