import { useState, useMemo } from 'react'
import { Target, X, TrendingUp, AlertTriangle, Check } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { EXPENSE_CATEGORIES } from '../utils/constants'
import { getBudgetHealth, getAIBudgetSuggestions } from '../utils/budgets'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import CategoryIcon from '../components/CategoryIcon'
import { useToast } from '../components/Toast'

export default function BudgetsPage() {
  const { budgets, transactions, updateBudgetLimit } = useFinance()
  const { addToast } = useToast()
  const [editingCat, setEditingCat] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const now = new Date()
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const calculatedBudgets = useMemo(() => {
    const updated = { ...budgets }
    for (const [cat, budget] of Object.entries(updated)) {
      const spent = monthTxs
        .filter((t) => t.category === cat)
        .reduce((s, t) => s + t.amount, 0)
      updated[cat] = { ...budget, spent }
    }
    return updated
  }, [budgets, monthTxs])

  const health = getBudgetHealth(calculatedBudgets)
  const suggestions = useMemo(() => getAIBudgetSuggestions(transactions), [transactions])

  const activeCategories = EXPENSE_CATEGORIES.filter((c) => calculatedBudgets[c.id])

  const handleEdit = (cat) => {
    setEditingCat(cat)
    setEditValue(String(calculatedBudgets[cat]?.limit || 0))
  }

  const handleSave = () => {
    if (editingCat) {
      const limit = parseFloat(editValue) || 0
      updateBudgetLimit(editingCat, limit)
      addToast('Budget updated!', 'success')
      setEditingCat(null)
    }
  }

  const handleApplySuggestion = (cat, amount) => {
    updateBudgetLimit(cat, amount)
    addToast(`Budget for ${cat} updated to ${formatCurrency(amount)}`, 'success')
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Monthly Budgets</h1>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-1.5 text-xs text-neon/70 hover:text-neon transition-colors"
        >
          <TrendingUp size={14} />
          AI Suggest
        </button>
      </div>

      {health.total > 0 && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Budget Health</span>
            <span className={`text-xs font-semibold ${
              health.health >= 80 ? 'text-neon' : health.health >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {health.health}%
            </span>
          </div>
          <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
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
          {health.overBudget > 0 && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              {health.overBudget} categor{health.overBudget > 1 ? 'ies' : 'y'} over budget
            </p>
          )}
        </GlassCard>
      )}

      {/* AI Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <GlassCard className="mb-4 border-neon/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-neon" />
              <h2 className="text-sm font-semibold">AI Budget Suggestions</h2>
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

      {/* Budget List */}
      {activeCategories.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Target}
            title="No budgets set"
            description="Set spending limits for each expense category"
          />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {activeCategories.map((cat) => {
            const budget = calculatedBudgets[cat.id]
            if (!budget) return null
            const percent = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0
            const isOver = budget.limit > 0 && budget.spent > budget.limit
            const isEditing = editingCat === cat.id

            return (
              <GlassCard key={cat.id} className={isOver ? 'border-red-500/20' : ''}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isOver ? 'bg-red-500/10 text-red-400' : 'bg-neon/10 text-neon'
                  }`}>
                    <CategoryIcon icon={cat.icon} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {formatCurrency(budget.spent)}
                      {budget.limit > 0 && ` / ${formatCurrency(budget.limit)}`}
                    </p>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 input-field text-xs !py-1.5 text-right"
                        autoFocus
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
                      Edit
                    </button>
                  )}
                </div>
                {budget.limit > 0 && (
                  <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-gradient-to-r from-neon to-green-400'
                      }`}
                      style={{ width: `${Math.max(percent, 2)}%` }}
                    />
                  </div>
                )}
                {isOver && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                    <AlertTriangle size={12} />
                    <span>Over budget by {formatCurrency(budget.spent - budget.limit)}</span>
                  </div>
                )}
                {!isOver && budget.limit > 0 && (
                  <p className="text-[11px] text-gray-600 mt-1.5 tabular-nums">
                    {formatCurrency(budget.limit - budget.spent)} remaining
                  </p>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
