import { Lightbulb, AlertTriangle, Heart, TrendingUp, TrendingDown, Target, Sun, Calendar, Flame, BarChart2, Activity, ArrowRightLeft, PieChart, Wallet, Repeat, FileText, DollarSign, ArrowUpCircle, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
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
  const { t } = useTranslation()
  const { transactions, insights, cashflowForecast } = useFinance()

  const { trends, scoreVelocity, streak, monthPrediction, scoreHistory } = insights
  const hasScoreHistory = scoreHistory.some((m) => m.score !== null)
  const hasCashflowData = cashflowForecast.some((m) => m.income > 0 || m.expense > 0)

  if (transactions.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <h1 className="text-xl font-bold mb-6">{t('insights.title')}</h1>
        <GlassCard>
          <EmptyState
            icon={Lightbulb}
            title={t('insights.emptyTitle')}
            description={t('insights.emptyDescription')}
          />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">{t('insights.title')}</h1>

      <FinancialScore score={insights.score?.value ?? insights.score} factors={insights.score?.factors ?? []} breakdown={insights.scoreBreakdown} />

      {insights.health && (
        <GlassCard brand className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">{t('insights.financialHealth')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-gray-500 mb-1">{t('insights.emergencyFund')}</p>
              <p className="text-lg font-extrabold tabular-nums">{formatCurrency(insights.health.emergencyFund)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">{t('insights.monthsCovered')}</p>
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
              <span className="text-xs text-gray-500">{t('insights.healthRating')}</span>
            </div>
          </div>
        </GlassCard>
      )}

      {insights.smartInsights?.length > 0 && (
        <GlassCard className="mt-4 border-neon/10">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">Smart Insights</h2>
          </div>
          <div className="space-y-2">
            {insights.smartInsights.map((si, i) => {
              const iconMap = {
                spending_increase: si.severity === 'success' ? TrendingDown : TrendingUp,
                category_increase: ArrowUpCircle,
                largest_category: PieChart,
                savings_trend: si.severity === 'success' ? TrendingUp : TrendingDown,
                budget_exceeded: DollarSign,
                low_balance: Wallet,
                frequent_spending: Repeat,
                monthly_summary: FileText,
              }
              const colorMap = {
                alert: 'text-red-400 bg-red-500/10',
                warning: 'text-yellow-400 bg-yellow-500/10',
                info: 'text-blue-400 bg-blue-500/10',
                success: 'text-neon bg-neon/10',
              }
              const Icon = iconMap[si.type] || Lightbulb
              const colorClass = colorMap[si.severity] || 'text-gray-400 bg-gray-500/10'
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300">{si.message}</p>
                    {si.detail && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{si.detail}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {insights.recommendations.length > 0 && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-yellow-400" />
            <h2 className="text-sm font-semibold">{t('insights.recommendations')}</h2>
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
                        {t('insights.priority', { impact: rec.impact })}
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
            <h2 className="text-sm font-semibold">{t('insights.spendingHabits')}</h2>
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
            <h2 className="text-sm font-semibold">{t('insights.categoryTrends')}</h2>
          </div>
          <div className="space-y-2.5">
            {trends.slice(0, 5).map((trend) => (
              <div key={trend.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs capitalize">{ALL_CATEGORIES.find((c) => c.id === trend.category)?.label || trend.category}</span>
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

      {/* Score velocity + logging streak */}
      {(scoreVelocity || streak > 1) && (
        <div className="flex gap-3 mt-4">
          {scoreVelocity && (
            <GlassCard className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                {scoreVelocity.direction === 'up'
                  ? <TrendingUp size={14} className="text-neon" />
                  : <TrendingDown size={14} className="text-red-400" />}
                <span className="text-[11px] text-gray-500 font-medium">{t('insights.scoreTrend')}</span>
              </div>
              <p className={`text-lg font-extrabold tabular-nums ${scoreVelocity.direction === 'up' ? 'text-neon' : 'text-red-400'}`}>
                {scoreVelocity.delta > 0 ? '+' : ''}{scoreVelocity.delta}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{t('insights.vsLastMonth')}</p>
            </GlassCard>
          )}
          {streak > 1 && (
            <GlassCard className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={14} className="text-orange-400" />
                <span className="text-[11px] text-gray-500 font-medium">{t('insights.loggingStreak')}</span>
              </div>
              <p className="text-lg font-extrabold tabular-nums text-orange-400">{streak}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{t('insights.streakDays', { count: streak })}</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* Month-end spend projection */}
      {monthPrediction && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={16} className="text-purple-400" />
            <h2 className="text-sm font-semibold">{t('insights.monthEndForecast')}</h2>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-extrabold tabular-nums text-purple-400">
              {formatCurrency(monthPrediction.projected)}
            </span>
            <span className="text-xs text-gray-500">{t('insights.projectedTotal')}</span>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">
            {t('insights.spentIn', { amount: formatCurrency(monthPrediction.spentSoFar), elapsed: monthPrediction.daysElapsed, total: monthPrediction.daysInMonth })}
          </p>
          {monthPrediction.categoryProjections.slice(0, 3).map((c) => (
            <div key={c.category} className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-400">{c.label || c.category.replace(/_/g, ' ')}</span>
              <span className="text-xs font-medium tabular-nums">{formatCurrency(c.projected)}</span>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Financial Health Timeline */}
      {hasScoreHistory && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">{t('insights.healthTimeline')}</h2>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={scoreHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1000]} tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickCount={3} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v) => v !== null ? [v, t('insights.score')] : [t('insights.na'), t('insights.score')]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#00ff9f"
                strokeWidth={2}
                dot={{ r: 3, fill: '#00ff9f' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-600 mt-1">{t('insights.timelineDescription')}</p>
        </GlassCard>
      )}

      {/* Cashflow Forecast */}
      {hasCashflowData && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold">{t('insights.cashflowForecast')}</h2>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={cashflowForecast} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={16}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickCount={3} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v, name) => [formatCurrency(v), name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Bar dataKey="income" fill="#00ff9f" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-600 mt-1">{t('insights.cashflowDescription')}</p>
          <div className="flex gap-3 mt-2">
            {cashflowForecast.map((m) => (
              <div key={m.label} className="flex-1 p-2 rounded-lg bg-white/[0.02] text-center">
                <p className="text-[10px] text-gray-500 mb-0.5">{m.label}</p>
                <p className={`text-xs font-bold tabular-nums ${m.net >= 0 ? 'text-neon' : 'text-red-400'}`}>
                  {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {insights.overspend && (
        <GlassCard className="mt-4 border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">{t('insights.spendingAlert')}</h2>
          </div>
          <p className="text-xs text-gray-400">{insights.overspend.message}</p>
        </GlassCard>
      )}
    </div>
  )
}
