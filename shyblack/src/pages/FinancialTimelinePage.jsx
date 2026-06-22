import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, BarChart3, Target,
  Activity, Heart, DollarSign, PieChart,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { getStoredNetWorthHistory } from '../utils/networth'
import { buildTimeline, getTimelineInsights, getPeriodTrend } from '../utils/financialTimeline'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const PERIODS = (t) => [
  { id: '3m', label: t('timeline.period3m') },
  { id: '6m', label: t('timeline.period6m') },
  { id: '1y', label: t('timeline.period1y') },
]

const TABS = (t) => [
  { id: 'netWorth', label: t('timeline.tabNetWorth'), icon: BarChart3, color: 'text-neon' },
  { id: 'income', label: t('timeline.tabIncomeVsExpenses'), icon: Activity, color: 'text-emerald-400' },
  { id: 'health', label: t('timeline.tabHealthScore'), icon: Heart, color: 'text-pink-400' },
  { id: 'savings', label: t('timeline.tabSavingsRate'), icon: DollarSign, color: 'text-blue-400' },
  { id: 'debt', label: t('timeline.tabDebt'), icon: TrendingDown, color: 'text-red-400' },
  { id: 'goals', label: t('timeline.tabGoals'), icon: Target, color: 'text-purple-400' },
]

export default function FinancialTimelinePage() {
  const { t } = useTranslation()
  const { transactions, debts, goals, savingsGoal, budgets } = useFinance()
  const [activeTab, setActiveTab] = useState('netWorth')
  const [period, setPeriod] = useState('1y')

  const storedNwHistory = useMemo(() => getStoredNetWorthHistory(), [])

  const timeline = useMemo(() => {
    return buildTimeline({ transactions, debts, goals, savingsGoal, budgets, storedNetWorthHistory: storedNwHistory })
  }, [transactions, debts, goals, savingsGoal, budgets, storedNwHistory])

  const insights = useMemo(() => getTimelineInsights(timeline), [timeline])

  const filteredData = useMemo(() => {
    return getPeriodTrend(timeline, activeTab, period)
  }, [timeline, activeTab, period])

  const chartData = useMemo(() => {
    switch (activeTab) {
      case 'netWorth':
        return filteredData.map((d) => ({ label: d.label, value: d.netWorth }))
      case 'income':
        return filteredData.map((d) => ({ label: d.label, income: d.income, expenses: d.expenses }))
      case 'health':
        return filteredData.map((d) => ({ label: d.label, value: d.score }))
      case 'savings':
        return filteredData.map((d) => ({ label: d.label, value: d.savingsRate, raw: d.savings }))
      case 'debt':
        return filteredData.map((d) => ({ label: d.label, value: d.totalDebt }))
      case 'goals':
        return filteredData.map((d) => ({ label: d.label, value: d.progress }))
      default:
        return []
    }
  }, [filteredData, activeTab])

  const maxVal = useMemo(() => {
    if (chartData.length === 0) return 1
    if (activeTab === 'income') {
      return Math.max(1, ...chartData.flatMap((d) => [d.income || 0, d.expenses || 0]))
    }
    return Math.max(1, ...chartData.map((d) => Math.abs(d.value || 0)))
  }, [chartData, activeTab])

  const tabs = useMemo(() => TABS(t), [t])
  const periods = useMemo(() => PERIODS(t), [t])
  const colors = tabs.find((tab) => tab.id === activeTab)?.color || 'text-neon'

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon/20 to-purple-500/20 flex items-center justify-center">
          <PieChart size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">{t('timeline.title')}</h1>
      </div>

      {/* Insights Cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {insights.slice(0, 4).map((ins, i) => (
            <GlassCard key={i}>
              <p className={`text-[10px] font-medium ${
                ins.direction === 'up' ? 'text-emerald-400' : ins.direction === 'down' ? 'text-red-400' : 'text-gray-500'
              }`}>{ins.summary}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">{ins.label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Period Selector */}
      <div className="flex bg-matte-100 rounded-lg p-0.5 mb-4">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              period === p.id ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white/[0.08] border border-white/[0.12] text-white'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <tab.icon size={12} className={tab.color} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bar Chart */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold">{tabs.find((tab) => tab.id === activeTab)?.label || activeTab}</h2>
        </div>

        {chartData.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title={t('timeline.noDataYet')}
            description={t('timeline.noDataDescription')}
          />
        ) : (
          <>
            <div className="flex items-end justify-between gap-1 h-40">
              {chartData.map((d, i) => {
                let height = 0
                if (activeTab === 'income') {
                  const incomeH = ((d.income || 0) / maxVal) * 100
                  const expenseH = ((d.expenses || 0) / maxVal) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                      <div className="w-full flex justify-center gap-0.5">
                        <div
                          className="w-1.5 bg-emerald-400/70 rounded-t-sm transition-all"
                          style={{ height: `${Math.max(incomeH, 2)}%` }}
                        />
                        <div
                          className="w-1.5 bg-red-400/70 rounded-t-sm transition-all"
                          style={{ height: `${Math.max(expenseH, 2)}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-gray-600 mt-1 truncate w-full text-center">{d.label}</span>
                    </div>
                  )
                }
                height = ((Math.abs(d.value || 0) / maxVal) * 100)
                const isPositive = d.value >= 0
                const barColor = activeTab === 'netWorth' || activeTab === 'savings'
                  ? (isPositive ? 'bg-emerald-400/70' : 'bg-red-400/70')
                  : activeTab === 'health'
                    ? 'bg-gradient-to-t from-pink-400/70 to-neon/70'
                    : activeTab === 'debt'
                      ? 'bg-red-400/70'
                      : 'bg-purple-400/70'
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                    <div className="w-full flex justify-center">
                      <div
                        className={`w-3 rounded-t-sm transition-all ${barColor}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-[7px] text-gray-600 mt-1 truncate w-full text-center">{d.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Legend for income tab */}
            {activeTab === 'income' && (
              <div className="flex justify-center gap-3 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400/70" /> {t('timeline.income')}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400/70" /> {t('timeline.expenses')}</span>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Data Table */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">{t('timeline.monthlyBreakdown')}</h2>
        {chartData.length === 0 ? (
          <GlassCard>
            <EmptyState icon={BarChart3} title={t('timeline.noData')} description={t('timeline.addTransactionsToPopulate')} />
          </GlassCard>
        ) : (
          chartData.map((d, i) => (
            <GlassCard key={i}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{d.label}</span>
                <span className={`text-xs font-semibold tabular-nums ${
                  activeTab === 'income'
                    ? 'text-emerald-400'
                    : d.value >= 0 || activeTab === 'health'
                      ? 'text-white'
                      : 'text-red-400'
                }`}>
                  {activeTab === 'income'
                    ? `${formatCurrency(d.income || 0)} / ${formatCurrency(d.expenses || 0)}`
                    : activeTab === 'health'
                      ? d.value !== null && d.value !== undefined ? `${d.value}/100` : '—'
                      : activeTab === 'savings'
                        ? `${d.value || 0}%`
                        : activeTab === 'goals'
                          ? `${d.value || 0}%`
                          : formatCurrency(d.value || 0)
                  }
                </span>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  )
}
