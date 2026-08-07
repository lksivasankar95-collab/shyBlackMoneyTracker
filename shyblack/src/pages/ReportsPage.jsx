import { useState, useMemo, useCallback } from 'react'
import { Download, FileText, BarChart3, Calendar, Share2, Loader2, ExternalLink, CheckCircle2, Tag, FileSpreadsheet, Code, Layers, History } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import {
  generateMonthlyStatement, generateStatementHTML, downloadHTML,
  transactionsToCsv, downloadCsv, downloadXlsx, exportToExcelWithSummary,
  exportWithChartsToHTML, downloadHtml, generateExportSummary,
  exportByMonth, exportByYear, exportByCategory, exportByCustomRange,
} from '../utils/exports'
import {
  generateMonthlyReport, generateCategoryReport, generateDateRangeReport, generateAnnualReport,
  generateCustomReport,
} from '../utils/pdfReport'
import { downloadBlob, shareBlob, openFileNative } from '../utils/downloadUtils'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { ALL_CATEGORIES } from '../utils/constants'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const REPORT_TYPES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'category', label: 'Category' },
  { id: 'daterange', label: 'Date Range' },
  { id: 'annual', label: 'Annual' },
]
const EXPORT_FORMATS = [
  { id: 'csv', label: 'CSV', icon: FileText },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { id: 'html', label: 'HTML Report', icon: Code },
  { id: 'pdf', label: 'PDF', icon: FileText },
]
const EXPORT_SCOPES = [
  { id: 'all', label: 'All Transactions' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom_range', label: 'Custom Range' },
  { id: 'by_category', label: 'By Category' },
]

export default function ReportsPage() {
  const { t } = useTranslation()
  const { transactions, tags } = useFinance()
  const { addToast } = useToast()
  const now = useMemo(() => new Date(), [])
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
  const [selectedTags, setSelectedTags] = useState([])
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportScope, setExportScope] = useState('all')
  const [customCategory, setCustomCategory] = useState('')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [exportWithCharts, setExportWithCharts] = useState(true)
  const [batchExport, setBatchExport] = useState(false)
  const [exportHistory, setExportHistory] = useState([])

  const filteredTxs = useMemo(() => {
    let result = [...transactions]
    if (selectedTags.length > 0) {
      result = result.filter((t) => t.tags && t.tags.some((tag) => selectedTags.includes(tag)))
    }
    const scope = exportScope
    if (scope === 'this_month') {
      result = exportByMonth(result, now.getFullYear(), now.getMonth())
    } else if (scope === 'this_year') {
      result = exportByYear(result, now.getFullYear())
    } else if (scope === 'custom_range') {
      if (customDateFrom && customDateTo) {
        result = exportByCustomRange(result, customDateFrom, customDateTo)
      }
    } else if (scope === 'by_category') {
      if (customCategory) {
        result = exportByCategory(result, customCategory)
      }
    }
    return result
  }, [transactions, selectedTags, exportScope, customCategory, customDateFrom, customDateTo, now])

  const exportSummary = useMemo(() => generateExportSummary(filteredTxs), [filteredTxs])

  const statement = useMemo(() => generateMonthlyStatement(transactions, selectedYear, selectedMonth), [transactions, selectedYear, selectedMonth])

  const getExportFilename = useCallback((ext) => {
    const dateStr = new Date().toISOString().split('T')[0]
    const scopePrefix = exportScope !== 'all' ? exportScope : 'all'
    return `etracker_${scopePrefix}_${dateStr}.${ext}`
  }, [exportScope])

  const handleExport = useCallback(async (singleFormat) => {
    const formats = singleFormat ? [singleFormat] : (batchExport ? EXPORT_FORMATS.map((f) => f.id) : [exportFormat])
    const results = []

    for (const fmt of formats) {
      try {
        if (filteredTxs.length === 0) throw new Error('No transactions to export')
        if (fmt === 'csv') {
          const csv = transactionsToCsv(filteredTxs)
          downloadCsv(csv, getExportFilename('csv'))
          results.push('CSV')
        } else if (fmt === 'excel') {
          const data = { transactions: filteredTxs, debts: [], goals: [], emis: [], transfers: [], accounts: [] }
          const blob = exportToExcelWithSummary(data, exportSummary)
          if (blob) {
            downloadXlsx(blob, getExportFilename('xlsx'))
            results.push('Excel')
          }
        } else if (fmt === 'html') {
          let html
          if (exportWithCharts) {
            html = exportWithChartsToHTML(filteredTxs, exportSummary)
          } else {
            const stmt = generateMonthlyStatement(filteredTxs, selectedYear, selectedMonth)
            html = stmt ? generateStatementHTML(stmt) : exportWithChartsToHTML(filteredTxs, exportSummary)
          }
          downloadHtml(html, getExportFilename('html'))
          results.push('HTML')
        } else if (fmt === 'pdf') {
          setPdfLoading(true)
          setPdfError(null)
          let result
          const opts = { includeCharts: exportWithCharts, includeSummary: true }
          if (exportScope === 'custom_range') {
            result = generateCustomReport(filteredTxs, { ...opts, dateFrom: customDateFrom, dateTo: customDateTo, title: 'Custom Range Report', periodLabel: `${customDateFrom} \u2014 ${customDateTo}` })
          } else if (exportScope === 'by_category') {
            result = generateCustomReport(filteredTxs, { ...opts, category: customCategory, title: 'Category Report', periodLabel: `Category: ${customCategory}` })
          } else if (exportScope === 'this_year') {
            result = generateAnnualReport(filteredTxs, now.getFullYear())
          } else if (exportScope === 'this_month') {
            result = generateMonthlyReport(filteredTxs, now.getMonth(), now.getFullYear())
          } else {
            result = generateCustomReport(filteredTxs, { ...opts, dateFrom: '', dateTo: '', title: 'Full Report', periodLabel: 'All Transactions' })
          }
          setPdfDataUri(result.dataUri)
          setPdfBlob(result.blob)
          const saveResult = await downloadBlob(result.blob, getExportFilename('pdf'))
          if (saveResult.success) {
            setDownloadResult(saveResult)
            setShowDownloadInfo(true)
            results.push(`PDF (${result.pageCount}p)`)
          } else {
            results.push('PDF (saved)')
          }
        }
      } catch (e) {
        addToast(e.message || 'Export failed', 'error')
      }
    }

    if (results.length > 0) {
      const exportRecord = {
        id: Date.now(),
        formats: results,
        scope: exportScope,
        count: filteredTxs.length,
        timestamp: new Date().toLocaleString('en-IN'),
      }
      setExportHistory((prev) => [exportRecord, ...prev].slice(0, 20))
      addToast(`Exported: ${results.join(', ')}`, 'success')
    }
    setPdfLoading(false)
  }, [filteredTxs, exportFormat, exportScope, batchExport, exportWithCharts, exportSummary, getExportFilename, customDateFrom, customDateTo, customCategory, selectedMonth, selectedYear, now, addToast])


  const handleExportStatement = useCallback(() => {
    if (statement) {
      const html = generateStatementHTML(statement)
      downloadHTML(html, `etracker_statement_${MONTHS[selectedMonth]}_${selectedYear}.html`)
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
      if (filteredTxs.length === 0) throw new Error(t('reports.no_data_desc'))
      let result
      switch (reportType) {
        case 'monthly':
          result = generateMonthlyReport(filteredTxs, selectedMonth, selectedYear)
          break
        case 'category':
          result = generateCategoryReport(filteredTxs, selectedMonth, selectedYear)
          break
        case 'daterange':
          if (!dateFrom || !dateTo) throw new Error(t('reports.select_dates'))
          if (dateFrom > dateTo) throw new Error(t('reports.start_before_end'))
          result = generateDateRangeReport(filteredTxs, dateFrom, dateTo)
          break
        case 'annual':
          result = generateAnnualReport(filteredTxs, selectedYear)
          break
        default:
          throw new Error(t('reports.unknown_type'))
      }
      setPdfDataUri(result.dataUri)
      setPdfBlob(result.blob)
      const saveResult = await downloadBlob(result.blob, `etracker_report_${Date.now()}.pdf`)
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
  }, [filteredTxs, reportType, selectedMonth, selectedYear, dateFrom, dateTo, addToast, t])

  const handleOpenPDF = useCallback(async () => {
    if (!pdfBlob) return
    const result = await openFileNative(pdfBlob, `etracker_report_${Date.now()}.pdf`)
    if (result.action === 'cancelled') return
  }, [pdfBlob])

  const handleSharePDF = useCallback(async () => {
    if (!pdfBlob) return
    const result = await shareBlob(pdfBlob, `etracker_report_${Date.now()}.pdf`, 'Expense Tracker Report')
    if (result.shared) {
      addToast(t('notifications.file_shared'), 'success')
    } else if (result.method === 'unsupported') {
      addToast(t('notifications.share_unsupported'), 'info')
    }
  }, [pdfBlob, addToast, t])

  const handleDownloadPDF = useCallback(async () => {
    if (!pdfBlob) return
    const result = await downloadBlob(pdfBlob, `etracker_report_${Date.now()}.pdf`)
    if (result.success) {
      setDownloadResult(result)
      setShowDownloadInfo(true)
      addToast(t('notifications.file_downloaded'), 'success')
    } else {
      addToast(t('notifications.download_failed'), 'error')
    }
  }, [pdfBlob, addToast, t])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">{t('reports.title')}</h1>

      {filteredTxs.length === 0 && selectedTags.length === 0 && exportScope === 'all' ? (
        <GlassCard>
          <EmptyState
            icon={FileText}
            title={t('reports.no_data')}
            description={t('reports.no_data_desc')}
          />
        </GlassCard>
      ) : filteredTxs.length === 0 && selectedTags.length > 0 ? (
        <GlassCard>
          <EmptyState
            icon={Tag}
            title={t('reports.no_tag_matches') || 'No transactions match selected tags'}
            description={t('reports.try_different_tags') || 'Try selecting different tags or clear the tag filter'}
          />
        </GlassCard>
      ) : (
        <>
          {/* Export Section */}
          <GlassCard brand className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Download size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('reports.export_options')}</h2>
            </div>

            {/* Export Format Selector */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 font-medium mb-1.5 block">{t('reports.export_format') || 'Export Format'}</label>
              <div className="flex gap-1.5">
                {EXPORT_FORMATS.map((ef) => (
                  <button
                    key={ef.id}
                    onClick={() => setExportFormat(ef.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
                      exportFormat === ef.id
                        ? 'bg-neon/10 text-neon border border-neon/30'
                        : 'text-gray-500 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    <ef.icon size={12} />
                    {ef.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Scope Selector */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 font-medium mb-1.5 block">{t('reports.export_scope') || 'Export Scope'}</label>
              <div className="flex gap-1.5 flex-wrap">
                {EXPORT_SCOPES.map((es) => (
                  <button
                    key={es.id}
                    onClick={() => setExportScope(es.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      exportScope === es.id
                        ? 'bg-neon/10 text-neon border border-neon/30'
                        : 'text-gray-500 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {es.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope Config */}
            {exportScope === 'custom_range' && (
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="input-field text-[10px] flex-1"
                />
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="input-field text-[10px] flex-1"
                />
              </div>
            )}
            {exportScope === 'by_category' && (
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="input-field text-[10px] w-full mb-3"
              >
                <option value="">{t('reports.select_category') || 'Select Category'}</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            )}

            {/* Export Summary Preview */}
            {filteredTxs.length > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-white/[0.03] border border-glass-border">
                <p className="text-[10px] text-gray-500 font-medium mb-2">{t('reports.export_summary') || 'Export Summary'}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[18px] font-extrabold text-neon tabular-nums">{formatCurrency(exportSummary.totalIncome)}</p>
                    <p className="text-[9px] text-gray-500">{t('common.income')}</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-extrabold text-red-400 tabular-nums">{formatCurrency(exportSummary.totalExpense)}</p>
                    <p className="text-[9px] text-gray-500">{t('common.expense')}</p>
                  </div>
                  <div>
                    <p className={`text-[18px] font-extrabold tabular-nums ${exportSummary.balance >= 0 ? 'text-neon' : 'text-red-400'}`}>{formatCurrency(exportSummary.balance)}</p>
                    <p className="text-[9px] text-gray-500">{t('common.balance')}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-glass-border text-[10px] text-gray-500">
                  <span>{exportSummary.count} {t('reports.transactions') || 'transactions'}</span>
                  <span>{t('reports.savings_rate') || 'Savings'}: {exportSummary.savingsRate.toFixed(1)}%</span>
                  {exportSummary.topCategory && <span>Top: {exportSummary.topCategory}</span>}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportWithCharts}
                  onChange={(e) => setExportWithCharts(e.target.checked)}
                  className="accent-neon"
                />
                {t('reports.include_charts') || 'Include Charts'}
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchExport}
                  onChange={(e) => setBatchExport(e.target.checked)}
                  className="accent-neon"
                />
                {t('reports.batch_export') || 'Batch Export (All Formats)'}
              </label>
            </div>

            {/* Export Button */}
            <button
              onClick={() => handleExport(null)}
              disabled={filteredTxs.length === 0 || pdfLoading}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pdfLoading ? (
                <><Loader2 size={16} className="animate-spin" /> {t('common.generating')}</>
              ) : (
                <><Download size={16} /> {batchExport ? (t('reports.batch_export_btn') || 'Export All Formats') : `${t('reports.export') || 'Export'} ${EXPORT_FORMATS.find((f) => f.id === exportFormat)?.label}`}</>
              )}
            </button>
          </GlassCard>

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

            {/* Tag Filter */}
            {tags.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] text-gray-500 font-medium mb-1.5 flex items-center gap-1">
                  <Tag size={11} />
                  {t('reports.filter_by_tag') || 'Filter by Tag'}
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.name)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTags((prev) =>
                          isSelected
                            ? prev.filter((t) => t !== tag.name)
                            : [...prev, tag.name]
                        )}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : 'text-gray-500 border border-white/[0.06] hover:text-white'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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

          {/* Export History */}
          {exportHistory.length > 0 && (
            <GlassCard className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-neon" />
                <h2 className="text-sm font-semibold">{t('reports.export_history') || 'Export History'}</h2>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {exportHistory.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-[10px]">
                    <div className="flex items-center gap-2">
                      <Layers size={12} className="text-gray-500" />
                      <span className="text-gray-400">{record.formats.join(', ')}</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-500">{record.count} txns</span>
                    </div>
                    <span className="text-gray-600">{record.timestamp}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Summary Stats */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('reports.account_summary')}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t('reports.total_transactions')}</span>
                <span className="text-sm font-semibold tabular-nums">{filteredTxs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t('reports.total_income')}</span>
                <span className="text-sm font-semibold text-neon tabular-nums">
                  {formatCurrency(filteredTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t('reports.total_expenses')}</span>
                <span className="text-sm font-semibold text-red-400 tabular-nums">
                  {formatCurrency(filteredTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="border-t border-glass-border pt-3 flex justify-between items-center">
                <span className="text-xs font-medium">{t('common.net_worth')}</span>
                <span className={`text-sm font-extrabold tabular-nums ${
                  filteredTxs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0) >= 0
                    ? 'text-neon' : 'text-red-400'
                }`}>
                  {formatCurrency(filteredTxs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0))}
                </span>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
