import { useState, useMemo, useCallback } from 'react'
import {
  ArrowUpRight, ArrowDownLeft, Handshake, Plus, Wallet,
  AlertTriangle, DollarSign,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import DebtCard from '../components/DebtCard'
import AddDebtModal from '../components/AddDebtModal'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'lent', label: 'Lent' },
  { id: 'borrowed', label: 'Borrowed' },
  { id: 'pending', label: 'Pending' },
  { id: 'paid', label: 'Paid' },
]

export default function DebtsPage() {
  const { debts, addDebt, deleteDebt, recordRepayment, debtsSummary } = useFinance()
  const { addToast } = useToast()
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [repayTarget, setRepayTarget] = useState(null)
  const [repayAmount, setRepayAmount] = useState('')

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return debts
    if (activeFilter === 'pending') return debts.filter((d) => d.status === 'pending')
    if (activeFilter === 'paid') return debts.filter((d) => d.status === 'paid')
    return debts.filter((d) => d.type === activeFilter)
  }, [debts, activeFilter])

  const handleSave = useCallback((data) => {
    addDebt(data)
    addToast(
      data.type === 'lent' ? 'Lent record added' : 'Borrowed record added',
      'success'
    )
    setShowAddModal(false)
  }, [addDebt, addToast])

  const handleDelete = useCallback((id) => {
    deleteDebt(id)
    addToast('Record deleted', 'info')
  }, [deleteDebt, addToast])

  const handleRepay = useCallback((debt) => {
    setRepayTarget(debt)
    setRepayAmount('')
  }, [])

  const submitRepayment = useCallback(() => {
    if (!repayTarget || !repayAmount) return
    const num = parseFloat(repayAmount)
    if (isNaN(num) || num <= 0) {
      addToast('Enter a valid amount', 'error')
      return
    }
    if (num > repayTarget.remainingAmount) {
      addToast('Amount exceeds remaining', 'error')
      return
    }
    recordRepayment(repayTarget.id, num)
    addToast('Repayment recorded', 'success')
    setRepayTarget(null)
    setRepayAmount('')
  }, [repayTarget, repayAmount, recordRepayment, addToast])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Handshake size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">Borrow & Lend</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <GlassCard className="!p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 font-medium">
              <ArrowUpRight size={11} className="text-green-400" />
              Total Lent
            </div>
            <p className="text-sm font-extrabold text-green-400 tabular-nums">{formatCurrency(debtsSummary.totalLent)}</p>
          </GlassCard>
          <GlassCard className="!p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 font-medium">
              <ArrowDownLeft size={11} className="text-orange-400" />
              Total Borrowed
            </div>
            <p className="text-sm font-extrabold text-orange-400 tabular-nums">{formatCurrency(debtsSummary.totalBorrowed)}</p>
          </GlassCard>
          {debtsSummary.pendingReceivables > 0 && (
            <GlassCard className="!p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 font-medium">
                <Wallet size={11} className="text-neon" />
                Pending Receivables
              </div>
              <p className="text-sm font-extrabold text-neon tabular-nums">{formatCurrency(debtsSummary.pendingReceivables)}</p>
            </GlassCard>
          )}
          {debtsSummary.pendingPayables > 0 && (
            <GlassCard className="!p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 font-medium">
                <DollarSign size={11} className="text-yellow-400" />
                Pending Payables
              </div>
              <p className="text-sm font-extrabold text-yellow-400 tabular-nums">{formatCurrency(debtsSummary.pendingPayables)}</p>
            </GlassCard>
          )}
          {debtsSummary.overdueCount > 0 && (
            <GlassCard className="!p-3 border-red-500/20">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 font-medium">
                <AlertTriangle size={11} className="text-red-400" />
                Overdue
              </div>
              <p className="text-sm font-extrabold text-red-400 tabular-nums">{debtsSummary.overdueCount}</p>
            </GlassCard>
          )}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeFilter === f.id
                ? 'bg-neon/15 text-neon border border-neon/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white hover:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={debts.length === 0 ? 'No borrow & lend records' : 'No matching records'}
          description={debts.length === 0
            ? 'Track money you lent or borrowed from friends'
            : 'Try a different filter'
          }
          action={debts.length === 0 ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-xs !px-4 !py-2"
            >
              Add First Record
            </button>
          ) : null}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onRepay={handleRepay}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddDebtModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSave}
      />

      {repayTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setRepayTarget(null) }}
        >
          <div className="glass-brand p-5 w-full max-w-sm animate-scale-in">
            <h2 className="text-sm font-semibold mb-1">
              {repayTarget.type === 'lent' ? 'Record Repayment' : 'Make Payment'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {repayTarget.personName} · Remaining: {formatCurrency(repayTarget.remainingAmount)}
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={repayAmount}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || /^\d+$/.test(v)) setRepayAmount(v)
              }}
              placeholder="Enter amount"
              className="input-field text-lg font-bold tabular-nums mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={submitRepayment}
                disabled={!repayAmount}
                className="flex-1 btn-primary text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => setRepayTarget(null)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
