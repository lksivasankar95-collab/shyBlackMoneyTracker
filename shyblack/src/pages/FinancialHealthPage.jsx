import { useMemo, useState, useEffect} from 'react'
import {
  Heart, TrendingDown, Target, CheckCircle, Lightbulb, Activity,
  ArrowUpRight, ArrowDownRight, Shield, BarChart3, PiggyBank,
  Umbrella, TrendingUp as ChartUp, ArrowLeft, AlertTriangle,
  DollarSign, Clock, RefreshCw, Award, TrendingUp,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import {
  getHealthHistory, getScoreVelocity,
} from '../utils/financialHealth'
import {
  calculateScore2, detectRisks, generateRecommendations2,
  loadScoreHistory, saveScoreSnapshot, getHistoryView,
  getScoreTrend,
} from '../utils/healthScore2'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const CATEGORY_COLORS = {
  incomeStability: '#3b82f6',
  savingsScore: '#39ff14',
  expenseControl: '#f97316',
  budgetDiscipline: '#a855f7',
  cashFlowHealth: '#06b6d4',
  debtHealth: '#ef4444',
  goalProgress: '#22c55e',
  netWorthGrowth: '#f59e0b',
  tradingCashMgmt: '#ec4899',
  emergencyFundHealth: '#14b8a6',
  recurringPaymentStability: '#8b5cf6',
  financialConsistency: '#6366f1',
}

const CATEGORY_ICONS = {
  incomeStability: TrendingUp,
  savingsScore: PiggyBank,
  expenseControl: TrendingDown,
  budgetDiscipline: Target,
  cashFlowHealth: DollarSign,
  debtHealth: Shield,
  goalProgress: Award,
  netWorthGrowth: ChartUp,
  tradingCashMgmt: Activity,
  emergencyFundHealth: Umbrella,
  recurringPaymentStability: Clock,
  financialConsistency: RefreshCw,
}

const RISK_ICONS = {
  overspending: TrendingDown,
  negative_cashflow: DollarSign,
  high_debt: Shield,
  low_savings: PiggyBank,
  budget_violations: Target,
  recurring_payment_risk: Clock,
  goal_delay: Award,
  trading_risk: Activity,
  emergency_fund_risk: Umbrella,
  income_instability: TrendingUp,
}


function ScoreGauge({ score }) {
  const color = score >= 80 ? '#39ff14' : score >= 70 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'
  const circumference = 251.2
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative inline-flex items-center justify-center mb-2">
      <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r="40"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tight text-gradient-brand">{score}</span>
      </div>
    </div>
  )
}

function LevelBadge({ level }) {
  const colors = {
    Excellent: 'bg-neon/10 text-neon',
    'Very Good': 'bg-emerald-500/10 text-emerald-400',
    Good: 'bg-green-500/10 text-green-400',
    Average: 'bg-yellow-500/10 text-yellow-400',
    'Needs Improvement': 'bg-orange-500/10 text-orange-400',
    Critical: 'bg-red-500/10 text-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[level] || 'bg-gray-500/10 text-gray-400'}`}>
      {level}
    </span>
  )
}

