import { Wallet, TrendingUp, TrendingDown, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, getMonthName } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import TransactionItem from '../components/TransactionItem'
import EmptyState from '../components/EmptyState'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../utils/constants'

export default function Dashboard() {
  const { transactions, getBalance, getMonthlySummary, savingsGoal, deleteTransaction } = useFinance()

  const now = new Date()
  const monthly = getMonthlySummary(now.getFullYear(), now.getMonth())
  const balance = getBalance()
  const savingsProgress = savingsGoal.target > 0 ? (savingsGoal.saved / savingsGoal.target) * 100 : 0

  const recentTx = transactions.slice(0, 5)

  const categoryBreakdown = () => {
    const income = { icon: 'TrendingUp', color: 'bg-neon/10 text-neon' }
    const expense = { icon: 'TrendingDown', color: 'bg-red-500/10 text-red-400' }
    const topIncome = INCOME_CATEGORIES.map(c => ({
      ...c,
      amount: transactions.filter(t => t.type === 'income' && t.category === c.id).reduce((s, t) => s + t.amount, 0),
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)[0]

    const topExpense = EXPENSE_CATEGORIES.map(c => ({
      ...c,
      amount: transactions.filter(t => t.type === 'expense' && t.category === c.id).reduce((s, t) => s + t.amount, 0),
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)[0]

    return { topIncome, topExpense }
  }

  const { topIncome, topExpense } = categoryBreakdown()

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6 mt-2">
        <p className="text-sm text-gray-500">Total Balance</p>
        <h1 className="text-4xl font-extrabold text-gradient mt-1">
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
          subtext={`${getMonthName(now.getMonth())} ${now.getFullYear()}`}
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={formatCurrency(monthly.expense)}
          color="text-red-400"
          subtext={`${getMonthName(now.getMonth())} ${now.getFullYear()}`}
        />
      </div>

      {/* Savings Goal */}
      {savingsGoal.target > 0 && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target size={16} className="text-neon" />
              <span>Savings Goal</span>
            </div>
            <span className="text-xs text-gray-500">
              {formatCurrency(savingsGoal.saved)} / {formatCurrency(savingsGoal.target)}
            </span>
          </div>
          <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(savingsProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {savingsProgress.toFixed(0)}% complete
          </p>
        </GlassCard>
      )}

      {/* Top Categories */}
      {(topIncome || topExpense) && (
        <div className="flex gap-3 mb-4">
          {topIncome && (
            <GlassCard className="flex-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <ArrowUpRight size={12} className="text-neon" />
                <span>Top Income</span>
              </div>
              <p className="text-sm font-semibold text-neon">{topIncome.label}</p>
              <p className="text-xs text-gray-400">{formatCurrency(topIncome.amount)}</p>
            </GlassCard>
          )}
          {topExpense && (
            <GlassCard className="flex-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <ArrowDownRight size={12} className="text-red-400" />
                <span>Top Expense</span>
              </div>
              <p className="text-sm font-semibold text-red-400">{topExpense.label}</p>
              <p className="text-xs text-gray-400">{formatCurrency(topExpense.amount)}</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Recent Transactions</h2>
          {transactions.length > 5 && (
            <span className="text-xs text-neon/70">View all</span>
          )}
        </div>
        <GlassCard>
          {recentTx.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Add your first income or expense to get started"
            />
          ) : (
            recentTx.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onDelete={deleteTransaction}
                compact
              />
            ))
          )}
        </GlassCard>
      </div>
    </div>
  )
}
