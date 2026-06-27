import { useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Eye, EyeOff, ChevronRight,
  AlertCircle, RefreshCw, Repeat2, RotateCcw, SkipForward, Sparkles, Target, Heart, FileText, BarChart3,
  Calendar, ArrowLeftRight, CreditCard, Activity, PieChart, Award, FolderOpen, FileDown, Users, Wallet,
  ShieldCheck, Printer, Bell, Smartphone, Clock, Receipt as ReceiptIcon, Zap,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import { getUpcomingRecurringTransactions } from '../utils/recurring'
import { getCategorySummary } from '../utils/categoryDrilldown'
import { setCategoryDetailId } from '../pages/CategoryDetail'
import { getAccounts, getStoredNetWorthHistory, getNetWorthTrend } from '../utils/networth'
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
  const { t } = useTranslation()
  const {
    transactions, getBalance, getMonthlySummary, savingsGoal,
    deleteTransaction, insights, notification, dismissNotification,
    security, updateSecurity, debtsSummary, debts,
    recurring,
    pendingRecurring, executeAllRecurring, skipAllRecurring,
    executeRecurring, skipRecurring,
    recoverySnapshot, restoreFromSnapshot,
    goals, goalsProjections,
    emiSummary, documents, documentStats,
    dataQuality, reviewSummary,
    receiptStats,
    wealthDashboardStats,
    backupDashboardStats,
  } = useFinance()

  const accounts = useMemo(() => getAccounts(), [])
  const netWorthTrend = useMemo(() => getNetWorthTrend(getStoredNetWorthHistory(), '30d'), [])

  const [hideBalance, setHideBalance] = useState(security.hideBalance)

  const now = useMemo(() => new Date(), [])
  const monthly = useMemo(() => getMonthlySummary(now.getFullYear(), now.getMonth()), [getMonthlySummary, now])
  const balance = useMemo(() => getBalance(), [transactions])

  const totalCash = useMemo(() => transactions.reduce((s, t) => s + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0), [transactions])
  const totalAccountBal = useMemo(() => accounts.reduce((s, a) => s + (a.balance || 0), 0), [accounts])
  const lentDebts = useMemo(() => debts.filter((d) => d.type === 'lent' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0), [debts])
  const borrowedDebts = useMemo(() => debts.filter((d) => d.type === 'borrowed' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0), [debts])
  const netWorth = useMemo(() => totalCash + totalAccountBal + lentDebts - borrowedDebts, [totalCash, totalAccountBal, lentDebts, borrowedDebts])

  const recentTx = useMemo(() => transactions.slice(0, 3), [transactions])

  const categorySummary = useMemo(() => getCategorySummary(transactions), [transactions])
  const topCategories = useMemo(() => categorySummary.slice(0, 3), [categorySummary])

  const toggleHide = useCallback(() => {
    const next = !hideBalance
    setHideBalance(next)
    updateSecurity({ hideBalance: next })
  }, [hideBalance, updateSecurity])

  const hasPendingActions = pendingRecurring.length > 0 || debtsSummary.overdueCount > 0
  const monthNet = monthly.income - monthly.expense

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">

      {/* ── 1. Net Worth + Balance ──────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => onNavigate('networth')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigate('networth')}>
            <p className="text-sm text-gray-500 font-medium">{t('common.net_worth')}</p>
            <ChevronRight size={14} className="text-gray-600" />
          </div>
          <button
            onClick={toggleHide}
            className="p-2 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label={hideBalance ? t('dashboard.show_balances') : t('dashboard.hide_balances')}
          >
            {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-gradient-brand mt-1 tracking-tight glow-neon-sm">
          {hideBalance ? '••••••' : <AnimatedNumber value={netWorth} format={formatCurrency} />}
        </h1>
        {transactions.length > 0 || accounts.length > 0 || debts.length > 0 ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="text-neon/60">{t('dashboard.assets')}</span>
              <span className="text-neon font-medium">{hideBalance ? '••••' : formatCurrency(Math.max(0, totalCash + totalAccountBal) + lentDebts)}</span>
            </span>
            <span className="text-gray-700">|</span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="text-red-400/60">{t('dashboard.liabilities')}</span>
              <span className="text-red-400 font-medium">{hideBalance ? '••••' : formatCurrency(Math.max(0, -(totalCash + totalAccountBal)) + borrowedDebts)}</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Snapshot recovery ───────────────────────── */}
      {recoverySnapshot && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
          <RotateCcw size={15} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-400">{t('dashboard.data_recovery_available')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {t('dashboard.snapshot_found', { count: recoverySnapshot.transactions?.length })}
            </p>
          </div>
          <button onClick={restoreFromSnapshot}
            className="text-[10px] font-semibold text-yellow-400 border border-yellow-500/30 rounded-lg px-2.5 py-1.5 hover:bg-yellow-500/10 transition-colors shrink-0"
          >
            {t('dashboard.restore')}
          </button>
        </div>
      )}

      <NotificationBanner notification={notification} onDismiss={dismissNotification} />

      {/* ── 2. Cash Flow ────────────────────────────── */}
      <div className="flex gap-3 mb-4">
        <StatCard
          icon={TrendingUp}
          label={t('dashboard.income')}
          value={hideBalance ? '••••' : formatCurrency(monthly.income)}
          color="text-neon"
          subtext={now.toLocaleString('en-US', { month: 'long' })}
          onClick={() => onNavigate('analytics')}
        />
        <StatCard
          icon={TrendingDown}
          label={t('dashboard.expense')}
          value={hideBalance ? '••••' : formatCurrency(monthly.expense)}
          color="text-red-400"
          subtext={now.toLocaleString('en-US', { month: 'long' })}
          onClick={() => onNavigate('analytics')}
        />
        <StatCard
          icon={Wallet}
          label={t('dashboard.total_balance')}
          value={hideBalance ? '••••' : formatCurrency(balance)}
          color={balance >= 0 ? 'text-neon' : 'text-red-400'}
          onClick={() => onNavigate('account-center')}
        />
      </div>

      {/* ── 3. What's Due ───────────────────────────── */}
      {(hasPendingActions || emiSummary?.active > 0) && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Bell size={12} className="text-neon" />
              {t('dashboard.whats_due')}
            </h2>
          </div>
          <div className="space-y-2">
            {pendingRecurring.length > 0 && (
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-neon" />
                    <span className="text-xs font-semibold text-neon">
                      {t('dashboard.recurring_due', { count: pendingRecurring.length })}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => executeAllRecurring()} className="px-2 py-1 rounded-lg bg-neon/10 text-neon text-[10px] border border-neon/20 hover:bg-neon/20 transition-colors">{t('dashboard.post_all')}</button>
                    <button onClick={() => skipAllRecurring()} className="px-2 py-1 rounded-lg bg-white/[0.03] text-gray-500 text-[10px] border border-glass-border hover:text-white transition-colors">{t('dashboard.skip_all')}</button>
                  </div>
                </div>
              </GlassCard>
            )}
            {debtsSummary.overdueCount > 0 && (
              <button onClick={() => onNavigate('debts')} className="w-full text-left">
                <GlassCard className="border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-red-400">
                        {t('dashboard.overdue_payments', { count: debtsSummary.overdueCount })}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 shrink-0" />
                  </div>
                </GlassCard>
              </button>
            )}
            <DashboardEmiWidget emiSummary={emiSummary} onNavigate={onNavigate} />
          </div>
        </div>
      )}

      {/* ── Upcoming Recurring ─────────────────────── */}
      {(() => {
        const upcoming = getUpcomingRecurringTransactions(recurring, 5)
        if (upcoming.length === 0) return null
        return (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Clock size={12} className="text-neon" />
                {t('dashboard.upcoming_recurring')}
              </h2>
              <button onClick={() => onNavigate('recurring-transactions')} className="text-[10px] text-neon/70 hover:text-neon transition-colors">
                {t('dashboard.manage')} <ChevronRight size={12} className="inline" />
              </button>
            </div>
            <GlassCard>
              <div className="divide-y divide-glass-border">
                {upcoming.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${item.type === 'income' ? 'bg-neon' : 'bg-red-400'} shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{item.note || item.category}</p>
                        <p className="text-[10px] text-gray-500">{formatDate(item.nextDate)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold tabular-nums shrink-0 ml-2 ${
                      item.type === 'income' ? 'text-neon' : 'text-red-400'
                    }`}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )
      })()}

      {/* ── 4. Quick Actions ────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold text-gray-300">{t('dashboard.quick_links')}</h2>
        </div>
        <QuickActions onNavigate={onNavigate} />
      </div>

      {/* ── 5. Recent Activity ──────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold text-gray-300">{t('dashboard.recent_transactions')}</h2>
          {transactions.length > 3 && (
            <button onClick={() => onNavigate('history')} className="text-[10px] text-neon/70 hover:text-neon transition-colors min-h-[28px]">
              {t('common.view_all')} <ChevronRight size={12} className="inline" />
            </button>
          )}
        </div>
        <GlassCard>
          {recentTx.length === 0 ? (
            <EmptyState
              title={t('dashboard.no_transactions')}
              description={t('dashboard.add_first')}
              action={
                <button onClick={() => onNavigate('add')} className="btn-primary text-xs !px-4 !py-2">
                  {t('transactions.add')}
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

      {/* ── 6. Quick Stats ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {documentStats.total > 0 && (
          <button onClick={() => onNavigate('documents')} className="text-left">
            <GlassCard className="!p-3">
              <FolderOpen size={14} className="text-neon mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{documentStats.total}</p>
              <p className="text-[10px] text-gray-500">{t('nav.documents')}</p>
            </GlassCard>
          </button>
        )}
        {receiptStats.total > 0 && (
          <button onClick={() => onNavigate('receipt-center')} className="text-left">
            <GlassCard className="!p-3">
              <ReceiptIcon size={14} className="text-blue-400 mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{receiptStats.thisMonth}</p>
              <p className="text-[10px] text-gray-500">{t('dashboard.receipts_month')}</p>
            </GlassCard>
          </button>
        )}
        {wealthDashboardStats.assetCount > 0 && (
          <button onClick={() => onNavigate('wealth-center')} className="text-left">
            <GlassCard className="!p-3">
              <BarChart3 size={14} className="text-amber-400 mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{wealthDashboardStats.wealthGrade !== 'N/A' ? wealthDashboardStats.wealthGrade : '-'}</p>
              <p className="text-[10px] text-gray-500">{t('dashboard.wealth_score')}</p>
            </GlassCard>
          </button>
        )}
        {wealthDashboardStats.netWorth !== 0 && (
          <button onClick={() => onNavigate('wealth-center')} className="text-left">
            <GlassCard className="!p-3">
              <TrendingUp size={14} className="text-neon mb-1" />
              <p className={`text-lg font-bold tabular-nums ${wealthDashboardStats.netWorth >= 0 ? 'text-neon' : 'text-red-400'}`}>{formatCurrency(wealthDashboardStats.netWorth)}</p>
              <p className="text-[10px] text-gray-500">{t('dashboard.net_worth')}</p>
            </GlassCard>
          </button>
        )}
        {backupDashboardStats.backupCount > 0 && (
          <button onClick={() => onNavigate('recovery-center')} className="text-left">
            <GlassCard className="!p-3">
              <ShieldCheck size={14} className={`mb-1 ${backupDashboardStats.healthStatus === 'excellent' || backupDashboardStats.healthStatus === 'good' ? 'text-neon' : 'text-amber-400'}`} />
              <p className={`text-lg font-bold tabular-nums ${backupDashboardStats.healthGrade !== 'F' ? 'text-neon' : 'text-amber-400'}`}>{backupDashboardStats.healthGrade}</p>
              <p className="text-[10px] text-gray-500">{t('dashboard.backup_health')}</p>
            </GlassCard>
          </button>
        )}
        <button onClick={() => onNavigate('forecast-center')} className="text-left">
          <GlassCard className="!p-3">
            <Zap size={14} className="text-amber-400 mb-1" />
            <p className="text-lg font-bold text-white tabular-nums">{transactions.length > 0 ? '✓' : '-'}</p>
            <p className="text-[10px] text-gray-500">{t('dashboard.forecast')}</p>
          </GlassCard>
        </button>
        <button onClick={() => onNavigate('diagnostics')} className="text-left">
          <GlassCard className="!p-3">
            <Activity size={14} className="text-cyan-400 mb-1" />
            <p className="text-lg font-bold text-white tabular-nums">{dataQuality?.total || 0 > 0 ? (dataQuality.total > 0 ? '⚠' : '✓') : '-'}</p>
            <p className="text-[10px] text-gray-500">{t('dashboard.health')}</p>
          </GlassCard>
        </button>
        {goals.length > 0 && (
          <button onClick={() => onNavigate('goals')} className="text-left">
            <GlassCard className="!p-3">
              <Target size={14} className="text-purple-400 mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{goals.length}</p>
              <p className="text-[10px] text-gray-500">{t('nav.goals')}</p>
            </GlassCard>
          </button>
        )}
        {transactions.length > 0 && (
          <button onClick={() => onNavigate('trends')} className="text-left">
            <GlassCard className="!p-3">
              <BarChart3 size={14} className="text-blue-400 mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{transactions.length}</p>
              <p className="text-[10px] text-gray-500">{t('nav.transactions')}</p>
            </GlassCard>
          </button>
        )}
        {accounts.length > 0 && (
          <button onClick={() => onNavigate('account-center')} className="text-left">
            <GlassCard className="!p-3">
              <Wallet size={14} className="text-cyan-400 mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{accounts.length}</p>
              <p className="text-[10px] text-gray-500">{t('nav.account_center')}</p>
            </GlassCard>
          </button>
        )}
      </div>

      {/* ── 7. More Features ────────────────────────── */}
      <GlassCard className="mb-4 !p-3">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => onNavigate('wealth-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <BarChart3 size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('dashboard.wealth_center')}</span>
          </button>
          <button onClick={() => onNavigate('recovery-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <ShieldCheck size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('dashboard.backup')}</span>
          </button>
          <button onClick={() => onNavigate('budget-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Target size={16} className="text-teal-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('dashboard.budget_center')}</span>
          </button>
          <button onClick={() => onNavigate('networth')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <BarChart3 size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.networth')}</span>
          </button>
          <button onClick={() => onNavigate('financial-health')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Heart size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.health')}</span>
          </button>
          <button onClick={() => onNavigate('statement-export')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <FileText size={16} className="text-yellow-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.statements')}</span>
          </button>
          <button onClick={() => onNavigate('reports')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Printer size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.reports')}</span>
          </button>
          <button onClick={() => onNavigate('subscriptions')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Repeat2 size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.subscriptions')}</span>
          </button>
          <button onClick={() => onNavigate('calendar')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Calendar size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.calendar')}</span>
          </button>
          <button onClick={() => onNavigate('transfers')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <ArrowLeftRight size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.transfer')}</span>
          </button>
          <button onClick={() => onNavigate('emi-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <CreditCard size={16} className="text-purple-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.emis')}</span>
          </button>
          <button onClick={() => onNavigate('forecast-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Zap size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('dashboard.forecast')}</span>
          </button>
          <button onClick={() => onNavigate('cash-flow-forecast')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Activity size={16} className="text-cyan-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.forecast')}</span>
          </button>
          <button onClick={() => onNavigate('financial-timeline')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <PieChart size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.timeline')}</span>
          </button>
          <button onClick={() => onNavigate('achievements')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Award size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.badges')}</span>
          </button>
          <button onClick={() => onNavigate('documents')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <FolderOpen size={16} className="text-neon" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.documents')}</span>
          </button>
          <button onClick={() => onNavigate('statements')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <FileDown size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.statements_export')}</span>
          </button>
          <button onClick={() => onNavigate('people')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Users size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.people')}</span>
          </button>
          <button onClick={() => onNavigate('receipt-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <ReceiptIcon size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('dashboard.receipt_scanner')}</span>
          </button>
          <button onClick={() => onNavigate('account-center')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Wallet size={16} className="text-cyan-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.account_center')}</span>
          </button>
          <button onClick={() => onNavigate('trends')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <BarChart3 size={16} className="text-blue-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.trends')}</span>
          </button>
          <button onClick={() => onNavigate('review')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <Sparkles size={16} className="text-violet-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.review_center')}</span>
          </button>
          <button onClick={() => onNavigate('data-quality')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]">
            <ShieldCheck size={16} className="text-amber-400" />
            <span className="text-[10px] font-medium text-gray-400">{t('nav.data_quality')}</span>
          </button>
        </div>
      </GlassCard>

      {/* ── 8. Financial Score ──────────────────────── */}
      {insights.score.score > 0 && (
        <div className="mb-4 cursor-pointer" onClick={() => onNavigate('insights')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigate('insights')}>
          <FinancialScore score={insights.score} factors={[]} compact breakdown={insights.scoreBreakdown} />
        </div>
      )}

      {/* ── 9. Data Quality ─────────────────────────── */}
      {dataQuality && dataQuality.total > 0 && (
        <button onClick={() => onNavigate('data-quality')} className="w-full text-left mb-4">
          <GlassCard className="!p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">{t('nav.data_quality')}</span>
            </div>
            <p className="text-xs text-gray-500">{t('dashboard.issues_found', { count: dataQuality.total })}</p>
          </GlassCard>
        </button>
      )}

      {/* ── 10. Savings Progress ────────────────────── */}
      {savingsGoal.target > 0 && (
        <GlassCard brand className="mb-4">
          <SavingsProgress savingsGoal={savingsGoal} />
        </GlassCard>
      )}

      {/* ── 11. Goals Overview ──────────────────────── */}
      {goals.length > 0 && (
        <button onClick={() => onNavigate('goals')} className="w-full text-left mb-4">
          <GlassCard className="!p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-purple-400" />
              <h2 className="text-xs font-semibold text-gray-300">{t('dashboard.financial_goals')}</h2>
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
                <p className="text-[10px] text-gray-600">{t('dashboard.more_goals', { count: goals.length - 2 })}</p>
              )}
            </div>
          </GlassCard>
        </button>
      )}
    </div>
  )
}