export default function FinancialHealthPage({ onNavigate }) {
  const { t } = useTranslation()
  const {
    transactions, budgets, debts, goals, budgetsV2, savingsGoal,
    smartRecommendations, spendingInsights, emiInsightsData,
    debtInsightsData, recurringInsightsData, budgetHealthV2,
    overspentCategories, recurring, netWorthHistory,
  } = useFinance()
  const [activeTab, setActiveTab] = useState('overview')
  const [historyRange, setHistoryRange] = useState(6)


  const scoreResults = useMemo(
    () => calculateScore2(transactions, budgetsV2, debts, goals, recurring, netWorthHistory),
    [transactions, budgetsV2, debts, goals, recurring, netWorthHistory]
  )

  const risks = useMemo(
    () => detectRisks(transactions, budgetsV2, debts, goals, recurring),
    [transactions, budgetsV2, debts, goals, recurring]
  )

  const recommendations2 = useMemo(
    () => generateRecommendations2(scoreResults.results || {}, risks),
    [scoreResults.results, risks]
  )

  const oldHistory = useMemo(
    () => getHealthHistory(transactions, budgets, debts, goals, 6, budgetsV2, savingsGoal),
    [transactions, budgets, debts, goals, budgetsV2, savingsGoal]
  )

  const velocity = useMemo(() => getScoreVelocity(oldHistory), [oldHistory])

  const savedHistory = useMemo(() => loadScoreHistory(), [])
  const historyView = useMemo(() => getHistoryView(savedHistory, historyRange), [savedHistory, historyRange])

  const trend = useMemo(() => getScoreTrend(historyView), [historyView])

  useEffect(() => {
    if (scoreResults.overall > 0) {
      saveScoreSnapshot(scoreResults.overall, scoreResults.categories.map((c) => ({ key: c.key, score: c.score })))
    }
  }, [scoreResults.overall, scoreResults.categories])

  const allInsights = useMemo(() => {
    return [...spendingInsights, ...emiInsightsData, ...debtInsightsData, ...recurringInsightsData]
  }, [spendingInsights, emiInsightsData, debtInsightsData, recurringInsightsData])

  const hasData = transactions.length > 0
  const hasHistory = savedHistory.length > 0 || oldHistory.some((h) => h.score !== null)

  if (!hasData) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
        <div className="flex items-center gap-2.5 mb-5">
          {onNavigate && (
            <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
              <ArrowLeft size={18} className="text-gray-400" />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Heart size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('health.title')}</h1>
        </div>
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
        {onNavigate && (
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
        )}
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Heart size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">{t('health.title')} 2.0</h1>
      </div>

      <GlassCard brand className="mb-4 text-center">
        <ScoreGauge score={scoreResults.overall} />
        <LevelBadge level={scoreResults.level} />
        <p className="text-[11px] text-gray-500 mt-2">out of 100</p>

        {historyView.length >= 2 && (
          <div className="flex items-center justify-center gap-3 mt-2">
            {trend.direction !== 'stable' && (
              <>
                {trend.direction === 'up' ? (
                  <ArrowUpRight size={14} className="text-neon" />
                ) : (
                  <ArrowDownRight size={14} className="text-red-400" />
                )}
                <span className={`text-xs font-medium ${trend.direction === 'up' ? 'text-neon' : 'text-red-400'}`}>
                  {trend.change > 0 ? '+' : ''}{trend.change} vs last month
                </span>
              </>
            )}
            {velocity && (
              <span className={`text-[10px] ${velocity.direction === 'up' ? 'text-neon' : velocity.direction === 'down' ? 'text-red-400' : 'text-gray-500'}`}>
                (legacy: {velocity.delta > 0 ? '+' : ''}{velocity.delta})
              </span>
            )}
          </div>
        )}
      </GlassCard>

      <div className="flex bg-matte-100 rounded-lg p-0.5 mb-4">
        {['overview', 'details', 'recommendations'].map((v) => (
          <button
            key={v}
            onClick={() => setActiveTab(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === v ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            {v === 'overview' ? t('health.overview') : v === 'details' ? t('health.details') : t('health.recommendations')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {scoreResults.categories.length > 0 && (
            <GlassCard className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-gray-300">All Categories</h2>
              </div>
              <div className="space-y-2">
                {scoreResults.categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.key] || Activity
                  const color = CATEGORY_COLORS[cat.key] || '#6366f1'
                  return (
                    <div key={cat.key} className="flex items-center gap-2.5">
                      <Icon size={12} className="shrink-0" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-400 font-medium">{cat.label}</span>
                          <span className="text-[10px] font-semibold tabular-nums">{cat.score}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${cat.score}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {risks.length > 0 && (
            <GlassCard className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-300">Risk Indicators ({risks.length})</h2>
              </div>
              <div className="space-y-1.5">
                {risks.map((risk, i) => {
                  const Icon = RISK_ICONS[risk.type] || AlertTriangle
                  const borderColor = risk.severity === 'high' ? 'border-red-500/20' : risk.severity === 'warning' ? 'border-amber-500/20' : 'border-blue-500/20'
                  return (
                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border ${borderColor}`}>
                      <Icon size={14} className={`shrink-0 mt-0.5 ${risk.severity === 'high' ? 'text-red-400' : risk.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-300">{risk.message}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">{risk.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {hasHistory && (
            <>
              <div className="flex gap-1.5 mb-3">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setHistoryRange(m)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      historyRange === m
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              {historyView.length >= 2 && (
                <GlassCard className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ChartUp size={14} className="text-emerald-400" />
                    <h2 className="text-sm font-semibold text-gray-300">Score Trend ({historyRange}m)</h2>
                    {trend.direction !== 'stable' && (
                      <span className={`text-[10px] font-medium ml-auto ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trend.direction === 'up' ? '+' : ''}{Math.round(trend.change)}
                      </span>
                    )}
                  </div>
                  <div className="h-24 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyView} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} tickCount={3} />
                        <Tooltip
                          contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }}
                          labelStyle={{ color: '#9ca3af' }}
                        />
                        <Line type="monotone" dataKey="score" stroke="#39ff14" strokeWidth={2} dot={{ r: 2, fill: '#39ff14' }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              {historyView.length >= 2 && (
                <GlassCard className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={14} className="text-blue-400" />
                    <h2 className="text-sm font-semibold text-gray-300">Month Comparison</h2>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {historyView.slice(-4).map((h, i, arr) => {
                      const prev = arr[i - 1]
                      const change = prev ? h.score - prev.score : 0
                      return (
                        <div key={h.month} className="text-center p-2 rounded-lg bg-white/[0.03]">
                          <p className="text-[9px] text-gray-500">{h.month.slice(5)}</p>
                          <p className="text-sm font-bold text-white">{h.score}</p>
                          {prev && (
                            <span className={`text-[8px] font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {change >= 0 ? '+' : ''}{change}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>
              )}
            </>
          )}

          {!hasHistory && oldHistory.filter((h) => h.score !== null).length >= 2 && (
            <GlassCard className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <ChartUp size={14} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-gray-300">Score History</h2>
              </div>
              <div className="h-24 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oldHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} tickCount={3} />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#39ff14" strokeWidth={2} dot={{ r: 2, fill: '#39ff14' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {activeTab === 'details' && (
        <div className="space-y-3">
          {scoreResults.categories.map((cat) => {
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
                      <h3 className="text-sm font-semibold text-gray-300">{cat.label}</h3>
                      <span className="text-xs font-bold tabular-nums" style={{ color }}>{cat.score}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{cat.detail}</p>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.score}%`, backgroundColor: color }}
                      />
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
          {recommendations2.map((rec, i) => (
            <GlassCard
              key={i}
              className={`${
                rec.priority === 'high' ? 'border-red-500/20' :
                rec.priority === 'medium' ? 'border-amber-500/20' :
                'border-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  rec.category.includes('savings') || rec.category.includes('emergency') ? 'bg-emerald-500/10 text-emerald-400' :
                  rec.category.includes('debt') ? 'bg-red-500/10 text-red-400' :
                  rec.category.includes('budget') || rec.category.includes('expense') ? 'bg-amber-500/10 text-amber-400' :
                  rec.category.includes('income') ? 'bg-blue-500/10 text-blue-400' :
                  rec.category.includes('goal') ? 'bg-purple-500/10 text-purple-400' :
                  rec.category.includes('trading') ? 'bg-pink-500/10 text-pink-400' :
                  rec.category.includes('recurring') ? 'bg-indigo-500/10 text-indigo-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  <Lightbulb size={15} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-gray-300 font-medium">{rec.action}</p>
                  <p className="text-[10px] text-gray-500">{rec.reason}</p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      rec.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                      rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {rec.priority}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-gray-500">
                      {rec.difficulty}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-gray-400">
                      {rec.estimatedImpact}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}

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
              <h3 className="text-xs font-semibold text-red-400 mb-2">{t('health.overspent_budgets')}</h3>
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
              <h3 className="text-xs font-semibold text-amber-400 mb-2">{t('health.budgets_warning')}</h3>
              <p className="text-[10px] text-gray-500">{t('health.budgets_warning_desc', { count: budgetHealthV2.warning })}</p>
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
                    {rec.priority === 'high' ? t('health.priority_high') : rec.priority === 'medium' ? t('health.priority_medium') : t('health.priority_suggestion')}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}

          {recommendations2.length === 0 && smartRecommendations.length === 0 && allInsights.length === 0 && (
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
