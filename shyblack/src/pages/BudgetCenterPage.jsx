import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Trash2, Edit3, Archive, RotateCcw, Target, AlertTriangle,
  Wallet, TrendingUp, CheckCircle2, X, BarChart3, CircleDollarSign,
  Calendar, Search,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import { EXPENSE_CATEGORIES } from '../utils/constants'
import { BUDGET_PERIODS, BUDGET_HEALTH } from '../utils/budgetUtils'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import CategoryIcon from '../components/CategoryIcon'

const PERIOD_OPTIONS = [
  { value: BUDGET_PERIODS.WEEKLY, label: 'Weekly' },
  { value: BUDGET_PERIODS.MONTHLY, label: 'Monthly' },
  { value: BUDGET_PERIODS.YEARLY, label: 'Yearly' },
]

const emptyForm = {
  name: '',
  category: 'food',
  amount: '',
  period: BUDGET_PERIODS.MONTHLY,
  alert80: true,
  alert100: true,
  rollover: false,
}

export default function BudgetCenterPage() {
  const { t } = useTranslation()
  const { budgetsV2, addBudgetV2, updateBudgetV2, deleteBudgetV2, archiveBudgetV2, reactivateBudgetV2, budgetDashboardStats, budgetHealthV2, budgetAlerts, overspentCategories } = useFinance()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...emptyForm })

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm })
  }, [])

  const openAdd = useCallback(() => {
    resetForm()
    setEditTarget(null)
    setShowForm(true)
  }, [resetForm])

  const openEdit = useCallback((b) => {
    setEditTarget(b)
    setForm({
      name: b.name,
      category: b.category,
      amount: String(b.amount),
      period: b.period,
      alert80: b.alert80,
      alert100: b.alert100,
      rollover: b.rollover,
    })
    setShowForm(true)
  }, [])

  const handleSave = useCallback(() => {
    const amount = parseFloat(form.amount)
    if (!form.name.trim()) { addToast('Budget name required', 'error'); return }
    if (!amount || amount <= 0) { addToast('Amount must be greater than 0', 'error'); return }

    const data = {
      name: form.name.trim(),
      category: form.category,
      amount,
      period: form.period,
      alert80: form.alert80,
      alert100: form.alert100,
      rollover: form.rollover,
    }

    if (editTarget) {
      updateBudgetV2(editTarget.id, data)
      addToast('Budget updated', 'success')
    } else {
      addBudgetV2(data)
      addToast('Budget created', 'success')
    }
    setShowForm(false)
    setEditTarget(null)
  }, [form, editTarget, addBudgetV2, updateBudgetV2, addToast])

  const filtered = useMemo(() => {
    let result = budgetsV2 || []
    if (filter === 'active') result = result.filter((b) => b.active)
    else if (filter === 'archived') result = result.filter((b) => !b.active)
    else if (filter === 'exceeded') result = result.filter((b) => b.active && b.amount > 0 && b.spent > b.amount)
    else if (filter === 'warning') result = result.filter((b) => b.active && b.amount > 0 && b.spent >= b.amount * 0.8 && b.spent <= b.amount)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
    }
    return result
  }, [budgetsV2, filter, search])

  const totalBudgeted = useMemo(() => budgetsV2.filter((b) => b.active).reduce((s, b) => s + b.amount, 0), [budgetsV2])
  const totalSpent = useMemo(() => budgetsV2.filter((b) => b.active).reduce((s, b) => s + b.spent, 0), [budgetsV2])
  const utilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Target size={18} className="text-teal-400" />
          </div>
          <h1 className="text-xl font-bold">Budget Center</h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/10 text-teal-400 text-xs font-medium hover:bg-teal-500/20 transition-all">
            <Plus size={14} /> Add Budget
          </button>
        </div>
      </div>

      {budgetsV2.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Total</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{budgetDashboardStats.totalBudgets}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Active</p>
            <p className="text-sm font-extrabold text-teal-400 tabular-nums">{budgetDashboardStats.activeBudgets}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Over</p>
            <p className={`text-sm font-extrabold tabular-nums ${budgetDashboardStats.overBudgetCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>{budgetDashboardStats.overBudgetCount}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">Util</p>
            <p className={`text-sm font-extrabold tabular-nums ${utilization > 80 ? 'text-yellow-400' : 'text-teal-400'}`}>{utilization}%</p>
          </GlassCard>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search budgets..." className="input-field !pl-9 text-xs" />
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {[
          { key: 'active', label: 'Active', count: budgetDashboardStats.activeBudgets },
          { key: 'exceeded', label: 'Exceeded', count: budgetDashboardStats.overBudgetCount },
          { key: 'warning', label: 'Warning', count: budgetHealthV2.warning },
          { key: 'all', label: 'All', count: budgetsV2.length },
          { key: 'archived', label: 'Archived' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${filter === tab.key ? 'bg-teal-500/20 text-teal-400' : 'bg-white/[0.03] text-gray-500 hover:text-gray-300'}`}
          >
            {tab.label}{tab.count > 0 && <span className="ml-1.5">({tab.count})</span>}
          </button>
        ))}
      </div>

      {budgetAlerts.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {budgetAlerts.slice(0, 3).map((alert) => (
            <div key={alert.budgetId + alert.type} className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${alert.type === 'exceeded' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GlassCard className="mb-4 border-teal-500/20">
          <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5">
            {editTarget ? <Edit3 size={12} className="text-teal-400" /> : <Plus size={12} className="text-teal-400" />}
            {editTarget ? 'Edit Budget' : 'Create Budget'}
          </h3>
          <div className="space-y-3">
            <input type="text" placeholder="Budget Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field text-sm" />
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id} type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${form.category === cat.id ? 'border-teal-500/50 bg-teal-500/10 text-teal-400' : 'border-glass-border text-gray-500 hover:text-white'}`}
                  >
                    <CategoryIcon icon={cat.icon} size={12} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <input type="number" placeholder="Budget Amount *" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="input-field text-sm" min="1" />
            <select value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} className="input-field text-sm">
              {PERIOD_OPTIONS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
            </select>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                <input type="checkbox" checked={form.alert80} onChange={(e) => setForm((f) => ({ ...f, alert80: e.target.checked }))} className="accent-teal-500" />
                80% Alert
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                <input type="checkbox" checked={form.alert100} onChange={(e) => setForm((f) => ({ ...f, alert100: e.target.checked }))} className="accent-teal-500" />
                100% Alert
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                <input type="checkbox" checked={form.rollover} onChange={(e) => setForm((f) => ({ ...f, rollover: e.target.checked }))} className="accent-teal-500" />
                Rollover
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!form.name || !form.amount}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-40"
              >
                {editTarget ? 'Update' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setEditTarget(null) }} className="flex-1 btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        </GlassCard>
      )}

      {overspentCategories.length > 0 && (
        <GlassCard className="mb-3">
          <h3 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
            <BarChart3 size={12} /> Top Overspending
          </h3>
          <div className="space-y-1.5">
            {overspentCategories.slice(0, 5).map((b) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === b.category)
              return (
                <div key={b.id} className="flex items-center justify-between text-[10px] bg-red-500/5 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {cat && <CategoryIcon icon={cat.icon} size={12} />}
                    <span className="truncate">{b.name}</span>
                  </div>
                  <span className="text-red-400 font-semibold">+{formatCurrency(b.spent - b.amount)}</span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {filtered.length === 0 && (
        <EmptyState
          icon={Target}
          title={budgetsV2.length === 0 ? 'No budgets yet' : 'No matching budgets'}
          description={budgetsV2.length === 0 ? 'Create your first budget to start tracking' : 'Try a different search or filter'}
          action={budgetsV2.length === 0 ? <button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">Create First Budget</button> : undefined}
        />
      )}

      <div className="space-y-2 mb-6">
        {filtered.map((b) => {
          const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
          const cat = EXPENSE_CATEGORIES.find((c) => c.id === b.category)
          const isExceeded = b.amount > 0 && b.spent > b.amount
          const isWarning = b.amount > 0 && b.spent >= b.amount * 0.8 && b.spent <= b.amount
          return (
            <GlassCard key={b.id} className={isExceeded ? 'border-red-500/20' : isWarning ? 'border-amber-500/20' : ''}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isExceeded ? 'bg-red-500/10' : isWarning ? 'bg-amber-500/10' : 'bg-teal-500/10'}`}>
                  {cat ? <CategoryIcon icon={cat.icon} size={15} /> : <CircleDollarSign size={15} className={isExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-teal-400'} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium truncate">{b.name}</p>
                    {isExceeded && <span className="text-[10px] text-red-400 font-medium">Exceeded</span>}
                    {isWarning && <span className="text-[10px] text-amber-400 font-medium">Warning</span>}
                    {!b.active && <span className="text-[10px] text-gray-500">Archived</span>}
                  </div>
                  <p className="text-[10px] text-gray-500 capitalize">{cat?.label || b.category} · {b.period}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums">{formatCurrency(b.spent)}</p>
                  <p className="text-[10px] text-gray-600">of {formatCurrency(b.amount)}</p>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-matte-200 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${isExceeded ? 'bg-gradient-to-r from-red-500 to-red-400' : isWarning ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-teal-500 to-emerald-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-600">{Math.round(pct)}% spent</span>
                <span className={`text-[10px] ${isExceeded ? 'text-red-400' : 'text-gray-600'}`}>{formatCurrency(Math.max(0, b.remaining))} left</span>
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                <button onClick={() => openEdit(b)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-gray-200 text-[10px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                  <Edit3 size={11} /> Edit
                </button>
                {b.active ? (
                  <button onClick={() => setArchiveTarget(b)} className="flex-1 bg-white/[0.05] hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 text-[10px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                    <Archive size={11} /> Archive
                  </button>
                ) : (
                  <button onClick={() => { reactivateBudgetV2(b.id); addToast('Budget reactivated', 'success') }} className="flex-1 bg-white/[0.05] hover:bg-teal-500/10 text-gray-400 hover:text-teal-400 text-[10px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                    <RotateCcw size={11} /> Reactivate
                  </button>
                )}
                <button onClick={() => setDeleteTarget(b)} className="flex-1 bg-white/[0.05] hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-[10px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteBudgetV2(deleteTarget.id); addToast('Budget deleted', 'info'); setDeleteTarget(null) }}
        title="Delete Budget"
        description="This will permanently delete this budget."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />

      <ConfirmationModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => { archiveBudgetV2(archiveTarget.id); addToast('Budget archived', 'info'); setArchiveTarget(null) }}
        title="Archive Budget"
        description="Archived budgets are hidden from active view but data is preserved."
        confirmLabel="Archive"
        cancelLabel="Cancel"
      />
    </div>
  )
}