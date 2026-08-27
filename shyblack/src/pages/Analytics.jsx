import { useMemo, useState } from 'react'
import { useTranslation } from '../i18n'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart3, Calendar, Activity, Zap, AlertTriangle } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { EXPENSE_CATEGORIES } from '../utils/constants'
import { getMonthlyData, getCategoryTrends, getDailyExpenseHeatmap, getIncomeForecast, compareSpending, getMonthlyGrowth } from '../utils/analytics'
import { getPulseStats, detectSpendingAnomalies } from '../utils/spendingPulse'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import AnimatedNumber from '../components/AnimatedNumber'

const PULSE_COLORS = {
  calm: { label: 'text-neon', bg: 'bg-neon/10', bar: 'bg-neon' },
  moderate: { label: 'text-blue-400', bg: 'bg-blue-500/10', bar: 'bg-blue-400' },
  elevated: { label: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-400' },
  hot: { label: 'text-red-400', bg: 'bg-red-500/10', bar: 'bg-red-400' },
}

function PulseView({ transactions, t }) {
  const pulse = useMemo(() => getPulseStats(transactions), [transactions])
  const anomalies = useMemo(() => detectSpendingAnomalies(transactions, 30), [transactions])
  const colors = PULSE_COLORS[pulse.pulseLevel] || PULSE_COLORS.calm
  const maxDay = Math.max(...pulse.series.map((d) => d.amount), 1)

  return (
    <div className="space-y-4">
      <GlassCard brand className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold">{t('analytics.spending_pulse')}</h2>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${colors.bg} ${colors.label}`}>
            {pulse.pulseLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-gray-500 mb-0.5">{t('analytics.today')}</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{formatCurrency(pulse.today)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-gray-500 mb-0.5">{t('analytics.last_7d')}</p>
            <p className="text-sm font-extrabold tabular-nums">{formatCurrency(pulse.weekTotal)}</p>
            <p className={`text-[9px] mt-0.5 tabular-nums ${pulse.weekOverWeekDelta > 0 ? 'text-red-400' : pulse.weekOverWeekDelta < 0 ? 'text-neon' : 'text-gray-600'}`}>
              {pulse.weekOverWeekDelta > 0 ? '+' : ''}{pulse.weekOverWeekDelta}% {t('analytics.week_vs_prev')}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-gray-500 mb-0.5">{t('analytics.last_30d')}</p>
            <p className="text-sm font-extrabold tabular-nums">{formatCurrency(pulse.monthTotal)}</p>
          </div>
        </div>

        <div className="h-32 -mx-1 mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pulse.series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 9 }} interval={4} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} fill="url(#pulseGrad)" name={t('common.expense')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-end gap-[3px] h-10 mt-1">
          {pulse.series.slice(-14).map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.day}: ${formatCurrency(d.amount)}`}>
              <div className={`w-full rounded-t ${d.amount > 0 ? colors.bar : 'bg-matte-200'}`} style={{ height: `${Math.max(d.amount > 0 ? 10 : 2, (d.amount / maxDay) * 30)}px` }} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard brand>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-amber-400" />
          <h2 className="text-sm font-semibold">{t('analytics.anomalies')}</h2>
        </div>
        {anomalies.length === 0 ? (
          <p className="text-xs text-gray-500">{t('analytics.no_anomalies')}</p>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div key={a.date} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{a.label} · {formatCurrency(a.amount)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {a.ratio}× {t('analytics.daily_avg', { value: formatCurrency(a.avg) })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

const NEON = '#39ff14'
const RED = '#ef4444'
const COLORS = ['#39ff14', '#22c55e', '#16a34a', '#15803d', '#ef4444', '#f97316', '#eab308', '#a855f7', '#3b82f6', '#ec4899']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 text-xs shadow-lg">
        <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold tabular-nums" style={{ color: p.fill || p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Analytics() {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const [viewMode, setViewMode] = useState('overview')

  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()

  const normalTx = transactions

  const monthlyData = useMemo(() => getMonthlyData(normalTx, 6), [normalTx])
  const growthData = useMemo(() => getMonthlyGrowth(normalTx), [normalTx])
  const forecast = useMemo(() => getIncomeForecast(normalTx), [normalTx])
  const comparison = useMemo(() => compareSpending(normalTx), [normalTx])
  const heatmap = useMemo(() => getDailyExpenseHeatmap(normalTx, year, month), [normalTx, year, month])
  const trends = useMemo(() => getCategoryTrends(normalTx, 3), [normalTx])

  const currentMonth = useMemo(() => {
    const monthTxs = normalTx.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, count: monthTxs.length }
  }, [normalTx, year, month])

  const categoryData = useMemo(() => {
    const monthTxs = normalTx.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const expenseByCat = {}
    monthTxs.filter((t) => t.type === 'expense').forEach((t) => {
      if (!expenseByCat[t.category]) expenseByCat[t.category] = 0
      expenseByCat[t.category] += t.amount
    })
    return Object.entries(expenseByCat).map(([cat, amount]) => {
      const catInfo = EXPENSE_CATEGORIES.find((c) => c.id === cat)
      return { name: catInfo?.label || cat, value: amount }
    }).sort((a, b) => b.value - a.value)
  }, [normalTx, year, month])

  const hasData = transactions.length > 0
  const firstDay = new Date(year, month, 1).getDay()
  const maxHeat = hasData ? Math.max(...heatmap.map((d) => d.amount), 1) : 1

  const dayAbbr = [t('time.sun'), t('time.mon'), t('time.tue'), t('time.wed'), t('time.thu'), t('time.fri'), t('time.sat')]

  if (!hasData) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <h1 className="text-xl font-bold mb-6">{t('analytics.title')}</h1>
        <GlassCard>
          <EmptyState icon={BarChart3} title={t('analytics.no_data')} description={t('analytics.no_data_desc')} />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t('analytics.title')}</h1>
        <div className="flex bg-matte-100 rounded-lg p-0.5">
          {['overview', 'trends', 'heatmap', 'pulse'].map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-h-[32px] ${
                viewMode === v ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              {v === 'overview' ? t('analytics.overview') : v === 'trends' ? t('analytics.trends') : v === 'heatmap' ? t('analytics.heatmap') : t('analytics.pulse')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <GlassCard brand className="flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 font-medium">
            <TrendingUp size={12} className="text-neon" />
            <span>{t('common.income')}</span>
          </div>
          <p className="text-lg font-extrabold text-neon tabular-nums tracking-tight glow-neon-sm">
            <AnimatedNumber value={currentMonth.income} format={formatCurrency} />
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">{t('analytics.transactions_count', { count: currentMonth.count })}</p>
        </GlassCard>
        <GlassCard brand className="flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 font-medium">
            <TrendingDown size={12} className="text-red-400" />
            <span>{t('common.expense')}</span>
          </div>
          <p className="text-lg font-extrabold text-red-400 tabular-nums tracking-tight">
            <AnimatedNumber value={currentMonth.expense} format={formatCurrency} />
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {currentMonth.income > 0 ? t('analytics.percent_of_income', { percent: ((currentMonth.expense / currentMonth.income) * 100).toFixed(0) }) : ''}
          </p>
        </GlassCard>
      </div>

      {comparison && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">{t('analytics.spending_comparison')}</h2>
            <span className={`text-xs font-semibold flex items-center gap-1 ${
              comparison.direction === 'down' ? 'text-neon' : comparison.direction === 'up' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {comparison.direction === 'up' ? '+' : ''}{comparison.change}%
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 mb-0.5">{t('dashboard.last_month')}</p>
              <p className="text-sm font-bold tabular-nums text-gray-400">{formatCurrency(comparison.previous)}</p>
            </div>
            <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 mb-0.5">{t('dashboard.this_month')}</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(comparison.current)}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {viewMode === 'overview' && (
        <>
          <GlassCard brand className="mb-4">
            <h2 className="text-sm font-semibold mb-4">{t('analytics.monthly_overview')}</h2>
            <div className="h-56 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="income" fill={NEON} radius={[4, 4, 0, 0]} maxBarSize={20} name={t('common.income')} />
                  <Bar dataKey="expense" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={20} name={t('common.expense')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {growthData.length > 0 && (
            <GlassCard brand className="mb-4">
              <h2 className="text-sm font-semibold mb-4">{t('analytics.net_worth_trend')}</h2>
              <div className="h-48 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#39ff14" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#39ff14" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="balance" stroke="#39ff14" strokeWidth={2} fill="url(#balanceGrad)" name={t('common.net_worth')} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {forecast && (
            <GlassCard brand className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-neon" />
                <h2 className="text-sm font-semibold">{t('analytics.income_forecast')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[10px] text-gray-500 mb-1">{t('analytics.monthly_average')}</p>
                  <p className="text-base font-extrabold text-neon tabular-nums">{formatCurrency(forecast.average)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[10px] text-gray-500 mb-1">{t('analytics.next_month')}</p>
                  <p className="text-base font-extrabold tabular-nums">{formatCurrency(forecast.nextMonth)}</p>
                </div>
              </div>
              {forecast.trend !== 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <TrendingUp size={12} className={forecast.trend > 0 ? 'text-neon' : 'text-red-400'} />
                  <span>{t('analytics.trend_value', { value: `${forecast.trend > 0 ? '+' : ''}${formatCurrency(forecast.trend)}` })}</span>
                </div>
              )}
            </GlassCard>
          )}

          {categoryData.length > 0 && (
            <GlassCard brand>
              <h2 className="text-sm font-semibold mb-4">{t('analytics.expense_breakdown')}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {categoryData.slice(0, 6).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs text-gray-400 truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-white tabular-nums ml-2 shrink-0">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {viewMode === 'trends' && (
        <div className="space-y-4">
          {trends.slice(0, 5).map((trend) => (
            <GlassCard brand key={trend.category}>
              <h3 className="text-sm font-semibold mb-3">{EXPENSE_CATEGORIES.find((c) => c.id === trend.category)?.label || trend.category}</h3>
              <div className="h-32 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="amount" stroke="#39ff14" strokeWidth={2} dot={false} name={t('analytics.spent')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>{t('analytics.avg', { value: formatCurrency(trend.avg) })}</span>
                <span>{t('analytics.total', { value: formatCurrency(trend.total) })}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {viewMode === 'heatmap' && (
        <GlassCard brand>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">{t('analytics.daily_spending')}</h2>
            <Calendar size={14} className="text-gray-500" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={d} className={`text-[10px] text-center font-medium py-1 ${i === 0 || i === 6 ? 'text-gray-600' : 'text-gray-700'}`}>{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {heatmap.map((d, i) => {
              const intensity = d.amount > 0 ? Math.min(d.amount / maxHeat, 1) : 0
              const dayOfWeek = (firstDay + i) % 7
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              return (
                <div
                  key={d.day}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all duration-200 ${isWeekend && d.amount > 0 ? 'ring-1 ring-white/5' : ''}`}
                  style={{
                    backgroundColor: intensity > 0 ? `rgba(57, 255, 20, ${intensity * 0.6 + 0.1})` : 'rgba(255,255,255,0.03)',
                    color: intensity > 0.3 ? '#000' : isWeekend ? '#555' : '#444',
                    boxShadow: intensity > 0.5 ? '0 0 8px rgba(57,255,20,0.25)' : 'none',
                  }}
                  title={`${dayAbbr[dayOfWeek]} ${d.day}: ${formatCurrency(d.amount)}`}
                >
                  {d.day}
                </div>
              )
            })}
          </div>
          {heatmap.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-glass-border text-[10px] text-gray-500">
              <span>{t('analytics.total', { value: formatCurrency(heatmap.reduce((s, d) => s + d.amount, 0)) })}</span>
              <span>{t('analytics.avg_day', { value: formatCurrency(Math.round(heatmap.reduce((s, d) => s + d.amount, 0) / heatmap.filter((d) => d.amount > 0).length || 1)) })}</span>
              <span>{t('analytics.peak', { value: formatCurrency(Math.max(...heatmap.map((d) => d.amount))) })}</span>
            </div>
          )}
        </GlassCard>
      )}

      {viewMode === 'pulse' && <PulseView transactions={normalTx} t={t} />}
    </div>
  )
}
