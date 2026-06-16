import { useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Eye, EyeOff, ChevronRight,
  AlertCircle, RefreshCw, SkipForward, RotateCcw,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { ALL_CATEGORIES } from '../utils/constants'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'
import AnimatedNumber from '../components/AnimatedNumber'
import SavingsProgress from '../components/SavingsProgress'
import FinancialScore from '../components/FinancialScore'
import NotificationBanner from '../components/NotificationBanner'

export default function Dashboard({ onNavigate }) {
  const {
    transactions, getBalance, getMonthlySummary, savingsGoal,
    deleteTransaction, insights, notification, dismissNotification,
    security, updateSecurity, debtsSummary,
    pendingRecurring, executeAllRecurring, skipAllRecurring,
    executeRecurring, skipRecurring,
    recoverySnapshot, restoreFromSnapshot,
  } = useFinance()

  const [hideBalance, setHideBalance] = useState(security.hideBalance)
  const [showRecurringDetail, setShowRecurringDetail] = useState(false)

  const now = new Date()
  const monthly = getMonthlySummary(now.getFullYear(), now.getMonth())
  const balance = useMemo(() => getBalance(), [getBalance])

  const netWorth = useMemo(() => {
    return balance + debtsSummary.pendingReceivables - debtsSummary.pendingPayables
  }, [balance, debtsSummary])

  const recentTx = useMemo(() => transactions.slice(0, 3), [transactions])

  const toggleHide = useCallback(() => {
    const next = !hideBalance
    setHideBalance(next)
    updateSecurity({ hideBalance: next })
  }, [hideBalance, updateSecurity])

  const hasPendingActions = pendingRecurring.length > 0 || debtsSummary.overdueCount > 0

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">

      {/* ── 1. Net Worth ─────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">Net Worth</p>
          <button
            onClick={toggleHide}
            className="p-2 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-gradient-brand mt-1 tracking-tight glow-neon-sm">
          {hideBalance ? '••••••' : <AnimatedNumber value={netWorth} format={formatCurrency} />}
        </h1>
        {debtsSummary.pendingReceivables > 0 || debtsSummary.pendingPayables > 0 ? (
          <p className="text-[11px] text-gray-600 mt-1">
            {debtsSummary.pendingReceivables > 0 && (
              <span className="text-neon/70">+{formatCurrency(debtsSummary.pendingReceivables)} receivable</span>
            )}
            {debtsSummary.pendingReceivables > 0 && debtsSummary.pendingPayables > 0 && (
              <span className="mx-1">·</span>
            )}
            {debtsSummary.pendingPayables > 0 && (
              <span className="text-red-400/70">-{formatCurrency(debtsSummary.pendingPayables)} payable</span>
            )}
          </p>
        ) : null}
      </div>

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

      {/* ── 3. Pending Actions ────────────────────────── */}
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

      {/* ── 4. Recent Activity ───────────────────────── */}
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

      {/* ── 5. Financial Score ───────────────────────── */}
      {insights.score.score > 0 && (
        <div
          className="mb-4 animate-glow-pulse cursor-pointer"
          onClick={() => onNavigate('insights')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('insights')}
        >
          <FinancialScore score={insights.score} factors={[]} compact />
        </div>
      )}

      {/* ── 6. Savings Progress ──────────────────────── */}
      {savingsGoal.target > 0 && (
        <GlassCard brand>
          <SavingsProgress savingsGoal={savingsGoal} />
        </GlassCard>
      )}
    </div>
  )
}
