import { useMemo } from 'react'
import { Lightbulb, AlertTriangle, Heart, TrendingUp, Target, Sun, Calendar } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { getCategoryTrends } from '../utils/analytics'
import GlassCard from '../components/GlassCard'
import FinancialScore from '../components/FinancialScore'
import EmptyState from '../components/EmptyState'

const tipIcons = {
  saving: Target,
  positive: TrendingUp,
  goal: Heart,
  pattern: Sun,
}

const tipColors = {
  saving: 'text-yellow-400 bg-yellow-500/10',
  positive: 'text-neon bg-neon/10',
  goal: 'text-purple-400 bg-purple-500/10',
  pattern: 'text-blue-400 bg-blue-500/10',
}

export default function InsightsPage() {
  const { transactions, insights } = useFinance()

  const trends = useMemo(() => getCategoryTrends(transactions, 3), [transactions])

  if (transactions.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <h1 className="text-xl font-bold mb-6">Financial Insights</h1>
        <GlassCard>
          <EmptyState
            icon={Lightbulb}
            title="No insights yet"
            description="Add transactions to unlock AI-powered financial insights"
          />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">Financial Insights</h1>

      <FinancialScore score={insights.score} factors={insights.score.factors} />

      {insights.health && (
        <GlassCard brand className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">Financial Health</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Emergency Fund</p>
              <p className="text-lg font-extrabold tabular-nums">{formatCurrency(insights.health.emergencyFund)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Months Covered</p>
              <p className="text-lg font-extrabold tabular-nums">{insights.health.monthsCovered}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                insights.health.rating === 'Excellent' ? 'bg-neon/10 text-neon' :
                insights.health.rating === 'Good' ? 'bg-green-500/10 text-green-400' :
                'bg-yellow-500/10 text-yellow-400'
              }`}>
                {insights.health.rating}
              </div>
              <span className="text-xs text-gray-500">financial health rating</span>
            </div>
          </div>
        </GlassCard>
      )}

      {insights.recommendations.length > 0 && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-yellow-400" />
            <h2 className="text-sm font-semibold">Recommendations</h2>
          </div>
          <div className="space-y-2">
            {insights.recommendations.map((rec, i) => {
              const Icon = tipIcons[rec.type] || Lightbulb
              const colorClass = tipColors[rec.type] || 'text-gray-400 bg-gray-500/10'
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300">{rec.text}</p>
                    {rec.impact && (
                      <span className={`text-[10px] font-medium mt-0.5 inline-block ${
                        rec.impact === 'high' ? 'text-yellow-400' : 'text-gray-500'
                      }`}>
                        {rec.impact} priority
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {insights.habits.length > 0 && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold">Spending Habits</h2>
          </div>
          <div className="space-y-2">
            {insights.habits.map((habit, i) => {
              const Icon = tipIcons[habit.type] || Sun
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-400 shrink-0">
                    <Icon size={15} />
                  </div>
                  <p className="text-xs text-gray-300">{habit.text}</p>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {trends.length > 0 && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-orange-400" />
            <h2 className="text-sm font-semibold">Category Trends</h2>
          </div>
          <div className="space-y-2.5">
            {trends.slice(0, 5).map((trend) => (
              <div key={trend.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs capitalize">{trend.category}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{formatCurrency(trend.total)}</span>
                </div>
                <div className="w-full h-1.5 bg-matte-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                    style={{ width: `${Math.min((trend.total / (trends[0]?.total || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {insights.overspend && (
        <GlassCard className="mt-4 border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Alert</h2>
          </div>
          <p className="text-xs text-gray-400">{insights.overspend.message}</p>
        </GlassCard>
      )}
    </div>
  )
}
