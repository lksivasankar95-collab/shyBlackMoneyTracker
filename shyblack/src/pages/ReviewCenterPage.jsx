import { useMemo, useState } from 'react'
import {
  ArrowLeft, BarChart3, Target, CreditCard,
  ChevronDown, ChevronUp, AlertTriangle, Lightbulb,
  PieChart, ShoppingBag, Briefcase, Activity, Calendar, DollarSign,
  Clock, FileText,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import {
  getTodayReview, getWeekReview, getBudgetReview,
  getSpendingReview, getIncomeReview, getTradingReview,
  getGoalReview, getSmartAlerts, getChartsData,
} from '../utils/reviewEngine'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const severityColors = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  alert: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const sectionIcons = {
  budget: PieChart,
  spending: ShoppingBag,
  income: Briefcase,
  debt: CreditCard,
  trading: Activity,
  goals: Target,
  insights: Lightbulb,
  alerts: AlertTriangle,
  charts: BarChart3,
}

function StatCard({ label, value, color = 'text-gray-300', sub }) {
  return (
    <div className="glass p-3 rounded-xl text-center min-w-0">
      <p className="text-[18px] font-bold tabular-nums leading-tight mb-0.5">{value}</p>
      <p className={`text-[10px] ${color.includes('text-') ? color : 'text-gray-500'}`}>{label}</p>
      {sub && <p className="text-[9px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function CategoryBar({ label, amount, percentage, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? (amount / max) * 100 : 0
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400 truncate mr-2">{label}</span>
        <span className="text-gray-300 tabular-nums font-medium whitespace-nowrap">{formatCurrency(amount)}</span>
      </div>
      {percentage !== undefined ? (
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
      ) : (
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight }) {
  return (
    <div className={`p-3 rounded-xl border ${severityColors[insight.severity] || 'border-white/10'}`}>
      <p className="text-xs font-medium mb-1">{insight.message}</p>
      {insight.detail && <p className="text-[10px] text-gray-500">{insight.detail}</p>}
    </div>
  )
}

function AlertCard({ alert }) {
  const iconMap = { emi: Clock, goal: Target, savings: DollarSign, budget: PieChart }
  const Icon = iconMap[alert.type] || AlertTriangle
  const colorMap = { alert: 'text-red-400', warning: 'text-amber-400', info: 'text-blue-400' }
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <Icon size={16} className={`mt-0.5 shrink-0 ${colorMap[alert.severity] || 'text-gray-400'}`} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-300">{alert.message}</p>
        {alert.detail && <p className="text-[10px] text-gray-500 mt-0.5">{alert.detail}</p>}
      </div>
    </div>
  )
}

function ReviewCard({ review, expanded, onToggle, t }) {
  if (!review) return null
  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">{review.label}</h2>
          {expanded ? <ChevronUp size={14} className="text-gray-500 ml-auto" /> : <ChevronDown size={14} className="text-gray-500 ml-auto" />}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="text-center">
            <p className="text-xs text-emerald-400 font-semibold tabular-nums">{formatCurrency(review.income)}</p>
            <p className="text-[9px] text-gray-600">{t('common.income')}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-red-400 font-semibold tabular-nums">{formatCurrency(review.expense)}</p>
            <p className="text-[9px] text-gray-600">{t('common.expense')}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs font-semibold tabular-nums ${review.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(review.savings)}
            </p>
            <p className="text-[9px] text-gray-600">{t('review_center.savings')}</p>
          </div>
        </div>
        {review.transactionCount > 0 && (
          <p className="text-[10px] text-gray-500">
            {review.transactionCount} {t('common.transactions')} · {review.savingsRate.toFixed(1)}% {t('review_center.savings')}
          </p>
        )}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
          {review.topCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">{t('review_center.top_spending')}</p>
              <div className="space-y-1">
                {review.topCategories.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{cat}</span>
                    <span className="text-xs text-gray-300 tabular-nums">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500">{t('review_center.debts_owed')}</p>
              <p className="text-xs text-emerald-400 font-semibold tabular-nums">{formatCurrency(review.debts.owed)}</p>
              <p className="text-[9px] text-gray-600">{t('review_center.active_count', { count: review.debts.activeCount })}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">{t('review_center.debts_borrowed')}</p>
              <p className="text-xs text-red-400 font-semibold tabular-nums">{formatCurrency(review.debts.borrowed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">{t('review_center.active_emis')}</p>
              <p className="text-xs text-orange-400 font-semibold tabular-nums">{review.emis.activeCount}</p>
              <p className="text-[9px] text-gray-600">{t('review_center.monthly_total', { amount: formatCurrency(review.emis.monthlyTotal) })}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">{t('review_center.goal_savings')}</p>
              <p className="text-xs text-purple-400 font-semibold tabular-nums">{formatCurrency(review.goals.saved)}</p>
              <p className="text-[9px] text-gray-600">{t('common.of')} {formatCurrency(review.goals.target)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-gray-500">{t('common.net_worth')}</span>
            <span className={`text-xs font-bold tabular-nums ${review.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(review.netWorth)}
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

function SectionCard({ _id, title, icon: Icon, expanded, onToggle, children }) {
  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-400 shrink-0" />}
          <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
          {expanded ? <ChevronUp size={14} className="text-gray-500 ml-auto shrink-0" /> : <ChevronDown size={14} className="text-gray-500 ml-auto shrink-0" />}
        </div>
      </button>
      {expanded && <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">{children}</div>}
    </GlassCard>
  )
}

export default function ReviewCenterPage({ onNavigate }) {
  const { t } = useTranslation()
  const {
    transactions, reviewSummary, budgetsV2, debts,
    emis, goals, recurring, insights,
  } = useFinance()
  const [activePeriod, setActivePeriod] = useState('month')
  const [subTab, setSubTab] = useState('monthly')
  const [expandedId, setExpandedId] = useState(null)
  const [sections, setSections] = useState({
    budget: false, spending: false, income: false, debt: false,
    trading: false, goals: false, insights: false, alerts: false, charts: false,
  })

  const toggleSection = (id) => {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const periodTabs = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ]

  const monthSubTabs = [
    { id: 'monthly', label: t('review_center.tab_monthly') },
    { id: 'quarterly', label: t('review_center.tab_quarterly') },
    { id: 'yearly', label: t('review_center.tab_yearly') },
  ]

  const todayReview = useMemo(() => {
    if (!transactions || transactions.length === 0) return null
    return getTodayReview(transactions)
  }, [transactions])

  const weekReview = useMemo(() => {
    if (!transactions || transactions.length === 0) return null
    return getWeekReview(transactions)
  }, [transactions])

  const currentReview = useMemo(() => {
    if (!reviewSummary) return null
    return reviewSummary[subTab]
  }, [reviewSummary, subTab])

  const budgetReview = useMemo(() => {
    if (!transactions || transactions.length === 0) return []
    return getBudgetReview(budgetsV2, transactions)
  }, [budgetsV2, transactions])

  const spendingReview = useMemo(() => {
    if (!transactions || transactions.length === 0) return { total: 0, count: 0, average: 0, topCategories: [], topMerchants: [] }
    return getSpendingReview(transactions)
  }, [transactions])

  const incomeReview = useMemo(() => {
    if (!transactions || transactions.length === 0) return { total: 0, count: 0, sources: [] }
    return getIncomeReview(transactions)
  }, [transactions])

  const tradingReview = useMemo(() => {
    if (!transactions || transactions.length === 0) return { depositCount: 0, depositAmount: 0, withdrawalCount: 0, withdrawalAmount: 0, netFlow: 0 }
    return getTradingReview(transactions)
  }, [transactions])

  const goalReview = useMemo(() => {
    return getGoalReview(goals, transactions)
  }, [goals, transactions])

  const alerts = useMemo(() => {
    if (!transactions || transactions.length === 0) return []
    return getSmartAlerts(transactions, budgetsV2, emis, debts, goals, recurring)
  }, [transactions, budgetsV2, emis, debts, goals, recurring])

  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return []
    return getChartsData(transactions)
  }, [transactions])

  const smartInsights = insights?.smartInsights || []

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <BarChart3 size={18} className="text-blue-400" />
          <h1 className="text-xl font-bold">Smart Review Center</h1>
        </div>
        <GlassCard>
          <EmptyState icon={FileText} title={t('review_center.no_data_title')} description={t('review_center.no_data_desc')} />
        </GlassCard>
      </div>
    )
  }

  const maxSpending = Math.max(...spendingReview.topCategories.map((c) => c.amount), 1)
  const maxIncome = Math.max(...incomeReview.sources.map((c) => c.amount), 1)
  const maxChart = Math.max(...chartData.map((m) => Math.max(m.income, m.expense)), 1)

  const sectionList = [
    { id: 'budget', title: 'Budget Review', icon: sectionIcons.budget, content: (
      budgetReview.length === 0 ? (
        <p className="text-xs text-gray-500">No budgets set up yet</p>
      ) : (
        <div className="space-y-2">
          {budgetReview.map((b) => (
            <div key={b.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">{b.label}</span>
                <span className="text-gray-300 tabular-nums">
                  {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    b.status === 'exceeded' ? 'bg-red-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className={b.status === 'exceeded' ? 'text-red-400' : b.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}>
                  {b.percentage}%
                </span>
                <span className="text-gray-500">{formatCurrency(b.remaining)} remaining</span>
              </div>
            </div>
          ))}
        </div>
      )
    )},
    { id: 'spending', title: 'Spending Analysis', icon: sectionIcons.spending, content: (
      spendingReview.count === 0 ? (
        <p className="text-xs text-gray-500">No expenses this month</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Total" value={formatCurrency(spendingReview.total)} color="text-red-400" />
            <StatCard label="Transactions" value={spendingReview.count} color="text-blue-400" />
            <StatCard label="Average" value={formatCurrency(Math.round(spendingReview.average))} color="text-gray-300" />
          </div>
          {spendingReview.topCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Categories</p>
              <div className="space-y-1.5">
                {spendingReview.topCategories.map((c) => (
                  <CategoryBar key={c.category} label={c.label} amount={c.amount} max={maxSpending} />
                ))}
              </div>
            </div>
          )}
          {spendingReview.topMerchants.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Most Used Payees</p>
              <div className="space-y-1">
                {spendingReview.topMerchants.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate mr-2">{m.name}</span>
                    <span className="text-gray-500">{m.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    )},
    { id: 'income', title: 'Income Analysis', icon: sectionIcons.income, content: (
      incomeReview.count === 0 ? (
        <p className="text-xs text-gray-500">No income this month</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Total" value={formatCurrency(incomeReview.total)} color="text-emerald-400" />
            <StatCard label="Sources" value={incomeReview.count} color="text-blue-400" />
            <StatCard label="Avg/Source" value={formatCurrency(incomeReview.count > 0 ? Math.round(incomeReview.total / incomeReview.count) : 0)} color="text-gray-300" />
          </div>
          {incomeReview.sources.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Income Sources</p>
              <div className="space-y-1.5">
                {incomeReview.sources.map((s) => (
                  <CategoryBar key={s.category} label={s.label} amount={s.amount} max={maxIncome} color="bg-emerald-500" />
                ))}
              </div>
            </div>
          )}
        </div>
      )
    )},
    { id: 'debt', title: 'Debt Review', icon: sectionIcons.debt, content: (
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Owed to You" value={formatCurrency(debts?.filter((d) => d.type === 'lent' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0))} color="text-emerald-400" />
        <StatCard label="You Owe" value={formatCurrency(debts?.filter((d) => d.type === 'borrowed' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0))} color="text-red-400" />
        <StatCard label="Total Debts" value={debts?.length || 0} color="text-blue-400" />
        <StatCard label="Overdue" value={debts?.filter((d) => d.dueDate && d.status !== 'settled' && new Date(d.dueDate) < new Date()).length || 0} color="text-amber-400" />
      </div>
    )},
    { id: 'trading', title: 'Trading Review', icon: sectionIcons.trading, content: (
      tradingReview.depositCount === 0 && tradingReview.withdrawalCount === 0 ? (
        <p className="text-xs text-gray-500">No trading activity this month</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Deposits" value={tradingReview.depositCount} sub={formatCurrency(tradingReview.depositAmount)} color="text-red-400" />
          <StatCard label="Withdrawals" value={tradingReview.withdrawalCount} sub={formatCurrency(tradingReview.withdrawalAmount)} color="text-emerald-400" />
          <div className="col-span-2">
            <StatCard
              label="Net Cash Flow"
              value={formatCurrency(Math.abs(tradingReview.netFlow))}
              color={tradingReview.netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}
              sub={tradingReview.netFlow >= 0 ? 'Net positive (profit)' : 'Net negative (loss)'}
            />
          </div>
        </div>
      )
    )},
    { id: 'goals', title: 'Goal Review', icon: sectionIcons.goals, content: (
      goalReview.length === 0 ? (
        <p className="text-xs text-gray-500">No savings goals set up yet</p>
      ) : (
        <div className="space-y-3">
          {goalReview.map((g) => (
            <div key={g.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">{g.name}</span>
                <span className="text-gray-300 tabular-nums">
                  {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${g.achieved ? 'bg-emerald-500' : 'bg-purple-500'}`}
                  style={{ width: `${g.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className={g.achieved ? 'text-emerald-400' : 'text-purple-400'}>{g.percentage}%</span>
                {!g.achieved && <span className="text-gray-500">{formatCurrency(g.remaining)} to go</span>}
                {g.achieved && <span className="text-emerald-400">Achieved!</span>}
              </div>
            </div>
          ))}
        </div>
      )
    )},
    { id: 'insights', title: 'Financial Insights', icon: sectionIcons.insights, content: (
      smartInsights.length === 0 ? (
        <p className="text-xs text-gray-500">Add more transactions to generate insights</p>
      ) : (
        <div className="space-y-2">
          {smartInsights.slice(0, 6).map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )
    )},
    { id: 'alerts', title: 'Smart Alerts', icon: sectionIcons.alerts, content: (
      alerts.length === 0 ? (
        <p className="text-xs text-gray-500">No alerts — your finances look healthy!</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))}
        </div>
      )
    )},
    { id: 'charts', title: 'Charts (6-Month Trend)', icon: sectionIcons.charts, content: (
      chartData.length === 0 ? (
        <p className="text-xs text-gray-500">Not enough data for charts</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Income vs Expense</p>
            <div className="space-y-1.5">
              {chartData.map((m) => (
                <div key={m.month} className="space-y-0.5">
                  <span className="text-[10px] text-gray-500">{m.month}</span>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                        style={{ width: `${(m.income / maxChart) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-500 rounded-r-full transition-all duration-500"
                        style={{ width: `${(m.expense / maxChart) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 tabular-nums w-16 text-right">
                      {formatCurrency(m.savings)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Monthly Savings</p>
            <div className="flex items-end gap-1.5 h-16">
              {chartData.map((m) => {
                const allPositive = [...chartData.map((d) => d.savings)]
                const absMax = Math.max(...allPositive.map(Math.abs), 1)
                const height = absMax > 0 ? (Math.abs(m.savings) / absMax) * 100 : 0
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col items-center" style={{ height: '100%' }}>
                      <div
                        className={`w-full rounded-t-sm transition-all duration-500 ${m.savings >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-gray-600">{m.month}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    )},
  ]

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <BarChart3 size={18} className="text-blue-400" />
        <h1 className="text-xl font-bold">Smart Review Center</h1>
      </div>

      <div className="flex gap-1.5 mb-4">
        {periodTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePeriod(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activePeriod === tab.id
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        {activePeriod === 'today' && todayReview && (
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="Income"
              value={formatCurrency(todayReview.income)}
              color="text-emerald-400"
            />
            <StatCard
              label="Spent"
              value={formatCurrency(todayReview.expense)}
              color="text-red-400"
            />
            <StatCard
              label="Savings"
              value={formatCurrency(todayReview.savings)}
              color={todayReview.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
            <StatCard
              label="Txns"
              value={todayReview.count}
              color="text-blue-400"
            />
          </div>
        )}
        {activePeriod === 'week' && weekReview && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="Income" value={formatCurrency(weekReview.income)} color="text-emerald-400" />
              <StatCard label="Spent" value={formatCurrency(weekReview.expense)} color="text-red-400" />
              <StatCard label="Savings" value={formatCurrency(weekReview.savings)} color={weekReview.savings >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <StatCard label="Txns" value={weekReview.count} color="text-blue-400" />
            </div>
            {weekReview.topCategories.length > 0 && (
              <GlassCard>
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Top Categories</p>
                {weekReview.topCategories.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-gray-400">{c.label}</span>
                    <span className="text-gray-300 tabular-nums">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </GlassCard>
            )}
          </div>
        )}
        {activePeriod === 'month' && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {monthSubTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    subTab === tab.id
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <ReviewCard
              review={currentReview}
              expanded={expandedId === subTab}
              onToggle={() => setExpandedId(expandedId === subTab ? null : subTab)}
              t={t}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {sectionList.map((section) => (
          <SectionCard
            key={section.id}
            id={section.id}
            title={section.title}
            icon={section.icon}
            expanded={sections[section.id]}
            onToggle={() => toggleSection(section.id)}
          >
            {section.content}
          </SectionCard>
        ))}
      </div>
    </div>
  )
}
