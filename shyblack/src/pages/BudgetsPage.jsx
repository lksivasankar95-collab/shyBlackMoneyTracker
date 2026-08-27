import { useState, useMemo, useCallback} from 'react'
import { Target, X, TrendingUp, AlertTriangle, Check, Plus, Bell, Calendar, ChevronDown, ChevronUp, Gauge, RotateCcw } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import { EXPENSE_CATEGORIES } from '../utils/constants'
import { getBudgetHealth, getAIBudgetSuggestions, rolloverBudgets } from '../utils/budgets'
import { getBudgetPace } from '../utils/budgetPace'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import CategoryIcon from '../components/CategoryIcon'
import { useToast } from '../components/Toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 text-xs shadow-lg">
        <p className="text-gray-400 mb-1 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold tabular-nums" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function BudgetsPage() {
  const { t } = useTranslation()
  const { budgets, transactions, updateBudgetLimit: updateBudgetCtx } = useFinance()
  const { addToast } = useToast()
  const [editingCat, setEditingCat] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCatBudget, setNewCatBudget] = useState({ category: EXPENSE_CATEGORIES[0]?.id || '', limit: '' })
  const [viewMode, setViewMode] = useState('current')
  const [expandedCat, setExpandedCat] = useState(null)

  const getCurrentYearMonth = () => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  }

  const monthTxs = useMemo(() => {
    const { year, month } = getCurrentYearMonth()
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year
    })
  }, [transactions])

  const lastMonthTxs = useMemo(() => {
    const { year, month } = getCurrentYearMonth()
    const lastMonth = month === 0 ? 11 : month - 1
    const lastYear = month === 0 ? year - 1 : year
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return t.type === 'expense' && d.getMonth() === lastMonth && d.getFullYear() === lastYear
    })
  }, [transactions])

  const calculatedBudgets = useMemo(() => {
    const updated = { ...budgets }
    for (const [cat, budget] of Object.entries(updated)) {
      const spent = monthTxs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0)
      const lastSpent = lastMonthTxs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0)
      updated[cat] = {
        ...budget,
        spent,
        lastSpent,
        remaining: (budget.limit || 0) - spent,
        percent: budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0,
        isOver: budget.limit > 0 && spent > budget.limit,
        isWarning: budget.limit > 0 && spent > budget.limit * 0.8 && spent <= budget.limit,
      }
    }
    return updated
  }, [budgets, monthTxs, lastMonthTxs])

  const health = useMemo(() => getBudgetHealth(calculatedBudgets), [calculatedBudgets])
  const suggestions = useMemo(() => getAIBudgetSuggestions(transactions), [transactions])
  const paceData = useMemo(() => getBudgetPace(calculatedBudgets, monthTxs), [calculatedBudgets, monthTxs])
  const paceMap = useMemo(() => Object.fromEntries(paceData.pace.map((p) => [p.category, p])), [paceData])

  const PACE_STYLE = {
    on_track: 'text-neon bg-neon/10',
    ahead: 'text-red-400 bg-red-500/10',
    behind: 'text-blue-400 bg-blue-500/10',
    breached: 'text-red-400 bg-red-500/10',
  }

  const activeCategories = EXPENSE_CATEGORIES.filter((c) => calculatedBudgets[c.id])
  const inactiveCategories = EXPENSE_CATEGORIES.filter((c) => !calculatedBudgets[c.id])

  const monthlyPerformance = useMemo(() => {
    const { year, month } = getCurrentYearMonth()
    const data = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1)
      const monthTx = transactions.filter((t) => {
        const td = new Date(t.date)
        return t.type === 'expense' && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
      })
      const totalExpense = monthTx.reduce((s, t) => s + t.amount, 0)
      const totalBudget = Object.values(budgets).reduce((s, b) => s + (b.limit || 0), 0)
      data.push({
        month: d.toLocaleString('default', { month: 'short' }),
        budget: totalBudget,
        actual: totalExpense,
        adherence: totalBudget > 0 ? Math.max(0, 100 - ((totalExpense - totalBudget) / totalBudget) * 100) : 0,
      })
    }
    return data
  }, [transactions, budgets])

  const handleEdit = (cat) => {
    setEditingCat(cat)
    setEditValue(String(calculatedBudgets[cat]?.limit || 0))
  }

  const handleSave = useCallback(() => {
    if (editingCat) {
      const limit = parseFloat(editValue) || 0
      updateBudgetCtx(editingCat, limit)
      addToast(t('budgets.budget_updated'), 'success')
      setEditingCat(null)
    }
  }, [editingCat, editValue, updateBudgetCtx, addToast, t])

  const handleApplySuggestion = (cat, amount) => {
    updateBudgetCtx(cat, amount)
    addToast(t('budgets.suggestion_applied', { category: cat, amount: formatCurrency(amount) }), 'success')
  }

  const handleAddBudget = () => {
    const limit = parseFloat(newCatBudget.limit) || 0
    if (limit <= 0) { addToast(t('budgets.enter_valid_limit'), 'error'); return }
    updateBudgetCtx(newCatBudget.category, limit)
    addToast(t('budgets.budget_created'), 'success')
    setShowAddForm(false)
    setNewCatBudget({ category: EXPENSE_CATEGORIES.find((c) => !calculatedBudgets[c.id])?.id || '', limit: '' })
  }

  const budgetCount = Object.values(calculatedBudgets).filter((b) => b.limit > 0).length
  const overCount = Object.values(calculatedBudgets).filter((b) => b.isOver).length
  const warnCount = Object.values(calculatedBudgets).filter((b) => b.isWarning && !b.isOver).length

  const hasLeftover = useMemo(
    () => Object.values(calculatedBudgets).some((b) => (b.limit || 0) > 0 && (b.remaining || 0) > 0),
    [calculatedBudgets]
  )

  const handleCarryOver = () => {
    const rolled = rolloverBudgets(transactions, calculatedBudgets)
    const applied = Object.entries(rolled).filter(([, b]) => (b.rollover || 0) > 0)
    if (applied.length === 0) {
      addToast(t('budgets.carry_over_none'), 'info')
      return
    }
    applied.forEach(([cat, b]) => {
      updateBudgetCtx(cat, (calculatedBudgets[cat].limit || 0) + b.rollover)
    })
    addToast(t('budgets.carry_over_success', { count: applied.length }), 'success')
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Target size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('budgets.title')}</h1>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="p-2 rounded-xl bg-matte-100 text-gray-400 hover:text-neon hover:bg-neon/10 transition-all"
            title={t('budgets.ai_suggestions')}
          >
            <TrendingUp size={16} />
          </button>
          {inactiveCategories.length > 0 && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
            >
              <Plus size={14} />
              {t('budgets.add')}
            </button>
          )}
        </div>
      </div>

      {/* Budget Health Dashboard */}
      {budgetCount > 0 && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge size={14} className="text-neon" />
              <span className="text-xs font-semibold">{t('budgets.health')}</span>
            </div>
            <span className={`text-sm font-bold ${
              health.health >= 80 ? 'text-neon' : health.health >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {health.health}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-matte-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${health.health}%`,
                background: health.health >= 80
                  ? 'linear-gradient(90deg, #39ff14, #22c55e)'
                  : health.health >= 50
                    ? 'linear-gradient(90deg, #eab308, #f97316)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }}
            />
          </div>
          <div className="flex gap-3 mt-2 text-[10px]">
            <span className="text-gray-500">{t('budgets.set_count', { count: budgetCount })}</span>
            {overCount > 0 && <span className="text-red-400 font-medium">{t('budgets.over_count', { count: overCount })}</span>}
            {warnCount > 0 && <span className="text-yellow-400 font-medium">{t('budgets.near_limit_count', { count: warnCount })}</span>}
          </div>
          {hasLeftover && viewMode === 'current' && (
            <button
              onClick={handleCarryOver}
              className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
            >
              <RotateCcw size={13} />
              {t('budgets.carry_over')}
            </button>
          )}
        </GlassCard>
      )}

      {/* Tab Switcher */}
      {budgetCount > 0 && (
        <div className="flex bg-matte-100 rounded-lg p-0.5 mb-4">
          {['current', 'performance'].map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewMode === v ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              {v === 'current' ? t('budgets.current_month') : t('budgets.performance')}
            </button>
          ))}
        </div>
      )}

      {/* AI Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <GlassCard className="mb-4 border-neon/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">{t('budgets.ai_suggestions')}</h2>
            </div>
            <button onClick={() => setShowSuggestions(false)} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {suggestions.map((s) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === s.category)
              return (
                <div key={s.category} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-2 min-w-0">
                    {cat && <CategoryIcon icon={cat.icon} size={14} />}
                    <span className="text-xs capitalize">{cat?.label || s.category}</span>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion(s.category, s.suggestedBudget)}
                    className="text-xs text-neon/70 hover:text-neon flex items-center gap-1 transition-colors"
                  >
                    <Check size={12} />
                    {formatCurrency(s.suggestedBudget)}
                  </button>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Add Budget Form */}
      {showAddForm && inactiveCategories.length > 0 && (
        <GlassCard className="mb-4 border-neon/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t('budgets.add')}</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-3">
            <select
              value={newCatBudget.category}
              onChange={(e) => setNewCatBudget((f) => ({ ...f, category: e.target.value }))}
              className="input-field text-sm"
            >
              {inactiveCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              value={newCatBudget.limit}
              onChange={(e) => setNewCatBudget((f) => ({ ...f, limit: e.target.value.replace(/\D/g, '') }))}
              placeholder={t('budgets.monthly_limit')}
              className="input-field text-lg font-bold tabular-nums"
            />
            <button onClick={handleAddBudget} className="w-full btn-primary text-sm">{t('budgets.create')}</button>
          </div>
        </GlassCard>
      )}

      {/* Performance View */}
      {viewMode === 'performance' && budgetCount > 0 && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-neon" />
            <h2 className="text-sm font-semibold">{t('budgets.monthly_performance')}</h2>
          </div>
          <div className="h-36 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPerformance} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="budget" fill="#39ff14" radius={[3, 3, 0, 0]} maxBarSize={12} name={t('budgets.budget_label')} />
                <Bar dataKey="actual" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={12} name={t('budgets.actual_label')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-neon" /> {t('budgets.budget_label')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> {t('budgets.actual_label')}</span>
          </div>
        </GlassCard>
      )}

      {/* Budget List */}
      {activeCategories.length === 0 && !showAddForm ? (
        <GlassCard>
          <EmptyState
            icon={Target}
            title={t('budgets.no_budgets')}
            description={t('budgets.no_budgets_desc')}
            action={
              inactiveCategories.length > 0 ? (
                <button onClick={() => setShowAddForm(true)} className="btn-primary text-xs !px-4 !py-2">
                  {t('budgets.create')}
                </button>
              ) : null
            }
          />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {activeCategories.map((cat) => {
            const budget = calculatedBudgets[cat.id]
            if (!budget) return null
            const isExpanded = expandedCat === cat.id

            return (
              <GlassCard
                key={cat.id}
                className={`transition-all duration-200 ${
                  budget.isOver ? 'border-red-500/20' : budget.isWarning ? 'border-yellow-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    budget.isOver ? 'bg-red-500/10 text-red-400' :
                    budget.isWarning ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-neon/10 text-neon'
                  }`}>
                    <CategoryIcon icon={cat.icon} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{cat.label}</p>
                      {editingCat === cat.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 input-field text-xs !py-1.5 text-right"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          />
                          <button onClick={handleSave} className="p-1.5 rounded-lg text-neon hover:bg-neon/10 transition-colors">
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(cat.id)}
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          {t('common.edit')}
                        </button>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-base font-extrabold tabular-nums ${
                        budget.isOver ? 'text-red-400' : budget.isWarning ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {formatCurrency(budget.spent)}
                      </span>
                      {budget.limit > 0 && (
                        <span className="text-xs text-gray-500">/ {formatCurrency(budget.limit)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Progress Bar */}
                {budget.limit > 0 && (
                  <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budget.isOver ? 'bg-red-500' :
                        budget.isWarning ? 'bg-yellow-500' :
                        'bg-gradient-to-r from-neon to-green-400'
                      }`}
                      style={{ width: `${Math.max(budget.percent, 2)}%` }}
                    />
                  </div>
                )}

                {/* Stats Row */}
                <div className="flex items-center gap-3 mt-2">
                  {budget.limit > 0 && (
                    <span className="text-[10px] tabular-nums">
                      <span className={budget.isOver ? 'text-red-400' : budget.isWarning ? 'text-yellow-400' : 'text-gray-500'}>
                        {Math.round(budget.percent)}%
                      </span>
                    </span>
                  )}
                  {budget.lastSpent > 0 && (
                    <span className="text-[10px] text-gray-600">
                      {t('budgets.last_month_label', { amount: formatCurrency(budget.lastSpent) })}
                    </span>
                  )}
                  {paceMap[cat.id] && paceMap[cat.id].status !== 'unused' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${PACE_STYLE[paceMap[cat.id].status]}`}>
                      {t(`budgets.pace_${paceMap[cat.id].status}`)}
                    </span>
                  )}
                  {budget.remaining > 0 && budget.limit > 0 && !budget.isOver && (
                    <span className="text-[10px] text-gray-600">
                      {t('budgets.remaining_label', { amount: formatCurrency(budget.remaining) })}
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-glass-border space-y-2 animate-fade-in">
                    {budget.limit > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('budgets.daily_avg')}</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(Math.round(budget.spent / Math.max(1, new Date().getDate())))}
                        </span>
                      </div>
                    )}
                    {paceMap[cat.id] && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('budgets.pace')}</span>
                        <span className="font-medium tabular-nums">
                          {t('budgets.pace_expected', { amount: formatCurrency(paceMap[cat.id].expected) })} ·{' '}
                          <span className={PACE_STYLE[paceMap[cat.id].status] || 'text-gray-500'}>
                            {t(`budgets.pace_${paceMap[cat.id].status}`)}
                          </span>
                        </span>
                      </div>
                    )}
                    {budget.limit > 0 && budget.isOver && (
                      <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                        <AlertTriangle size={12} />
                        <span>{t('budgets.over_by', { amount: formatCurrency(budget.spent - budget.limit) })}</span>
                      </div>
                    )}
                    {budget.limit > 0 && budget.remaining > 0 && !budget.isOver && (
                      <div className="flex items-center gap-1.5 text-xs text-neon bg-neon/10 rounded-lg p-2">
                        <RotateCcw size={12} />
                        <span>{t('budgets.carry_over_hint', { amount: formatCurrency(Math.round(budget.remaining * 0.5)) })}</span>
                      </div>
                    )}
                    {budget.limit > 0 && budget.isWarning && !budget.isOver && (
                      <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-2">
                        <Bell size={12} />
                        <span>{t('budgets.only_remaining', { amount: formatCurrency(budget.remaining), percent: Math.round(100 - budget.percent) })}</span>
                      </div>
                    )}
                    {budget.limit > 0 && !budget.isOver && !budget.isWarning && budget.remaining > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-neon/70 bg-neon/5 rounded-lg p-2">
                        <Check size={12} />
                        <span>{t('budgets.on_track', { amount: formatCurrency(budget.remaining) })}</span>
                      </div>
                    )}
                    {budget.lastSpent > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('budgets.vs_last_month')}</span>
                        <span className={`font-medium tabular-nums ${
                          budget.spent <= budget.lastSpent ? 'text-neon' : 'text-red-400'
                        }`}>
                          {budget.lastSpent > 0
                            ? `${((budget.spent - budget.lastSpent) / budget.lastSpent * 100).toFixed(0)}%`
                            : t('common.na')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
