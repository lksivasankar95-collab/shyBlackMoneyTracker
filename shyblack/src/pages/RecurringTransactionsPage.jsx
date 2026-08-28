import { useState, useMemo, useCallback } from 'react'
import {
  Repeat2, Plus, Trash2, Edit3, Search, Calendar, CheckCircle2, XCircle,
  ChevronRight, AlertTriangle, PauseCircle, Play, SkipForward,
  Bell, BellOff, Shield, Zap, Briefcase, Building2, CreditCard, TrendingUp,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate } from '../utils/helpers'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, ALL_CATEGORIES } from '../utils/constants'
import { getRecurringStats, getRecurringCalendarData, detectDuplicateGeneration } from '../utils/recurring'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'

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

const CATEGORY_ICON_MAP = {
  salary: Briefcase,
  rent: Building2,
  emi: CreditCard,
  sip: TrendingUp,
  subscription: Repeat2,
  insurance: Shield,
  utility_bills: Zap,
}

const CATEGORY_COLOR_MAP = {
  salary: 'text-green-400 bg-green-500/10',
  rent: 'text-blue-400 bg-blue-500/10',
  emi: 'text-red-400 bg-red-500/10',
  sip: 'text-purple-400 bg-purple-500/10',
  subscription: 'text-cyan-400 bg-cyan-500/10',
  insurance: 'text-yellow-400 bg-yellow-500/10',
  utility_bills: 'text-orange-400 bg-orange-500/10',
}

