import { useState, useMemo, useCallback } from 'react'
import {
  CreditCard, Plus, Minus, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  BarChart3, Landmark, Calendar, RotateCcw, ChevronDown, ChevronUp,
  Search, Trash2, Edit3, Lock, Unlock, Calculator, X,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { EMI_STATUS, FREQUENCY_OPTIONS, FREQUENCIES, getFrequencyLabel, LOAN_TYPES, getLoanTypeLabel, calculateEMI, getEmiDueDate, getEmiPaymentHistory, getEmiStatsForDashboard, getEmiInsights } from '../utils/emi'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import { useToast } from '../components/Toast'

function DueBadge({ emi }) {
  if (emi.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
        <AlertTriangle size={10} /> Overdue
      </span>
    )
  }
  if (emi.isDueToday) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
        <Clock size={10} /> Due Today
      </span>
    )
  }
  if (emi.isDueTomorrow) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
        <Calendar size={10} /> Due Tomorrow
      </span>
    )
  }
  if (emi.isDueWithin7) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
        <Calendar size={10} /> {emi.dueInDays}d left
      </span>
    )
  }
  return null
}

const emptyForm = {
  loanName: '',
  lenderName: '',
  loanType: 'personal',
  principalAmount: '',
  interestRate: '',
  tenureMonths: '',
  emiAmount: '',
  startDate: new Date().toISOString().split('T')[0],
  frequency: FREQUENCIES.MONTHLY,
  notes: '',
}

