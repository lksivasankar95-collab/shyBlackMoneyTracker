import { useState, useMemo, useCallback } from 'react'
import {
  Repeat2, Plus, Trash2, Edit3, Search, Calendar, CheckCircle2, XCircle,
  ChevronRight, AlertTriangle, Filter,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate, generateId } from '../utils/helpers'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, ALL_CATEGORIES } from '../utils/constants'
import { getRecurringStats, advanceNextDate } from '../utils/recurring'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'

const RECURRENCE_TYPES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

const emptyForm = {
  type: 'expense',
  category: '',
  amount: '',
  note: '',
  recurrenceType: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  isActive: true,
}

export default function RecurringTransactionsPage() {
  const { recurring, addRecurring, updateRecurring, toggleRecurring, removeRecurring } = useFinance()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [filterType, setFilterType] = useState('all')

  const stats = useMemo(() => getRecurringStats(recurring), [recurring])

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const filtered = useMemo(() => {
    let items = recurring
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((r) =>
        (r.note || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      )
    }
    if (filterType === 'active') items = items.filter((r) => r.isActive !== undefined ? r.isActive : r.active !== false)
    if (filterType === 'inactive') items = items.filter((r) => (r.isActive !== undefined ? r.isActive : r.active !== false) === false)
    if (filterType === 'income') items = items.filter((r) => r.type === 'income')
    if (filterType === 'expense') items = items.filter((r) => r.type === 'expense')
    return items
  }, [recurring, search, filterType])

  const resetForm = useCallback(() => {
    setForm({
      ...emptyForm,
      startDate: new Date().toISOString().split('T')[0],
    })
  }, [])

  const openAdd = useCallback(() => {
    resetForm()
    setEditTarget(null)
    setShowAddModal(true)
  }, [resetForm])

  const openEdit = useCallback((item) => {
    setEditTarget(item)
    setForm({
      type: item.type || 'expense',
      category: item.category || '',
      amount: String(item.amount || ''),
      note: item.note || '',
      recurrenceType: item.recurrenceType || item.frequency || 'monthly',
      startDate: item.startDate || item.nextDate || new Date().toISOString().split('T')[0],
      endDate: item.endDate || '',
      isActive: item.isActive !== undefined ? item.isActive : (item.active !== false),
    })
    setShowAddModal(true)
  }, [])

  const handleSave = useCallback(() => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { addToast('Amount must be greater than 0', 'error'); return }
    if (!form.startDate) { addToast('Start date is required', 'error'); return }
    if (!form.recurrenceType) { addToast('Recurrence type is required', 'error'); return }
    if (!form.category) { addToast('Category is required', 'error'); return }

    const data = {
      type: form.type,
      category: form.category,
      amount,
      note: form.note.trim(),
      recurrenceType: form.recurrenceType,
      frequency: form.recurrenceType,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      nextDate: form.startDate,
      nextRunDate: form.startDate,
      isActive: form.isActive,
      active: form.isActive,
      source: 'recurring',
    }

    if (editTarget) {
      updateRecurring(editTarget.id, data)
      addToast('Recurring transaction updated', 'success')
    } else {
      addRecurring(data)
      addToast('Recurring transaction added', 'success')
    }

    setShowAddModal(false)
    setEditTarget(null)
  }, [form, editTarget, addRecurring, updateRecurring, addToast])

  const handleToggle = useCallback((id) => {
    toggleRecurring(id)
    addToast('Recurring transaction toggled', 'info')
  }, [toggleRecurring, addToast])

  const getCategoryLabel = (catId) => {
    const cat = ALL_CATEGORIES.find((c) => c.id === catId)
    return cat ? cat.label : catId
  }

  const getFrequencyLabel = (item) => {
    const freq = item.recurrenceType || item.frequency || 'monthly'
    const r = RECURRENCE_TYPES.find((t) => t.id === freq)
    return r ? r.label : freq
  }

  const isItemActive = (item) => item.isActive !== undefined ? item.isActive : (item.active !== false)

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Repeat2 size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">Recurring Transactions</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all">
          <Plus size={14} />
          Add
        </button>
      </div>

      {recurring.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Active</p>
            <p className="text-lg font-extrabold tabular-nums">{stats.active}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Monthly Total</p>
            <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(stats.totalMonthly)}</p>
          </GlassCard>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recurring..."
            className="input-field !pl-9 text-xs"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'active', 'inactive', 'income', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                filterType === f ? 'border-neon/50 bg-neon/10 text-neon' : 'border-glass-border text-gray-500 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Repeat2}
          title={search || filterType !== 'all' ? 'No matching recurring transactions' : 'No recurring transactions yet'}
          description={search || filterType !== 'all' ? 'Try a different search or filter' : 'Add your first recurring transaction to automate income and expenses'}
          action={
            !search && filterType === 'all' ? (
              <button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">Add First</button>
            ) : undefined
          }
        />
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <GlassCard key={item.id}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                item.type === 'income' ? 'bg-neon/10' : 'bg-red-500/10'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${item.type === 'income' ? 'bg-neon' : 'bg-red-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${!isItemActive(item) ? 'text-gray-500' : ''}`}>
                    {item.note || getCategoryLabel(item.category)}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isItemActive(item) ? 'bg-neon/10 text-neon' : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {getFrequencyLabel(item)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {formatCurrency(item.amount)}
                  {item.category && ` · ${getCategoryLabel(item.category)}`}
                </p>
                {item.nextDate && (
                  <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                    <Calendar size={10} />
                    Next: {formatDate(item.nextDate)}
                    {item.endDate && ` · Ends: ${formatDate(item.endDate)}`}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`p-1.5 rounded-lg transition-all ${
                    isItemActive(item)
                      ? 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'
                      : 'text-neon hover:text-neon hover:bg-neon/10'
                  }`}
                  title={isItemActive(item) ? 'Disable' : 'Enable'}
                >
                  {isItemActive(item) ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(item.id)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditTarget(null) }}
        title={editTarget ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Type</label>
            <div className="flex gap-2">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    form.type === t
                      ? t === 'income' ? 'border-neon/50 bg-neon/10 text-neon' : 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-glass-border text-gray-500 hover:text-white'
                  }`}
                >
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    form.category === cat.id
                      ? 'border-neon/50 bg-neon/10 text-neon'
                      : 'border-glass-border text-gray-500 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Amount</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
              placeholder="0"
              className="input-field text-lg font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Note</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Rent, Salary, etc."
              className="input-field"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Recurrence Type</label>
            <div className="flex gap-2">
              {RECURRENCE_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, recurrenceType: rt.id }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    form.recurrenceType === rt.id
                      ? 'border-neon/50 bg-neon/10 text-neon'
                      : 'border-glass-border text-gray-500 hover:text-white'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              End Date <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`p-2 rounded-lg transition-all ${form.isActive ? 'bg-neon/10 text-neon' : 'bg-matte-100 text-gray-500'}`}
            >
              {form.isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            </button>
            <div className="flex-1">
              <p className="text-xs font-medium">Active</p>
              <p className="text-[11px] text-gray-500">Auto-generate transactions when due</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!form.amount || !form.startDate || !form.recurrenceType || !form.category}
              className="flex-1 btn-primary text-sm disabled:opacity-40"
            >
              {editTarget ? 'Update' : 'Add'}
            </button>
            <button onClick={() => { setShowAddModal(false); setEditTarget(null) }} className="flex-1 btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { removeRecurring(deleteTarget); addToast('Recurring transaction deleted', 'info'); setDeleteTarget(null) }}
        title="Delete Recurring Transaction"
        description="This will permanently remove this recurring transaction. Future transactions will not be auto-generated."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}