export default function RecurringTransactionsPage() {
  const { t } = useTranslation()
  const { recurring, transactions, addRecurring, updateRecurring, toggleRecurring, removeRecurring, pauseRecurring, resumeRecurring, skipNextOccurrence, editFutureOccurrences } = useFinance()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [filterType, setFilterType] = useState('all')
  const [showEditFutureModal, setShowEditFutureModal] = useState(false)
  const [editFutureTarget, setEditFutureTarget] = useState(null)
  const [futureForm, setFutureForm] = useState({ amount: '', category: '', note: '' })
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())

  const stats = useMemo(() => getRecurringStats(recurring), [recurring])

  const RECURRENCE_TYPES = useMemo(() => [
    { id: 'daily', label: t('recurring.daily') },
    { id: 'weekly', label: t('recurring.weekly') },
    { id: 'monthly', label: t('recurring.monthly') },
    { id: 'yearly', label: t('recurring.yearly') },
  ], [t])

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const duplicateStatus = useMemo(() => {
    try { return detectDuplicateGeneration(recurring, transactions) } catch { return [] }
  }, [recurring, transactions])

  const calendarData = useMemo(() => {
    if (!showCalendar) return []
    try { return getRecurringCalendarData(recurring, calendarYear, calendarMonth) } catch { return [] }
  }, [recurring, calendarYear, calendarMonth, showCalendar])

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
    if (filterType === 'paused') items = items.filter((r) => r.paused)
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

  const openEditFuture = useCallback((item) => {
    setEditFutureTarget(item)
    setFutureForm({
      amount: String(item.amount || ''),
      category: item.category || '',
      note: item.note || '',
    })
    setShowEditFutureModal(true)
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

  const handlePause = useCallback((id) => {
    pauseRecurring(id)
    addToast('Recurring paused', 'info')
  }, [pauseRecurring, addToast])

  const handleResume = useCallback((id) => {
    resumeRecurring(id)
    addToast('Recurring resumed', 'success')
  }, [resumeRecurring, addToast])

  const handleSkip = useCallback((id) => {
    skipNextOccurrence(id)
    addToast('Next occurrence skipped', 'info')
  }, [skipNextOccurrence, addToast])

  const handleEditFuture = useCallback(() => {
    if (!editFutureTarget) return
    const updates = {}
    if (futureForm.amount) updates.amount = parseFloat(futureForm.amount)
    if (futureForm.category) updates.category = futureForm.category
    updates.note = futureForm.note.trim()
    editFutureOccurrences(editFutureTarget.id, updates)
    addToast('Future occurrences updated', 'success')
    setShowEditFutureModal(false)
    setEditFutureTarget(null)
  }, [editFutureTarget, futureForm, editFutureOccurrences, addToast])

  const handleNotifyToggle = useCallback((item) => {
    updateRecurring(item.id, { notify: !(item.notify ?? true) })
    addToast(item.notify === false ? 'Notifications enabled' : 'Notifications disabled', 'info')
  }, [updateRecurring, addToast])

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

  const getCategoryIcon = (catId) => {
    const Icon = CATEGORY_ICON_MAP[catId]
    return Icon || Repeat2
  }

  const getCategoryColorClass = (catId) => {
    return CATEGORY_COLOR_MAP[catId] || (catId === 'salary' ? 'text-green-400 bg-green-500/10' : 'text-gray-400 bg-gray-500/10')
  }


  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Repeat2 size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('recurring.title')}</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all">
          <Plus size={14} />
          {t('recurring.add_btn')}
        </button>
      </div>

      {recurring.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">{t('recurring.active')}</p>
            <p className="text-lg font-extrabold tabular-nums">{stats.active}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">{t('recurring.monthly_total')}</p>
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
        <div className="flex gap-1 flex-wrap">
          {['all', 'active', 'inactive', 'paused', 'income', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                filterType === f ? 'border-neon/50 bg-neon/10 text-neon' : 'border-glass-border text-gray-500 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full flex items-center justify-center gap-2 py-2 mb-4 rounded-xl border border-glass-border text-xs text-gray-500 hover:text-white hover:bg-white/[0.03] transition-all"
      >
        <Calendar size={14} />
        {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
        <ChevronRight size={12} className={`transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
      </button>

      {showCalendar && (
        <GlassCard className="!p-3 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (calendarMonth === 1) { setCalendarYear((y) => y - 1); setCalendarMonth(12) }
                else setCalendarMonth((m) => m - 1)
              }}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
            <span className="text-xs font-semibold">
              {new Date(calendarYear, calendarMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                if (calendarMonth === 12) { setCalendarYear((y) => y + 1); setCalendarMonth(1) }
                else setCalendarMonth((m) => m + 1)
              }}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          {calendarData.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">No recurring items this month</p>
          )}
          {calendarData.slice(0, 14).map((day) => (
            <div key={day.date} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
              <span className="text-[10px] text-gray-500 w-20 shrink-0">{formatDate(day.date)}</span>
              <div className="flex flex-wrap gap-1">
                {day.items.map((item) => (
                  <span key={item.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-neon/10 text-neon">
                    {item.note || getCategoryLabel(item.category)} ({formatCurrency(item.amount)})
                  </span>
                ))}
              </div>
            </div>
          ))}
          {calendarData.length > 14 && (
            <p className="text-[10px] text-gray-600 text-center mt-2">+{calendarData.length - 14} more days</p>
          )}
        </GlassCard>
      )}

      {duplicateStatus.some((d) => d.generatedToday) && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2.5">
          <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">Duplicate Warning</p>
            <p className="text-[10px] text-yellow-300/70">{duplicateStatus.filter((d) => d.generatedToday).length} recurring transactions already generated today</p>
          </div>
        </div>
      )}

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
        {filtered.map((item) => {
          const CatIcon = getCategoryIcon(item.category)
          const catColorClass = getCategoryColorClass(item.category)
          const isPaused = item.paused
          const dup = duplicateStatus.find((d) => d.recurring.id === item.id)

          return (
            <GlassCard key={item.id}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  catColorClass
                }`}>
                  <CatIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${!isItemActive(item) || isPaused ? 'text-gray-500' : ''}`}>
                      {item.note || getCategoryLabel(item.category)}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isPaused ? 'bg-yellow-500/10 text-yellow-400' :
                      isItemActive(item) ? 'bg-neon/10 text-neon' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {isPaused ? 'Paused' : getFrequencyLabel(item)}
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
                  {dup && dup.generatedToday && (
                    <p className="text-[10px] text-yellow-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={10} />
                      Generated today
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <button
                    onClick={() => handleNotifyToggle(item)}
                    className={`p-1.5 rounded-lg transition-all ${
                      (item.notify ?? true)
                        ? 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'
                        : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.05]'
                    }`}
                    title={(item.notify ?? true) ? 'Disable notifications' : 'Enable notifications'}
                  >
                    {(item.notify ?? true) ? <Bell size={14} /> : <BellOff size={14} />}
                  </button>
                  {isPaused ? (
                    <button
                      onClick={() => handleResume(item.id)}
                      className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-all"
                      title="Resume"
                    >
                      <Play size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePause(item.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                      title="Pause"
                    >
                      <PauseCircle size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleSkip(item.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                    title="Skip Next"
                  >
                    <SkipForward size={14} />
                  </button>
                  <button
                    onClick={() => openEditFuture(item)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                    title="Edit Future"
                  >
                    <Edit3 size={14} />
                  </button>
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
          )
        })}
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

      <Modal
        open={showEditFutureModal}
        onClose={() => { setShowEditFutureModal(false); setEditFutureTarget(null) }}
        title="Edit Future Occurrences"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Update amount, category, or note for all future occurrences of this recurring transaction.</p>
          {editFutureTarget && (
            <div className="p-3 rounded-xl bg-white/[0.03]">
              <p className="text-xs font-semibold">{editFutureTarget.note || getCategoryLabel(editFutureTarget.category)}</p>
              <p className="text-[10px] text-gray-500">{formatCurrency(editFutureTarget.amount)} · {getFrequencyLabel(editFutureTarget)}</p>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">New Amount <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              inputMode="numeric"
              value={futureForm.amount}
              onChange={(e) => setFutureForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
              placeholder="Leave empty to keep current"
              className="input-field text-lg font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">New Category <span className="text-gray-600">(optional)</span></label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {(editFutureTarget?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFutureForm((f) => ({ ...f, category: cat.id }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    futureForm.category === cat.id
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
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">New Note <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              value={futureForm.note}
              onChange={(e) => setFutureForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Leave empty to keep current"
              className="input-field"
              maxLength={100}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditFuture}
              disabled={!futureForm.amount && !futureForm.category && !futureForm.note.trim()}
              className="flex-1 btn-primary text-sm disabled:opacity-40"
            >
              Update Future
            </button>
            <button onClick={() => { setShowEditFutureModal(false); setEditFutureTarget(null) }} className="flex-1 btn-secondary text-sm">Cancel</button>
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
