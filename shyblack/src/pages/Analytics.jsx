import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const NEON = '#39ff14'
const RED = '#ef4444'
const COLORS = ['#39ff14', '#22c55e', '#16a34a', '#15803d', '#ef4444', '#f97316', '#eab308', '#a855f7', '#3b82f6', '#ec4899']

export default function Analytics() {
  const { getMonthlyData, transactions } = useFinance()

  const monthlyData = getMonthlyData()

  const currentMonth = useMemo(() => {
    const now = new Date()
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, count: monthTxs.length }
  }, [transactions])

  const categoryData = useMemo(() => {
    const now = new Date()
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const expenseByCat = {}
    monthTxs.filter((t) => t.type === 'expense').forEach((t) => {
      if (!expenseByCat[t.category]) expenseByCat[t.category] = 0
      expenseByCat[t.category] += t.amount
    })
    return Object.entries(expenseByCat).map(([cat, amount]) => {
      const catInfo = EXPENSE_CATEGORIES.find((c) => c.id === cat)
      return { name: catInfo?.label || cat, value: amount }
    }).sort((a, b) => b.value - a.value)
  }, [transactions])

  const hasData = transactions.length > 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 text-xs">
          <p className="text-gray-400 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="font-medium" style={{ color: p.fill }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (!hasData) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-6">Analytics</h1>
        <GlassCard>
          <EmptyState
            icon={BarChart}
            title="No data to analyze"
            description="Add some transactions to see your analytics"
          />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Analytics</h1>

      {/* Monthly Summary */}
      <div className="flex gap-3 mb-6">
        <GlassCard className="flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <TrendingUp size={12} className="text-neon" />
            <span>Income</span>
          </div>
          <p className="text-lg font-bold text-neon">{formatCurrency(currentMonth.income)}</p>
          <p className="text-xs text-gray-600 mt-0.5">{currentMonth.count} transactions</p>
        </GlassCard>
        <GlassCard className="flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <TrendingDown size={12} className="text-red-400" />
            <span>Expenses</span>
          </div>
          <p className="text-lg font-bold text-red-400">{formatCurrency(currentMonth.expense)}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {currentMonth.income > 0 ? `${((currentMonth.expense / currentMonth.income) * 100).toFixed(0)}% of income` : ''}
          </p>
        </GlassCard>
      </div>

      {/* Monthly Bar Chart */}
      <GlassCard className="mb-4">
        <h2 className="text-sm font-semibold mb-4">Monthly Overview</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="income" fill={NEON} radius={[4, 4, 0, 0]} maxBarSize={20} name="Income" />
              <Bar dataKey="expense" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={20} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Category Pie Chart */}
      {categoryData.length > 0 && (
        <GlassCard>
          <h2 className="text-sm font-semibold mb-4">Expense Breakdown</h2>
          <div className="flex items-center gap-6">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs text-gray-400">{item.name}</span>
                  </div>
                  <span className="text-xs font-medium text-white">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
