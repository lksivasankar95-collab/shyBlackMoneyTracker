import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Camera, Upload, CheckCircle2, Trash2, Search, FileText,
  Loader2, Scan, Receipt,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '../utils/helpers'
import { scanReceipt } from '../utils/receiptParser'
import * as privacy from '../utils/privacy'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import CategoryIcon from '../components/CategoryIcon'

const emptyParsed = {
  merchant: '',
  amount: 0,
  category: 'other_expense',
  date: new Date().toISOString().split('T')[0],
  rawText: '',
  confidence: 0,
}

export default function ReceiptCenterPage({ onNavigate }) {
  const { t } = useTranslation()
  const { receipts, createTransactionFromReceipt, deleteReceiptCb, addReceipt, receiptStats } = useFinance()
  const { addToast } = useToast()
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanStatus, setScanStatus] = useState('')
  const [parsed, setParsed] = useState(null)
  const [editParsed, setEditParsed] = useState({ ...emptyParsed })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const reset = useCallback(() => {
    setParsed(null)
    setEditParsed({ ...emptyParsed })
    setProgress(0)
    setScanStatus('')
    setScanning(false)
  }, [])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { addToast(t('receipts.image_too_large'), 'error'); return }
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp']
    if (!ALLOWED_TYPES.includes(file.type)) { addToast(t('receipts.invalid_image_type'), 'error'); return }

    setScanning(true)
    setProgress(0)
    setScanStatus(t('receipts.compressing'))
    try {
      const result = await scanReceipt(file, (p, status) => {
        if (!mountedRef.current) return
        setProgress(p)
        if (status) {
          const statusMap = {
            compressing: t('receipts.compressing'),
            initializing: t('receipts.initializing'),
            recognizing: t('receipts.scanning'),
            parsing: t('receipts.parsing'),
            complete: t('receipts.complete'),
          }
          setScanStatus(statusMap[status] || t('receipts.scanning'))
        }
      })
      if (!mountedRef.current) return
      setParsed(result)
      setEditParsed({
        merchant: result.merchant,
        amount: result.amount,
        category: result.category,
        date: result.date,
        rawText: result.rawText,
        confidence: result.confidence,
      })
      setScanning(false)
    } catch (err) {
      if (!mountedRef.current) return
      addToast(t('receipts.ocr_failed', { error: err.message || 'Unknown error' }), 'error')
      reset()
    }
  }, [addToast, reset, t])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleConfirm = useCallback(() => {
    if (!editParsed.merchant || !editParsed.amount || editParsed.amount <= 0) {
      addToast(t('receipts.merchant_required'), 'error')
      return
    }
    createTransactionFromReceipt({
      ...editParsed,
      amount: parseFloat(editParsed.amount),
    })
    addToast(t('receipts.receipt_imported', { amount: formatCurrency(editParsed.amount) }), 'success')
    reset()
  }, [editParsed, createTransactionFromReceipt, addToast, reset, t])

  const filtered = useMemo(() => {
    let result = receipts || []
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) =>
        (r.merchant || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      )
    }
    if (filter === 'has-tx') result = result.filter((r) => r.transactionId)
    else if (filter === 'no-tx') result = result.filter((r) => !r.transactionId)
    return result
  }, [receipts, search, filter])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Receipt size={18} className="text-blue-400" />
          </div>
          <h1 className="text-xl font-bold">{t('receipts.title')}</h1>
        </div>
      </div>

      {receipts.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">{t('receipts.total')}</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{receiptStats.total}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">{t('receipts.this_month')}</p>
            <p className="text-sm font-extrabold text-blue-400 tabular-nums">{receiptStats.thisMonth}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">{t('receipts.accuracy')}</p>
            <p className="text-sm font-extrabold text-emerald-400 tabular-nums">{receiptStats.avgConfidence}%</p>
          </GlassCard>
        </div>
      )}

      {!parsed && !scanning && (
        <GlassCard className="mb-4 border-blue-500/20">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Scan size={32} className="text-blue-400" />
            </div>
            <p className="text-xs text-gray-500 text-center">{t('receipts.scan_hint')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => { privacy.suppressLockForTransition(10000); cameraInputRef.current?.click() }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all"
              >
                <Camera size={14} /> {t('receipts.take_photo')}
              </button>
              <button
                onClick={() => { privacy.suppressLockForTransition(10000); fileInputRef.current?.click() }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 text-xs font-semibold hover:bg-white/[0.1] transition-all"
              >
                <Upload size={14} /> {t('receipts.choose_image')}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </div>
        </GlassCard>
      )}

      {scanning && (
        <GlassCard className="mb-4 text-center">
          <Loader2 size={24} className="text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium">{scanStatus}</p>
          <div className="w-full h-1.5 bg-matte-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{Math.round(progress * 100)}%</p>
        </GlassCard>
      )}

      {parsed && !scanning && (
        <GlassCard className="mb-4 border-emerald-500/20">
          <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-400" />
            {t('receipts.preview_title')}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 font-medium mb-1 block">{t('receipts.merchant')}</label>
              <input type="text" value={editParsed.merchant} onChange={(e) => setEditParsed((f) => ({ ...f, merchant: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">{t('receipts.amount')}</label>
                <input type="number" value={editParsed.amount} onChange={(e) => setEditParsed((f) => ({ ...f, amount: e.target.value }))} className="input-field text-sm" min="1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">{t('receipts.date')}</label>
                <input type="date" value={editParsed.date} onChange={(e) => setEditParsed((f) => ({ ...f, date: e.target.value }))} className="input-field text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium mb-1 block">{t('receipts.category')}</label>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id} type="button"
                    onClick={() => setEditParsed((f) => ({ ...f, category: cat.id }))}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${editParsed.category === cat.id ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-glass-border text-gray-500 hover:text-white'}`}
                  >
                    <CategoryIcon icon={cat.icon} size={12} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            {editParsed.rawText && (
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">{t('receipts.ocr_text')}</label>
                <textarea readOnly value={editParsed.rawText} rows={3} className="input-field text-[10px] resize-none text-gray-500" />
              </div>
            )}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">{t('receipts.ocr_confidence')}</span>
              <span className={`font-semibold ${parsed.confidence >= 80 ? 'text-emerald-400' : parsed.confidence >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{parsed.confidence}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={!editParsed.merchant || !editParsed.amount || editParsed.amount <= 0} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} /> {t('receipts.create_expense')}
              </button>
              <button onClick={reset} className="flex-1 btn-secondary text-sm">{t('receipts.discard')}</button>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('receipts.search_placeholder')} className="input-field !pl-9 text-xs" />
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {[
          { key: 'all', label: t('receipts.filter_all'), count: receipts.length },
          { key: 'has-tx', label: t('receipts.filter_imported') },
          { key: 'no-tx', label: t('receipts.filter_unlinked') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${filter === tab.key ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.03] text-gray-500 hover:text-gray-300'}`}
          >
            {tab.label}{tab.count > 0 && tab.key === 'all' && <span className="ml-1.5">({tab.count})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={receipts.length === 0 ? t('receipts.no_receipts') : t('receipts.no_matching')}
          description={receipts.length === 0 ? t('receipts.no_receipts_desc') : undefined}
          hint={receipts.length === 0 ? t('receipts.supported_hint') : undefined}
        />
      )}

      <div className="space-y-2 mb-6">
        {filtered.map((r) => {
          const cat = EXPENSE_CATEGORIES.find((c) => c.id === r.category)
          return (
            <GlassCard key={r.id}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  {cat ? <CategoryIcon icon={cat.icon} size={15} /> : <FileText size={15} className="text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium truncate">{r.merchant || 'Unknown'}</p>
                    {r.transactionId && <span className="text-[10px] text-emerald-400 font-medium">{t('receipts.imported_label')}</span>}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {cat?.label || r.category} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums">{formatCurrency(r.amount)}</p>
                  {r.confidence > 0 && <p className="text-[10px] text-gray-600">{r.confidence}%</p>}
                </div>
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                {!r.transactionId && (
                  <button
                    onClick={() => {
                      createTransactionFromReceipt(r)
                      addToast(t('receipts.expense_created', { amount: formatCurrency(r.amount) }), 'success')
                    }}
                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={11} /> {t('receipts.create_expense')}
                  </button>
                )}
                <button onClick={() => setDeleteTarget(r)} className="flex-1 bg-white/[0.05] hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-[10px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                  <Trash2 size={11} /> {t('receipts.delete')}
                </button>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteReceiptCb(deleteTarget.id); addToast(t('receipts.receipt_deleted'), 'info'); setDeleteTarget(null) }}
        title={t('receipts.delete_title')}
        description={t('receipts.delete_desc')}
        confirmLabel={t('receipts.delete')}
        cancelLabel={t('receipts.cancel')}
        danger
      />
    </div>
  )
}
