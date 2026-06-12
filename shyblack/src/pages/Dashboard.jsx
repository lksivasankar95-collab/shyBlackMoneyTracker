import { TrendingUp, TrendingDown, Target, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, getMonthName } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'

export default function Dashboard({ onNavigate }) {
  const { transactions, getBalance, getMonthlySummary, savingsGoal, deleteTransaction } = useFinance()

  const now = new Date()
  const monthly = getMonthlySummary(now.getFullYear(), now.getMonth())
  const balance = getBalance()
  const savingsProgress = savingsGoal.target > 0 ? Math.min((savingsGoal.saved / savingsGoal.target) * 100, 100) : 0
  const recentTx = transactions.slice(0, 5)

  const getTopCategory = (type) => {
    const grouped = {}
    transactions.filter((t) => t.type === type).forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount
    })
    const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1])
    return entries.length > 0 ? { category: entries[0][0], amount: entries[0][1] } : null
  }

  const topIncome = getTopCategory('income')
  const topExpense = getTopCategory('expense')

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Balance */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 font-medium">Total Balance</p>
        <h1 className="text-4xl font-extrabold text-gradient-brand mt-1 tracking-tight">
          {formatCurrency(balance)}
        </h1>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 mb-4">
        <StatCard
          icon={TrendingUp}
          label="Income"
          value={formatCurrency(monthly.income)}
          color="text-neon"
          subtext={getMonthName(now.getMonth())}
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={formatCurrency(monthly.expense)}
          color="text-red-400"
          subtext={getMonthName(now.getMonth())}
        />
      </div>

      {/* Savings Goal */}
      {savingsGoal.target > 0 && (
        <GlassCard className="mb-4 shadow-neon-sm" glow>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target size={16} className="text-neon" />
              <span>Savings Goal</span>
            </div>
            <span className="text-xs text-gray-500 tabular-nums">
              {formatCurrency(savingsGoal.saved)} / {formatCurrency(savingsGoal.target)}
            </span>
          </div>
          <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon to-green-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${savingsProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{savingsProgress.toFixed(0)}% complete</p>
        </GlassCard>
      )}

      {/* Top Categories */}
      {(topIncome || topExpense) && (
        <div className="flex gap-3 mb-4">
          {topIncome && (
            <GlassCard className="flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 font-medium">
                <ArrowUpRight size={12} className="text-neon" />
                <span>Top Income</span>
              </div>
              <p className="text-sm font-semibold text-neon">{topIncome.category}</p>
              <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{formatCurrency(topIncome.amount)}</p>
            </GlassCard>
          )}
          {topExpense && (
            <GlassCard className="flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 font-medium">
                <ArrowDownRight size={12} className="text-red-400" />
                <span>Top Expense</span>
              </div>
              <p className="text-sm font-semibold text-red-400">{topExpense.category}</p>
              <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{formatCurrency(topExpense.amount)}</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Recent Transactions</h2>
          {transactions.length > 5 && (
            <button onClick={() => onNavigate('history')} className="flex items-center gap-0.5 text-xs text-neon/70 hover:text-neon transition-colors">
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
