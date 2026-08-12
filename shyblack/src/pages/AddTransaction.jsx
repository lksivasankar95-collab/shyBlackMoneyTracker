import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Check, Repeat2, Tag, X, User, Smartphone, Zap, ChevronDown, ChevronUp, Banknote, Building2, CreditCard, Pencil, Loader2, Mic, SplitSquareHorizontal, Plus } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSACTION_TYPES, PAYMENT_METHODS } from '../utils/constants'
import { getSmartCategoryPrediction } from '../utils/insights'
import { getSuggestedTags } from '../utils/tags'
import { parseVoiceCommand, recognizeVoiceSpeech } from '../utils/voiceEntry'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { getCurrencySettings, getBaseCurrencyCode, CURRENCIES, formatInCurrency } from '../utils/multiCurrency'
import { attachSplits, validateSplits, hasSplits } from '../utils/splitUtils'
import CategoryIcon from '../components/CategoryIcon'
import ConfirmationModal from '../components/ConfirmationModal'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]
const MAX_AMOUNT = 99999999
const LARGE_AMOUNT_THRESHOLD = 50000

const TYPE_ICONS = {
  [TRANSACTION_TYPES.INCOME]: ArrowUpCircle,
  [TRANSACTION_TYPES.EXPENSE]: ArrowDownCircle,
}

const PAYMENT_ICONS = {
  gpay: Smartphone,
  phonepay: Smartphone,
  paytm: Smartphone,
  upi: Smartphone,
  cash: Banknote,
  bank_transfer: Building2,
  card: CreditCard,
}

function getCurrencySymbol() {
  try {
    const data = safeStorage.getRaw(STORAGE_KEYS.ONBOARDING)
    if (data) {
      const parsed = JSON.parse(data)
      if (parsed.currency) {
        const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AED: 'د.إ' }
        return symbols[parsed.currency] || '₹'
      }
    }
  } catch { /* currency not configured, use default */ }
  return '₹'
}

