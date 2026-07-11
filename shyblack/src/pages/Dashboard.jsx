import { useState, useMemo, useCallback, memo } from 'react'
import {
  TrendingUp, TrendingDown, Eye, EyeOff, ChevronRight,
  AlertCircle, RefreshCw, Repeat2, RotateCcw, Sparkles, Target, Heart, FileText, BarChart3,
  Calendar, ArrowLeftRight, CreditCard, Activity, PieChart, Award, FolderOpen, FileDown, Users, Wallet,
  ShieldCheck, Printer, Bell, Clock, Receipt as ReceiptIcon, Zap, Lightbulb, Calculator,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { getUpcomingRecurringTransactions } from '../utils/recurring'
import { getBills, getUpcomingBills, getOverdueBills, getBillStats } from '../utils/bills'
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
import { getTodaysTip } from '../utils/dailyTip'

const DashboardContent = memo(function DashboardContent({ onNavigate }) {
  const { t } = useTranslation()
  const {
    transactions, getBalance, getMonthlySummary, savingsGoal,
    deleteTransaction, insights, notification, dismissNotification,
    security, updateSecurity, debtsSummary, debts,
    recurring,
    pendingRecurring, executeAllRecurring, skipAllRecurring,
    recoverySnapshot, restoreFromSnapshot,
    goals, goalsProjections,
    emiSummary, documentStats,
    dataQuality,
    receiptStats,
    wealthDashboardStats, accounts,
    backupDashboardStats,
  } = useFinance()

  const [hideBalance, setHideBalance] = useState(security.hideBalance)

  const monthly = useMemo(() => {
    const d = new Date()
    return getMonthlySummary(d.getFullYear(), d.getMonth())
  }, [getMonthlySummary])
  const balance = useMemo(() => getBalance(), [getBalance])

  const totalCash = useMemo(() => transactions.reduce((s, t) => s + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0), [transactions])
  const totalAccountBal = useMemo(() => accounts.reduce((s, a) => s + (a.balance || 0), 0), [accounts])
  const lentDebts = useMemo(() => debts.filter((d) => d.type === 'lent' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0), [debts])
  const borrowedDebts = useMemo(() => debts.filter((d) => d.type === 'borrowed' && d.status !== 'settled').reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0), [debts])
  const netWorth = useMemo(() => totalCash + totalAccountBal + lentDebts - borrowedDebts, [totalCash, totalAccountBal, lentDebts, borrowedDebts])

  const recentTx = useMemo(() => transactions.slice(0, 3), [transactions])

  const toggleHide = useCallback(() => {
    const next = !hideBalance
    setHideBalance(next)
    updateSecurity({ hideBalance: next })
  }, [hideBalance, updateSecurity])

  const handleEditTx = useCallback((id) => {
    const tx = transactions.find((t) => t.id === id)
    if (tx) {
      onNavigate('add', { editTransaction: tx, returnTo: 'dashboard' })
    }
  }, [transactions, onNavigate])

  const hasPendingActions = pendingRecurring.length > 0 || debtsSummary.overdueCount > 0

  const featureLinks = [
    { route: 'wealth-center', Icon: BarChart3, color: 'text-amber-400', labelKey: 'dashboard.wealth_center' },
    { route: 'health-center', Icon: ShieldCheck, color: 'text-neon', labelKey: 'dashboard.backup_health' },
    { route: 'recovery-center', Icon: ShieldCheck, color: 'text-neon', labelKey: 'dashboard.backup' },
    { route: 'budget-center', Icon: Target, color: 'text-teal-400', labelKey: 'dashboard.budget_center' },
    { route: 'networth', Icon: BarChart3, color: 'text-neon', labelKey: 'nav.networth' },
    { route: 'financial-health', Icon: Heart, color: 'text-neon', labelKey: 'nav.health' },
    { route: 'statement-export', Icon: FileText, color: 'text-yellow-400', labelKey: 'nav.statements' },
    { route: 'reports', Icon: Printer, color: 'text-neon', labelKey: 'nav.reports' },
    { route: 'subscriptions', Icon: Repeat2, color: 'text-blue-400', labelKey: 'nav.subscriptions' },
    { route: 'calendar', Icon: Calendar, color: 'text-neon', labelKey: 'nav.calendar' },
    { route: 'transfers', Icon: ArrowLeftRight, color: 'text-amber-400', labelKey: 'nav.transfer' },
    { route: 'emi-center', Icon: CreditCard, color: 'text-purple-400', labelKey: 'nav.emis' },
    { route: 'forecast-center', Icon: Zap, color: 'text-amber-400', labelKey: 'dashboard.forecast' },
    { route: 'cash-flow-forecast', Icon: Activity, color: 'text-cyan-400', labelKey: 'nav.forecast' },
    { route: 'financial-timeline', Icon: PieChart, color: 'text-neon', labelKey: 'nav.timeline' },
    { route: 'achievements', Icon: Award, color: 'text-amber-400', labelKey: 'nav.badges' },
    { route: 'documents', Icon: FolderOpen, color: 'text-neon', labelKey: 'nav.documents' },
    { route: 'statements', Icon: FileDown, color: 'text-blue-400', labelKey: 'nav.statements_export' },
    { route: 'people', Icon: Users, color: 'text-blue-400', labelKey: 'nav.people' },
    { route: 'receipt-center', Icon: ReceiptIcon, color: 'text-blue-400', labelKey: 'dashboard.receipt_scanner' },
    { route: 'account-center', Icon: Wallet, color: 'text-cyan-400', labelKey: 'nav.account_center' },
    { route: 'trends', Icon: BarChart3, color: 'text-blue-400', labelKey: 'nav.trends' },
    { route: 'review', Icon: Sparkles, color: 'text-violet-400', labelKey: 'nav.review_center' },
    { route: 'data-quality', Icon: ShieldCheck, color: 'text-amber-400', labelKey: 'nav.data_quality' },
    { route: 'sip-calculator', Icon: Calculator, color: 'text-green-400', labelKey: 'nav.sip_calculator' },
  ]

  return (
    <div className="px-5 pt-2 max-w-lg mx-auto pb-24">

      {/* ── 1. Net Worth + Balance ──────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => onNavigate('networth')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigate('networth')}>
            <p className="text-sm text-gray-500 font-medium">{t('common.net_worth')}</p>
            <ChevronRight size={14} className="text-gray-600" />
          </div>
          <button
            onClick={toggleHide}
            className="p-2 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all flex items-center justify-center shrink-0"
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
          subtext={new Date().toLocaleString('en-US', { month: 'long' })}
          onClick={() => onNavigate('analytics')}
        />
        <StatCard
          icon={TrendingDown}
          label={t('dashboard.expense')}
          value={hideBalance ? '••••' : formatCurrency(monthly.expense)}
          color="text-red-400"
          subtext={new Date().toLocaleString('en-US', { month: 'long' })}
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

      {/* ── Upcoming Bills ──────────────────────────── */}
      {(() => {
        const allBills = getBills()
        if (allBills.length === 0) return null
        const billsDue = getUpcomingBills(allBills, 7)
        const overdue = getOverdueBills(allBills)
        const combined = [...overdue, ...billsDue].slice(0, 5)
        if (combined.length === 0) return null
        return (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <ReceiptIcon size={12} className="text-neon" />
                Upcoming Bills
              </h2>
              <button onClick={() => onNavigate('bills')} className="text-[10px] text-neon/70 hover:text-neon transition-colors">
                Manage <ChevronRight size={12} className="inline" />
              </button>
            </div>
            <GlassCard>
              <div className="divide-y divide-glass-border">
                {combined.map((bill) => {
                  const dueDate = new Date(bill.dueDate)
                  const now = new Date()
                  now.setHours(0, 0, 0, 0)
                  const isOverdue = dueDate < now
                  return (
                    <div key={bill.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-400' : 'bg-amber-400'} shrink-0`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{bill.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {isOverdue ? `Overdue · ${dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold tabular-nums shrink-0 ml-2 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  )
                })}
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
                <TransactionItem key={tx.id} transaction={tx} onDelete={deleteTransaction} onEdit={handleEditTx} compact />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── 6. Quick Stats ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(() => {
          const billStats = getBillStats(getBills())
          if (billStats.total > 0) {
            return (
              <button onClick={() => onNavigate('bills')} className="text-left">
                <GlassCard className="!p-3">
                  <ReceiptIcon size={14} className="text-neon mb-1" />
                  <p className="text-lg font-bold text-white tabular-nums">{billStats.overdue > 0 ? billStats.overdue : billStats.upcoming}</p>
                  <p className="text-[10px] text-gray-500">{billStats.overdue > 0 ? 'Bills Overdue' : 'Bills Due'}</p>
                </GlassCard>
              </button>
            )
          }
          return null
        })()}
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
            <p className="text-lg font-bold text-white tabular-nums">{dataQuality?.total ? (dataQuality.total > 0 ? '⚠' : '✓') : '-'}</p>
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
        {insights.score.score > 0 && (
          <button onClick={() => onNavigate('financial-health')} className="text-left">
            <GlassCard className="!p-3">
              <Heart size={14} className="text-neon mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{Number(insights.score.score).toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">{t('health.score')}</p>
            </GlassCard>
          </button>
        )}
      </div>

      {/* ── 7. More Features ────────────────────────── */}
      <GlassCard className="mb-4 !p-3">
        <div className="grid grid-cols-3 gap-2">
          {featureLinks.map(({ route, Icon, color, labelKey }) => (
            <button
              key={route}
              onClick={() => onNavigate(route)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors min-h-[52px]"
              aria-label={t(labelKey)}
            >
              <Icon size={16} className={color} />
              <span className="text-[10px] font-medium text-gray-400">{t(labelKey)}</span>
            </button>
          ))}
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
      {/* ── 12. Daily Tip ───────────────────────────── */}
      <GlassCard className="mb-4 !p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
            <Lightbulb size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">Daily Tip</p>
            <p className="text-xs text-gray-400 leading-relaxed">{getTodaysTip()}</p>
          </div>
        </div>
      </GlassCard>

    </div>
  )
})

export default memo(function Dashboard({ onNavigate }) {
  return <DashboardContent onNavigate={onNavigate} />
})
