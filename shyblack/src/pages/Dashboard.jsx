import { useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Eye, EyeOff, ChevronRight,
  AlertCircle, RefreshCw, Repeat2, RotateCcw, SkipForward, Sparkles, Target, Heart, FileText, BarChart3,
  Calendar, ArrowLeftRight, CreditCard, Activity, PieChart, Award, FolderOpen, FileDown, Users, Wallet,
  ShieldCheck,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import { getCategorySummary } from '../utils/categoryDrilldown'
import { setCategoryDetailId } from '../pages/CategoryDetail'
import { calculateNetWorth, getAccounts, getStoredNetWorthHistory, getNetWorthTrend } from '../utils/networth'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'
import AnimatedNumber from '../components/AnimatedNumber'
import SavingsProgress from '../components/SavingsProgress'
import FinancialScore from '../components/FinancialScore'
import NotificationBanner from '../components/NotificationBanner'
import DashboardEmiWidget from '../components/DashboardEmiWidget'
import QuickActions from '../components/QuickActions'
import CategoryIcon from '../components/CategoryIcon'

export default function Dashboard({ onNavigate }) {
  const {
    transactions, getBalance, getMonthlySummary, savingsGoal,
    deleteTransaction, insights, notification, dismissNotification,
    security, updateSecurity, debtsSummary, debts,
    pendingRecurring, executeAllRecurring, skipAllRecurring,
    executeRecurring, skipRecurring,
    recoverySnapshot, restoreFromSnapshot,
    goals, goalsProjections,
    emiSummary, documents, documentStats,
    dataQuality, reviewSummary,
  } = useFinance()

  const accounts = useMemo(() => getAccounts(), [])
  const netWorthData = useMemo(() => calculateNetWorth(transactions, debts, accounts), [transactions, debts, accounts])
  const netWorthTrend = useMemo(() => getNetWorthTrend(getStoredNetWorthHistory(), '30d'), [])

  const [hideBalance, setHideBalance] = useState(security.hideBalance)
  const [showRecurringDetail, setShowRecurringDetail] = useState(false)

  const now = useMemo(() => new Date(), [])
  const monthly = useMemo(() => getMonthlySummary(now.getFullYear(), now.getMonth()), [getMonthlySummary, now])
  const balance = useMemo(() => getBalance(), [transactions])

  const netWorth = useMemo(() => {
    return balance + debtsSummary.pendingReceivables - debtsSummary.pendingPayables
  }, [balance, debtsSummary])

  const recentTx = useMemo(() => transactions.slice(0, 3), [transactions])

  const categorySummary = useMemo(() => getCategorySummary(transactions), [transactions])
  const topCategories = useMemo(() => categorySummary.slice(0, 4), [categorySummary])

  const toggleHide = useCallback(() => {
    const next = !hideBalance
    setHideBalance(next)
    updateSecurity({ hideBalance: next })
  }, [hideBalance, updateSecurity])

  const hasPendingActions = pendingRecurring.length > 0 || debtsSummary.overdueCount > 0

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">

      {/* ── 1. Net Worth ─────────────────────────────── */}
      <button onClick={() => onNavigate('networth')} className="w-full text-left mb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">Net Worth</p>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); toggleHide() }}
              className="p-2 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <ChevronRight size={14} className="text-gray-600" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gradient-brand mt-1 tracking-tight glow-neon-sm">
          {hideBalance ? '••••••' : <AnimatedNumber value={netWorth} format={formatCurrency} />}
        </h1>
        {netWorthData && (
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="text-neon/60">Assets</span>
              <span className="text-neon font-medium">{formatCurrency(netWorthData.totalAssets)}</span>
            </span>
            <span className="text-gray-700">|</span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="text-red-400/60">Liabilities</span>
              <span className="text-red-400 font-medium">{formatCurrency(netWorthData.totalLiabilities)}</span>
            </span>
          </div>
        )}
      </button>

      {/* ── Snapshot recovery banner ─────────────────── */}
      {recoverySnapshot && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
          <RotateCcw size={15} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-400">Data recovery available</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              A recent snapshot with {recoverySnapshot.transactions?.length} transactions was found.
            </p>
          </div>
          <button
            onClick={restoreFromSnapshot}
            className="text-[10px] font-semibold text-yellow-400 border border-yellow-500/30 rounded-lg px-2.5 py-1.5 hover:bg-yellow-500/10 transition-colors shrink-0"
          >
            Restore
          </button>
        </div>
      )}

      {/* ── Overspend notification ────────────────────── */}
      <NotificationBanner notification={notification} onDismiss={dismissNotification} />

      {/* ── 2. Month Status ───────────────────────────── */}
      <div className="flex gap-3 mb-4">
        <StatCard
          icon={TrendingUp}
          label="Income"
          value={hideBalance ? '••••' : formatCurrency(monthly.income)}
          color="text-neon"
          subtext={now.toLocaleString('en-US', { month: 'long' })}
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={hideBalance ? '••••' : formatCurrency(monthly.expense)}
          color="text-red-400"
          subtext={now.toLocaleString('en-US', { month: 'long' })}
        />
      </div>

      {/* ── 3. Category Summary ──────────────────────── */}
      {topCategories.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold text-gray-300">Category Summary</h2>
            {categorySummary.length > 4 && (
              <button
                onClick={() => onNavigate('analytics')}
                className="text-[10px] text-neon/70 hover:text-neon transition-colors"
              >
                View All
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {topCategories.map((cat) => {
              const catDef = ALL_CATEGORIES.find((c) => c.id === cat.categoryId)
              const isCatIncome = cat.type === 'income'
              return (
                <button
                  key={cat.categoryId}
                  onClick={() => { setCategoryDetailId(cat.categoryId); onNavigate('category-detail') }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all border border-transparent hover:border-glass-border"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCatIncome ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'
                  }`}>
                    <CategoryIcon icon={catDef?.icon} size={16} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{cat.label}</p>
                    <p className="text-[10px] text-gray-600">{cat.txCount} transaction{cat.txCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold tabular-nums ${isCatIncome ? 'text-neon' : 'text-red-400'}`}>
                      {formatCurrency(cat.total)}
                    </p>
                    <p className={`text-[10px] tabular-nums ${isCatIncome ? 'text-neon/60' : 'text-red-400/60'}`}>
                      {cat.percentage.toFixed(1)}%
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 4. Pending Actions ────────────────────────── */}
      {hasPendingActions && (
        <div className="mb-4 space-y-2">

          {/* Recurring due */}
          {pendingRecurring.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-neon" />
                  <span className="text-xs font-semibold text-neon">
                    {pendingRecurring.length} recurring due
                  </span>
                </div>
                <button
                  onClick={() => setShowRecurringDetail((p) => !p)}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors"
                >
                  {showRecurringDetail ? 'Hide' : 'Details'}
                </button>
              </div>

              {showRecurringDetail && (
                <div className="mb-3 space-y-1.5">
                  {pendingRecurring.map((r) => {
                    const cat = ALL_CATEGORIES.find((c) => c.id === r.category)
                    return (
                      <div key={r.id} className="flex items-center justify-between py-1">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{cat?.label || r.category}</p>
                          <p className="text-[11px] text-gray-500">{formatCurrency(r.amount)} · {r.frequency}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => executeRecurring(r.id)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-colors"
                          >
                            Post
                          </button>
                          <button
                            onClick={() => skipRecurring(r.id)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-gray-500 border border-glass-border hover:text-white transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={executeAllRecurring}
                  className="flex-1 py-2 rounded-xl bg-neon/10 text-neon text-xs font-semibold border border-neon/20 hover:bg-neon/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  Post All
                </button>
                <button
                  onClick={skipAllRecurring}
                  className="flex-1 py-2 rounded-xl bg-white/[0.03] text-gray-500 text-xs font-semibold border border-glass-border hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <SkipForward size={12} />
                  Skip All
                </button>
              </div>
            </GlassCard>
          )}

          {/* Overdue debts */}
          {debtsSummary.overdueCount > 0 && (
            <button
              onClick={() => onNavigate('debts')}
              className="w-full text-left"
            >
              <GlassCard className="border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-400">
                      {debtsSummary.overdueCount} overdue {debtsSummary.overdueCount === 1 ? 'payment' : 'payments'}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">Tap to review borrow & lend</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 shrink-0" />
                </div>
              </GlassCard>
            </button>
          )}
        </div>
      )}

      {/* ── 5. Upcoming EMIs ─────────────────────────── */}
      <DashboardEmiWidget emiSummary={emiSummary} onNavigate={onNavigate} />

      {/* ── 5.5 Document Vault ─────────────────────── */}
      {documentStats.total > 0 && (
        <button onClick={() => onNavigate('documents')} className="w-full text-left mb-4">
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-neon" />
              <h2 className="text-xs font-semibold text-gray-300">Document Vault</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-white tabular-nums">{documentStats.total}</span>
                <span className="text-[10px] text-gray-500">total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-neon tabular-nums">{documentStats.thisMonth}</span>
                <span className="text-[10px] text-gray-500">this month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-yellow-400 tabular-nums">
                  {Object.keys(documentStats.byCategory).length}
                </span>
                <span className="text-[10px] text-gray-500">categories</span>
              </div>
            </div>
          </GlassCard>
        </button>
      )}

      {/* ── 5.8 Account Summary ────────────────────── */}
      {accounts.length > 0 && (
        <button onClick={() => onNavigate('account-center')} className="w-full text-left mb-4">
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={14} className="text-cyan-400" />
              <h2 className="text-xs font-semibold text-gray-300">Accounts</h2>
            </div>
            <div className="space-y-1.5">
              {accounts.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{a.name}</span>
                  <span className={`text-xs font-semibold tabular-nums ${(a.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(a.balance || 0)}
                  </span>
                </div>
              ))}
              {accounts.length > 3 && (
                <p className="text-[10px] text-gray-600 text-center pt-1">+{accounts.length - 3} more accounts</p>
              )}
            </div>
          </GlassCard>
        </button>
      )}

      {/* ── 6. Quick Links ──────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Links</h2>
        <QuickActions onNavigate={onNavigate} />
      </div>

      {/* ── 7. More Features ────────────────────────── */}
      <GlassCard className="mb-4 !p-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onNavigate('networth')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <BarChart3 size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">Net Worth</span>
          </button>
          <button
            onClick={() => onNavigate('financial-health')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Heart size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">Health</span>
          </button>
          <button
            onClick={() => onNavigate('statement-export')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <FileText size={16} className="text-yellow-400" />
            <span className="text-[10px] font-medium text-gray-400">Statement</span>
          </button>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Repeat2 size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">Subscriptions</span>
          </button>
          <button
            onClick={() => onNavigate('review')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-[10px] font-medium text-gray-400">Review</span>
          </button>
          <button
            onClick={() => onNavigate('insights')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <TrendingUp size={16} className="text-orange-400" />
            <span className="text-[10px] font-medium text-gray-400">Insights</span>
          </button>
          <button
            onClick={() => onNavigate('calendar')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Calendar size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">Calendar</span>
          </button>
          <button
            onClick={() => onNavigate('transfers')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <ArrowLeftRight size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">Transfer</span>
          </button>
          <button
            onClick={() => onNavigate('emi-center')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <CreditCard size={16} className="text-purple-400" />
            <span className="text-[10px] font-medium text-gray-400">EMIs</span>
          </button>
          <button
            onClick={() => onNavigate('cash-flow-forecast')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Activity size={16} className="text-cyan-400" />
            <span className="text-[10px] font-medium text-gray-400">Forecast</span>
          </button>
          <button
            onClick={() => onNavigate('financial-timeline')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <PieChart size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">Timeline</span>
          </button>
          <button
            onClick={() => onNavigate('achievements')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Award size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">Badges</span>
          </button>
          <button
            onClick={() => onNavigate('documents')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <FolderOpen size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">Documents</span>
          </button>
          <button
            onClick={() => onNavigate('statements')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <FileDown size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">Statements</span>
          </button>
          <button
            onClick={() => onNavigate('people')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Users size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">People</span>
          </button>
          <button
            onClick={() => onNavigate('account-center')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Wallet size={16} className="text-cyan-400" />
            <span className="text-[10px] font-medium text-gray-400">Accounts</span>
          </button>
          <button
            onClick={() => onNavigate('trends')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <BarChart3 size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">Trends</span>
          </button>
          <button
            onClick={() => onNavigate('review')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <Calendar size={16} className="text-violet-400" />
            <span className="text-[10px] font-medium text-gray-400">Review</span>
          </button>
          <button
            onClick={() => onNavigate('data-quality')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
          >
            <ShieldCheck size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">Quality</span>
          </button>
        </div>
      </GlassCard>

      {/* ── 8. Recent Activity ───────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
          {transactions.length > 3 && (
            <button
              onClick={() => onNavigate('history')}
              className="flex items-center gap-0.5 text-xs text-neon/70 hover:text-neon transition-colors min-h-[28px]"
            >
              View all <ChevronRight size={12} />
            </button>
          )}
        </div>
        <GlassCard>
          {recentTx.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Add your first income or expense to get started"
              action={
                <button onClick={() => onNavigate('add')} className="btn-primary text-xs !px-4 !py-2">
                  Add Transaction
                </button>
              }
            />
          ) : (
            <div>
              {recentTx.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} onDelete={deleteTransaction} compact />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── 9. Financial Score ───────────────────────── */}
      {insights.score.score > 0 && (
        <div
          className="mb-4 animate-glow-pulse cursor-pointer"
          onClick={() => onNavigate('insights')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('insights')}
        >
          <FinancialScore score={insights.score} factors={[]} compact breakdown={insights.scoreBreakdown} />
        </div>
      )}

      {/* ── 9.5 Data Quality ───────────────────────── */}
      {dataQuality && dataQuality.total > 0 && (
        <button onClick={() => onNavigate('data-quality')} className="w-full text-left mb-4">
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <h2 className="text-xs font-semibold text-amber-400">Data Quality</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-amber-400 tabular-nums">{dataQuality.total}</span>
              <span className="text-[10px] text-gray-500">issues found</span>
              {dataQuality.bySeverity.medium > 0 && (
                <span className="text-xs text-amber-400">{dataQuality.bySeverity.medium} need attention</span>
              )}
            </div>
          </GlassCard>
        </button>
      )}

      {/* ── 10. Savings Progress ──────────────────────── */}
      {savingsGoal.target > 0 && (
        <GlassCard brand>
          <SavingsProgress savingsGoal={savingsGoal} />
        </GlassCard>
      )}

      {/* ── 11. Goals Overview ───────────────────────── */}
      {goals.length > 0 && (
        <button onClick={() => onNavigate('goals')} className="w-full text-left mt-4">
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-purple-400" />
              <h2 className="text-xs font-semibold text-gray-300">Financial Goals</h2>
            </div>
            <div className="space-y-2">
              {goalsProjections.slice(0, 2).map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 truncate">{g.name}</span>
                      <span className="text-gray-500 tabular-nums">{Math.round(g.projection?.progress || 0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-matte-200 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-neon" style={{ width: `${Math.min(g.projection?.progress || 0, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {goals.length > 2 && (
                <p className="text-[10px] text-gray-600">+{goals.length - 2} more goals</p>
              )}
            </div>
          </GlassCard>
        </button>
      )}
    </div>
  )
}
