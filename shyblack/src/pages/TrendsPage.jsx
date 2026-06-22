import { useMemo, useState } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Target, CreditCard, Users } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import { getMonthlyTrends, getSavingsTrend, getDebtReductionTrend, getEmiProgressTrend, getGoalAchievementTrend } from '../utils/trends'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

function MiniBar({ value, max, color = 'bg-blue-400' }) {
  const pct = max > 0 ? (value / max * 100) : 0
  return (
    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export default function TrendsPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions, debts, emis, goals } = useFinance()
  const [activeTab, setActiveTab] = useState('monthly')

  const TREND_TABS = [
    { id: 'monthly', label: t('trends_page.tab_monthly'), icon: BarChart3 },
    { id: 'savings', label: t('trends_page.tab_savings'), icon: TrendingUp },
    { id: 'category', label: t('trends_page.tab_category'), icon: TrendingDown },
    { id: 'debts', label: t('trends_page.tab_debts'), icon: Users },
    { id: 'emis', label: t('trends_page.tab_emis'), icon: CreditCard },
    { id: 'goals', label: t('trends_page.tab_goals'), icon: Target },
  ]

  const monthlyTrends = useMemo(() => getMonthlyTrends(transactions, 12), [transactions])
  const savingsTrend = useMemo(() => getSavingsTrend(transactions, 12), [transactions])
  const debtTrend = useMemo(() => getDebtReductionTrend(debts), [debts])
  const emiTrend = useMemo(() => getEmiProgressTrend(emis), [emis])
  const goalTrend = useMemo(() => getGoalAchievementTrend(goals), [goals])

  const categoryTrends = useMemo(() => {
    const cats = {}
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      if (!cats[t.category]) cats[t.category] = { total: 0, count: 0, months: {} }
      cats[t.category].total += Math.abs(t.amount)
      cats[t.category].count += 1
      const m = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      cats[t.category].months[m] = (cats[t.category].months[m] || 0) + Math.abs(t.amount)
    })
    return Object.entries(cats)
      .map(([cat, data]) => ({ category: cat, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [transactions])

  const maxMonthlyIncome = useMemo(() => Math.max(...monthlyTrends.map((m) => m.income), 1), [monthlyTrends])
  const maxMonthlyExpense = useMemo(() => Math.max(...monthlyTrends.map((m) => m.expense), 1), [monthlyTrends])
  const maxSavings = useMemo(() => Math.max(...savingsTrend.map((m) => Math.abs(m.savings)), 1), [savingsTrend])
  const maxCategoryTotal = useMemo(() => Math.max(...categoryTrends.map((c) => c.total), 1), [categoryTrends])

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <BarChart3 size={18} className="text-blue-400" />
          <h1 className="text-xl font-bold">{t('trends_page.title')}</h1>
        </div>
        <GlassCard>
          <EmptyState icon={BarChart3} title={t('trends_page.no_data_title')} description={t('trends_page.no_data_desc')} />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <BarChart3 size={18} className="text-blue-400" />
        <h1 className="text-xl font-bold">{t('trends_page.title')}</h1>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
        {TREND_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {activeTab === 'monthly' && monthlyTrends.length > 0 && (
          <GlassCard>
            <h2 className="text-xs font-semibold text-gray-300 mb-3">{t('trends_page.monthly_income_expense')}</h2>
            <div className="space-y-2">
              {monthlyTrends.map((m) => (
                <div key={m.month}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-gray-500">{m.month}</span>
                    <span className="text-[10px] text-gray-500 tabular-nums">{t('trends_page.txns_count', { count: m.count })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={8} className="text-emerald-400 shrink-0" />
                        <MiniBar value={m.income} max={maxMonthlyIncome} color="bg-emerald-400" />
                        <span className="text-[9px] text-emerald-400 tabular-nums w-12 text-right">{formatCurrency(m.income)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingDown size={8} className="text-red-400 shrink-0" />
                        <MiniBar value={m.expense} max={maxMonthlyExpense} color="bg-red-400" />
                        <span className="text-[9px] text-red-400 tabular-nums w-12 text-right">{formatCurrency(m.expense)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === 'savings' && savingsTrend.length > 0 && (
          <GlassCard>
            <h2 className="text-xs font-semibold text-gray-300 mb-3">{t('trends_page.savings_trend')}</h2>
            <div className="space-y-2">
              {savingsTrend.map((s) => (
                <div key={s.month} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14 shrink-0">{s.month}</span>
                  <div className="flex-1">
                    <MiniBar value={Math.abs(s.savings)} max={maxSavings} color={s.savings >= 0 ? 'bg-emerald-400' : 'bg-red-400'} />
                  </div>
                  <span className={`text-[10px] font-semibold tabular-nums w-16 text-right ${s.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(s.savings)}
                  </span>
                  <span className="text-[9px] text-gray-600 w-8 text-right">{s.savingsRate.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === 'category' && categoryTrends.length > 0 && (
          <GlassCard>
            <h2 className="text-xs font-semibold text-gray-300 mb-3">{t('trends_page.category_spending')}</h2>
            <div className="space-y-2">
              {categoryTrends.map((c) => (
                <div key={c.category}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-400">{c.category}</span>
                    <span className="text-[10px] text-gray-500 tabular-nums">{formatCurrency(c.total)}</span>
                  </div>
                  <MiniBar value={c.total} max={maxCategoryTotal} color="bg-blue-400" />
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === 'debts' && debtTrend.length > 0 && (
          <GlassCard>
            <h2 className="text-xs font-semibold text-gray-300 mb-3">{t('trends_page.debt_reduction')}</h2>
            <div className="space-y-2">
              {debtTrend.map((d) => (
                <div key={d.personName} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400">{d.personName}</span>
                      <span className="text-[10px] text-gray-500 tabular-nums">{d.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${d.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-gray-600">{d.type === 'lend' ? t('trends_page.they_owe') : t('trends_page.you_owe')}</span>
                      <span className="text-[9px] text-gray-600 tabular-nums">{formatCurrency(d.paidAmount)} of {formatCurrency(d.originalAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === 'emis' && emiTrend.length > 0 && (
          <GlassCard>
            <h2 className="text-xs font-semibold text-gray-300 mb-3">{t('trends_page.emi_progress')}</h2>
            <div className="space-y-2">
              {emiTrend.map((e) => (
                <div key={e.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400">{e.name}</span>
                      <span className="text-[10px] text-gray-500 tabular-nums">{e.paidMonths}/{e.totalMonths}mo</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${e.progress}%` }} />
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5">{formatCurrency(e.amount)}/mo · {t('trends_page.months_remaining', { count: e.remainingMonths })}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === 'goals' && goalTrend.length > 0 && (
          <GlassCard>
            <h2 className="text-xs font-semibold text-gray-300 mb-3">{t('trends_page.goal_achievement')}</h2>
            <div className="space-y-2">
              {goalTrend.map((g) => (
                <div key={g.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400">{g.name}</span>
                      <span className="text-[10px] text-gray-500 tabular-nums">{g.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-400 transition-all duration-500" style={{ width: `${Math.min(g.progress, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-gray-600">{g.category || 'Goal'}</span>
                      <span className="text-[9px] text-gray-600 tabular-nums">{formatCurrency(g.saved)} of {formatCurrency(g.target)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {(activeTab === 'monthly' && monthlyTrends.length === 0) ||
         (activeTab === 'savings' && savingsTrend.length === 0) ||
         (activeTab === 'category' && categoryTrends.length === 0) ||
         (activeTab === 'debts' && debtTrend.length === 0) ||
         (activeTab === 'emis' && emiTrend.length === 0) ||
         (activeTab === 'goals' && goalTrend.length === 0) ? (
          <GlassCard>
            <EmptyState icon={BarChart3} title={t('trends_page.no_data_title')} description={t('trends_page.no_data_for_tab', { tab: activeTab })} />
          </GlassCard>
        ) : null}
      </div>
    </div>
  )
}
