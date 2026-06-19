import { useState, useMemo } from 'react'
import {
  CreditCard, Plus, Minus, CheckCircle2, Clock,
  BarChart3, Landmark,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { getEmiSummary, EMI_STATUS } from '../utils/emi'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

export default function EmiCenterPage({ onNavigate }) {
  const { emis, addEmi, markEmiPaid, emiSummary: ctxSummary } = useFinance()
  const [showForm, setShowForm] = useState(false)
  const [selectedEmi, setSelectedEmi] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    amount: '',
    totalMonths: '',
    startDate: new Date().toISOString().split('T')[0],
    lender: '',
    notes: '',
  })

  const summary = useMemo(() => getEmiSummary(emis), [emis])

  const activeEmis = emis.filter((e) => e.status === EMI_STATUS.ACTIVE)
  const completedEmis = emis.filter((e) => e.status === EMI_STATUS.CLOSED)

  const handleCreate = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.amount || !formData.totalMonths) return
    addEmi({
      name: formData.name,
      totalAmount: formData.totalAmount || Number(formData.amount) * Number(formData.totalMonths),
      amount: Number(formData.amount),
      totalMonths: Number(formData.totalMonths),
      remainingMonths: Number(formData.totalMonths),
      startDate: formData.startDate,
      lender: formData.lender,
      notes: formData.notes,
    })
    setShowForm(false)
    setFormData({
      name: '', totalAmount: '', amount: '', totalMonths: '',
      startDate: new Date().toISOString().split('T')[0], lender: '', notes: '',
    })
  }

  const handlePay = (emiId) => {
    markEmiPaid(emiId)
  }

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
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <GlassCard>
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Total Monthly</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{formatCurrency(ctxSummary.totalMonthly)}</p>
          </GlassCard>
          <GlassCard>
            <p className="text-[10px] text-gray-500 mb-1 font-medium">Active EMIs</p>
            <p className="text-sm font-extrabold text-purple-400 tabular-nums">{summary.totalActive}</p>
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
                type="number" placeholder="Monthly Amount" value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all" required min="1"
              />
              <input
                type="number" placeholder="Total Months" value={formData.totalMonths}
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
              <input
                type="text" placeholder="Lender (optional)" value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all"
              />
            </div>
            <input
              type="date" value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all"
            />
            <textarea
              placeholder="Notes (optional)" value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2} className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-purple-400/30 focus:outline-none transition-all resize-none"
            />
            <button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all">
              Create EMI
            </button>
          </form>
        </GlassCard>
      )}

      {/* Active EMIs */}
      <h2 className="text-xs font-semibold text-gray-400 mb-2">
        Active EMIs ({activeEmis.length})
      </h2>
      {activeEmis.length === 0 && !showForm ? (
        <GlassCard className="mb-4">
          <EmptyState
            icon={Landmark}
            title="No active EMIs"
            description="Track your loans and EMIs here"
          />
        </GlassCard>
      ) : (
        <div className="space-y-2 mb-6">
          {activeEmis.map((emi) => {
            const progress = emi.totalAmount > 0
              ? Math.round((emi.totalPaid / emi.totalAmount) * 100) : 0
            return (
              <button
                key={emi.id}
                onClick={() => setSelectedEmi(selectedEmi?.id === emi.id ? null : emi)}
                className="w-full text-left"
              >
                <GlassCard className={`hover:border-purple-500/20 transition-all ${
                  selectedEmi?.id === emi.id ? 'border-purple-500/20' : ''
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <CreditCard size={15} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{emi.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {emi.lender || emi.category || 'EMI'} · {formatCurrency(emi.amount)}/mo
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">
                        {formatCurrency(emi.remainingAmount || emi.totalAmount)}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {emi.remainingMonths || emi.totalMonths || 0} mo left
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-matte-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-orange-400 transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-600">{progress}% paid</span>
                    <span className="text-[10px] text-gray-600">
                      {emi.paidCount || emi.totalPaidCount || 0}/{emi.totalMonths || 0} months
                    </span>
                  </div>
                  {selectedEmi?.id === emi.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="font-semibold text-right">{formatCurrency(emi.totalAmount)}</span>
                        <span className="text-gray-600">Total Paid</span>
                        <span className="font-semibold text-right">{formatCurrency(emi.totalPaid)}</span>
                        <span className="text-gray-600">Start Date</span>
                        <span className="font-semibold text-right">{formatDate(emi.startDate)}</span>
                        {emi.lender && (
                          <>
                            <span className="text-gray-600">Lender</span>
                            <span className="font-semibold text-right truncate">{emi.lender}</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePay(emi.id) }}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-1.5 rounded-lg transition-all"
                      >
                        Mark as Paid
                      </button>
                    </div>
                  )}
                </GlassCard>
              </button>
            )
          })}
        </div>
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
                    <p className="text-xs font-medium truncate">{emi.name}</p>
                    <p className="text-[10px] text-gray-500">{emi.lender || 'Completed'}</p>
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
