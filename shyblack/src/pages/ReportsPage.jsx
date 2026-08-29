import { useState, useMemo, useCallback, useRef } from 'react'
import { Download, FileText, BarChart3, Calendar, Share2, Loader2, ExternalLink, CheckCircle2, Tag, FileSpreadsheet, Code, Layers, History } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import {
  generateMonthlyStatement, generateStatementHTML,
  transactionsToCsv, exportToExcelWithSummary,
  exportWithChartsToHTML, generateExportSummary,
  exportByMonth, exportByYear, exportByCategory, exportByCustomRange,
} from '../utils/exports'
import {
  generateMonthlyReport, generateCategoryReport, generateDateRangeReport, generateAnnualReport,
  generateCustomReport,
} from '../utils/pdfReport'
import { downloadBlob, shareBlob, openFileNative } from '../utils/downloadUtils'
import {
  buildReportFilename, openSavedFile, isAndroidNative,
  DOWNLOAD_RELATIVE_PATH,
} from '../utils/downloadService'
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
  const [pdfFilename, setPdfFilename] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [statementLoading, setStatementLoading] = useState(false)
  const [sharingPdf, setSharingPdf] = useState(false)
  const [downloadResult, setDownloadResult] = useState(null)
  const [showDownloadInfo, setShowDownloadInfo] = useState(false)
  const downloadBusyRef = useRef(false)
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
    const pad2 = (n) => String(n + 1).padStart(2, '0')
    const ym = `${now.getFullYear()}-${pad2(now.getMonth())}`
    const dateStr = now.toISOString().split('T')[0]
    switch (exportScope) {
      case 'this_month':
        return `Monthly_Expense_${ym}.${ext}`
      case 'this_year':
        return `Annual_Expense_${now.getFullYear()}.${ext}`
      case 'custom_range':
        return `Expense_Report_${customDateFrom || 'start'}_to_${customDateTo || 'end'}.${ext}`
      case 'by_category':
        return `Category_Report_${customCategory || 'selected'}_${dateStr}.${ext}`
      default:
        return `Expense_Report_${dateStr}.${ext}`
    }
  }, [exportScope, customDateFrom, customDateTo, customCategory, now])

  const handleExport = useCallback(async (singleFormat, delivery = 'share') => {
    const formats = singleFormat ? [singleFormat] : (batchExport ? EXPORT_FORMATS.map((f) => f.id) : [exportFormat])
    const results = []
    const failures = []
    setExporting(true)

    for (const fmt of formats) {
      try {
        if (filteredTxs.length === 0) throw new Error('No transactions to export')
        let blob = null
        let filename = getExportFilename(fmt === 'excel' ? 'xlsx' : fmt)
        let label = fmt.toUpperCase()

        if (fmt === 'csv') {
          const csvContent = transactionsToCsv(filteredTxs)
          if (!csvContent) throw new Error('CSV generation returned empty data')
          blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
          label = 'CSV'
        } else if (fmt === 'excel') {
          const data = { transactions: filteredTxs, debts: [], goals: [], emis: [], transfers: [], accounts: [] }
          blob = exportToExcelWithSummary(data, exportSummary)
          if (!blob) throw new Error('Excel generation failed')
          label = 'Excel'
        } else if (fmt === 'html') {
          let html
          if (exportWithCharts) {
            html = exportWithChartsToHTML(filteredTxs, exportSummary)
          } else {
            const stmt = generateMonthlyStatement(filteredTxs, selectedYear, selectedMonth)
            html = stmt ? generateStatementHTML(stmt) : exportWithChartsToHTML(filteredTxs, exportSummary)
          }
          if (!html) throw new Error('HTML generation returned empty data')
          blob = new Blob([html], { type: 'text/html' })
          label = 'HTML'
        } else if (fmt === 'pdf') {
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
          if (!result || !result.blob) throw new Error('PDF generation failed')
          blob = result.blob
          filename = buildReportFilename(
            exportScope === 'custom_range' ? 'daterange' : exportScope === 'this_month' ? 'monthly'
              : exportScope === 'this_year' ? 'annual' : exportScope === 'by_category' ? 'category' : 'full',
            { month: now.getMonth(), year: now.getFullYear(), dateFrom: customDateFrom, dateTo: customDateTo },
            'pdf',
          )
          setPdfDataUri(result.dataUri)
          setPdfBlob(result.blob)
          setPdfFilename(filename)
          label = `PDF (${result.pageCount}p)`
        }

        if (!blob || blob.size === 0) throw new Error(`${label} export produced an empty file`)

        // Keep the latest export available to the confirmation panel's Open and Share actions.
        setPdfBlob(blob)
        setPdfFilename(filename)

        if (batchExport || delivery === 'download') {
          const saved = await downloadBlob(blob, filename)
          if (saved.success) {
            results.push(label)
            setDownloadResult(saved)
            setShowDownloadInfo(true)
          } else {
            failures.push(label)
            addToast(saved.error || `${label} download failed`, 'error')
          }
        } else {
          const shared = await shareBlob(blob, filename, 'Expense Tracker ShyBlack — Report')
          if (shared.shared || shared.method === 'cancelled') results.push(label)
          else failures.push(label)
        }
      } catch (e) {
        console.error(`[REPORTS][PIPELINE] Export ${fmt} failed:`, e)
        addToast(e.message || t('notifications.download_error'), 'error')
      }
    }

    if (results.length > 0 || failures.length > 0) {
      const exportRecord = {
        id: Date.now(),
        formats: [...results, ...failures.map((f) => `${f} !`)],
        scope: exportScope,
        count: filteredTxs.length,
        timestamp: new Date().toLocaleString('en-IN'),
      }
      setExportHistory((prev) => [exportRecord, ...prev].slice(0, 20))
    }
    if (results.length > 0) {
      addToast(
        batchExport || delivery === 'download'
          ? t('notifications.saved_to_path', { path: DOWNLOAD_RELATIVE_PATH })
          : `Shared: ${results.join(', ')}`,
        'success',
      )
    }
    if (failures.length > 0) {
      addToast(t('notifications.download_error'), 'error')
    }
    setExporting(false)
  }, [filteredTxs, exportFormat, exportScope, batchExport, exportWithCharts, exportSummary, getExportFilename, customDateFrom, customDateTo, customCategory, selectedMonth, selectedYear, now, addToast, t])


  const handleExportStatement = useCallback(async () => {
    if (!statement || statementLoading) return
    setStatementLoading(true)
    try {
      const html = generateStatementHTML(statement)
      if (!html) throw new Error('Failed to generate statement HTML')
      const blob = new Blob([html], { type: 'text/html' })
      if (blob.size === 0) throw new Error('Generated statement is empty')
      const filename = `Monthly_Statement_${MONTHS[selectedMonth]}_${selectedYear}.html`

      /* Store the blob and filename so Open/Share buttons in the
       * Download Info Modal can access them (previously pdfBlob was null
       * after statement download, causing Share to silently fail). */
      setPdfBlob(blob)
      setPdfFilename(filename)
      setPdfDataUri(null)

      const saved = await downloadBlob(blob, filename)
      if (saved.success) {
        setDownloadResult(saved)
        setShowDownloadInfo(true)
        addToast(t('notifications.saved_to_path', { path: DOWNLOAD_RELATIVE_PATH }), 'success')
      } else {
        addToast(saved.error || t('notifications.download_error'), 'error')
      }
    } catch (e) {
      console.error('[REPORTS][PIPELINE] Statement export failed:', e)
      addToast(e.message || t('notifications.download_error'), 'error')
    } finally {
      setStatementLoading(false)
    }
  }, [statement, statementLoading, selectedMonth, selectedYear, addToast, t])

  const handleGeneratePDF = useCallback(async () => {
    if (pdfLoading || downloading) return
    setPdfLoading(true)
    setPdfError(null)
    setPdfDataUri(null)
    setPdfBlob(null)
    setDownloadResult(null)
    setShowDownloadInfo(false)
    const filename = buildReportFilename(reportType, { month: selectedMonth, year: selectedYear, dateFrom, dateTo }, 'pdf')
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
      if (!result || !result.blob) throw new Error('PDF generation returned no data')
      if (result.blob.size === 0) throw new Error('Generated PDF is empty')
      setPdfDataUri(result.dataUri)
      setPdfBlob(result.blob)
      setPdfFilename(filename)
      const saveResult = await downloadBlob(result.blob, filename)
      if (saveResult.success) {
        setDownloadResult(saveResult)
        setShowDownloadInfo(true)
        addToast(
          `${t('notifications.download_success')} — ${t('notifications.saved_to_path', { path: DOWNLOAD_RELATIVE_PATH })}`,
          'success',
          6000,
          null,
          { label: t('reports.open_report'), onClick: () => openSavedFile(saveResult.uri, saveResult.mimeType) },
        )
      } else {
        addToast(saveResult.error || t('notifications.download_error'), 'error')
      }
    } catch (e) {
      console.error('[REPORTS][PIPELINE] PDF generation failed:', e)
      setPdfError(e.message || t('notifications.pdf_generate_failed'))
      addToast(e.message || t('notifications.pdf_generate_failed'), 'error')
    } finally {
      setPdfLoading(false)
    }
  }, [filteredTxs, reportType, selectedMonth, selectedYear, dateFrom, dateTo, pdfLoading, downloading, addToast, t])

  const handleOpenPDF = useCallback(async () => {
    try {
      if (isAndroidNative()) {
        /* Primary path: if we already have a saved file (content:// URI from
         * MediaStore), open it directly via ACTION_VIEW.  This works for both
         * PDFs and HTML statements because DownloadStorage.openFile() uses
         * ACTION_VIEW with the correct MIME type. */
        if (downloadResult?.uri) {
          console.log('[REPORTS][OPEN] Opening saved file:', downloadResult.uri, downloadResult.mimeType)
          const opened = await openSavedFile(downloadResult.uri, downloadResult.mimeType)
          if (!opened.opened && opened.error) {
            addToast(opened.error, 'error')
          }
          return
        }
        /* Fallback: no saved file yet (e.g. page reloaded). Save the blob
         * first, then open it via ACTION_VIEW. */
        if (pdfBlob) {
          console.log('[REPORTS][OPEN] No saved file — saving then opening')
          const result = await openFileNative(pdfBlob, pdfFilename)
          if (!result.success && result.error) {
            addToast(result.error, 'error')
          } else if (result.openError) {
            addToast(result.openError, 'info')
          }
          return
        }
      }
      /* Non-Android or no blob — nothing to open */
    } catch (e) {
      console.error('[REPORTS][OPEN] Failed:', e)
      addToast(e.message || 'Unable to open file', 'error')
    }
  }, [downloadResult, pdfBlob, pdfFilename, addToast])

  const handleSharePDF = useCallback(async () => {
    if (!pdfBlob || sharingPdf) return
    setSharingPdf(true)
    try {
      console.log('[REPORTS][SHARE] Sharing blob:', pdfFilename, pdfBlob.size, 'bytes')
      const result = await shareBlob(pdfBlob, pdfFilename, 'Expense Tracker Report')
      if (result.shared) {
        addToast(t('notifications.file_shared'), 'success')
      } else if (result.method === 'cancelled') {
        /* User cancelled — no toast needed */
      } else if (result.method === 'unsupported') {
        addToast(t('notifications.share_unsupported'), 'info')
      } else {
        addToast(result.error || t('notifications.share_unsupported'), 'error')
      }
    } catch (e) {
      console.error('[REPORTS][SHARE] Failed:', e)
      addToast(e.message || t('notifications.share_unsupported'), 'error')
    } finally {
      setSharingPdf(false)
    }
  }, [pdfBlob, pdfFilename, sharingPdf, addToast, t])

  const handleDownloadPDF = useCallback(async () => {
    if (!pdfBlob || downloadBusyRef.current) return
    downloadBusyRef.current = true
    setDownloading(true)
    try {
      const filename = pdfFilename || buildReportFilename(reportType, { month: selectedMonth, year: selectedYear }, 'pdf')
      const result = await downloadBlob(pdfBlob, filename)
      if (result.success) {
        setDownloadResult(result)
        setShowDownloadInfo(true)
        addToast(
          `${t('notifications.download_success')} — ${t('notifications.saved_to_path', { path: DOWNLOAD_RELATIVE_PATH })}`,
          'success',
          6000,
          null,
          { label: t('reports.open_report'), onClick: () => openSavedFile(result.uri, result.mimeType) },
        )
      } else {
        addToast(result.error || t('notifications.download_error'), 'error')
      }
    } catch (e) {
      console.error('[REPORTS][PIPELINE] PDF download failed:', e)
      addToast(e.message || t('notifications.download_error'), 'error')
    } finally {
      downloadBusyRef.current = false
      setDownloading(false)
    }
  }, [pdfBlob, pdfFilename, reportType, selectedMonth, selectedYear, addToast, t])

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

            {/* Export Actions */}
            {batchExport ? (
              <button
                onClick={() => handleExport(null, 'download')}
                disabled={filteredTxs.length === 0 || exporting || pdfLoading}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {exporting ? (
                  <><Loader2 size={16} className="animate-spin" /> {t('common.generating')}</>
                ) : (
                  <><Download size={16} /> {t('reports.batch_export_btn') || 'Export All Formats'}</>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(null, 'download')}
                  disabled={filteredTxs.length === 0 || exporting || pdfLoading}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {t('reports.download') || 'Download'}
                </button>
                <button
                  onClick={() => handleExport(null, 'share')}
                  disabled={filteredTxs.length === 0 || exporting || pdfLoading}
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {exporting ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
                  {t('reports.share') || 'Share'}
                </button>
              </div>
            )}
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
                    disabled={downloading || sharingPdf}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2 disabled:opacity-50"
                  >
                    {sharingPdf ? (
                      <><Loader2 size={13} className="animate-spin" /> {t('common.generating')}</>
                    ) : (
                      <><Share2 size={13} /> {t('reports.share')}</>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="btn-secondary flex-1 text-[10px] flex items-center justify-center gap-1.5 py-2 disabled:opacity-50"
                  >
                    {downloading ? (
                      <><Loader2 size={13} className="animate-spin" /> {t('common.saving') || 'Saving...'}</>
                    ) : (
                      <><Download size={13} /> {t('reports.save_again')}</>
                    )}
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
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-medium hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    {t('reports.download') || 'Download'}
                  </button>
                  <button
                    onClick={handleSharePDF}
                    disabled={sharingPdf}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-medium hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {sharingPdf ? (
                      <><Loader2 size={13} className="animate-spin" /> {t('common.generating')}</>
                    ) : (
                      <><Share2 size={13} /> {t('reports.share')}</>
                    )}
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

                <button onClick={handleExportStatement} disabled={statementLoading} className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {statementLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('common.generating')}</>
                  ) : (
                    <><Download size={16} /> {t('reports.download_statement')}</>
                  )}
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
