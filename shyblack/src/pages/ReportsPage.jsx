import { useState, useMemo, useCallback } from 'react'
import { Download, FileText, BarChart3, Calendar, Share2, Save, Eye, Loader2 } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { exportToCSV, generateMonthlyStatement, generateStatementHTML, downloadCSV, downloadHTML } from '../utils/exports'
import { generateMonthlyReport, generateCategoryReport, generateDateRangeReport, generateAnnualReport } from '../utils/pdfReport'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const REPORT_TYPES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'category', label: 'Category' },
  { id: 'daterange', label: 'Date Range' },
  { id: 'annual', label: 'Annual' },
]

export default function ReportsPage() {
  const { transactions } = useFinance()
  const { addToast } = useToast()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [reportType, setReportType] = useState('monthly')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pdfDataUri, setPdfDataUri] = useState(null)
  const [pdfBlob, setPdfBlob] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const statement = useMemo(() => generateMonthlyStatement(transactions, selectedYear, selectedMonth), [transactions, selectedYear, selectedMonth])

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(transactions)
    downloadCSV(csv)
    addToast('CSV exported!', 'success')
  }, [transactions, addToast])

  const handleExportStatement = useCallback(() => {
    if (statement) {
      const html = generateStatementHTML(statement)
      downloadHTML(html, `shyblack_statement_${MONTHS[selectedMonth]}_${selectedYear}.html`)
      addToast('Statement generated!', 'success')
    }
  }, [statement, selectedMonth, selectedYear, addToast])

  const handleGeneratePDF = useCallback(async () => {
    setPdfLoading(true)
    setPdfError(null)
    setPdfDataUri(null)
    setPdfBlob(null)
    setShowPreview(false)
    try {
      if (transactions.length === 0) throw new Error('No transactions to generate report from.')
      const r = await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            let result
            switch (reportType) {
              case 'monthly':
                result = generateMonthlyReport(transactions, selectedMonth, selectedYear)
                break
              case 'category':
                result = generateCategoryReport(transactions, selectedMonth, selectedYear)
                break
              case 'daterange':
                if (!dateFrom || !dateTo) throw new Error('Please select both start and end dates.')
                if (dateFrom > dateTo) throw new Error('Start date must be before end date.')
                result = generateDateRangeReport(transactions, dateFrom, dateTo)
                break
              case 'annual':
                result = generateAnnualReport(transactions, selectedYear)
                break
              default:
                throw new Error('Unknown report type')
            }
            resolve(result)
          } catch (e) {
            reject(e)
          }
        }, 100)
      })
      setPdfDataUri(r.dataUri)
      setPdfBlob(r.blob)
      addToast(`${r.pageCount}-page PDF generated!`, 'success')
    } catch (e) {
      setPdfError(e.message || 'Failed to generate PDF')
      addToast(e.message || 'Failed to generate PDF', 'error')
    } finally {
      setPdfLoading(false)
    }
  }, [transactions, reportType, selectedMonth, selectedYear, dateFrom, dateTo, addToast])

  const handleDownloadPDF = useCallback(() => {
    if (!pdfDataUri) return
    const link = document.createElement('a')
    link.href = pdfDataUri
    link.download = `shyblack_report_${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('PDF downloaded!', 'success')
  }, [pdfDataUri, addToast])

  const handleSharePDF = useCallback(async () => {
    if (!pdfBlob) return
    if (navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], `shyblack_report_${Date.now()}.pdf`, { type: 'application/pdf' })
      try {
        await navigator.share({ files: [file], title: 'ShyBlack Finance Report' })
        addToast('PDF shared!', 'success')
      } catch {
        addToast('Share cancelled or failed', 'error')
      }
    } else {
      addToast('Sharing not supported on this device. Use Download instead.', 'error')
    }
  }, [pdfBlob, addToast])

  const handleSavePDF = useCallback(() => {
    handleDownloadPDF()
  }, [handleDownloadPDF])

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
          {/* PDF Report Generation */}
          <GlassCard brand className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">Generate PDF Report</h2>
            </div>

            {/* Report Type Selector */}
            <div className="flex gap-1.5 mb-4">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => { setReportType(rt.id); setPdfDataUri(null); setPdfBlob(null); setPdfError(null) }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    reportType === rt.id
                      ? 'bg-neon/10 text-neon border border-neon/30'
                      : 'text-gray-500 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            {/* Config Fields */}
            <div className="space-y-3 mb-4">
              {reportType !== 'daterange' && (
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setPdfDataUri(null); setPdfBlob(null) }}
                    className="input-field text-[10px] flex-1"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setPdfDataUri(null); setPdfBlob(null) }}
                    className="input-field text-[10px] flex-1"
                  >
                    {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
              {reportType === 'daterange' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPdfDataUri(null); setPdfBlob(null) }}
                    className="input-field text-[10px] flex-1"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPdfDataUri(null); setPdfBlob(null) }}
                    className="input-field text-[10px] flex-1"
                    placeholder="To"
                  />
                </div>
              )}
              {reportType === 'annual' && (
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setPdfDataUri(null); setPdfBlob(null) }}
                  className="input-field text-[10px] w-full"
                >
                  {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleGeneratePDF}
              disabled={pdfLoading}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pdfLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><FileText size={16} /> Generate Report</>
              )}
            </button>

            {pdfError && (
              <p className="text-[11px] text-red-400 mt-2 text-center">{pdfError}</p>
            )}

            {/* PDF Actions */}
            {pdfDataUri && !pdfLoading && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Eye size={13} />
                    {showPreview ? 'Hide' : 'Preview'}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="btn-primary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Download size={13} />
                    Download
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSharePDF}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                  <button
                    onClick={handleSavePDF}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Save size={13} />
                    Save
                  </button>
                </div>

                {showPreview && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-glass-border">
                    <iframe
                      src={pdfDataUri}
                      className="w-full h-[400px]"
                      title="PDF Preview"
                    />
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Monthly Statement */}
          <GlassCard className="mb-4">
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
