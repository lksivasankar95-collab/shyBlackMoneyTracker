import { useState, useMemo } from 'react'
import {
  FileText, Download, Printer, Calendar, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, FileDown, FileUp,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { generateMonthlyStatement, printStatement, downloadStatement } from '../utils/pdfExport'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'

export default function StatementExportPage() {
  const { t } = useTranslation()
  const { transactions, debts, budgets, accounts } = useFinance()
  const { addToast } = useToast()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const now = new Date()

  const monthTxs = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    })
  }, [transactions, selectedYear, selectedMonth])

  const monthlySummary = useMemo(() => {
    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, count: monthTxs.length }
  }, [monthTxs])

  const hasData = monthlySummary.count > 0

  const handlePrint = () => {
    try {
      const html = generateMonthlyStatement(transactions, debts, accounts || [], budgets, selectedYear, selectedMonth)
      const ok = printStatement(html)
      if (ok) addToast(t('statements.printOpened'), 'success')
      else addToast(t('statements.printFailed'), 'error')
    } catch {
      addToast(t('statements.generateFailed'), 'error')
    }
  }

  const handleDownload = () => {
    try {
      const html = generateMonthlyStatement(transactions, debts, accounts || [], budgets, selectedYear, selectedMonth)
      const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' }).replace(/ /g, '_')
      downloadStatement(html, `etracker_statement_${monthName}.html`)
      addToast(t('statements.downloaded'), 'success')
    } catch {
      addToast(t('statements.generateFailed'), 'error')
    }
  }

  const canGoPrev = selectedYear > 2020 || (selectedYear === 2020 && selectedMonth > 0)
  const canGoNext = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())

  const goPrev = () => {
    if (selectedMonth === 0) {
      setSelectedYear((y) => y - 1)
      setSelectedMonth(11)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const goNext = () => {
    if (selectedMonth === 11) {
      setSelectedYear((y) => y + 1)
      setSelectedMonth(0)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <FileText size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">{t('statements.title')}</h1>
      </div>

      {/* Month Selector */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-neon" />
            <span className="text-sm font-semibold">{monthLabel}</span>
          </div>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </GlassCard>

      {/* Month Summary */}
      {hasData ? (
        <GlassCard brand className="mb-4">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 p-3 rounded-xl bg-white/[0.03]">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
                <TrendingUp size={12} className="text-neon" />
                <span>{t('common.income')}</span>
              </div>
              <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(monthlySummary.income)}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-white/[0.03]">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
                <TrendingDown size={12} className="text-red-400" />
                <span>{t('common.expense')}</span>
              </div>
              <p className="text-lg font-extrabold text-red-400 tabular-nums">{formatCurrency(monthlySummary.expense)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('statements.transactionsThisMonth', { n: monthlySummary.count })}</span>
            <span className={`font-semibold ${monthlySummary.income - monthlySummary.expense >= 0 ? 'text-neon' : 'text-red-400'}`}>
              {t('statements.net')}: {formatCurrency(monthlySummary.income - monthlySummary.expense)}
            </span>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="mb-4">
          <EmptyState
            icon={FileText}
            title={t('statements.noTransactions')}
            description={t('statements.noTransactionsDesc')}
          />
        </GlassCard>
      )}

      {/* Actions */}
      <div className="space-y-3 mb-4">
        <button
          onClick={handlePrint}
          disabled={!hasData}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-neon/10 border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center shrink-0">
            <Printer size={20} className="text-neon" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('statements.printStatement')}</p>
            <p className="text-[11px] text-gray-500">{t('statements.printDesc')}</p>
          </div>
          <FileUp size={18} className="text-neon shrink-0" />
        </button>

        <button
          onClick={handleDownload}
          disabled={!hasData}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-glass-border hover:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Download size={20} className="text-blue-400" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t('statements.downloadHtml')}</p>
            <p className="text-[11px] text-gray-500">{t('statements.downloadDesc')}</p>
          </div>
          <FileDown size={18} className="text-blue-400 shrink-0" />
        </button>
      </div>

      {/* Statement Content Preview */}
      {hasData && (
        <GlassCard>
          <h2 className="text-sm font-semibold mb-3">{t('statements.includes')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: TrendingUp, label: 'incomeSummary', color: 'text-neon' },
              { icon: TrendingDown, label: 'expenseSummary', color: 'text-red-400' },
              { icon: FileText, label: 'categoryBreakdown', color: 'text-yellow-400' },
              { icon: TrendingUp, label: 'tradingSummary', color: 'text-blue-400' },
              { icon: FileText, label: 'debtSummary', color: 'text-purple-400' },
              { icon: FileText, label: 'netWorthSnapshot', color: 'text-neon' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03]">
                  <Icon size={14} className={item.color} />
                  <span className="text-[11px] text-gray-400">{t(`statements.${item.label}`)}</span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
