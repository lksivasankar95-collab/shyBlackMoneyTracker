import { useState, useMemo, useCallback } from 'react'
import { Target, Plus, Trash2, TrendingUp, CheckCircle2, ChevronRight, AlertTriangle, Calendar } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'

export default function GoalsPage() {
  const { goals, goalsProjections, addGoal, editGoal, removeGoal } = useFinance()
  const { addToast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', target: '', saved: '', monthlyContribution: '' })

  const resetForm = useCallback(() => {
    setForm({ name: '', target: '', saved: '', monthlyContribution: '' })
  }, [])

  const openAdd = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const openEdit = useCallback((goal) => {
    setForm({
      name: goal.name,
      target: String(goal.target),
      saved: String(goal.saved),
      monthlyContribution: String(goal.monthlyContribution || ''),
    })
    setEditTarget(goal)
  }, [])

  const handleSave = useCallback(() => {
    const name = form.name.trim()
    const target = parseFloat(form.target)
    const saved = parseFloat(form.saved) || 0
    const monthlyContribution = parseFloat(form.monthlyContribution) || 0

    if (!name) { addToast('Enter a goal name', 'error'); return }
    if (!target || target <= 0) { addToast('Enter a valid target amount', 'error'); return }

    if (editTarget) {
      editGoal(editTarget.id, { name, target, saved, monthlyContribution })
      addToast('Goal updated', 'success')
    } else {
      addGoal({ name, target, saved, monthlyContribution })
      addToast('Goal created', 'success')
    }

    setShowAddModal(false)
    setEditTarget(null)
    resetForm()
  }, [form, editTarget, addGoal, editGoal, addToast, resetForm])

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    removeGoal(deleteTarget)
    addToast('Goal deleted', 'info')
    setDeleteTarget(null)
  }, [deleteTarget, removeGoal, addToast])

  const achieved = useMemo(() => goalsProjections.filter((g) => g.projection?.isAchieved), [goalsProjections])
  const active = useMemo(() => goalsProjections.filter((g) => !g.projection?.isAchieved), [goalsProjections])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Target size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">Goals</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
        >
          <Plus size={14} />
          Add Goal
        </button>
      </div>

      {goals.length === 0 && (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set financial goals like Emergency Fund, MacBook, or Trip"
          action={
            <button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">
              Create First Goal
            </button>
          }
        />
      )}

      {achieved.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-neon" />
            Achieved
          </h2>
          <div className="space-y-2">
            {achieved.map((g) => (
              <GlassCard key={g.id} className="border-neon/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{g.name}</p>
                    <p className="text-xs text-neon">{formatCurrency(g.target)}</p>
                  </div>
                  <button onClick={() => setDeleteTarget(g.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => {
            const p = g.projection
            return (
              <GlassCard key={g.id} onClick={() => openEdit(g)} className="cursor-pointer hover:border-neon/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p?.isAchieved ? 'bg-neon/10' : 'bg-purple-500/10'}`}>
                    <Target size={18} className={p?.isAchieved ? 'text-neon' : 'text-purple-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold truncate">{g.name}</h3>
                      <ChevronRight size={14} className="text-gray-500 shrink-0" />
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-extrabold tabular-nums">{formatCurrency(g.saved)}</span>
                      <span className="text-xs text-gray-500">/ {formatCurrency(g.target)}</span>
                    </div>
                    {p && (
                      <>
                        <div className="w-full h-1.5 bg-matte-200 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${p.isAchieved ? 'bg-neon' : 'bg-gradient-to-r from-purple-500 to-neon'}`}
                            style={{ width: `${Math.min(p.progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-500">{Math.round(p.progress)}%</span>
                          {p.monthsToGoal !== null && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Calendar size={9} />
                              {p.monthsToGoal}m left
                            </span>
                          )}
                        </div>
                        {g.monthlyContribution > 0 && (
                          <p className="text-[10px] text-gray-600 mt-1">
                            {formatCurrency(g.monthlyContribution)}/mo contribution
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditTarget(null); resetForm() }} title={editTarget ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Goal Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund, MacBook..." className="input-field" maxLength={50} autoFocus />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Target Amount</label>
            <input type="text" inputMode="numeric" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value.replace(/\D/g, '') }))} placeholder="0" className="input-field text-lg font-bold tabular-nums" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Saved So Far <span className="text-gray-600 font-normal">(optional)</span></label>
            <input type="text" inputMode="numeric" value={form.saved} onChange={(e) => setForm((f) => ({ ...f, saved: e.target.value.replace(/\D/g, '') }))} placeholder="0" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Monthly Contribution <span className="text-gray-600 font-normal">(optional)</span></label>
            <input type="text" inputMode="numeric" value={form.monthlyContribution} onChange={(e) => setForm((f) => ({ ...f, monthlyContribution: e.target.value.replace(/\D/g, '') }))} placeholder="0" className="input-field" />
            {parseFloat(form.monthlyContribution) > 0 && parseFloat(form.target) > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                ~{Math.ceil((parseFloat(form.target) - (parseFloat(form.saved) || 0)) / parseFloat(form.monthlyContribution))} months to goal
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.name.trim() || !form.target} className="flex-1 btn-primary text-sm">Save</button>
            <button onClick={() => { setShowAddModal(false); setEditTarget(null); resetForm() }} className="flex-1 btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Goal?"
        description="This will permanently remove this goal."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}
