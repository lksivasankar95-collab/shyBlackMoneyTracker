import { useState, useMemo, useCallback } from 'react'
import {
  Target, Plus, Trash2, TrendingUp, CheckCircle2, ChevronRight,
  AlertTriangle, PiggyBank, Car, Home, Sparkles,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/helpers'
import { getGoalProjection } from '../utils/goals'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'

const GOAL_PRESETS = [
  { name: 'goals.preset_emergency_fund', icon: PiggyBank, color: 'text-yellow-400 bg-yellow-500/10', defaultTarget: 50000 },
  { name: 'goals.preset_vehicle', icon: Car, color: 'text-blue-400 bg-blue-500/10', defaultTarget: 500000 },
  { name: 'goals.preset_house', icon: Home, color: 'text-purple-400 bg-purple-500/10', defaultTarget: 2000000 },
  { name: 'goals.preset_custom', icon: Sparkles, color: 'text-neon bg-neon/10', defaultTarget: 10000 },
]

export default function GoalsPage() {
  const { t } = useTranslation()
  const { goals: contextGoals, addGoal, editGoal, removeGoal } = useFinance()
  const { addToast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    name: '', target: '', saved: '', monthlyContribution: '', targetDate: '',
  })

  const goalsProjections = useMemo(
    () => (contextGoals || []).map((g) => ({ ...g, projection: getGoalProjection(g) })),
    [contextGoals]
  )

  const resetForm = useCallback(() => {
    setForm({ name: '', target: '', saved: '', monthlyContribution: '', targetDate: '' })
  }, [])

  const openAdd = useCallback(() => {
    resetForm()
    setShowAddModal(true)
    setEditTarget(null)
  }, [resetForm])

  const openEdit = useCallback((goal) => {
    setForm({
      name: goal.name,
      target: String(goal.target),
      saved: String(goal.saved),
      monthlyContribution: String(goal.monthlyContribution || ''),
      targetDate: goal.targetDate || '',
    })
    setEditTarget(goal)
    setShowAddModal(true)
  }, [])

  const applyPreset = useCallback((preset) => {
    setForm((f) => ({
      ...f,
      name: preset.name,
      target: String(preset.defaultTarget),
    }))
  }, [])

  const handleSave = useCallback(() => {
    const name = form.name.trim()
    const target = parseFloat(form.target)
    const saved = parseFloat(form.saved) || 0
    const monthlyContribution = parseFloat(form.monthlyContribution) || 0
    const targetDate = form.targetDate || null

    if (!name) { addToast(t('goals.enter_goal_name'), 'error'); return }
    if (!target || target <= 0) { addToast(t('goals.enter_valid_target'), 'error'); return }
    if (!editTarget && saved >= target) { addToast(t('goals.saved_meets_target'), 'error'); return }

    if (editTarget) {
      editGoal(editTarget.id, { name, target, saved, monthlyContribution, targetDate })
      addToast(t('goals.goal_updated'), 'success')
    } else {
      addGoal({ name, target, saved, monthlyContribution, targetDate })
      addToast(t('goals.goal_created'), 'success')
    }

    setShowAddModal(false)
    setEditTarget(null)
    resetForm()
  }, [form, editTarget, addGoal, editGoal, addToast, resetForm, t])

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    removeGoal(deleteTarget)
    addToast(t('goals.goal_deleted'), 'info')
    setDeleteTarget(null)
  }, [deleteTarget, removeGoal, addToast, t])

  const achieved = useMemo(() => goalsProjections.filter((g) => g.projection?.isAchieved), [goalsProjections])
  const active = useMemo(() => goalsProjections.filter((g) => !g.projection?.isAchieved), [goalsProjections])

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const getMonthsBetween = (from, to) => {
    return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth()
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Target size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('goals.title')}</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
        >
          <Plus size={14} />
          {t('goals.add')}
        </button>
      </div>

      {(!contextGoals || contextGoals.length === 0) && (
        <EmptyState
          icon={Target}
          title={t('goals.no_goals')}
          description={t('goals.no_goals_desc')}
          action={
            <button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">
              {t('goals.create_first')}
            </button>
          }
        />
      )}

      {/* Achieved Goals */}
      {achieved.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-neon" />
            {t('goals.achieved_count', { count: achieved.length })}
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
                  <button
                    onClick={() => setDeleteTarget(g.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Active Goals */}
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => {
            const p = g.projection
            const totalRemaining = p ? p.remaining : g.target - g.saved

            let forecastMonths = null
            if (p && p.monthsToGoal !== null) {
              forecastMonths = p.monthsToGoal
            } else if (g.monthlyContribution > 0) {
              forecastMonths = Math.ceil(totalRemaining / g.monthlyContribution)
            }

            let targetDateEta = null
            if (g.targetDate) {
              const targetD = new Date(g.targetDate)
              const now = new Date()
              const monthsUntilTarget = getMonthsBetween(now, targetD)
              if (monthsUntilTarget > 0) {
                const requiredMonthly = totalRemaining / monthsUntilTarget
                targetDateEta = {
                  monthsLeft: monthsUntilTarget,
                  requiredMonthly: Math.round(requiredMonthly),
                  onTrack: g.monthlyContribution >= requiredMonthly,
                }
              }
            }

            const _dailyRate = g.monthlyContribution > 0
              ? Math.round(g.monthlyContribution / 30)
              : 0

            return (
              <GlassCard
                key={g.id}
                onClick={() => openEdit(g)}
                className="cursor-pointer hover:border-neon/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    p?.isAchieved ? 'bg-neon/10' : 'bg-purple-500/10'
                  }`}>
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
                            className={`h-full rounded-full transition-all duration-500 ${
                              p.isAchieved ? 'bg-neon' : 'bg-gradient-to-r from-purple-500 to-neon'
                            }`}
                            style={{ width: `${Math.min(p.progress, 100)}%` }}
                          />
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="p-1.5 rounded-lg bg-white/[0.03] text-center">
                            <p className="text-[10px] text-gray-600">{t('goals.progress')}</p>
                            <p className="text-xs font-bold tabular-nums">{Math.round(p.progress)}%</p>
                          </div>
                          {forecastMonths !== null && (
                            <div className="p-1.5 rounded-lg bg-white/[0.03] text-center">
                              <p className="text-[10px] text-gray-600">{t('goals.eta')}</p>
                              <p className="text-xs font-bold tabular-nums">{forecastMonths}m</p>
                            </div>
                          )}
                          {g.monthlyContribution > 0 && (
                            <div className="p-1.5 rounded-lg bg-white/[0.03] text-center">
                              <p className="text-[10px] text-gray-600">{t('goals.monthly')}</p>
                              <p className="text-xs font-bold tabular-nums text-neon">
                                {formatCurrency(g.monthlyContribution)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Target Date Info */}
                        {targetDateEta && (
                          <div className={`flex items-center gap-1.5 mt-2 p-2 rounded-lg text-xs ${
                            targetDateEta.onTrack
                              ? 'bg-neon/5 text-neon'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {targetDateEta.onTrack ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <AlertTriangle size={12} />
                            )}
                            <span>
                              {targetDateEta.onTrack
                                ? t('goals.on_track', { date: formatDate(g.targetDate) })
                                : t('goals.behind', { amount: formatCurrency(targetDateEta.requiredMonthly) })
                              }
                            </span>
                          </div>
                        )}

                        {p.progress >= 80 && !p.isAchieved && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-neon bg-neon/5 rounded-lg p-2">
                            <TrendingUp size={12} />
                            <span>{t('goals.almost_there', { amount: formatCurrency(totalRemaining) })}</span>
                          </div>
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

      {/* Add/Edit Goal Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditTarget(null); resetForm() }}
        title={editTarget ? t('goals.edit') : t('goals.add')}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Presets (only for new goals) */}
          {!editTarget && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-2 block">{t('goals.quick_start')}</label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_PRESETS.map((preset) => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        form.name === preset.name
                          ? 'border-neon/50 bg-neon/10'
                          : 'border-glass-border bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${preset.color}`}>
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-medium truncate">{t(preset.name)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t('goals.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('goals.name_placeholder')}
              className="input-field"
              maxLength={50}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t('goals.target')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.target}
              onChange={(e) => setForm((f) => ({ ...f, target: e.target.value.replace(/\D/g, '') }))}
              placeholder="0"
              className="input-field text-lg font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              {t('goals.saved')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.saved}
              onChange={(e) => setForm((f) => ({ ...f, saved: e.target.value.replace(/\D/g, '') }))}
              placeholder="0"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              {t('goals.monthly_contribution')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.monthlyContribution}
              onChange={(e) => setForm((f) => ({ ...f, monthlyContribution: e.target.value.replace(/\D/g, '') }))}
              placeholder="0"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              {t('goals.deadline')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Forecast */}
          {parseFloat(form.target) > 0 && (
            <div className="p-3 rounded-xl bg-white/[0.03] space-y-1.5">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{t('goals.forecast')}</p>
              {parseFloat(form.monthlyContribution) > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{t('goals.at_current_pace')}</span>
                  <span className="font-semibold tabular-nums">
                    {Math.ceil(
                      (parseFloat(form.target) - (parseFloat(form.saved) || 0)) /
                      parseFloat(form.monthlyContribution)
                    )} {t('goals.months_remaining')}
                  </span>
                </div>
              )}
              {form.targetDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{t('goals.required_monthly')}</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(
                      Math.ceil(
                        (parseFloat(form.target) - (parseFloat(form.saved) || 0)) /
                        Math.max(1, getMonthsBetween(new Date(), new Date(form.targetDate)))
                      )
                    )}
                  </span>
                </div>
              )}
              {parseFloat(form.monthlyContribution) > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{t('goals.daily_savings')}</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(Math.round(parseFloat(form.monthlyContribution) / 30))}{t('goals.per_day')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-matte">
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.target}
              className="flex-1 btn-primary text-sm"
            >
              {editTarget ? t('goals.save_changes') : t('goals.create_goal')}
            </button>
            <button
              onClick={() => { setShowAddModal(false); setEditTarget(null); resetForm() }}
              className="flex-1 btn-secondary text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('goals.delete_title')}
        description={t('goals.delete_desc')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
      />
    </div>
  )
}
