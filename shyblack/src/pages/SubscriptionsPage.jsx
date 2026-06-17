import { useState, useMemo, useCallback } from 'react'
import { Repeat2, Plus, Trash2, Smartphone, CheckCircle2, XCircle, Calendar, AlertTriangle, ChevronRight } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import { getSubscriptionSummary } from '../utils/recurring'
import { PAYMENT_METHODS } from '../utils/constants'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'

const BILLING_CYCLES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'weekly', label: 'Weekly' },
]

export default function SubscriptionsPage() {
  const { recurring, addRecurring, removeRecurring, transactions } = useFinance()
  const { addToast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', amount: '', category: 'subscription', billingCycle: 'monthly', renewalDate: '', autoDebit: true })

  const summary = useMemo(() => getSubscriptionSummary(recurring), [recurring])

  const resetForm = useCallback(() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setForm({ name: '', amount: '', category: 'subscription', billingCycle: 'monthly', renewalDate: nextMonth.toISOString().split('T')[0], autoDebit: true })
  }, [])

  const openAdd = useCallback(() => { resetForm(); setShowAddModal(true) }, [resetForm])

  const handleSave = useCallback(() => {
    const name = form.name.trim()
    const amount = parseFloat(form.amount)
    if (!name) { addToast('Enter a subscription name', 'error'); return }
    if (!amount || amount <= 0) { addToast('Enter a valid amount', 'error'); return }

    addRecurring({
      type: 'expense',
      amount,
      category: form.category || 'subscription',
      note: name,
      source: 'subscription',
      frequency: form.billingCycle,
      nextDate: form.renewalDate || new Date().toISOString().split('T')[0],
      active: true,
      subscriptionName: name,
      billingCycle: form.billingCycle,
      renewalDate: form.renewalDate,
      autoDebit: form.autoDebit,
    })

    addToast('Subscription added', 'success')
    setShowAddModal(false)
  }, [form, addRecurring, addToast])

  const subscriptions = useMemo(() => {
    return recurring.filter((r) => r.source === 'subscription' || r.subscriptionName)
  }, [recurring])

  const activeSubs = useMemo(() => subscriptions.filter((s) => s.active !== false), [subscriptions])
  const inactiveSubs = useMemo(() => subscriptions.filter((s) => s.active === false), [subscriptions])

  const toggleActive = useCallback((id, current) => {
    removeRecurring(id)
    if (current !== false) {
      addToast('Subscription paused', 'info')
    }
  }, [removeRecurring, addToast])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Repeat2 size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">Subscriptions</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all">
          <Plus size={14} />
          Add
        </button>
      </div>

      {subscriptions.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Active</p>
            <p className="text-lg font-extrabold tabular-nums">{summary.activeSubs}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Monthly Total</p>
            <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(summary.totalMonthly)}</p>
          </GlassCard>
        </div>
      )}

      {subscriptions.length === 0 && (
        <EmptyState
          icon={Repeat2}
          title="No subscriptions"
          description="Track Netflix, Spotify, gym, and other recurring payments"
          action={<button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">Add First Subscription</button>}
        />
      )}

      {activeSubs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 mb-2">Active</h2>
          {activeSubs.map((s) => (
            <GlassCard key={s.id}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
                  <Repeat2 size={18} className="text-neon" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.subscriptionName || s.note || s.category}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(s.amount)}/{s.billingCycle || s.frequency}
                    {s.autoDebit && ' · Auto-debit'}
                    {s.renewalDate && ` · Next: ${new Date(s.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(s.id, s.active)} className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all" title="Pause">
                    <XCircle size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(s.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {inactiveSubs.length > 0 && (
        <div className="space-y-2 mt-5">
          <h2 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Inactive
          </h2>
          {inactiveSubs.map((s) => (
            <GlassCard key={s.id} className="opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-500/10 flex items-center justify-center">
                  <Repeat2 size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-400">{s.subscriptionName || s.note || s.category}</p>
                  <p className="text-xs text-gray-600">{formatCurrency(s.amount)}/{s.billingCycle || s.frequency}</p>
                </div>
                <button onClick={() => setDeleteTarget(s.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Subscription">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Subscription Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Netflix, Spotify..." className="input-field" maxLength={50} autoFocus />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Amount</label>
            <input type="text" inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))} placeholder="0" className="input-field text-lg font-bold tabular-nums" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Billing Cycle</label>
            <div className="flex gap-2">
              {BILLING_CYCLES.map((bc) => (
                <button
                  key={bc.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, billingCycle: bc.id }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    form.billingCycle === bc.id ? 'border-neon/50 bg-neon/10 text-neon' : 'border-glass-border text-gray-500 hover:text-white'
                  }`}
                >
                  {bc.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Next Renewal Date</label>
            <input type="date" value={form.renewalDate} onChange={(e) => setForm((f) => ({ ...f, renewalDate: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, autoDebit: !f.autoDebit }))}
              className={`p-2 rounded-lg transition-all ${form.autoDebit ? 'bg-neon/10 text-neon' : 'bg-matte-100 text-gray-500'}`}
            >
              <Smartphone size={16} />
            </button>
            <div className="flex-1">
              <p className="text-xs font-medium">Auto-debit</p>
              <p className="text-[11px] text-gray-500">Amount is auto-debited each cycle</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.name.trim() || !form.amount} className="flex-1 btn-primary text-sm">Add</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { removeRecurring(deleteTarget); addToast('Deleted', 'info'); setDeleteTarget(null) }}
        title="Delete Subscription?"
        description="This will permanently remove this subscription."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}
