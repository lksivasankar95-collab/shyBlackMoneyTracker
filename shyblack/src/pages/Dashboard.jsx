import { useState, useMemo, useCallback } from 'react'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronRight, Eye, EyeOff, Send, BarChart3 } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, getMonthName } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'
import AnimatedNumber from '../components/AnimatedNumber'
import QuickActions from '../components/QuickActions'
import SavingsProgress from '../components/SavingsProgress'
import FinancialScore from '../components/FinancialScore'
import NotificationBanner from '../components/NotificationBanner'

export default function Dashboard({ onNavigate }) {
  const { transactions, getBalance, getMonthlySummary, savingsGoal, deleteTransaction, insights, notification, dismissNotification, security, updateSecurity } = useFinance()
  const [hideBalance, setHideBalance] = useState(security.hideBalance)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const monthly = getMonthlySummary(currentYear, currentMonth)
  const balance = useMemo(() => getBalance(), [getBalance])
  const recentTx = useMemo(() => transactions.slice(0, 5), [transactions])

  const topCategories = useMemo(() => {
    const getTop = (type) => {
      const grouped = {}
      transactions.filter((t) => t.type === type).forEach((t) => {
        grouped[t.category] = (grouped[t.category] || 0) + t.amount
      })
      const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1])
      return entries.length > 0 ? { category: entries[0][0], amount: entries[0][1] } : null
    }
    return { income: getTop('income'), expense: getTop('expense') }
  }, [transactions])

  const tradingMetrics = useMemo(() => {
    const capitalInvested = transactions
      .filter((t) => t.transactionPurpose === 'investment_transfer')
      .reduce((sum, t) => sum + t.amount, 0)
    const tradingProfit = transactions
      .filter((t) => t.transactionPurpose === 'trading_profit')
      .reduce((sum, t) => sum + t.amount, 0)
    const tradingLoss = transactions
      .filter((t) => t.transactionPurpose === 'trading_loss')
      .reduce((sum, t) => sum + t.amount, 0)
    return { capitalInvested, tradingProfit, tradingLoss, netResult: tradingProfit - tradingLoss }
  }, [transactions])

  const toggleHide = useCallback(() => {
    const newVal = !hideBalance
    setHideBalance(newVal)
    updateSecurity({ hideBalance: newVal })
  }, [hideBalance, updateSecurity])

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">Total Balance</p>
          <button onClick={toggleHide} className="p-2 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
            {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-gradient-brand mt-1 tracking-tight glow-neon-sm">
          {hideBalance ? '••••••' : <AnimatedNumber value={balance} format={formatCurrency} />}
        </h1>
      </div>

      <NotificationBanner notification={notification} onDismiss={dismissNotification} />

      <div className="mb-5">
        <QuickActions onNavigate={onNavigate} compact />
      </div>

      {insights.score.score > 0 && (
        <div className="mb-4 animate-glow-pulse" onClick={() => onNavigate('insights')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigate('insights')}>
          <FinancialScore score={insights.score} factors={[]} compact />
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <StatCard
          icon={TrendingUp}
          label="Income"
          value={hideBalance ? '••••' : formatCurrency(monthly.income)}
          color="text-neon"
          subtext={getMonthName(currentMonth)}
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={hideBalance ? '••••' : formatCurrency(monthly.expense)}
          color="text-red-400"
          subtext={getMonthName(currentMonth)}
        />
      </div>

      {savingsGoal.target > 0 && (
        <div className="mb-4">
          <GlassCard brand>
            <SavingsProgress savingsGoal={savingsGoal} />
          </GlassCard>
        </div>
      )}

      {(tradingMetrics.capitalInvested > 0 || tradingMetrics.tradingProfit > 0 || tradingMetrics.tradingLoss > 0) && (
        <div className="mb-4">
          <GlassCard brand className="border-neon/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <BarChart3 size={14} className="text-purple-400" />
              </div>
              <h2 className="text-xs font-semibold text-gray-300">Trading Summary</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tradingMetrics.capitalInvested > 0 && (
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                    <Send size={10} className="text-blue-400" />
                    Invested
                  </div>
                  <p className="text-xs font-bold text-blue-400 tabular-nums">{formatCurrency(tradingMetrics.capitalInvested)}</p>
                </div>
              )}
              {tradingMetrics.tradingProfit > 0 && (
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                    <TrendingUp size={10} className="text-purple-400" />
                    Profit
                  </div>
                  <p className="text-xs font-bold text-purple-400 tabular-nums">{formatCurrency(tradingMetrics.tradingProfit)}</p>
                </div>
              )}
              {tradingMetrics.tradingLoss > 0 && (
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                    <TrendingDown size={10} className="text-orange-400" />
                    Loss
                  </div>
                  <p className="text-xs font-bold text-orange-400 tabular-nums">{formatCurrency(tradingMetrics.tradingLoss)}</p>
                </div>
              )}
            </div>
            {(tradingMetrics.tradingProfit > 0 || tradingMetrics.tradingLoss > 0) && (
              <div className="mt-2 pt-2 border-t border-glass-border flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Net Trading Result</span>
                <span className={`text-xs font-bold tabular-nums ${tradingMetrics.netResult >= 0 ? 'text-neon' : 'text-red-400'}`}>
                  {tradingMetrics.netResult >= 0 ? '+' : ''}{formatCurrency(tradingMetrics.netResult)}
                </span>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {(topCategories.income || topCategories.expense) && (
        <div className="flex gap-3 mb-4">
          {topCategories.income && (
            <GlassCard brand className="flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 font-medium">
                <ArrowUpRight size={12} className="text-neon" />
                <span>Top Income</span>
              </div>
              <p className="text-sm font-semibold text-neon">{topCategories.income.category}</p>
              <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{hideBalance ? '••••' : formatCurrency(topCategories.income.amount)}</p>
            </GlassCard>
          )}
          {topCategories.expense && (
            <GlassCard brand className="flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 font-medium">
                <ArrowDownRight size={12} className="text-red-400" />
                <span>Top Expense</span>
              </div>
              <p className="text-sm font-semibold text-red-400">{topCategories.expense.category}</p>
              <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{hideBalance ? '••••' : formatCurrency(topCategories.expense.amount)}</p>
            </GlassCard>
          )}
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Recent Transactions</h2>
          {transactions.length > 5 && (
            <button onClick={() => onNavigate('history')} className="flex items-center gap-0.5 text-xs text-neon/70 hover:text-neon transition-colors min-h-[28px]">
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
    </div>
  )
}
