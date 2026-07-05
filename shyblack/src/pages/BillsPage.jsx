import { useState, useMemo, useCallback} from 'react'
import { Receipt, Plus, Trash2, CheckCircle2, Calendar, Bell, BellOff, CreditCard, Wifi, Smartphone, Droplets, Flame, Shield, Banknote, Zap } from 'lucide-react'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import { getBills, addBill, updateBill, deleteBill, markBillPaid, getBillStats, BILL_TYPES } from '../utils/bills'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'

const BILL_ICONS = {
  Zap, Wifi, Smartphone, Droplets, Flame, Shield, CreditCard, Banknote, Receipt,
}

function getBillIcon(typeId) {
  const bt = BILL_TYPES.find((t) => t.id === typeId)
  const iconName = bt?.icon || 'Receipt'
  return BILL_ICONS[iconName] || Receipt
}

function getBillLabel(typeId) {
  const bt = BILL_TYPES.find((t) => t.id === typeId)
  return bt?.label || 'Custom Bill'
}

function getNextUnpaidDueDate(bill) {
  if (!bill.paidDates || bill.paidDates.length === 0) return bill.dueDate
  const paid = new Set(bill.paidDates)
  const d = new Date(bill.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let maxIter = 24
  while (maxIter-- > 0) {
    const dateStr = d.toISOString().split('T')[0]
    if (!paid.has(dateStr)) {
      if (bill.recurring && d < today) {
        d.setMonth(d.getMonth() + 1)
        continue
      }
      return dateStr
    }
    if (bill.recurring) {
      d.setMonth(d.getMonth() + 1)
    } else {
      break
    }
  }
  return bill.dueDate
}

function getBillStatus(bill) {
  const dueStr = getNextUnpaidDueDate(bill)
  const today = new Date().toISOString().split('T')[0]
  if (!bill.active) return 'inactive'
  if (!bill.paidDates || bill.paidDates.length === 0) {
    if (dueStr < today) return 'overdue'
    if (dueStr === today) return 'due_today'
    return 'upcoming'
  }
  const lastPaid = [...bill.paidDates].sort().pop()
  if (bill.recurring) {
    const nextDate = new Date(bill.dueDate)
    const paidDatesSet = new Set(bill.paidDates)
    let maxIter = 24
    while (maxIter-- > 0) {
      const ds = nextDate.toISOString().split('T')[0]
      if (!paidDatesSet.has(ds)) {
        if (ds < today) return 'overdue'
        if (ds === today) return 'due_today'
        return 'upcoming'
      }
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    return 'paid'
  }
  if (lastPaid >= today) return 'paid'
  const nextUnpaid = getNextUnpaidDueDate(bill)
  if (nextUnpaid < today) return 'overdue'
  if (nextUnpaid === today) return 'due_today'
  return 'upcoming'
}

export default function BillsPage({ _onNavigate }) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [bills, setBills] = useState(() => getBills())
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState({
    type: 'electricity', name: '', amount: '', dueDate: '',
    recurring: false, reminderDays: 3, notes: '',
  })

  const refresh = useCallback(() => {
    setBills(getBills())
  }, [])

  const resetForm = useCallback(() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setForm({
      type: 'electricity', name: '', amount: '', dueDate: nextMonth.toISOString().split('T')[0],
      recurring: false, reminderDays: 3, notes: '',
    })
  }, [])

  const openAdd = useCallback(() => { resetForm(); setShowAddModal(true) }, [resetForm])

  const stats = useMemo(() => getBillStats(bills), [bills])

  const billsWithStatus = useMemo(() => {
    return bills.map((b) => ({ ...b, _status: getBillStatus(b) }))
  }, [bills])

  const filteredBills = useMemo(() => {
    if (filterStatus === 'all') return billsWithStatus
    return billsWithStatus.filter((b) => b._status === filterStatus)
  }, [billsWithStatus, filterStatus])

  const activeCount = useMemo(() => billsWithStatus.filter((b) => b._status !== 'inactive').length, [billsWithStatus])

  const handleSave = useCallback(() => {
    const name = form.name.trim()
    const amount = parseFloat(form.amount)
    if (!name) { addToast('Bill name is required', 'error'); return }
    if (!amount || amount <= 0) { addToast('Valid amount is required', 'error'); return }
    if (!form.dueDate) { addToast('Due date is required', 'error'); return }

    addBill({
      type: form.type,
      name,
      amount,
      dueDate: form.dueDate,
      recurring: form.recurring,
      reminderDays: form.reminderDays,
      notes: form.notes,
    })
    addToast('Bill added successfully', 'success')
    setShowAddModal(false)
    refresh()
  }, [form, addToast, refresh])

  const handleMarkPaid = useCallback((id) => {
    markBillPaid(id)
    addToast('Bill marked as paid', 'success')
    refresh()
  }, [addToast, refresh])

  const handleDelete = useCallback(() => {
    if (deleteTarget) {
      deleteBill(deleteTarget)
      addToast('Bill deleted', 'info')
      setDeleteTarget(null)
      refresh()
    }
  }, [deleteTarget, addToast, refresh])

  const handleToggleActive = useCallback((id, currentActive) => {
    updateBill(id, { active: !currentActive })
    addToast(currentActive ? 'Bill paused' : 'Bill activated', 'info')
    refresh()
  }, [addToast, refresh])

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'due_today', label: 'Due Today' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'paid', label: 'Paid' },
  ]

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Receipt size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">Bills</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all">
          <Plus size={14} />
          Add Bill
        </button>
      </div>

      {/* Stats Header */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Total Bills</p>
            <p className="text-lg font-extrabold tabular-nums">{stats.total}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Paid This Month</p>
            <p className="text-lg font-extrabold text-neon tabular-nums">{stats.paid}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Overdue</p>
            <p className={`text-lg font-extrabold tabular-nums ${stats.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`}>{stats.overdue}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Upcoming Amount</p>
            <p className="text-lg font-extrabold text-amber-400 tabular-nums">{formatCurrency(stats.upcomingAmount)}</p>
          </GlassCard>
        </div>
      )}

      {/* Filter Tabs */}
      {activeCount > 0 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => {
            const count = f.id === 'all' ? activeCount : billsWithStatus.filter((b) => b._status === f.id).length
            const isActive = filterStatus === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isActive ? 'bg-neon text-black' : 'bg-matte-100 text-gray-500 hover:text-white'
                }`}
              >
                {f.label} {count > 0 && <span className={`ml-1 ${isActive ? 'text-black/60' : 'text-gray-600'}`}>({count})</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {bills.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Add your recurring bills like electricity, internet, insurance to never miss a payment"
          action={<button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">Add First Bill</button>}
        />
      )}

      {/* Bill List */}
      {filteredBills.length > 0 && (
        <div className="space-y-2">
          {filteredBills.map((bill) => {
            const Icon = getBillIcon(bill.type)
            const status = bill._status
            const dueStr = getNextUnpaidDueDate(bill)
            const dueDate = new Date(dueStr)
            const now = new Date()
            now.setHours(0, 0, 0, 0)
            const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

            return (
              <GlassCard key={bill.id} className={status === 'overdue' ? 'border-red-500/20' : status === 'due_today' ? 'border-amber-500/20' : ''}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    status === 'paid' ? 'bg-neon/10 text-neon' :
                    status === 'overdue' ? 'bg-red-500/10 text-red-400' :
                    status === 'due_today' ? 'bg-amber-500/10 text-amber-400' :
                    status === 'inactive' ? 'bg-gray-500/10 text-gray-500' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{bill.name}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        status === 'paid' ? 'bg-neon/10 text-neon' :
                        status === 'overdue' ? 'bg-red-500/10 text-red-400' :
                        status === 'due_today' ? 'bg-amber-500/10 text-amber-400' :
                        status === 'inactive' ? 'bg-gray-500/10 text-gray-500' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {status === 'paid' ? 'Paid' :
                         status === 'overdue' ? 'Overdue' :
                         status === 'due_today' ? 'Due Today' :
                         status === 'inactive' ? 'Paused' :
                         diffDays === 0 ? 'Due Today' :
                         diffDays === 1 ? 'Due Tomorrow' :
                         `In ${diffDays} days`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{getBillLabel(bill.type)}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500">{formatCurrency(bill.amount)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-600">
                        {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {bill.recurring && ' (Recurring)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {status !== 'paid' && status !== 'inactive' && (
                      <button
                        onClick={() => handleMarkPaid(bill.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all"
                        title="Mark as paid"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActive(bill.id, bill.active)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                      title={bill.active ? 'Pause' : 'Activate'}
                    >
                      {bill.active ? <BellOff size={14} /> : <Bell size={14} />}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(bill.id)}
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
      )}

      {/* Add Bill Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Bill">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Bill Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input-field text-sm"
            >
              {BILL_TYPES.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Bill Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Airtel Broadband"
              className="input-field"
              maxLength={50}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Amount (₹)</label>
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
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="input-field"
            />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
              className={`p-2 rounded-lg transition-all ${form.recurring ? 'bg-neon/10 text-neon' : 'bg-matte-100 text-gray-500'}`}
            >
              <Calendar size={16} />
            </button>
            <div className="flex-1">
              <p className="text-xs font-medium">Recurring Bill</p>
              <p className="text-[11px] text-gray-500">Automatically repeats each month</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Reminder (days before due)</label>
            <select
              value={form.reminderDays}
              onChange={(e) => setForm((f) => ({ ...f, reminderDays: Number(e.target.value) }))}
              className="input-field text-sm"
            >
              {[0, 1, 2, 3, 5, 7, 14].map((d) => (
                <option key={d} value={d}>{d === 0 ? 'On due date' : `${d} day${d > 1 ? 's' : ''} before`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional info"
              className="input-field"
              maxLength={100}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.name.trim() || !form.amount} className="flex-1 btn-primary text-sm">Add Bill</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Bill"
        description="Are you sure you want to delete this bill? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}
