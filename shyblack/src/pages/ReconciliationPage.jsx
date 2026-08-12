import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, Upload, CheckCircle2, XCircle, Link2, Import, ShieldCheck, FileText, MessageSquareText, BookOpenText } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import { formatInCurrency, getBaseCurrencyCode } from '../utils/multiCurrency'
import { parseUpiSms, parseSmsBackupXml, parseBankStatementText, normalizeStatementTransaction } from '../utils/statementImport'
import { getReconciliationReport, getCandidatesForStatement } from '../utils/reconciliation'

const SOURCES = ['upi_sms', 'sms_backup', 'bank_pdf']

const CONFIDENCE_STYLE = {
  exact: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  high: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  manual: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
}

export default function ReconciliationPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions, addTransactionsBulk } = useFinance()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const [source, setSource] = useState(SOURCES[2])
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [statement, setStatement] = useState([])
  const [pairs, setPairs] = useState([])
  const [unmatchedStatement, setUnmatchedStatement] = useState([])
  const [unmatchedLedger, setUnmatchedLedger] = useState([])
  const [totals, setTotals] = useState({ statementTotal: 0, matchedTotal: 0, unmatchedTotal: 0 })
  const [completeness, setCompleteness] = useState(0)
  const [candidatesFor, setCandidatesFor] = useState(null)
  const [toImport, setToImport] = useState(() => new Set())
  const [cleared, setCleared] = useState(() => new Set())
  const [importing, setImporting] = useState(false)

  const baseCurrency = getBaseCurrencyCode() || 'INR'
  const fmt = (n) => formatInCurrency(n, baseCurrency)

  const runReconciliation = useCallback((parsed) => {
    const report = getReconciliationReport(parsed, transactions)
    setStatement(parsed)
    setPairs(report.matched)
    setUnmatchedStatement(report.unmatchedStatement)
    setUnmatchedLedger(report.unmatchedLedger)
    setTotals(report.totals)
    setCompleteness(report.completeness)
    setToImport(new Set(report.unmatchedStatement.map((s) => s.__idx ?? String(Math.random()))))
    setCandidatesFor(null)
  }, [transactions])

  const parseCurrentText = useCallback((src, txt) => {
    if (!txt || !txt.trim()) {
      setStatement([]); setPairs([]); setUnmatchedStatement([]); setUnmatchedLedger([])
      return
    }
    const raw = src === 'upi_sms'
      ? parseUpiSms(txt)
      : src === 'sms_backup'
        ? parseSmsBackupXml(txt, { fallbackDate: new Date().toISOString().split('T')[0] })
        : parseBankStatementText(txt, { fallbackDate: new Date().toISOString().split('T')[0] })
    runReconciliation(raw)
  }, [runReconciliation])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (source === 'bank_pdf' && /\.pdf$/i.test(file.name)) {
      try {
        const buf = await file.arrayBuffer()
        const { extractPdfSmart } = await import('../utils/statementImport')
        const { text: pdfText } = await extractPdfSmart(buf)
        setText(pdfText)
        setFileName(file.name)
        parseCurrentText('bank_pdf', pdfText)
        return
      } catch (err) {
        addToast(err?.message || t('reconciliation.pdf_error'), 'error')
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

  const statementKey = useCallback((s) => {
    if (s.__idx != null) return `idx-${s.__idx}`
    return `${s.type}|${s.date}|${s.amount}|${s.note}`
  }, [])

  const handleCandidatePick = useCallback((statementIdx, ledgerIdx) => {
    const updated = [...pairs]
    const pair = updated.find((p) => p.statementIndex === statementIdx)
    if (pair) {
      pair.ledger = transactions[ledgerIdx]
      pair.ledgerIndex = ledgerIdx
      pair.confidence = 'exact'
      pair.score = 100
      const idx = unmatchedStatement.findIndex((s) => s.__idx === statementIdx)
      if (idx >= 0) unmatchedStatement.splice(idx, 1)
    }
    setPairs(updated)
    setUnmatchedStatement([...unmatchedStatement])
    setCandidatesFor(null)
    setToImport((prev) => {
      const next = new Set(prev)
      next.delete(`idx-${statementIdx}`)
      return next
    })
    const report = getReconciliationReport(statement, transactions)
    setTotals(report.totals)
    setCompleteness(report.completeness)
  }, [pairs, unmatchedStatement, statement, transactions])

  const handleImportUnmatched = useCallback(() => {
    const items = unmatchedStatement.filter((s) => toImport.has(statementKey(s)))
    if (!items.length) return
    setImporting(true)
    try {
      const final = items.map((p) => normalizeStatementTransaction(p, {
        category: p.type === 'income' ? 'other_income' : 'other_expense',
      }))
      addTransactionsBulk(final)
      addToast(t('reconciliation.import_success', { count: final.length }), 'success', 4000)
      runReconciliation(statement)
    } catch (err) {
      addToast(err?.message || t('reconciliation.import_failed'), 'error')
    }
    setImporting(false)
  }, [unmatchedStatement, toImport, statementKey, addTransactionsBulk, addToast, t, runReconciliation, statement])

  const toggleImport = useCallback((key) => {
    setToImport((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleCleared = useCallback((ledgerId) => {
    setCleared((prev) => {
      const next = new Set(prev)
      if (next.has(ledgerId)) next.delete(ledgerId)
      else next.add(ledgerId)
      return next
    })
  }, [])

  const header = (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={() => onNavigate?.('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all" aria-label="Back">
        <ArrowLeft size={18} />
      </button>
      <div>
        <h1 className="text-base font-bold">{t('reconciliation.title')}</h1>
        <p className="text-[10px] text-gray-500">{t('reconciliation.subtitle')}</p>
      </div>
    </div>
  )

  const summary = (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <GlassCard className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('reconciliation.statement_total')}</p>
        <p className="text-sm font-bold text-white tabular-nums">{fmt(totals.statementTotal)}</p>
      </GlassCard>
      <GlassCard className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('reconciliation.matched_total')}</p>
        <p className="text-sm font-bold text-neon tabular-nums">{fmt(totals.matchedTotal)}</p>
      </GlassCard>
      <GlassCard className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('reconciliation.unmatched_total')}</p>
        <p className="text-sm font-bold text-amber-400 tabular-nums">{fmt(totals.unmatchedTotal)}</p>
      </GlassCard>
    </div>
  )

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {header}

      <GlassCard className="mb-4 p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => { setSource(s); setStatement([]); setText(''); setFileName('') }}
              className={`p-3 rounded-xl text-left transition-all ${source === s ? 'bg-neon/[0.08] border border-neon/40' : 'bg-white/[0.03] border border-transparent'}`}
            >
              {s === 'upi_sms' ? <MessageSquareText size={16} className="text-neon" /> : s === 'sms_backup' ? <FileText size={16} className="text-blue-400" /> : <BookOpenText size={16} className="text-amber-400" />}
              <p className="text-[11px] font-semibold mt-1.5">{t(`reconciliation.source_${s}`)}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-white/10 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-neon/50 transition-colors"
        >
          <Upload size={20} className="text-gray-500" />
          <span className="text-xs text-gray-400">{fileName || t('reconciliation.pick_file')}</span>
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
            placeholder={source === 'upi_sms' ? t('reconciliation.sms_placeholder') : t('reconciliation.pdf_text_placeholder')}
            rows={6}
            className="input-field w-full text-xs font-mono"
          />
        )}
        <p className="text-[10px] text-gray-500 leading-relaxed">{t('reconciliation.match_note')}</p>
      </GlassCard>

      {!statement.length && !text.trim() && (
        <EmptyState icon={Link2} title={t('reconciliation.no_data')} description={t('reconciliation.no_data_desc')} />
      )}

      {statement.length > 0 && (
        <>
          {summary}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">{t('reconciliation.completeness')}</span>
              <span className="text-[10px] font-semibold text-neon tabular-nums">{Math.round(completeness * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-neon transition-all duration-500" style={{ width: `${Math.min(100, Math.round(completeness * 100))}%` }} />
            </div>
          </div>

          {pairs.length > 0 && (
            <GlassCard className="mb-4 p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 size={15} className="text-neon" />
                {t('reconciliation.matched_heading', { count: pairs.length })}
              </h2>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {pairs.map((p, i) => {
                  const ledgerId = p.ledger?.id || p.ledger?._id
                  const isCleared = cleared.has(ledgerId)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-white/[0.03] p-2">
                      <button
                        onClick={() => ledgerId && toggleCleared(ledgerId)}
                        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isCleared ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/15 text-transparent'}`}
                        aria-label="toggle cleared"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                      <span className={`truncate flex-1 ${isCleared ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {fmt(p.statement.amount)} <span className="text-gray-500">· {p.statement.date}</span>
                        <span className="text-gray-500"> — </span>
                        {p.statement.note}
                      </span>
                      <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border ${CONFIDENCE_STYLE[p.confidence] || CONFIDENCE_STYLE.medium}`}>
                        {t(`reconciliation.confidence_${p.confidence}`)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {unmatchedStatement.length > 0 && (
            <GlassCard className="mb-4 p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <XCircle size={15} className="text-amber-400" />
                {t('reconciliation.unmatched_statement_heading', { count: unmatchedStatement.length })}
              </h2>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {unmatchedStatement.map((s, i) => {
                  const key = statementKey(s)
                  const selected = toImport.has(key)
                  const cands = candidatesFor === key ? getCandidatesForStatement(s, transactions) : []
                  return (
                    <div key={`${key}-${i}`} className="rounded-lg bg-white/[0.03] p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleImport(key)}
                          className="accent-emerald-500 shrink-0"
                        />
                        <span className="truncate flex-1 text-gray-200">
                          {fmt(s.amount)} <span className="text-gray-500">· {s.date}</span>
                          <span className="text-gray-500"> — </span>
                          {s.note}
                        </span>
                        <button
                          onClick={() => setCandidatesFor(candidatesFor === key ? null : key)}
                          className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-neon/10 text-neon hover:bg-neon/20 transition-colors"
                        >
                          {t('reconciliation.try_match')}
                        </button>
                      </div>
                      {candidatesFor === key && (
                        <div className="mt-1.5 space-y-1">
                          {cands.length === 0 && <p className="text-[10px] text-gray-500 px-1">{t('reconciliation.no_candidates')}</p>}
                          {cands.slice(0, 5).map((c, j) => (
                            <button
                              key={j}
                              onClick={() => handleCandidatePick(s.__idx, c.ledgerIndex)}
                              className="w-full flex items-center justify-between gap-2 text-[10px] px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-neon/10 transition-colors text-left"
                            >
                              <span className="truncate text-gray-300">{fmt(c.ledger.amount)} · {c.ledger.date} — {c.ledger.note}</span>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded-full border ${CONFIDENCE_STYLE[c.confidence]}`}>
                                {t(`reconciliation.confidence_${c.confidence}`)} · {Math.round((c.noteSim || 0) * 100)}%
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {unmatchedLedger.length > 0 && (
            <GlassCard className="mb-4 p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ShieldCheck size={15} className="text-blue-400" />
                {t('reconciliation.unmatched_ledger_heading', { count: unmatchedLedger.length })}
              </h2>
              <p className="text-[10px] text-gray-500 mb-2">{t('reconciliation.unmatched_ledger_note')}</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {unmatchedLedger.map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-white/[0.03] p-2">
                    <span className={`truncate flex-1 ${tx.type === 'income' ? 'text-neon' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '−'} {fmt(tx.amount)}
                      <span className="text-gray-500"> · {tx.date}</span>
                      <span className="text-gray-500"> — </span>
                      <span className="text-gray-300">{tx.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <button
            onClick={handleImportUnmatched}
            disabled={importing || toImport.size === 0}
            className="btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Import size={15} />
            {importing ? t('reconciliation.importing') : t('reconciliation.import_unmatched', { count: toImport.size })}
          </button>
        </>
      )}
    </div>
  )
}
