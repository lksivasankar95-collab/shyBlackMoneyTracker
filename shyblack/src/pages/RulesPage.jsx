import { useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, FlaskConical, Wand2, ArrowLeft, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import { ALL_CATEGORIES } from '../utils/constants'
import {
  getRules, createRule, updateRule, deleteRule, toggleRule,
  getRuleStats, findMatchingRule, suggestRulesFromTransactions,
  RULE_MATCH_MODES, RULE_SCOPES, RULE_TYPES,
} from '../utils/rules'

const emptyForm = {
  match: '', mode: 'contains', scope: 'note_or_merchant', category: '', tags: '', type: 'auto_categorize', note: '',
}

export default function RulesPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const { addToast } = useToast()

  const [rules, setRules] = useState(() => getRules())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [testText, setTestText] = useState('')
  const [suggestions, setSuggestions] = useState(() => suggestRulesFromTransactions(transactions))

  const refresh = useCallback(() => {
    setRules(getRules())
    setSuggestions(suggestRulesFromTransactions(transactions))
  }, [transactions])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (rule) => {
    setEditId(rule.id)
    setForm({
      match: rule.match,
      mode: rule.mode,
      scope: rule.scope,
      category: rule.category,
      tags: (rule.tags || []).join(', '),
      type: rule.type,
      note: rule.note || '',
    })
    setFormError('')
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.match.trim()) {
      setFormError(t('rules.match_required'))
      return
    }
    if (!form.category) {
      setFormError(t('rules.category_required'))
      return
    }
    const data = {
      match: form.match.trim(),
      mode: form.mode,
      scope: form.scope,
      category: form.category,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      type: form.type,
      note: form.note.trim(),
    }
    if (editId) {
      const updated = updateRule(editId, data)
      if (updated) updateRule(editId, updated)
      addToast(t('rules.updated_toast'), 'success')
    } else {
      const created = createRule(data)
      if (!created) {
        setFormError(t('rules.match_required'))
        return
      }
      addToast(t('rules.created_toast'), 'success')
    }
    setShowForm(false)
    refresh()
  }

  const handleToggle = (rule) => {
    toggleRule(rule.id, !rule.enabled)
    refresh()
  }

  const currentMatch = testText.trim()
    ? findMatchingRule({ note: testText, merchant: '' })
    : null

  const stats = getRuleStats()

  const addSuggestion = (s) => {
    createRule({ match: s.match, mode: 'contains', scope: 'note_or_merchant', category: s.category })
    addToast(t('rules.created_toast'), 'success')
    refresh()
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-matte-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-glass-border">
        <button onClick={() => onNavigate('settings')} className="p-2 rounded-xl hover:bg-white/5" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t('rules.title')}</h1>
          <p className="text-xs text-gray-400">{t('rules.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2 px-4 py-2.5">
          <Plus className="w-4 h-4" />
          {t('rules.add')}
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('rules.total')}</p>
            <p className="text-xl font-bold text-white">{stats.total}</p>
          </GlassCard>
          <GlassCard className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('rules.enabled')}</p>
            <p className="text-xl font-bold text-neon">{stats.enabled}</p>
          </GlassCard>
          <GlassCard className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('rules.applied_times')}</p>
            <p className="text-xl font-bold text-white">{stats.totalUses}</p>
          </GlassCard>
        </div>

        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-neon" />
            <h2 className="text-sm font-semibold text-white">{t('rules.tester_title')}</h2>
          </div>
          <input
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder={t('rules.tester_placeholder')}
            className="input-field w-full text-sm"
          />
          {testText.trim() && (
            <div className="text-xs">
              {currentMatch ? (
                <p className="text-neon">
                  {t('rules.matches')}{' '}
                  <span className="font-semibold">{currentMatch.match}</span>
                  {' → '}
                  {currentMatch.type === 'flag' ? t('rules.flags_transaction') : (ALL_CATEGORIES.find((c) => c.id === currentMatch.category)?.label || currentMatch.category)}
                </p>
              ) : (
                <p className="text-gray-500">{t('rules.no_match')}</p>
              )}
            </div>
          )}
        </GlassCard>

        {suggestions.length > 0 && (
          <GlassCard className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-neon" />
              <h2 className="text-sm font-semibold text-white">{t('rules.suggestions')}</h2>
            </div>
            {suggestions.map((s) => (
              <div key={s.match} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{s.match}</p>
                  <p className="text-xs text-gray-400">
                    {ALL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category} · {s.uses}×
                  </p>
                </div>
                <button onClick={() => addSuggestion(s)} className="btn-secondary text-xs px-3 py-1.5">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ))}
          </GlassCard>
        )}

        {rules.length === 0 ? (
          <GlassCard className="p-8 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-400">{t('rules.empty')}</p>
            <button onClick={openCreate} className="btn-secondary text-sm inline-flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              {t('rules.add')}
            </button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const cat = ALL_CATEGORIES.find((c) => c.id === rule.category)
              return (
                <GlassCard key={rule.id} className={`p-4 ${rule.enabled ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {rule.mode === 'regex' ? `/${rule.match}/i` : rule.match}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cat ? cat.label : rule.category}
                        {' · '}
                        {RULE_SCOPES[rule.scope] || rule.scope}
                        {rule.type === 'flag' && ' · ' + t('rules.flags_transaction')}
                        {rule.usageCount > 0 && ` · ${rule.usageCount}×`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(rule)}
                        className="p-1.5 text-gray-400 hover:text-neon"
                        aria-label="Toggle rule"
                      >
                        {rule.enabled ? <ToggleRight className="w-5 h-5 text-neon" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => openEdit(rule)} className="p-1.5 text-gray-400 hover:text-white" aria-label="Edit rule">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(rule)} className="p-1.5 text-gray-400 hover:text-red-400" aria-label="Delete rule">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? t('rules.edit') : t('rules.add')}>
        <div className="space-y-4">
          {formError && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{formError}</p>}
          <div>
            <label className="text-xs text-gray-400">{t('rules.match_label')}</label>
            <input
              value={form.match}
              onChange={(e) => setForm((f) => ({ ...f, match: e.target.value }))}
              placeholder={t('rules.match_placeholder')}
              className="input-field w-full mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('rules.mode')}</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                className="input-field w-full mt-1"
              >
                <option value={RULE_MATCH_MODES.CONTAINS}>{t('rules.mode_contains')}</option>
                <option value={RULE_MATCH_MODES.REGEX}>{t('rules.mode_regex')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('rules.scope')}</label>
              <select
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                className="input-field w-full mt-1"
              >
                <option value={RULE_SCOPES.NOTE_OR_MERCHANT}>{t('rules.scope_both')}</option>
                <option value={RULE_SCOPES.NOTE}>{t('rules.scope_note')}</option>
                <option value={RULE_SCOPES.MERCHANT}>{t('rules.scope_merchant')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">{t('rules.category_label')}</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input-field w-full mt-1"
            >
              <option value="">{t('rules.select_category')}</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">{t('rules.tags_label')}</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="work, tax, travel"
              className="input-field w-full mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">{t('rules.type')}</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input-field w-full mt-1"
            >
              <option value={RULE_TYPES.AUTO_CATEGORIZE}>{t('rules.auto_categorize')}</option>
              <option value={RULE_TYPES.FLAG}>{t('rules.flag')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">{t('rules.note_label')}</label>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={t('rules.note_placeholder')}
              className="input-field w-full mt-1"
            />
          </div>
          <button onClick={handleSave} className="btn-primary w-full text-sm py-3">
            {editId ? t('rules.save') : t('rules.add')}
          </button>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteRule(deleteTarget.id)
          setDeleteTarget(null)
          refresh()
          addToast(t('rules.deleted_toast'), 'success')
        }}
        title={t('rules.delete_title')}
        message={t('rules.delete_message')}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}