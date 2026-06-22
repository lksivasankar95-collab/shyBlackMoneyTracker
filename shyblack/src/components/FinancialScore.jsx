import { useState } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, BarChart3, PieChart, DollarSign, Activity, Hash } from 'lucide-react'
import GlassCard from './GlassCard'
import { useTranslation } from '../i18n'

const scoreColors = {
  Excellent: { from: '#39ff14', to: '#22c55e', label: 'Excellent' },
  Good: { from: '#22c55e', to: '#16a34a', label: 'Good' },
  Fair: { from: '#eab308', to: '#f97316', label: 'Fair' },
  'Needs Work': { from: '#ef4444', to: '#dc2626', label: 'Needs Work' },
}

const breakdownIcons = {
  savings: DollarSign,
  debt: AlertTriangle,
  consistency: Activity,
  budget: BarChart3,
  tracking: Hash,
}

export default function FinancialScore({ score, factors, compact, breakdown }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { level } = score
  const colors = scoreColors[level] || scoreColors['Needs Work']

  const getArcStyle = () => {
    const percent = Math.min(score.score / 1000, 1)
    return {
      background: `conic-gradient(${colors.from} ${percent * 360}deg, rgba(255,255,255,0.05) ${percent * 360}deg)`,
      boxShadow: `0 0 12px ${colors.from}22`,
    }
  }

  const content = (
    <>
      <div className={`flex items-center gap-3 ${compact ? '' : 'mb-4'}`}>
        <div className="relative shrink-0">
          <div className="rounded-full p-[2px]" style={getArcStyle()}>
            <div className="w-12 h-12 rounded-full bg-matte flex items-center justify-center">
              <TrendingUp size={20} className="text-neon" />
            </div>
          </div>
          {score.score > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-matte flex items-center justify-center shadow-sm">
              <div className="w-2 h-2 rounded-full bg-neon animate-neon-pulse" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-gradient-brand">{score.score}</span>
            <span className="text-xs font-medium" style={{ color: colors.from }}>{level}</span>
          </div>
          <p className="text-xs text-gray-500">{t('financial_score.subtitle')}</p>
        </div>
      </div>

      {!compact && breakdown && (
        <div className="mb-3 space-y-1.5">
          {breakdown.categories.map((cat) => {
            const Icon = breakdownIcons[cat.key] || TrendingUp
            const pct = cat.max > 0 ? (cat.score / cat.max) * 100 : 0
            return (
              <div key={cat.key} className="flex items-center gap-2.5">
                <Icon size={11} className="text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-gray-500 font-medium">{cat.label}</span>
                    <span className="text-[10px] font-medium tabular-nums">{cat.score}/{cat.max}</span>
                  </div>
                  <div className="w-full h-1 bg-matte-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-gray-500 to-neon" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!compact && factors.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {factors.length === 1 ? t('financial_score.factors_one') : t('financial_score.factors', { count: factors.length })}
          </button>
          {expanded && (
            <div className="space-y-1.5 animate-fade-in">
              {factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {f.type === 'positive' && <CheckCircle size={12} className="text-neon shrink-0 mt-0.5" />}
                  {f.type === 'negative' && <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />}
                  {f.type === 'warning' && <AlertTriangle size={12} className="text-yellow-500 shrink-0 mt-0.5" />}
                  <span className={f.type === 'positive' ? 'text-gray-300' : 'text-gray-400'}>{f.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )

  if (compact) return content

  return (
    <GlassCard brand className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full -mr-8 -mt-8" style={{ background: `radial-gradient(circle, ${colors.from}, transparent)` }} />
      {content}
    </GlassCard>
  )
}
