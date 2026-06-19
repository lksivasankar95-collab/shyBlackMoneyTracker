import { useState, useMemo } from 'react'
import {
  CreditCard, Plus, Minus, CheckCircle2, Clock, AlertTriangle,
  BarChart3, Landmark, Calendar, RotateCcw, ChevronDown, ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { EMI_STATUS, FREQUENCY_OPTIONS, getFrequencyLabel, getEmiDueDate } from '../utils/emi'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

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
        <Calendar size={10} /> Due in {emi.dueInDays}d
      </span>
    )
  }
  return null
}

export default function EmiCenterPage({ onNavigate }) {
  const { emis, addEmi, markEmiPaid, undoEmiPayment, emiSummary: ctxSummary } = useFinance()
  const [showForm, setShowForm] = useState(false)
  const [selectedEmi, setSelectedEmi] = useState(null)
  const [filter, setFilter] = useState('all')
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    amount: '',
    totalMonths: '',
    startDate: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    lender: '',
    notes: '',
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.amount || !formData.totalMonths) return
    addEmi({
      name: formData.name,
      totalAmount: formData.totalAmount || Number(formData.amount) * Number(formData.totalMonths),
      amount: Number(formData.amount),
      totalMonths: Number(formData.totalMonths),
      frequency: formData.frequency,
      startDate: formData.startDate,
      lender: formData.lender,
      notes: formData.notes,
    })
    setShowForm(false)
    setFormData({
      name: '', totalAmount: '', amount: '', totalMonths: '',
      startDate: new Date().toISOString().split('T')[0], frequency: 'monthly', lender: '', notes: '',
    })
  }

  const handlePay = (emiId) => {
    markEmiPaid(emiId)
  }

  const handleUndo = (emiId) => {
    undoEmiPayment(emiId)
  }

  const activeEmis = useMemo(() => {
    let result = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    result = result.map((emi) => {
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
        completionPercentage: emi.totalAmount > 0
          ? Math.round((emi.totalPaid / emi.totalAmount) * 100) : 0,
        remainingBalance: Math.max(0, emi.totalAmount - emi.totalPaid),
        remainingInstallments: Math.max(0, emi.totalMonths - emi.totalPaidCount),
      }
    })

    if (filter === 'overdue') return result.filter((e) => e.isOverdue)
    if (filter === 'due-today') return result.filter((e) => e.isDueToday)
    if (filter === 'due-week') return result.filter((e) => e.isDueWithin7 || e.isDueToday || e.isDueTomorrow)
    return result
  }, [emis, filter])

  const completedEmis = emis.filter(
    (e) => e.status === EMI_STATUS.CLOSED || e.status === EMI_STATUS.COMPLETED
  )

  const overdueCount = activeEmis.filter((e) => e.isOverdue).length
  const dueTodayCount = activeEmis.filter((e) => e.isDueToday).length

  const frequencyLabel = FREQUENCY_OPTIONS.find((f) => f.value === formData.frequency)?.label || 'Monthly'

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Landmark size={18} className="text-purple-400" />
          </div>
          <h1 className="text-xl font-bold">EMI Center</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5"
        >
          {showForm ? <Minus size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New EMI'}
        </button>
      </div>

      {/* Summary Cards */}
      {ctxSummary && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Active</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{ctxSummary.totalActive}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Due Today</p>
            <p className={`text-sm font-extrabold tabular-nums ${dueTodayCount > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {dueTodayCount}
            </p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Overdue</p>
            <p className={`text-sm font-extrabold tabular-nums ${overdueCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {overdueCount}
            </p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Total/mo</p>
            <p className="text-sm font-extrabold text-purple-400 tabular-nums">{formatCurrency(ctxSummary.totalInstallmentAmount)}</p>
          </GlassCard>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <GlassCard className="mb-4 border-purple-500/20">
          <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5">
            <Plus size={12} className="text-purple-400" /> New EMI
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text" placeholder="EMI Name" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all" required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" placeholder="Installment Amount" value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all" required min="1"
              />
              <input
                type="number" placeholder="Total Installments" value={formData.totalMonths}
                onChange={(e) => setFormData({ ...formData, totalMonths: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all" required min="1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" placeholder="Total Amount (optional)" value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all" min="1"
              />
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all appearance-none"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date" value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all"
              />
              <input
                type="text" placeholder="Lender (optional)" value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all"
              />
            </div>
            <textarea
              placeholder="Notes (optional)" value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2} className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all resize-none"
            />
            <button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all">
              Create {frequencyLabel} EMI
            </button>
          </form>
        </GlassCard>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'All Active' },
          { key: 'overdue', label: 'Overdue', count: overdueCount },
          { key: 'due-today', label: 'Due Today', count: dueTodayCount },
          { key: 'due-week', label: 'Due This Week' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-white/[0.03] text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 ${tab.key === 'overdue' ? 'text-red-400' : tab.key === 'due-today' ? 'text-yellow-400' : ''}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active EMIs */}
      <h2 className="text-xs font-semibold text-gray-400 mb-2">
        {filter === 'all' ? 'Active EMIs' : filter === 'overdue' ? 'Overdue EMIs' : filter === 'due-today' ? 'Due Today' : 'Due This Week'}
        {' '}({activeEmis.length})
      </h2>
      {activeEmis.length === 0 && !showForm ? (
        <GlassCard className="mb-4">
          <EmptyState
            icon={Landmark}
            title={filter === 'all' ? 'No active EMIs' : 'No EMIs match this filter'}
            description={filter === 'all' ? 'Track your loans and EMIs here' : 'Try a different filter'}
          />
        </GlassCard>
      ) : (
        <div className="space-y-2 mb-6">
          {activeEmis.map((emi) => {
            const progress = emi.completionPercentage
            return (
              <button
                key={emi.id}
                onClick={() => setSelectedEmi(selectedEmi?.id === emi.id ? null : emi)}
                className="w-full text-left"
              >
                <GlassCard className={`hover:border-purple-500/20 transition-all ${
                  selectedEmi?.id === emi.id ? 'border-purple-500/20' : ''
                } ${emi.isOverdue ? 'border-red-500/20' : emi.isDueToday ? 'border-yellow-500/20' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      emi.isOverdue ? 'bg-red-500/10' : emi.isDueToday ? 'bg-yellow-500/10' : 'bg-purple-500/10'
                    }`}>
                      <CreditCard size={15} className={
                        emi.isOverdue ? 'text-red-400' : emi.isDueToday ? 'text-yellow-400' : 'text-purple-400'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{emi.name}</p>
                        <DueBadge emi={emi} />
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {emi.lender || emi.category || 'EMI'} · {getFrequencyLabel(emi.frequency)} · {formatCurrency(emi.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">
                        {formatCurrency(emi.remainingBalance || emi.totalAmount)}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {emi.remainingInstallments || emi.totalMonths || 0} left
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-matte-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        emi.isOverdue
                          ? 'bg-gradient-to-r from-red-500 to-orange-400'
                          : 'bg-gradient-to-r from-purple-500 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-600">{progress}% paid</span>
                    <span className="text-[10px] text-gray-600">
                      {emi.totalPaidCount}/{emi.totalMonths} installments
                    </span>
                  </div>

                  {/* Detail View */}
                  {selectedEmi?.id === emi.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="font-semibold text-right">{formatCurrency(emi.totalAmount)}</span>
                        <span className="text-gray-600">Total Paid</span>
                        <span className="font-semibold text-right">{formatCurrency(emi.totalPaid)}</span>
                        <span className="text-gray-600">Remaining</span>
                        <span className="font-semibold text-right">{formatCurrency(emi.remainingBalance)}</span>
                        <span className="text-gray-600">Frequency</span>
                        <span className="font-semibold text-right">{getFrequencyLabel(emi.frequency)}</span>
                        <span className="text-gray-600">Next Due</span>
                        <span className={`font-semibold text-right ${emi.isOverdue ? 'text-red-400' : ''}`}>
                          {emi.nextDueDate ? formatDate(emi.nextDueDate) : '-'}
                        </span>
                        <span className="text-gray-600">Start Date</span>
                        <span className="font-semibold text-right">{formatDate(emi.startDate)}</span>
                        {emi.lender && (
                          <>
                            <span className="text-gray-600">Lender</span>
                            <span className="font-semibold text-right truncate">{emi.lender}</span>
                          </>
                        )}
                        <span className="text-gray-600">Installments</span>
                        <span className="font-semibold text-right">{emi.totalPaidCount}/{emi.totalMonths}</span>
                      </div>

                      {/* Payment History */}
                      {(emi.paymentHistory || []).length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Payment History</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {(emi.paymentHistory || []).slice().reverse().map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-[10px] bg-matte-200 rounded-lg px-2.5 py-1.5">
                                <span className="text-gray-500">{formatDate(p.date)}</span>
                                <span className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePay(emi.id) }}
                          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={13} />
                          Mark Paid
                        </button>
                        {(emi.paymentHistory || []).length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUndo(emi.id) }}
                            className="bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-gray-200 text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center gap-1.5"
                          >
                            <RotateCcw size={13} />
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </GlassCard>
              </button>
            )
          })}
        </div>
      )}

      {/* Overdue Alert */}
      {overdueCount > 0 && filter === 'all' && (
        <GlassCard className="mb-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400 font-medium">
              {overdueCount} EMI{overdueCount > 1 ? 's are' : ' is'} overdue. Tap to review and make payments.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Completed EMIs */}
      {completedEmis.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-gray-400 mb-2">Completed ({completedEmis.length})</h2>
          <div className="space-y-2">
            {completedEmis.map((emi) => (
              <GlassCard key={emi.id}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{emi.name}</p>
                      <span className="text-[10px] text-emerald-400 font-medium">Completed</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{emi.lender || getFrequencyLabel(emi.frequency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-emerald-400 font-medium">Paid</p>
                    <p className="text-xs font-semibold tabular-nums">{formatCurrency(emi.totalPaid)}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
