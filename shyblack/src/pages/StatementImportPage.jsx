import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, MessageSquareText, BookOpenText, ArrowLeft } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import { formatInCurrency, getCurrencySettings, getBaseCurrencyCode } from '../utils/multiCurrency'
import {
  parseUpiSms, parseSmsBackupXml, parseBankStatementText, extractPdfText,
  dedupeStatementTransactions, normalizeStatementTransaction,
} from '../utils/statementImport'

const SOURCES = ['upi_sms', 'sms_backup', 'bank_pdf']

export default function StatementImportPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions, addTransactionsBulk } = useFinance()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const [source, setSource] = useState(SOURCES[0])
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [parsed, setParsed] = useState([])
  const [duplicates, setDuplicates] = useState(0)

  const baseCurrency = getBaseCurrencyCode()
  const multiSettings = getCurrencySettings()

  const parseCurrentText = useCallback(async (src, txt) => {
    if (!txt || !txt.trim()) {
      setParsed([])
      setDuplicates(0)
      return
    }
    const raw = src === 'upi_sms'
      ? parseUpiSms(txt)
      : src === 'sms_backup'
        ? parseSmsBackupXml(txt, { fallbackDate: new Date().toISOString().split('T')[0] })
        : parseBankStatementText(txt, { fallbackDate: new Date().toISOString().split('T')[0] })
    const deduped = dedupeStatementTransactions(raw, transactions)
    setParsed(deduped.result)
    setDuplicates(deduped.duplicates)
  }, [transactions])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (source === 'bank_pdf' && /\.pdf$/i.test(file.name)) {
      try {
        const buf = await file.arrayBuffer()
        const pdfText = await extractPdfText(buf)
        if (!pdfText.trim()) {
          addToast(t('statement_import.no_text_pdf'), 'warning')
          return
        }
        setText(pdfText)
        setFileName(file.name)
        await parseCurrentText('bank_pdf', pdfText)
        return
      } catch (err) {
        addToast(err?.message || t('statement_import.pdf_error'), 'error')
        return
      }
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const txt = ev.target.result
      setText(txt)
      setFileName(file.name)
      parseCurrentText(source, txt)
    }
    reader.readAsText(file)
  }, [source, parseCurrentText, addToast, t])

  const handleImport = useCallback(() => {
    if (!parsed.length) return
    setImporting(true)
    try {
      const final = parsed.map((p) => normalizeStatementTransaction(p, {
        category: p.type === 'income' ? 'other_income' : 'other_expense',
        merchant: p.bank ? p.bank : undefined,
      }))
      const withRules = addTransactionsBulk(final)
      addToast(t('statement_import.import_success', { count: withRules.length }), 'success', 4000)
      setParsed([])
      setText('')
      setFileName('')
      onNavigate?.('history')
    } catch (err) {
      addToast(err?.message || t('statement_import.import_failed'), 'error')
    }
    setImporting(false)
  }, [parsed, addTransactionsBulk, addToast, t, onNavigate])

  
  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => onNavigate?.('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold">{t('statement_import.title')}</h1>
          <p className="text-[10px] text-gray-500">{t('statement_import.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => { setSource(s); setParsed([]); setText(''); setFileName('') }}
            className={`p-3 rounded-xl text-left transition-all ${source === s ? 'bg-neon/[0.08] border border-neon/40' : 'bg-white/[0.03] border border-transparent'}`}
          >
            {s === 'upi_sms' ? <MessageSquareText size={16} className="text-neon" /> : s === 'sms_backup' ? <FileText size={16} className="text-blue-400" /> : <BookOpenText size={16} className="text-amber-400" />}
            <p className="text-[11px] font-semibold mt-1.5">{t(`statement_import.${s}`)}</p>
          </button>
        ))}
      </div>

      <GlassCard className="mb-4 p-4 space-y-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-white/10 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-neon/50 transition-colors"
        >
          <Upload size={20} className="text-gray-500" />
          <span className="text-xs text-gray-400">{fileName || t('statement_import.pick_file')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={source === 'bank_pdf' ? '.pdf,.txt' : '.txt,.xml,.csv'}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
        {source !== 'sms_backup' && (
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); parseCurrentText(source, e.target.value) }}
            placeholder={source === 'upi_sms' ? t('statement_import.sms_placeholder') : t('statement_import.pdf_text_placeholder')}
            rows={6}
            className="input-field w-full text-xs font-mono"
          />
        )}
        {source === 'upi_sms' && (
          <p className="text-[10px] text-gray-500 leading-relaxed">
            {t('statement_import.upi_example')}
          </p>
        )}
      </GlassCard>

      {parsed.length === 0 && text.trim() && (
        <GlassCard className="p-4 flex items-center gap-2 text-xs text-amber-400">
          <AlertTriangle size={14} />
          {t('statement_import.no_transactions')}
        </GlassCard>
      )}

      {parsed.length > 0 && (
        <>
          <GlassCard className="mb-4 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} className="text-neon" />
                {t('statement_import.found', { count: parsed.length })}
              </h2>
              {duplicates > 0 && (
                <span className="text-[10px] text-gray-400">{t('statement_import.duplicates', { count: duplicates })}</span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {parsed.slice(0, 30).map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-gray-300 flex-1">
                    <span className={p.type === 'income' ? 'text-neon' : 'text-red-400'}>
                      {p.type === 'income' ? '+' : '−'}
                    </span>{' '}
                    {formatInCurrency(p.amount, baseCurrency || 'INR')}
                    <span className="text-gray-500"> · {p.date}</span>
                  </span>
                  <span className="truncate text-gray-500 max-w-[45%]">{p.note}</span>
                </div>
              ))}
              {parsed.length > 30 && <p className="text-[10px] text-gray-500 text-center pt-1">+{parsed.length - 30} more</p>}
            </div>
          </GlassCard>

          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {importing ? t('csv_import.importing') : t('statement_import.import_all', { count: parsed.length })}
          </button>
        </>
      )}

      {multiSettings.enabled && (
        <p className="text-[10px] text-gray-500 text-center mt-3">
          {t('statement_import.base_note', { code: baseCurrency })}
        </p>
      )}
    </div>
  )
}