function formatAmountShort(amount, symbol) {
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}k`
  return `${symbol}${amount}`
}

export default function AddTransaction({ onNavigate, navParams }) {
  const { t } = useTranslation()
  const { addTransaction, updateTransaction, undoLastAction, addRecurring, tags, addTag, recentPeople, recentTemplates, addTemplate, transactions } = useFinance()
  const { addToast } = useToast()
  const amountInputRef = useRef(null)
  const lastCategoryByType = useRef({ income: '', expense: '' })
  const currencySymbol = useMemo(() => getCurrencySymbol(), [])
  const amountSymbol = useMemo(() => {
    if (!currency) return currencySymbol
    const c = CURRENCIES.find((x) => x.code === currency)
    return c ? c.symbol : currency
  }, [currency, currencySymbol])

  const editTx = navParams?.editTransaction || null
  const isEditing = !!editTx

  const [purpose, setPurpose] = useState(() => editTx?.type || TRANSACTION_TYPES.EXPENSE)
  const [amount, setAmount] = useState(() => editTx ? String(editTx.originalAmount ?? editTx.amount) : '')
  const [currency, setCurrency] = useState(() => editTx?.currency || '')
  const [category, setCategory] = useState(() => editTx?.category || lastCategoryByType.current[TRANSACTION_TYPES.EXPENSE] || '')
  const [note, setNote] = useState(() => editTx?.note || '')
  const [date, setDate] = useState(() => editTx?.date || new Date().toISOString().split('T')[0])
  const [selectedTags, setSelectedTags] = useState(() => editTx?.tags || [])
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [source, setSource] = useState(() => editTx?.source || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showLargeConfirm, setShowLargeConfirm] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(null)
  const [personName, setPersonName] = useState(() => editTx?.person?.name || '')
  const [paymentMethod, setPaymentMethod] = useState(() => editTx?.paymentMethod || '')
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false)
  const [showMore, setShowMore] = useState(!!editTx)
  const [splitMode, setSplitMode] = useState(() => hasSplits(editTx))
  const [splitLines, setSplitLines] = useState(() => (hasSplits(editTx) && Array.isArray(editTx.splits)
    ? editTx.splits.map((s) => ({ category: s.category, amount: String(s.amount) }))
    : [{ category: '', amount: '' }]))

  const personSuggestions = useMemo(() => {
    if (!personName.trim()) return []
    const q = personName.toLowerCase()
    return recentPeople.filter((name) => name.toLowerCase().includes(q) && name.toLowerCase() !== q)
  }, [personName, recentPeople])

  const transactionType = purpose
  const categories = transactionType === TRANSACTION_TYPES.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const suggestedTags = useMemo(() => getSuggestedTags(), [])
  const multiCurrencySettings = useMemo(() => getCurrencySettings(), [])
  const baseCurrencyCode = useMemo(() => getBaseCurrencyCode(), [])
  const showCurrencyPicker = multiCurrencySettings.enabled && category !== ''

  useEffect(() => {
    const timer = setTimeout(() => amountInputRef.current?.focus(), 150)
    return () => clearTimeout(timer)
  }, [])

  const handleAmountChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      const num = parseFloat(val)
      if (val === '' || num <= MAX_AMOUNT) {
        setAmount(val)
        setError('')
        if (note && !category) {
          const predicted = getSmartCategoryPrediction(transactions, note)
          if (predicted && categories.find((c) => c.id === predicted)) {
            setCategory(predicted)
          }
        }
      } else {
        setError(t('transactions.amount_too_large'))
      }
    }
  }

  const handleQuickAmount = (val) => {
    setAmount(String(val))
    setError('')
  }

  const updateSplitLine = (idx, patch) => {
    setSplitLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const addSplitLine = () => {
    setSplitLines((prev) => [...prev, { category: '', amount: '' }])
  }

  const removeSplitLine = (idx) => {
    setSplitLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const splitStatus = useMemo(() => {
    const total = parseFloat(amount)
    const sum = splitLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
    if (!total || total <= 0) return { ok: false, label: t('transactions.split_enter_total') }
    const diff = Math.abs(sum - total)
    if (diff <= 0.01) return { ok: true, label: `${t('transactions.split_matches')} ${formatCurrency(total)}` }
    return { ok: false, label: `${t('transactions.split_remaining')} ${formatCurrency(total - sum)}` }
  }, [splitLines, amount, t])

  const handleVoiceEntry = () => {
    if (listening) return
    setListening(true)
    recognizeVoiceSpeech()
      .then((transcript) => {
        const parsed = parseVoiceCommand(transcript)
        if (!parsed) {
          setError(t('transactions.voice_unparsed'))
          return
        }
        setAmount(String(parsed.amount))
        setNote(parsed.note)
        setDate(parsed.date)
        setPurpose(parsed.type)
        setCategory('')
        const predicted = getSmartCategoryPrediction(transactions, parsed.note)
        if (predicted && categories.find((c) => c.id === predicted)) {
          setCategory(predicted)
        }
        setError('')
        addToast(`${parsed.note}: ${formatCurrency(parsed.amount)}`, 'success')
      })
      .catch((err) => {
        if (err && err.unsupported) {
          setError(t('transactions.voice_unsupported'))
        } else if (err && err.permission) {
          setError(t('transactions.voice_permission'))
        } else {
          setError(t('transactions.voice_failed'))
        }
      })
      .finally(() => setListening(false))
  }

  const handleNoteChange = (e) => {
    const val = e.target.value
    setNote(val)
    if (val && !category) {
      const predicted = getSmartCategoryPrediction(transactions, val)
      if (predicted && categories.find((c) => c.id === predicted)) {
        setCategory(predicted)
      }
    }
  }

  const toggleTag = (tagName) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    )
    addTag(tagName)
  }

  const doSubmit = useCallback((transactionData) => {
    setIsSubmitting(true)
    setError('')

    try {
      if (isEditing && editTx) {
        updateTransaction(editTx.id, transactionData)

        addToast(t('transactions.updated_success'), 'success', 4000, () => {
          undoLastAction()
          addToast(t('transactions.undone'), 'info', 2000)
        })

        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onNavigate?.(navParams?.returnTo || 'history')
        }, 800)
      } else {
        addTransaction(transactionData)
        addTemplate(transactionData)

        addToast(t('transactions.added_success'), 'success', 4000, () => {
          undoLastAction()
          addToast(t('transactions.undone'), 'info', 2000)
        })

        if (isRecurring) {
          const nextDate = new Date(date)
          if (frequency === 'monthly') {
            const origDay = nextDate.getDate()
            nextDate.setMonth(nextDate.getMonth() + 1)
            if (nextDate.getDate() !== origDay) nextDate.setDate(0)
          } else if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
          else if (frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1)

          addRecurring({
            ...transactionData,
            frequency,
            nextDate: nextDate.toISOString().split('T')[0],
            active: true,
          })
        }

        setAmount('')
        setCategory('')
        setNote('')
        setDate(new Date().toISOString().split('T')[0])
        setSelectedTags([])
        setIsRecurring(false)
        setSource('')
        setPersonName('')
        setPaymentMethod('')
        setCurrency('')
        setShowMore(false)
        setSplitMode(false)
        setSplitLines([{ category: '', amount: '' }])
        setSuccess(true)
        setError('')
        setPendingSubmit(null)
        setTimeout(() => setSuccess(false), 2000)
      }
    } catch (err) {
      setError(t('transactions.update_failed'))
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }, [addTransaction, updateTransaction, undoLastAction, addRecurring, isRecurring, isEditing, editTx, date, frequency, addTemplate, addToast, t, onNavigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(t('transactions.enter_valid_amount'))
      return
    }
    if (numAmount > MAX_AMOUNT) {
      setError(t('transactions.amount_exceeds_limit'))
      return
    }
    if (splitMode) {
      const res = validateSplits(splitLines, numAmount)
      if (!res.valid) {
        setError(res.errors.includes('sum_mismatch') ? t('transactions.split_sum_mismatch') : t('transactions.split_invalid'))
        return
      }
    } else if (!category) {
      setError(t('transactions.select_category'))
      return
    }

    const selectedDate = new Date(date + 'T00:00:00')
    if (isNaN(selectedDate.getTime())) {
      setError(t('transactions.invalid_date'))
      return
    }

    const transactionData = {
      type: transactionType,
      amount: numAmount,
      currency: showCurrencyPicker && currency ? currency : undefined,
      category: splitMode ? splitLines[0].category : category,
      note: note.trim(),
      date,
      tags: selectedTags,
      source: source.trim() || undefined,
      person: personName.trim() ? { name: personName.trim() } : undefined,
      paymentMethod: paymentMethod || undefined,
    }

    const finalData = splitMode ? attachSplits(transactionData, splitLines) : transactionData

    if (numAmount >= LARGE_AMOUNT_THRESHOLD) {
      setPendingSubmit(finalData)
      setShowLargeConfirm(true)
      return
    }

    doSubmit(finalData)
  }

  const confirmLargeTransaction = useCallback(() => {
    if (!pendingSubmit) return
    setShowLargeConfirm(false)
    doSubmit(pendingSubmit)
  }, [pendingSubmit, doSubmit])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {isEditing && (
        <div className="flex items-center gap-3 mb-5">
          {onNavigate && (
            <button
              onClick={() => onNavigate(navParams?.returnTo || 'history')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
              aria-label={t('common.back')}
            >
              <ArrowUpCircle size={18} className="rotate-[-90deg]" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold">{t('transactions.edit')}</h1>
            <p className="text-[10px] text-gray-500">{formatCurrency(editTx?.amount || 0)} · {editTx?.category}</p>
          </div>
        </div>
      )}
      {/* Type Selector */}
      <div className="flex gap-2 mb-5">
        {[TRANSACTION_TYPES.INCOME, TRANSACTION_TYPES.EXPENSE].map((txType) => {
          const Icon = TYPE_ICONS[txType]
          const isActive = purpose === txType
          return (
            <button
              key={txType}
              onClick={() => { setPurpose(txType); setCategory(lastCategoryByType.current[txType] || ''); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                isActive
                  ? txType === TRANSACTION_TYPES.INCOME
                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-matte-100 text-gray-500 border-transparent hover:text-white'
              }`}
            >
              <Icon size={20} />
              {txType === TRANSACTION_TYPES.INCOME ? t('transactions.income') : t('transactions.expense')}
            </button>
          )
        })}
      </div>

      {recentTemplates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-[10px] font-medium text-gray-500">{t('transactions.quick_templates')}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {recentTemplates.filter((t) => t.type === purpose).slice(0, 4).map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => {
                  setAmount(String(tmpl.amount))
                  setCategory(tmpl.category)
                  setNote(tmpl.note || '')
                  setPersonName(tmpl.person?.name || '')
                  setPaymentMethod(tmpl.paymentMethod || '')
                  setSource(tmpl.source || '')
                  setCurrency(tmpl.currency || '')
                  setSelectedTags(tmpl.tags || [])
                  const tmplCat = tmpl.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                  if (tmplCat.find((c) => c.id === tmpl.category)) {
                    lastCategoryByType.current[tmpl.type] = tmpl.category
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-glass-border text-[10px] font-medium text-gray-400 hover:text-white hover:border-gray-500 transition-all"
              >
                <span>{tmpl.label}</span>
                {tmpl.paymentMethod && (
                  <span className="text-gray-600">· {PAYMENT_METHODS.find((m) => m.id === tmpl.paymentMethod)?.label || tmpl.paymentMethod}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount - Core field */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 font-medium">{t('transactions.amount')}</label>
            <button
              type="button"
              onClick={handleVoiceEntry}
              disabled={listening}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                listening
                  ? 'border-neon/60 text-neon bg-neon/10 animate-pulse'
                  : 'border-glass-border text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <Mic size={12} />
              {listening ? t('transactions.listening') : t('transactions.voice')}
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold pointer-events-none">{amountSymbol}</span>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="input-field text-2xl font-bold pl-10 py-4 tabular-nums"
            />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleQuickAmount(q)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  parseFloat(amount) === q
                    ? 'border-neon/50 text-neon bg-neon/10'
                    : 'border-glass-border text-gray-500 hover:border-gray-500'
                }`}
              >
                {formatAmountShort(q, currencySymbol)}
              </button>
            ))}
          </div>
          {multiCurrencySettings.enabled && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-glass-border bg-matte-100 text-gray-400 focus:outline-none focus:border-neon/40"
                aria-label="Currency"
              >
                <option value="">{baseCurrencyCode} ({t('csv_import.base')})</option>
                {CURRENCIES.filter((c) => c.code !== baseCurrencyCode).map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              {currency && currency !== baseCurrencyCode && (
                <span className="text-[10px] text-gray-500">
                  ≈ {formatInCurrency(parseFloat(amount) || 0, currency)} = {formatInCurrency((parseFloat(amount) || 0) * (multiCurrencySettings.rates[currency] || 1), baseCurrencyCode)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">{t('transactions.category')}</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setCategory(cat.id); lastCategoryByType.current[transactionType] = cat.id; setError('') }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150 ${
                  category === cat.id
                    ? transactionType === TRANSACTION_TYPES.INCOME
                      ? 'border-neon/50 bg-neon/10 text-neon shadow-sm shadow-neon/10'
                      : 'border-red-500/50 bg-red-500/10 text-red-400 shadow-sm shadow-red-500/10'
                    : 'border-glass-border text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                <CategoryIcon icon={cat.icon} size={20} />
                <span className="text-[10px] font-medium text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
          {transactionType === TRANSACTION_TYPES.EXPENSE && (
            <>
              <button
                type="button"
                onClick={() => setSplitMode(!splitMode)}
                className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                  splitMode
                    ? 'border-teal-500/40 text-teal-400 bg-teal-500/10'
                    : 'border-glass-border text-gray-500 hover:text-white hover:border-gray-500'
                }`}
              >
                <SplitSquareHorizontal size={12} />
                {splitMode ? t('transactions.split_on') : t('transactions.split_off')}
              </button>
              {splitMode && (
                <div className="mt-3 p-3 rounded-xl border border-teal-500/20 bg-teal-500/[0.03] space-y-2 animate-slide-up">
                  <p className="text-[10px] text-gray-500">{t('transactions.split_hint')}</p>
                  {splitLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={line.category}
                        onChange={(e) => updateSplitLine(idx, { category: e.target.value })}
                        className="input-field flex-1 py-2 text-xs"
                        aria-label={`Split category ${idx + 1}`}
                      >
                        <option value="">{t('transactions.split_select')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={line.amount}
                        onChange={(e) => updateSplitLine(idx, { amount: e.target.value })}
                        placeholder="0.00"
                        className="input-field w-24 py-2 text-xs tabular-nums text-right"
                        aria-label={`Split amount ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeSplitLine(idx)}
                        disabled={splitLines.length <= 1}
                        className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30"
                        aria-label={t('transactions.split_remove')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={addSplitLine}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors"
                    >
                      <Plus size={11} />
                      {t('transactions.split_add')}
                    </button>
                    <span className={`text-[10px] tabular-nums ${splitStatus.ok ? 'text-teal-400' : 'text-amber-400'}`}>
                      {splitStatus.label}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">{t('transactions.note')} <span className="text-gray-600 font-normal">({t('common.optional')})</span></label>
          <input
            type="text"
            value={note}
            onChange={handleNoteChange}
            placeholder={t('transactions.note_placeholder')}
            className="input-field"
            maxLength={100}
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">{t('transactions.date')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* More Options Toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-neon transition-colors"
        >
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showMore ? t('transactions.less_options') : t('transactions.more_options')}
        </button>

        {showMore && (
          <div className="space-y-4 animate-slide-up">
            {/* Person */}
            <div>
              <label className="text-xs text-gray-500 font-medium mb-2 block">
                {purpose === TRANSACTION_TYPES.INCOME ? t('transactions.received_from') : t('transactions.paid_to')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => { setPersonName(e.target.value); setShowPersonSuggestions(true) }}
                  onFocus={() => setShowPersonSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPersonSuggestions(false), 200)}
                  placeholder={t('transactions.person_placeholder')}
                  className="input-field pl-9"
                  maxLength={50}
                  autoComplete="off"
                />
                {showPersonSuggestions && personSuggestions.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-matte-200 border border-glass-border rounded-xl overflow-hidden shadow-lg animate-fade-in">
                    {personSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={() => { setPersonName(name); setShowPersonSuggestions(false) }}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <User size={12} className="text-gray-500 shrink-0" />
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {recentPeople.length > 0 && !personName && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {recentPeople.slice(0, 5).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setPersonName(name)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-glass-border text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs text-gray-500 font-medium mb-2 block">{t('transactions.payment_method')} <span className="text-gray-600 font-normal">({t('common.optional')})</span></label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const PIcon = PAYMENT_ICONS[pm.id] || Smartphone
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(paymentMethod === pm.id ? '' : pm.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-150 ${
                        paymentMethod === pm.id
                          ? 'border-neon/50 bg-neon/10 text-neon'
                          : 'border-glass-border text-gray-400 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      <PIcon size={16} />
                      <span className="text-[9px] font-medium leading-tight text-center">{pm.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="text-xs text-gray-500 font-medium mb-2 block">{t('transactions.source')} <span className="text-gray-600 font-normal">({t('common.optional')})</span></label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t('transactions.source_placeholder')}
                className="input-field"
                maxLength={50}
              />
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500 font-medium">{t('transactions.tags')} <span className="text-gray-600 font-normal">({t('common.optional')})</span></label>
                <button
                  type="button"
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className="flex items-center gap-1 text-xs text-neon/70 hover:text-neon transition-colors"
                >
                  <Tag size={12} />
                  {showTagPicker ? t('common.done') : t('transactions.add_tags')}
                </button>
              </div>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTags.map((t) => (
                    <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-medium border border-purple-500/20">
                      #{t}
                      <button type="button" onClick={() => toggleTag(t)} className="hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {showTagPicker && (
                <div className="flex flex-wrap gap-1.5">
                  {(tags.length > 0 ? tags.map((t) => t.name) : suggestedTags).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all duration-150 ${
                        selectedTags.includes(t)
                          ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                          : 'border-glass-border text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`p-2 rounded-lg transition-all duration-150 ${
                  isRecurring ? 'bg-neon/10 text-neon' : 'bg-matte-100 text-gray-500'
                }`}
              >
                <Repeat2 size={16} />
              </button>
              <div className="flex-1">
                <p className="text-xs font-medium">{t('transactions.recurring')}</p>
                <p className="text-[11px] text-gray-500">{t('transactions.recurring_desc')}</p>
              </div>
              {isRecurring && (
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="input-field text-xs !py-1.5 w-24"
                >
                  <option value="weekly">{t('budgets.weekly')}</option>
                  <option value="monthly">{t('budgets.monthly')}</option>
                  <option value="yearly">{t('budgets.yearly')}</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!amount || !category || isSubmitting}
          className={`w-full btn-primary flex items-center justify-center gap-2 ${
            success ? '!bg-neon !text-black' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {t('transactions.updating')}
            </>
          ) : success ? (
            <>
              <Check size={18} />
              {isEditing ? t('transactions.saved') : t('transactions.added')}
            </>
          ) : isEditing ? (
            <>
              <Pencil size={18} />
              {t('transactions.save_changes')}
            </>
          ) : (
            purpose === TRANSACTION_TYPES.INCOME ? t('transactions.add_income') : t('transactions.add_expense')
          )}
        </button>
      </form>

      <ConfirmationModal
        open={showLargeConfirm}
        onClose={() => { setShowLargeConfirm(false); setPendingSubmit(null) }}
        onConfirm={confirmLargeTransaction}
        title={t('transactions.confirm_large')}
        description={t('transactions.confirm_large_desc', { amount: formatCurrency(pendingSubmit?.amount || 0) })}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
      />
    </div>
  )
}
