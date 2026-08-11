import { useState, useCallback } from 'react'
import { Plus, Users, Trash2, CheckCircle2, Scale, X, ArrowLeft, PartyPopper, AlertTriangle } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import { splitEqually, isSplitSettled, SPLIT_STATUS } from '../utils/splits'
import { getCurrencySettings, getBaseCurrencyCode, formatInCurrency, CURRENCIES } from '../utils/multiCurrency'
import { formatDate } from '../utils/helpers'

const emptyForm = {
  title: '', totalAmount: '', date: new Date().toISOString().split('T')[0], note: '',
  currency: '', participants: [{ id: 'p1', name: '', share: '' }],
}

export default function SplitsPage({ onNavigate }) {
  const { t } = useTranslation()
  const { splits, addSplit, markSplitPaid, deleteSplitCb } = useFinance()
  const { addToast } = useToast()
  const multiSettings = getCurrencySettings()
  const baseCurrency = getBaseCurrencyCode()

  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  const activeSplits = splits.filter((s) => s.status === SPLIT_STATUS.ACTIVE)
  const settledSplits = splits.filter((s) => s.status === SPLIT_STATUS.SETTLED)
  const totalPending = activeSplits.reduce((sum, s) => {
    const paid = s.participants.reduce((x, p) => x + (p.paid || 0), 0)
    return sum + Math.max(0, s.totalAmount - paid)
  }, 0)

  const handleAddParticipant = () => {
    setForm((f) => ({
      ...f,
      participants: [...f.participants, { id: `p${Date.now().toString(36)}`, name: '', share: '' }],
    }))
  }

  const handleRemoveParticipant = (id) => {
    setForm((f) => ({ ...f, participants: f.participants.filter((p) => p.id !== id) }))
  }

  const handleParticipantChange = (id, key, value) => {
    setForm((f) => ({
      ...f,
      participants: f.participants.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    }))
  }

  const handleEqualSplit = () => {
    const total = parseFloat(form.totalAmount)
    if (!total || total <= 0) {
      setFormError(t('splits.enter_total_first'))
      return
    }
    const names = form.participants.map((p) => p.name.trim()).filter(Boolean)
    if (names.length < 2) {
      setFormError(t('splits.min_two_people'))
      return
    }
    setFormError('')
    const shares = splitEqually(total, names)
    setForm((f) => ({ ...f, participants: shares.map((s, i) => ({ ...f.participants[i], ...s, share: String(s.share) })) }))
  }

  const handleCreate = useCallback(() => {
    setFormError('')
    const total = parseFloat(form.totalAmount)
    if (!total || total <= 0) {
      setFormError(t('splits.enter_valid_total'))
      return
    }
    const participants = form.participants
      .map((p) => ({ name: p.name.trim(), share: p.share === '' ? null : parseFloat(p.share) }))
      .filter((p) => p.name)
    if (participants.length < 2) {
      setFormError(t('splits.min_two_people'))
      return
    }
    const setAll = participants.every((p) => p.share !== null)
    const split = addSplit({
      title: form.title,
      totalAmount: total,
      date: form.date,
      note: form.note,
      currency: multiSettings.enabled && form.currency ? form.currency : undefined,
      equalSplit: !setAll,
      participants: setAll ? participants.map((p) => ({ ...p, share: p.share })) : participants,
    })
    if (!split) {
      setFormError(t('splits.create_failed'))
      return
    }
    addToast(t('splits.created_toast'), 'success')
    setShowCreate(false)
    setForm(emptyForm)
  }, [form, addSplit, addToast, t, multiSettings.enabled])

  const handleMarkPaid = useCallback((splitId, participantId, name) => {
    const result = markSplitPaid(splitId, participantId)
    if (result.success) {
      addToast(t('splits.paid_toast', { name }), 'success')
      if (isSplitSettled(result.split)) {
        addToast(t('splits.settled_toast'), 'success', 4000)
      }
    }
  }, [markSplitPaid, addToast, t])

  const formatSplitAmount = (split) => {
    if (split.currency && multiSettings.enabled) {
      return `${formatInCurrency(split.totalAmount, split.currency)}${split.amountBase ? ` ≈ ${formatInCurrency(split.amountBase, baseCurrency)}` : ''}`
    }
    return formatInCurrency(split.totalAmount, baseCurrency)
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => onNavigate?.('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold">{t('splits.title')}</h1>
          <p className="text-[10px] text-gray-500">{t('splits.subtitle')}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-2xl glass">
          <p className="text-[10px] text-gray-500 mb-1">{t('splits.active')}</p>
          <p className="text-lg font-extrabold tabular-nums">{activeSplits.length}</p>
        </div>
        <div className="p-3 rounded-2xl glass">
          <p className="text-[10px] text-gray-500 mb-1">{t('splits.settled')}</p>
          <p className="text-lg font-extrabold tabular-nums text-neon">{settledSplits.length}</p>
        </div>
        <div className="p-3 rounded-2xl glass">
          <p className="text-[10px] text-gray-500 mb-1">{t('splits.pending')}</p>
          <p className="text-sm font-extrabold tabular-nums text-yellow-400 truncate">{formatInCurrency(totalPending, baseCurrency)}</p>
        </div>
      </div>

      <button onClick={() => { setForm(emptyForm); setFormError(''); setShowCreate(true) }} className="btn-primary w-full text-sm flex items-center justify-center gap-2 mb-4">
        <Plus size={16} />
        {t('splits.new_split')}
      </button>

      {splits.length === 0 && (
        <GlassCard className="py-10 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center">
            <Users size={24} className="text-neon" />
          </div>
          <p className="text-sm font-medium">{t('splits.empty_title')}</p>
          <p className="text-[11px] text-gray-500 text-center px-6">{t('splits.empty_desc')}</p>
        </GlassCard>
      )}

      {activeSplits.map((split) => {
        const allPaid = isSplitSettled(split)
        return (
          <GlassCard key={split.id} className="mb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{split.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(split.date)}{split.note ? ` · ${split.note}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {allPaid && (
                  <span className="px-1.5 py-0.5 rounded-md bg-neon/10 text-neon text-[9px] font-semibold flex items-center gap-0.5">
                    <PartyPopper size={9} /> {t('splits.settled')}
                  </span>
                )}
                <button onClick={() => setDeleteTarget(split)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <p className="text-xl font-extrabold tabular-nums mb-3">{formatSplitAmount(split)}</p>
            <div className="space-y-1.5">
              {split.participants.map((p) => {
                const paid = (p.paid || 0) >= (p.share || 0) - 0.005
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03]">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${paid ? 'bg-neon/10 text-neon' : 'bg-matte-200 text-gray-500'}`}>
                      {paid ? <CheckCircle2 size={14} /> : <Users size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-500 tabular-nums">
                        {split.currency && multiSettings.enabled ? formatInCurrency(p.share, split.currency) : formatInCurrency(p.share, baseCurrency)}
                        {' · '}
                        {paid ? t('splits.paid_label') : t('splits.owes_label', { amount: formatInCurrency(Math.max(0, (p.share || 0) - (p.paid || 0)), split.currency && multiSettings.enabled ? split.currency : baseCurrency) })}
                      </p>
                    </div>
                    {!paid && (
                      <button
                        onClick={() => handleMarkPaid(split.id, p.id, p.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-neon/10 text-neon text-[10px] font-medium border border-neon/20 hover:bg-neon/20 transition-all shrink-0"
                      >
                        {t('splits.mark_paid')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )
      })}

      {settledSplits.map((split) => (
        <GlassCard key={split.id} className="mb-3 opacity-70">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold truncate">{split.title}</p>
            <span className="px-1.5 py-0.5 rounded-md bg-neon/10 text-neon text-[9px] font-semibold shrink-0">{t('splits.settled')}</span>
          </div>
          <p className="text-[10px] text-gray-500 mb-1">{formatDate(split.date)} · {split.participants.map((p) => p.name).join(', ')}</p>
          <p className="text-sm font-bold tabular-nums mb-2">{formatSplitAmount(split)}</p>
          <button onClick={() => setDeleteTarget(split)} className="text-[10px] text-gray-600 hover:text-red-400 flex items-center gap-1">
            <Trash2 size={11} /> {t('common.delete')}
          </button>
        </GlassCard>
      ))}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('splits.new_split')}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('splits.title_field')}</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('splits.title_placeholder')} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('splits.total_field')}</label>
              <input type="number" inputMode="decimal" value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('splits.date_field')}</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
            </div>
          </div>
          {multiSettings.enabled && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('splits.currency_field')}</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="input-field">
                <option value="">{baseCurrency} ({t('csv_import.base')})</option>
                {CURRENCIES.filter((c) => c.code !== baseCurrency).map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('splits.note_field')}</label>
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder={t('splits.note_placeholder')} className="input-field" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500 font-medium">{t('splits.participants_field')}</label>
              <button onClick={handleEqualSplit} className="text-[10px] font-medium text-neon flex items-center gap-1 hover:bg-neon/10 rounded-lg px-2 py-1 transition-all">
                <Scale size={11} /> {t('splits.split_equally')}
              </button>
            </div>
            <div className="space-y-2">
              {form.participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-matte-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">{i + 1}</div>
                  <input
                    value={p.name}
                    onChange={(e) => handleParticipantChange(p.id, 'name', e.target.value)}
                    placeholder={t('splits.name_placeholder')}
                    className="input-field py-2 text-sm flex-1"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={p.share}
                    onChange={(e) => handleParticipantChange(p.id, 'share', e.target.value)}
                    placeholder={t('splits.share_placeholder')}
                    className="input-field py-2 text-sm w-24 tabular-nums"
                  />
                  {form.participants.length > 2 && (
                    <button onClick={() => handleRemoveParticipant(p.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 shrink-0" aria-label="Remove">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleAddParticipant} className="mt-2 text-[11px] font-medium text-gray-400 hover:text-neon flex items-center gap-1 transition-colors">
              <Plus size={12} /> {t('splits.add_participant')}
            </button>
          </div>

          {formError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{formError}</p>}
          <button onClick={handleCreate} className="btn-primary w-full text-sm">{t('splits.create_split')}</button>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSplitCb(deleteTarget.id)
            addToast(t('splits.deleted_toast'), 'info')
            setDeleteTarget(null)
          }
        }}
        title={t('splits.delete_title')}
        description={t('splits.delete_desc')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
      />
    </div>
  )
}