export default function EmiCenterPage({ onNavigate }) {
  const { t } = useTranslation()
  const { emis, addEmi, updateEmi, deleteEmi, closeEmi, reopenEmi, markEmiPaid, undoEmiPayment, emiSummary } = useFinance()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailEmi, setDetailEmi] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcForm, setCalcForm] = useState({ principal: '', rate: '', tenure: '' })
  const [calcResult, setCalcResult] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm, startDate: new Date().toISOString().split('T')[0] })
  }, [])

  const openAdd = useCallback(() => {
    resetForm()
    setEditTarget(null)
    setShowForm(true)
  }, [resetForm])

  const openEdit = useCallback((emi) => {
    setEditTarget(emi)
    setForm({
      loanName: emi.loanName || emi.name || '',
      lenderName: emi.lenderName || emi.lender || '',
      loanType: emi.loanType || 'other',
      principalAmount: String(emi.principalAmount || emi.totalAmount || ''),
      interestRate: String(emi.interestRate || ''),
      tenureMonths: String(emi.tenureMonths || emi.totalMonths || ''),
      emiAmount: String(emi.emiAmount || emi.amount || ''),
      startDate: emi.startDate || new Date().toISOString().split('T')[0],
      frequency: emi.frequency || FREQUENCIES.MONTHLY,
      notes: emi.notes || '',
    })
    setShowForm(true)
  }, [])

  const handleCalc = useCallback(() => {
    const p = parseFloat(calcForm.principal)
    const r = parseFloat(calcForm.rate)
    const t = parseFloat(calcForm.tenure)
    if (!p || p <= 0 || !t || t <= 0) return
    setCalcResult(calculateEMI(p, r, t))
  }, [calcForm])

  const applyCalcResult = useCallback(() => {
    if (!calcResult) return
    setForm((f) => ({ ...f, emiAmount: String(calcResult.emi) }))
    setShowCalculator(false)
  }, [calcResult])

  const handleSave = useCallback(() => {
    const principal = parseFloat(form.principalAmount)
    const emiAmt = parseFloat(form.emiAmount)
    const tenure = parseFloat(form.tenureMonths)
    const rate = parseFloat(form.interestRate) || 0

    if (!form.loanName.trim()) { addToast('Loan name is required', 'error'); return }
    if (!principal || principal <= 0) { addToast('Principal must be greater than 0', 'error'); return }
    if (!emiAmt || emiAmt <= 0) { addToast('EMI amount must be greater than 0', 'error'); return }
    if (!tenure || tenure <= 0) { addToast('Tenure must be greater than 0', 'error'); return }

    const data = {
      loanName: form.loanName.trim(),
      lenderName: form.lenderName.trim(),
      loanType: form.loanType,
      principalAmount: principal,
      interestRate: rate,
      tenureMonths: tenure,
      emiAmount: emiAmt,
      startDate: form.startDate,
      frequency: form.frequency,
      notes: form.notes.trim(),
    }

    if (editTarget) {
      updateEmi(editTarget.id, data)
      addToast('EMI updated', 'success')
    } else {
      addEmi(data)
      addToast('EMI added', 'success')
    }

    setShowForm(false)
    setEditTarget(null)
  }, [form, editTarget, addToast, updateEmi, addEmi])

  const handlePay = useCallback((emiId) => {
    markEmiPaid(emiId)
    addToast('EMI payment recorded', 'success')
  }, [markEmiPaid, addToast])

  const handleUndo = useCallback((emiId) => {
    undoEmiPayment(emiId)
    addToast('Last payment undone', 'info')
  }, [undoEmiPayment, addToast])

  const handleClose = useCallback((emiId) => {
    closeEmi(emiId)
    addToast('EMI closed', 'info')
  }, [closeEmi, addToast])

  const handleReopen = useCallback((emiId) => {
    reopenEmi(emiId)
    addToast('EMI reopened', 'success')
  }, [reopenEmi, addToast])

  const filtered = useMemo(() => {
    const withDue = emis.map((emi) => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const nextDue = getEmiDueDate(emi)
      const dueDate = nextDue ? new Date(nextDue + 'T00:00:00') : null
      const diffDays = dueDate ? Math.ceil((dueDate - today) / 86400000) : null
      return {
        ...emi,
        nextDueDate: nextDue,
        dueInDays: diffDays,
        isOverdue: diffDays !== null && diffDays < 0,
        isDueToday: diffDays === 0,
        isDueTomorrow: diffDays === 1,
        isDueWithin7: diffDays !== null && diffDays >= 0 && diffDays <= 7,
        completionPercentage: emi.principalAmount > 0
          ? Math.round((((emi.principalAmount - (emi.remainingAmount || 0)) / emi.principalAmount) * 100))
          : 0,
        remainingBalance: Math.max(0, emi.remainingAmount || 0),
        remainingInstallments: Math.max(0, emi.remainingMonths || 0),
      }
    })

    let result = withDue
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((e) =>
        (e.loanName || e.name || '').toLowerCase().includes(q) ||
        (e.lenderName || e.lender || '').toLowerCase().includes(q)
      )
    }
    if (filter === 'active') result = result.filter((e) => e.status === EMI_STATUS.ACTIVE)
    else if (filter === 'closed') result = result.filter((e) => e.status === EMI_STATUS.CLOSED || e.status === EMI_STATUS.COMPLETED)
    else if (filter === 'overdue') result = result.filter((e) => e.isOverdue && e.status === EMI_STATUS.ACTIVE)
    else if (filter === 'due-this-month') result = result.filter((e) => e.isDueWithin7 || e.isDueToday || e.isDueTomorrow)
    return result
  }, [emis, search, filter])

  const stats = useMemo(() => getEmiStatsForDashboard(emis), [emis])
  const insights = useMemo(() => getEmiInsights(emis), [emis])

  const overdueCount = filtered.filter((e) => e.isOverdue && e.status === EMI_STATUS.ACTIVE).length

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Landmark size={18} className="text-purple-400" />
          </div>
          <h1 className="text-xl font-bold">EMI Tracker</h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowCalculator(true)} className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all" title="EMI Calculator">
            <Calculator size={16} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all">
            {showForm ? <Minus size={14} /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {emis.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Active</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{stats.totalActiveLoans}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Outstanding</p>
            <p className="text-sm font-extrabold text-purple-400 tabular-nums">{formatCurrency(stats.totalOutstanding)}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Due This Month</p>
            <p className={`text-sm font-extrabold tabular-nums ${stats.dueThisMonth > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>{stats.dueThisMonth}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Monthly EMI</p>
            <p className="text-sm font-extrabold text-amber-400 tabular-nums">{formatCurrency(stats.totalEMIThisMonth)}</p>
          </GlassCard>
        </div>
      )}

      {showForm && (
        <GlassCard className="mb-4 border-purple-500/20">
          <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5">
            {editTarget ? <Edit3 size={12} className="text-purple-400" /> : <Plus size={12} className="text-purple-400" />}
            {editTarget ? 'Edit EMI' : 'Add New EMI'}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Loan Name *" value={form.loanName} onChange={(e) => setForm((f) => ({ ...f, loanName: e.target.value }))} className="input-field text-sm" required />
              <input type="text" placeholder="Lender Name" value={form.lenderName} onChange={(e) => setForm((f) => ({ ...f, lenderName: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1.5 block">Loan Type</label>
              <div className="flex flex-wrap gap-1.5">
                {LOAN_TYPES.map((lt) => (
                  <button
                    key={lt.id} type="button"
                    onClick={() => setForm((f) => ({ ...f, loanType: lt.id }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${form.loanType === lt.id ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-glass-border text-gray-500 hover:text-white'}`}
                  >{lt.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Principal *</label>
                <input type="number" placeholder="1,00,000" value={form.principalAmount} onChange={(e) => setForm((f) => ({ ...f, principalAmount: e.target.value }))} className="input-field text-sm" min="1" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Interest Rate %</label>
                <input type="number" placeholder="10.5" value={form.interestRate} onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))} className="input-field text-sm" min="0" step="0.1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Tenure (months) *</label>
                <input type="number" placeholder="12" value={form.tenureMonths} onChange={(e) => setForm((f) => ({ ...f, tenureMonths: e.target.value }))} className="input-field text-sm" min="1" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">EMI Amount *</label>
                <div className="flex gap-1">
                  <input type="number" placeholder="10,000" value={form.emiAmount} onChange={(e) => setForm((f) => ({ ...f, emiAmount: e.target.value }))} className="input-field text-sm flex-1" min="1" />
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseFloat(form.principalAmount)
                      const r = parseFloat(form.interestRate) || 0
                      const t = parseFloat(form.tenureMonths)
                      if (p > 0 && t > 0) {
                        const result = calculateEMI(p, r, t)
                        setForm((f) => ({ ...f, emiAmount: String(result.emi) }))
                      }
                    }}
                    className="px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] hover:bg-amber-500/20 transition-all"
                    title="Auto-calculate EMI"
                  >
                    <Calculator size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Frequency</label>
                <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} className="input-field text-sm">
                  {FREQUENCY_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                </select>
              </div>
            </div>
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input-field text-sm resize-none" />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!form.loanName || !form.principalAmount || !form.emiAmount || !form.tenureMonths}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-40"
              >
                {editTarget ? 'Update EMI' : 'Create EMI'}
              </button>
              <button onClick={() => { setShowForm(false); setEditTarget(null) }} className="flex-1 btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search loans..." className="input-field !pl-9 text-xs" />
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {[
          { key: 'active', label: 'Active', count: stats.totalActiveLoans },
          { key: 'overdue', label: 'Overdue', count: overdueCount },
          { key: 'due-this-month', label: 'Due Soon' },
          { key: 'closed', label: 'Closed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${filter === tab.key ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.03] text-gray-500 hover:text-gray-300'}`}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1.5">({tab.count})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Landmark}
          title={emis.length === 0 ? 'No EMIs yet' : 'No matching EMIs'}
          description={emis.length === 0 ? 'Add your first EMI to start tracking' : 'Try a different search or filter'}
          action={emis.length === 0 ? <button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">Add First EMI</button> : undefined}
        />
      )}

      <div className="space-y-2 mb-6">
        {filtered.map((emi) => (
          <GlassCard key={emi.id} className={`${emi.isOverdue ? 'border-red-500/20' : emi.isDueToday ? 'border-yellow-500/20' : ''}`}>
            <button onClick={() => setDetailEmi(detailEmi?.id === emi.id ? null : emi)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${emi.isOverdue ? 'bg-red-500/10' : emi.isDueToday ? 'bg-yellow-500/10' : 'bg-purple-500/10'}`}>
                  <CreditCard size={15} className={emi.isOverdue ? 'text-red-400' : emi.isDueToday ? 'text-yellow-400' : 'text-purple-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium truncate">{emi.loanName || emi.name || 'Untitled'}</p>
                    <DueBadge emi={emi} />
                    {(emi.status === EMI_STATUS.CLOSED || emi.status === EMI_STATUS.COMPLETED) && (
                      <span className="text-[10px] text-emerald-400 font-medium">Closed</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {emi.lenderName || emi.lender || getLoanTypeLabel(emi.loanType)} · {getFrequencyLabel(emi.frequency)} · {formatCurrency(emi.emiAmount || emi.amount || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums">{formatCurrency(emi.remainingBalance)}</p>
                  <p className="text-[10px] text-gray-600">{emi.remainingInstallments || 0} left</p>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-matte-200 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${emi.isOverdue ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-purple-500 to-orange-400'}`} style={{ width: `${Math.min(emi.completionPercentage || 0, 100)}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-600">{Math.round(emi.completionPercentage || 0)}% paid</span>
                <span className="text-[10px] text-gray-600">{emi.totalPaidCount || 0}/{emi.tenureMonths || emi.totalMonths || 0} payments</span>
              </div>
            </button>

            {detailEmi?.id === emi.id && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <span className="text-gray-600">Principal</span>
                  <span className="font-semibold text-right">{formatCurrency(emi.principalAmount || 0)}</span>
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-semibold text-right">{emi.interestRate || 0}%</span>
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-semibold text-right text-emerald-400">{formatCurrency(emi.totalPaid || 0)}</span>
                  <span className="text-gray-600">Interest Paid</span>
                  <span className="font-semibold text-right text-amber-400">{formatCurrency(emi.totalInterestPaid || 0)}</span>
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-semibold text-right">{formatCurrency(emi.remainingBalance)}</span>
                  <span className="text-gray-600">Next Due</span>
                  <span className={`font-semibold text-right ${emi.isOverdue ? 'text-red-400' : ''}`}>{emi.nextDueDate ? formatDate(emi.nextDueDate) : '-'}</span>
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-semibold text-right">{formatDate(emi.startDate)}</span>
                  <span className="text-gray-600">Tenure</span>
                  <span className="font-semibold text-right">{emi.tenureMonths || emi.totalMonths || 0} months</span>
                  <span className="text-gray-600">Status</span>
                  <span className={`font-semibold text-right ${emi.status === EMI_STATUS.ACTIVE ? 'text-neon' : 'text-gray-500'}`}>{emi.status}</span>
                </div>

                {(emi.payments || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Payment History ({emi.payments.length})</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {[...(emi.payments || [])].reverse().map((p) => (
                        <div key={p.id || p.paymentId} className="flex items-center justify-between text-[10px] bg-matte-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-gray-500">{formatDate(p.date || p.paymentDate)}</span>
                          <span className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {emi.status === EMI_STATUS.ACTIVE && (
                    <button onClick={() => handlePay(emi.id)} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={13} /> Pay EMI
                    </button>
                  )}
                  {(emi.payments || []).length > 0 && (
                    <button onClick={() => handleUndo(emi.id)} className="bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-gray-200 text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center gap-1.5">
                      <RotateCcw size={13} /> Undo
                    </button>
                  )}
                  <button onClick={() => openEdit(emi)} className="bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-gray-200 text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center gap-1.5">
                    <Edit3 size={13} /> Edit
                  </button>
                  {emi.status === EMI_STATUS.ACTIVE ? (
                    <button onClick={() => handleClose(emi.id)} className="bg-white/[0.05] hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center gap-1.5">
                      <Lock size={13} /> Close
                    </button>
                  ) : (
                    <button onClick={() => handleReopen(emi.id)} className="bg-white/[0.05] hover:bg-neon/10 text-gray-400 hover:text-neon text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center gap-1.5">
                      <Unlock size={13} /> Reopen
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(emi.id)} className="bg-white/[0.05] hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center gap-1.5">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {insights.totalActiveLoans > 0 && (
        <GlassCard className="mb-4">
          <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
            <BarChart3 size={12} className="text-purple-400" /> EMI Insights
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total Outstanding</span>
              <span className="font-semibold">{formatCurrency(insights.totalOutstanding)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total Interest Paid</span>
              <span className="font-semibold text-amber-400">{formatCurrency(insights.totalInterestPaidAll)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Debt Reduction</span>
              <span className="font-semibold text-neon">{insights.debtReductionProgress}%</span>
            </div>
            {insights.closureForecasts.slice(0, 3).map((f) => (
              <div key={f.loanName} className="flex items-center justify-between text-[10px] bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                <span className="text-gray-500 truncate">{f.loanName}</span>
                <span className="text-gray-400">Closes ~{formatDate(f.estimatedClosureDate)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <Modal open={showCalculator} onClose={() => { setShowCalculator(false); setCalcResult(null) }} title="EMI Calculator">
        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Principal Amount</label>
            <input type="number" value={calcForm.principal} onChange={(e) => setCalcForm((f) => ({ ...f, principal: e.target.value }))} placeholder="1,00,000" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Annual Interest Rate (%)</label>
            <input type="number" step="0.1" value={calcForm.rate} onChange={(e) => setCalcForm((f) => ({ ...f, rate: e.target.value }))} placeholder="10.5" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Tenure (months)</label>
            <input type="number" value={calcForm.tenure} onChange={(e) => setCalcForm((f) => ({ ...f, tenure: e.target.value }))} placeholder="12" className="input-field" />
          </div>
          <button onClick={handleCalc} disabled={!calcForm.principal || !calcForm.tenure} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-40">Calculate</button>

          {calcResult && (
            <div className="p-3 rounded-xl bg-white/[0.03] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Monthly EMI</span>
                <span className="text-lg font-extrabold text-neon">{formatCurrency(calcResult.emi)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Interest</span>
                <span className="text-xs font-semibold text-amber-400">{formatCurrency(calcResult.totalInterest)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Payment</span>
                <span className="text-xs font-semibold">{formatCurrency(calcResult.totalPayment)}</span>
              </div>
              <button onClick={applyCalcResult} className="w-full bg-neon/10 text-neon text-xs font-semibold py-2 rounded-lg border border-neon/20 hover:bg-neon/20 transition-all mt-1">Use This EMI Amount</button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteEmi(deleteTarget); addToast('EMI deleted', 'info'); setDeleteTarget(null) }}
        title="Delete EMI"
        description="This will permanently delete this EMI and all its payment history."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}