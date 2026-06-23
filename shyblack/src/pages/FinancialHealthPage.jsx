import { useMemo, useState } from 'react'
import {
  Heart, TrendingUp, TrendingDown, Target, DollarSign, AlertTriangle,
  CheckCircle, Lightbulb, Activity, ArrowUpRight, ArrowDownRight,
  Wallet, Shield, BarChart3, PiggyBank,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import {
  calculateHealthScore, getHealthHistory, getScoreVelocity,
} from '../utils/financialHealth'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const CATEGORY_ICONS = {
  savingsRate: PiggyBank,
  expenseControl: TrendingDown,
  debtRatio: Shield,
  budgetAdherence: Target,
  incomeStability: Activity,
}

const CATEGORY_COLORS = {
  savingsRate: '#39ff14',
  expenseControl: '#f97316',
  debtRatio: '#ef4444',
  budgetAdherence: '#a855f7',
  incomeStability: '#3b82f6',
}

function formatCategoryDetail(detail) {
  if (!detail) return ''
  return detail
}

export default function FinancialHealthPage() {
  const { t } = useTranslation()
  const { transactions, budgets, debts, goals, budgetsV2, financialScore, smartRecommendations, spendingInsights, savingsRate, emiInsightsData, debtInsightsData, recurringInsightsData, budgetHealthV2, overspentCategories } = useFinance()
  const [activeTab, setActiveTab] = useState('overview')

  const health = useMemo(
    () => calculateHealthScore(transactions, budgets, debts, goals),
    [transactions, budgets, debts, goals]
  )

  const history = useMemo(
    () => getHealthHistory(transactions, budgets, debts, goals, 6),
    [transactions, budgets, debts, goals]
  )

  const velocity = useMemo(() => getScoreVelocity(history), [history])

  const allInsights = useMemo(() => {
    return [...spendingInsights, ...emiInsightsData, ...debtInsightsData, ...recurringInsightsData]
  }, [spendingInsights, emiInsightsData, debtInsightsData, recurringInsightsData])

  const hasData = transactions.length > 0
  const hasHistory = history.some((h) => h.score !== null)

  if (!hasData) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <h1 className="text-xl font-bold mb-6">{t('health.title')}</h1>
        <GlassCard>
          <EmptyState
            icon={Heart}
            title={t('health.no_data')}
            description={t('health.no_data_desc')}
          />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Heart size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">{t('health.title')}</h1>
      </div>

      {/* Score Gauge */}
      <GlassCard brand className="mb-4 text-center">
        <div className="relative inline-flex items-center justify-center mb-2">
          <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke={health.score >= 60 ? '#39ff14' : health.score >= 40 ? '#eab308' : '#ef4444'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(health.score / 100) * 251.2} 251.2`}
              style={{
                transition: 'stroke-dasharray 1s ease-out',
                filter: `drop-shadow(0 0 6px ${health.score >= 60 ? 'rgba(57,255,20,0.3)' : health.score >= 40 ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'})`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight text-gradient-brand">{health.score}</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          health.level === 'Excellent' ? 'bg-neon/10 text-neon' :
          health.level === 'Good' ? 'bg-green-500/10 text-green-400' :
          health.level === 'Fair' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          {t(`health.${health.level.toLowerCase()}`)}
        </div>
        <p className="text-[11px] text-gray-500 mt-2">{t('health.out_of_100')}</p>

        {velocity && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {velocity.direction === 'up' ? (
              <ArrowUpRight size={14} className="text-neon" />
            ) : velocity.direction === 'down' ? (
              <ArrowDownRight size={14} className="text-red-400" />
            ) : null}
            <span className={`text-xs font-medium ${velocity.direction === 'up' ? 'text-neon' : velocity.direction === 'down' ? 'text-red-400' : 'text-gray-500'}`}>
              {t('health.vs_last_month', { sign: velocity.direction === 'up' ? '+' : '', delta: velocity.delta })}
            </span>
          </div>
        )}
      </GlassCard>

      {/* Tab Switcher */}
      <div className="flex bg-matte-100 rounded-lg p-0.5 mb-4">
        {['overview', 'details', 'recommendations'].map((v) => (
          <button
            key={v}
            onClick={() => setActiveTab(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === v ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            {v === 'overview' ? t('health.overview') : v === 'details' ? t('health.details') : t('health.tips')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Category Scores */}
          <div className="space-y-2.5 mb-4">
            {health.categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.key] || Activity
              const pct = cat.max > 0 ? (cat.score / cat.max) * 100 : 0
              return (
                <GlassCard key={cat.key}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neon/10 shrink-0">
                      <Icon size={15} className="text-neon" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{cat.label}</span>
                        <span className="text-xs font-semibold tabular-nums">{cat.score}/{cat.max}</span>
                      </div>
                      <div className="w-full h-1.5 bg-matte-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            background: pct >= 70
                              ? 'linear-gradient(90deg, #39ff14, #22c55e)'
                              : pct >= 40
                                ? 'linear-gradient(90deg, #eab308, #f97316)'
                                : 'linear-gradient(90deg, #ef4444, #dc2626)',
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{cat.detail}</p>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>

          {/* Score History */}
          {hasHistory && (
            <GlassCard brand>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-neon" />
                <h2 className="text-sm font-semibold">{t('health.score_history')}</h2>
              </div>
              <div className="h-28 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} tickCount={3} />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#39ff14" strokeWidth={2} dot={{ r: 3, fill: '#39ff14' }} connectNulls={false} name={t('health.score')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {activeTab === 'details' && (
        <div className="space-y-3">
          {health.categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key] || Activity
            const color = CATEGORY_COLORS[cat.key] || '#39ff14'
            return (
              <GlassCard key={cat.key}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={17} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{cat.label}</h3>
                      <span className="text-xs font-bold tabular-nums" style={{ color }}>{cat.score}/{cat.max}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatCategoryDetail(cat.detail)}</p>
                    <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden mt-2">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(cat.score / cat.max) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-2">
          {allInsights.length > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <BarChart3 size={12} /> Insights
              </h3>
              <div className="space-y-1.5">
                {allInsights.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-[10px] ${
                    ins.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                    ins.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                    ins.severity === 'positive' ? 'bg-neon/10 text-neon' :
                    'bg-white/[0.03] text-gray-400'
                  }`}>
                    <Lightbulb size={12} className="shrink-0 mt-0.5" />
                    <div>
                      <p>{ins.message}</p>
                      <p className="text-gray-600 mt-0.5">{ins.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {overspentCategories.length > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold text-red-400 mb-2">Overspent Budgets</h3>
              <div className="space-y-1">
                {overspentCategories.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-[10px] bg-red-500/5 rounded-lg px-2.5 py-1.5">
                    <span className="text-gray-400">{b.name}</span>
                    <span className="text-red-400 font-semibold">+{formatCurrency(b.spent - b.amount)}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {budgetHealthV2.warning > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold text-amber-400 mb-2">Budgets at Warning Level</h3>
              <p className="text-[10px] text-gray-500">{budgetHealthV2.warning} budget(s) have reached 80%+ of their limit</p>
            </GlassCard>
          )}

          {smartRecommendations.map((rec, i) => (
            <GlassCard key={i} className={rec.priority === 'high' ? 'border-red-500/20' : rec.priority === 'medium' ? 'border-amber-500/20' : ''}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  rec.type.includes('budget') ? 'bg-teal-500/10 text-teal-400' :
                  rec.type.includes('savings') ? 'bg-yellow-500/10 text-yellow-400' :
                  rec.type.includes('debt') ? 'bg-orange-500/10 text-orange-400' :
                  rec.type.includes('food') ? 'bg-green-500/10 text-green-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  <Lightbulb size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300">{rec.action}</p>
                  <span className={`text-[10px] font-medium mt-1 inline-block ${
                    rec.priority === 'high' ? 'text-red-400' :
                    rec.priority === 'medium' ? 'text-amber-400' :
                    'text-gray-500'
                  }`}>
                    {rec.priority === 'high' ? 'High Priority' : rec.priority === 'medium' ? 'Medium' : 'Suggestion'}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}

          {health.recommendations.length === 0 && smartRecommendations.length === 0 && (
            <GlassCard>
              <EmptyState
                icon={CheckCircle}
                title={t('health.doing_great')}
                description={t('health.doing_great_desc')}
              />
            </GlassCard>
          )}
        </div>
      )}
    </div>
  )
}
