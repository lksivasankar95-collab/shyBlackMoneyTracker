import { useState, useMemo, useCallback } from 'react'
import { Download, FileText, BarChart3, Calendar, Share2, Save, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import { exportToCSV, generateMonthlyStatement, generateStatementHTML, downloadCSV, downloadHTML } from '../utils/exports'
import { generateMonthlyReport, generateCategoryReport, generateDateRangeReport, generateAnnualReport } from '../utils/pdfReport'
import { downloadBlob, shareBlob, openFileNative } from '../utils/downloadUtils'
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
  const { t } = useTranslation()
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
  const [downloadResult, setDownloadResult] = useState(null)
  const [showDownloadInfo, setShowDownloadInfo] = useState(false)

  const statement = useMemo(() => generateMonthlyStatement(transactions, selectedYear, selectedMonth), [transactions, selectedYear, selectedMonth])

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(transactions)
    downloadCSV(csv)
    addToast(t('notifications.csv_exported'), 'success')
  }, [transactions, addToast, t])

  const handleExportStatement = useCallback(() => {
    if (statement) {
      const html = generateStatementHTML(statement)
      downloadHTML(html, `shyblack_statement_${MONTHS[selectedMonth]}_${selectedYear}.html`)
      addToast(t('notifications.statement_generated'), 'success')
    }
  }, [statement, selectedMonth, selectedYear, addToast, t])

  const handleGeneratePDF = useCallback(async () => {
    setPdfLoading(true)
    setPdfError(null)
    setPdfDataUri(null)
    setPdfBlob(null)
    setDownloadResult(null)
    setShowDownloadInfo(false)
    try {
      if (transactions.length === 0) throw new Error(t('reports.no_data_desc'))
      let result
      switch (reportType) {
        case 'monthly':
          result = generateMonthlyReport(transactions, selectedMonth, selectedYear)
          break
        case 'category':
          result = generateCategoryReport(transactions, selectedMonth, selectedYear)
          break
        case 'daterange':
          if (!dateFrom || !dateTo) throw new Error(t('reports.select_dates'))
          if (dateFrom > dateTo) throw new Error(t('reports.start_before_end'))
          result = generateDateRangeReport(transactions, dateFrom, dateTo)
          break
        case 'annual':
          result = generateAnnualReport(transactions, selectedYear)
          break
        default:
          throw new Error(t('reports.unknown_type'))
      }
      setPdfDataUri(result.dataUri)
      setPdfBlob(result.blob)
      const saveResult = await downloadBlob(result.blob, `shyblack_report_${Date.now()}.pdf`)
      if (saveResult.success) {
        setDownloadResult(saveResult)
        setShowDownloadInfo(true)
        addToast(t('notifications.pdf_saved', { pageCount: result.pageCount }), 'success')
      } else {
        addToast(t('notifications.file_saved_unknown'), 'info')
      }
    } catch (e) {
      setPdfError(e.message || t('notifications.pdf_generate_failed'))
      addToast(e.message || t('notifications.pdf_generate_failed'), 'error')
    } finally {
      setPdfLoading(false)
    }
  }, [transactions, reportType, selectedMonth, selectedYear, dateFrom, dateTo, addToast, t])

  const handleOpenPDF = useCallback(async () => {
    if (!pdfBlob) return
    const result = await openFileNative(pdfBlob, `shyblack_report_${Date.now()}.pdf`)
    if (result.action === 'cancelled') return
  }, [pdfBlob])

  const handleSharePDF = useCallback(async () => {
    if (!pdfBlob) return
    const result = await shareBlob(pdfBlob, `shyblack_report_${Date.now()}.pdf`, 'ShyBlack Finance Report')
    if (result.shared) {
      addToast(t('notifications.file_shared'), 'success')
    } else if (result.method === 'unsupported') {
      addToast(t('notifications.share_unsupported'), 'info')
    }
  }, [pdfBlob, addToast, t])

  const handleDownloadPDF = useCallback(async () => {
    if (!pdfBlob) return
    const result = await downloadBlob(pdfBlob, `shyblack_report_${Date.now()}.pdf`)
    if (result.success) {
      setDownloadResult(result)
      setShowDownloadInfo(true)
      addToast(t('notifications.file_downloaded'), 'success')
    } else {
      addToast(t('notifications.download_failed'), 'error')
    }
  }, [pdfBlob, addToast, t])

  const handleSavePDF = useCallback(() => {
    handleDownloadPDF()
  }, [handleDownloadPDF])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">{t('reports.title')}</h1>

      {transactions.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={FileText}
            title={t('reports.no_data')}
            description={t('reports.no_data_desc')}
          />
        </GlassCard>
      ) : (
        <>
          {/* PDF Report Generation */}
          <GlassCard brand className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('reports.generate_pdf')}</h2>
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
                  {t('reports.types.' + rt.id)}
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
                      <option key={i} value={i}>{t('months_short.' + i)}</option>
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
                    placeholder={t('reports.date_from')}
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPdfDataUri(null); setPdfBlob(null) }}
                    className="input-field text-[10px] flex-1"
                    placeholder={t('reports.date_to')}
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
                <><Loader2 size={16} className="animate-spin" /> {t('common.generating')}</>
              ) : (
                <><FileText size={16} /> {t('reports.generate_report')}</>
              )}
            </button>

            {pdfError && (
              <p className="text-[11px] text-red-400 mt-2 text-center">{pdfError}</p>
            )}

            {/* PDF Actions */}
            {pdfDataUri && !pdfLoading && !showDownloadInfo && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleOpenPDF}
                  className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2.5"
                >
                  <ExternalLink size={14} />
                  {t('reports.open_report')}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleSharePDF}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Share2 size={13} />
                    {t('reports.share')}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Download size={13} />
                    {t('reports.save_again')}
                  </button>
                </div>
              </div>
            )}

            {/* Download Info Modal */}
            {showDownloadInfo && downloadResult && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-glass-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-neon" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t('reports.report_saved')}</p>
                    <p className="text-[10px] text-gray-500">{t('reports.saved_desc')}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="p-2.5 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-gray-500 mb-0.5">{t('reports.file_name')}</p>
                    <p className="text-xs text-white font-medium break-all">{downloadResult.filename}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-gray-500 mb-0.5">{t('reports.location')}</p>
                    <p className="text-xs text-gray-300 font-mono">{downloadResult.path}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleOpenPDF}
                    className="flex-1 py-2.5 rounded-xl bg-neon/10 text-neon text-xs font-medium border border-neon/20 hover:bg-neon/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    {t('reports.open_report')}
                  </button>
                  <button
                    onClick={handleSharePDF}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-medium hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Share2 size={13} />
                    {t('reports.share')}
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Monthly Statement */}
          <GlassCard className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('reports.monthly_statement')}</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input-field text-xs flex-1"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{t('months_short.' + i)}</option>
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
                    <p className="text-[11px] text-gray-500 mb-1">{t('common.income')}</p>
                    <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(statement.income)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/5">
                    <p className="text-[11px] text-gray-500 mb-1">{t('common.expense')}</p>
                    <p className="text-lg font-extrabold text-red-400 tabular-nums">{formatCurrency(statement.expenses)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                  <span className="text-xs text-gray-500">{t('common.balance')}</span>
                  <span className={`text-sm font-bold tabular-nums ${statement.balance >= 0 ? 'text-neon' : 'text-red-400'}`}>
                    {formatCurrency(statement.balance)}
                  </span>
                </div>

                <button onClick={handleExportStatement} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  <Download size={16} />
                  {t('reports.download_statement')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">{t('reports.no_transactions_period')}</p>
            )}
          </GlassCard>

          {/* Export Options */}
          <GlassCard className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('reports.export_options')}</h2>
            </div>
            <div className="space-y-2">
              <button onClick={handleExportCSV} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Download size={16} />
                {t('reports.export_csv')}
              </button>
            </div>
          </GlassCard>

          {/* Summary Stats */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('reports.account_summary')}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t('reports.total_transactions')}</span>
                <span className="text-sm font-semibold tabular-nums">{transactions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t('reports.total_income')}</span>
                <span className="text-sm font-semibold text-neon tabular-nums">
                  {formatCurrency(transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t('reports.total_expenses')}</span>
                <span className="text-sm font-semibold text-red-400 tabular-nums">
                  {formatCurrency(transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="border-t border-glass-border pt-3 flex justify-between items-center">
                <span className="text-xs font-medium">{t('common.net_worth')}</span>
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
