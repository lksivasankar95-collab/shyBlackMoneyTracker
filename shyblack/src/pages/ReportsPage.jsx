import { useState } from 'react'
import { Download, FileText, BarChart3, Calendar } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { exportToCSV, generateMonthlyStatement, generateStatementHTML, downloadCSV, downloadHTML } from '../utils/exports'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ReportsPage() {
  const { transactions } = useFinance()
  const { addToast } = useToast()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const statement = generateMonthlyStatement(transactions, selectedYear, selectedMonth)

  const handleExportCSV = () => {
    const csv = exportToCSV(transactions)
    downloadCSV(csv)
    addToast('CSV exported!', 'success')
  }

  const handleExportStatement = () => {
    if (statement) {
      const html = generateStatementHTML(statement)
      downloadHTML(html, `shyblack_statement_${MONTHS[selectedMonth]}_${selectedYear}.html`)
      addToast('Statement generated!', 'success')
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">Reports & Export</h1>

      {transactions.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={FileText}
            title="No data to export"
            description="Add transactions to generate reports"
          />
        </GlassCard>
      ) : (
        <>
          {/* Monthly Statement */}
          <GlassCard brand className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">Monthly Statement</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input-field text-xs flex-1"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input-field text-xs flex-1"
              >
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {statement ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-neon/5">
                    <p className="text-[11px] text-gray-500 mb-1">Income</p>
                    <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(statement.income)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/5">
                    <p className="text-[11px] text-gray-500 mb-1">Expenses</p>
                    <p className="text-lg font-extrabold text-red-400 tabular-nums">{formatCurrency(statement.expenses)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                  <span className="text-xs text-gray-500">Net Balance</span>
                  <span className={`text-sm font-bold tabular-nums ${statement.balance >= 0 ? 'text-neon' : 'text-red-400'}`}>
                    {formatCurrency(statement.balance)}
                  </span>
                </div>

                <button onClick={handleExportStatement} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  <Download size={16} />
                  Download Statement
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No transactions for this period</p>
            )}
          </GlassCard>

          {/* Export Options */}
          <GlassCard className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">Export Options</h2>
            </div>
            <div className="space-y-2">
              <button onClick={handleExportCSV} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Download size={16} />
                Export All as CSV
              </button>
            </div>
          </GlassCard>

          {/* Summary Stats */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">Account Summary</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Transactions</span>
                <span className="text-sm font-semibold tabular-nums">{transactions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Income</span>
                <span className="text-sm font-semibold text-neon tabular-nums">
                  {formatCurrency(transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Expenses</span>
                <span className="text-sm font-semibold text-red-400 tabular-nums">
                  {formatCurrency(transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="border-t border-glass-border pt-3 flex justify-between items-center">
                <span className="text-xs font-medium">Net Worth</span>
                <span className={`text-sm font-extrabold tabular-nums ${
                  transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0) >= 0
                    ? 'text-neon' : 'text-red-400'
                }`}>
                  {formatCurrency(transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0))}
                </span>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
