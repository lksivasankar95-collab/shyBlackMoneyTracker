import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, ChevronRight, Table, ArrowLeft } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import { formatInCurrency, getCurrencySettings, getBaseCurrencyCode, CURRENCIES } from '../utils/multiCurrency'
import { convertCsvToTransactions, finalizeParsedTransaction } from '../utils/csvImport'
import { formatCurrency } from '../utils/helpers'

const STEPS = ['file', 'preview']

export default function CsvImportPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions, addTransactionsBulk } = useFinance()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState(STEPS[0])
  const [parseResult, setParseResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [useCurrencyColumn, setuseCurrencyColumn] = useState(false)
  const [currencyOverride, setCurrencyOverride] = useState('')
  const multiSettings = getCurrencySettings()
  const baseCurrency = getBaseCurrencyCode()

  const handleFile = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const parsed = convertCsvToTransactions(text, transactions)
      setFileName(file.name)
      setParseResult(parsed)
      setCurrencyOverride('')
      setuseCurrencyColumn(false)
      setStep(STEPS[1])
      if (parsed.errors.length) {
        addToast(parsed.errors[0], 'warning')
      }
    }
    reader.readAsText(file)
  }, [transactions, addToast])

  const handleImport = useCallback(() => {
    if (!parseResult) return
    setImporting(true)
    try {
      const options = { currency: currencyOverride || baseCurrency }
      if (multiSettings.enabled && useCurrencyColumn) options.allowMultiCurrency = true
      const final = parseResult.candidates.map((c) => finalizeParsedTransaction(c, options))
      const added = addTransactionsBulk(final)
      addToast(t('csv_import.import_success', { count: added.length }), 'success', 4000)
      setParseResult(null)
      setFileName('')
      setStep(STEPS[0])
      onNavigate?.('history')
    } catch (err) {
      addToast(err.message || 'Import failed', 'error')
    }
    setImporting(false)
  }, [parseResult, addTransactionsBulk, addToast, t, currencyOverride, useCurrencyColumn, multiSettings.enabled, baseCurrency, onNavigate])

  const previewRows = parseResult?.candidates?.slice(0, 12) || []

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => onNavigate?.('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold">{t('csv_import.title')}</h1>
          <p className="text-[10px] text-gray-500">{t('csv_import.subtitle')}</p>
        </div>
      </div>

      {step === STEPS[0] && (
        <GlassCard className="mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-10 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-glass-border hover:border-neon/40 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center">
              <Upload size={24} className="text-neon" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('csv_import.pick_file')}</p>
              <p className="text-[11px] text-gray-500 mt-1 text-center">{t('csv_import.file_hint')}</p>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={(e) => { handleFile(e.target.files[0]); e.target.value = '' }} className="hidden" />

          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] space-y-1.5">
            <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5"><FileText size={11} /> {t('csv_import.supported_columns')}</p>
            {['date', 'type', 'category', 'amount', 'note', 'person', 'payment method', 'currency'].map((c) => (
              <span key={c} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-matte-200 text-[10px] text-gray-500">{c}</span>
            ))}
            <p className="text-[10px] text-gray-600 pt-1">{t('csv_import.debit_credit_hint')}</p>
          </div>
        </GlassCard>
      )}

      {step === STEPS[1] && parseResult && (
        <>
          <GlassCard className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-neon" />
              <h2 className="text-xs font-semibold">{fileName}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
                <p className="text-lg font-extrabold tabular-nums text-neon">{parseResult.candidates.length}</p>
                <p className="text-[10px] text-gray-500">{t('csv_import.ready')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
                <p className="text-lg font-extrabold tabular-nums text-yellow-400">{parseResult.skipped}</p>
                <p className="text-[10px] text-gray-500">{t('csv_import.skipped')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
                <p className="text-lg font-extrabold tabular-nums text-red-400">{parseResult.invalid}</p>
                <p className="text-[10px] text-gray-500">{t('csv_import.invalid')}</p>
              </div>
            </div>

            {parseResult.errors.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2.5 mb-3">
                <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-yellow-300 leading-relaxed">{parseResult.errors[0]}</p>
              </div>
            )}

            {multiSettings.enabled && (
              <div className="space-y-2 mb-3 p-3 rounded-xl bg-white/[0.03]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-400">{t('csv_import.use_currency_column')}</span>
                  <button
                    onClick={() => setuseCurrencyColumn((v) => !v)}
                    className={`relative w-10 h-6 rounded-full transition-all duration-200 ${useCurrencyColumn ? 'bg-neon/30' : 'bg-matte-200'}`}
                    aria-pressed={useCurrencyColumn}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${useCurrencyColumn ? 'bg-neon left-[18px]' : 'bg-gray-500 left-0.5'}`} />
                  </button>
                </label>
                <label className="block">
                  <span className="text-[10px] text-gray-500 mb-1 block">{t('csv_import.default_currency')}</span>
                  <select
                    value={currencyOverride}
                    onChange={(e) => setCurrencyOverride(e.target.value)}
                    className="input-field py-2 text-sm"
                  >
                    <option value="">{formatInCurrency(0, baseCurrency)} — {baseCurrency} ({t('csv_import.base')})</option>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="w-full h-px bg-glass-border mb-3" />
            <button className="btn-primary w-full text-sm flex items-center justify-center gap-2" onClick={handleImport} disabled={importing || parseResult.candidates.length === 0}>
              <Table size={15} />
              {importing ? t('csv_import.importing') : t('csv_import.import_now', { count: parseResult.candidates.length })}
            </button>
          </GlassCard>

          {previewRows.length > 0 && (
            <GlassCard className="mb-4">
              <h2 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Table size={12} className="text-neon" /> {t('csv_import.preview')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-glass-border">
                      <th className="py-1.5 pr-2 font-medium">Date</th>
                      <th className="py-1.5 pr-2 font-medium">Type</th>
                      <th className="py-1.5 pr-2 font-medium">Category</th>
                      <th className="py-1.5 pr-2 font-medium">Amount</th>
                      <th className="py-1.5 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b border-glass-border last:border-0">
                        <td className="py-1.5 pr-2 text-gray-500 whitespace-nowrap">{r.date}</td>
                        <td className={`py-1.5 pr-2 font-medium ${r.type === 'income' ? 'text-neon' : 'text-red-400'}`}>{r.type}</td>
                        <td className="py-1.5 pr-2 text-gray-400 whitespace-nowrap">{r.category}</td>
                        <td className="py-1.5 pr-2 tabular-nums whitespace-nowrap">{r.currency && multiSettings.enabled ? formatInCurrency(r.amount, r.currency) : formatCurrency(r.amount)}</td>
                        <td className="py-1.5 text-gray-500 truncate max-w-[120px]">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.candidates.length > previewRows.length && (
                  <p className="text-[10px] text-gray-600 pt-2 flex items-center gap-1"><ChevronRight size={10} /> +{parseResult.candidates.length - previewRows.length} more</p>
                )}
              </div>
            </GlassCard>
          )}

          <button onClick={() => setStep(STEPS[0])} className="btn-secondary w-full text-sm">{t('common.back')}</button>
        </>
      )}
    </div>
  )
}
