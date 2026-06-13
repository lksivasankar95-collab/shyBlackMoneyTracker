import { useState, useCallback } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Send, TrendingUp, TrendingDown, Check, Repeat2, Tag, X } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSACTION_TYPES, TRANSACTION_PURPOSE, PURPOSE_LABELS, TRADING_PLATFORMS } from '../utils/constants'
import { getSmartCategoryPrediction } from '../utils/insights'
import { getSuggestedTags } from '../utils/tags'
import CategoryIcon from '../components/CategoryIcon'
import ConfirmationModal from '../components/ConfirmationModal'

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]
const MAX_AMOUNT = 99999999
const LARGE_AMOUNT_THRESHOLD = 50000

const PURPOSE_ICONS = {
  [TRANSACTION_PURPOSE.INCOME]: ArrowUpCircle,
  [TRANSACTION_PURPOSE.EXPENSE]: ArrowDownCircle,
  [TRANSACTION_PURPOSE.INVESTMENT_TRANSFER]: Send,
  [TRANSACTION_PURPOSE.TRADING_PROFIT]: TrendingUp,
  [TRANSACTION_PURPOSE.TRADING_LOSS]: TrendingDown,
}

const PURPOSE_COLORS = {
  [TRANSACTION_PURPOSE.INCOME]: 'bg-green-500/15 text-green-400 border-green-500/30',
  [TRANSACTION_PURPOSE.EXPENSE]: 'bg-red-500/15 text-red-400 border-red-500/30',
  [TRANSACTION_PURPOSE.INVESTMENT_TRANSFER]: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  [TRANSACTION_PURPOSE.TRADING_PROFIT]: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  [TRANSACTION_PURPOSE.TRADING_LOSS]: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

function getTypeFromPurpose(purpose) {
  if (purpose === TRANSACTION_PURPOSE.INCOME || purpose === TRANSACTION_PURPOSE.TRADING_PROFIT) return TRANSACTION_TYPES.INCOME
  return TRANSACTION_TYPES.EXPENSE
}

const PURPOSE_ORDER = [
  TRANSACTION_PURPOSE.INCOME,
  TRANSACTION_PURPOSE.EXPENSE,
  TRANSACTION_PURPOSE.INVESTMENT_TRANSFER,
  TRANSACTION_PURPOSE.TRADING_PROFIT,
  TRANSACTION_PURPOSE.TRADING_LOSS,
]

export default function AddTransaction({ onNavigate }) {
  const { addTransaction, addRecurring, tags, addTag } = useFinance()
  const [purpose, setPurpose] = useState(TRANSACTION_PURPOSE.EXPENSE)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTags, setSelectedTags] = useState([])
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [tradingPlatform, setTradingPlatform] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showLargeConfirm, setShowLargeConfirm] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(null)

  const transactionType = getTypeFromPurpose(purpose)
  const categories = transactionType === TRANSACTION_TYPES.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const isTradingPurpose = purpose === TRANSACTION_PURPOSE.TRADING_PROFIT || purpose === TRANSACTION_PURPOSE.TRADING_LOSS
  const suggestedTags = getSuggestedTags()

  const handleAmountChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d+$/.test(val)) {
      const num = parseInt(val, 10)
      if (val === '' || num <= MAX_AMOUNT) {
        setAmount(val)
        setError('')
        if (note && !category) {
          const predicted = getSmartCategoryPrediction(null, note)
          if (predicted && categories.find((c) => c.id === predicted)) {
            setCategory(predicted)
          }
        }
      } else {
        setError('Amount too large')
      }
    }
  }

  const handleQuickAmount = (val) => {
    setAmount(String(val))
    setError('')
  }

  const handleNoteChange = (e) => {
    const val = e.target.value
    setNote(val)
    if (val && !category) {
      const predicted = getSmartCategoryPrediction(null, val)
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
    addTransaction(transactionData)

    if (isRecurring) {
      const nextDate = new Date(date)
      if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)
      else if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
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
    setTradingPlatform('')
    setSuccess(true)
    setError('')
    setPendingSubmit(null)
    setTimeout(() => setSuccess(false), 2000)
  }, [addTransaction, addRecurring, isRecurring, date, frequency])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (numAmount > MAX_AMOUNT) {
      setError('Amount exceeds maximum limit')
      return
    }
    if (!category) {
      setError('Please select a category')
      return
    }

    const selectedDate = new Date(date)
    if (isNaN(selectedDate.getTime())) {
      setError('Invalid date selected')
      return
    }
    if (selectedDate > new Date()) {
      setError('Future dates are not allowed')
      return
    }

    const transactionData = {
      type: transactionType,
      transactionPurpose: purpose,
      tradingPlatform: isTradingPurpose ? tradingPlatform || 'manual' : undefined,
      amount: numAmount,
      category,
      note: note.trim(),
      date,
      tags: selectedTags,
    }

    if (numAmount >= LARGE_AMOUNT_THRESHOLD) {
      setPendingSubmit(transactionData)
      setShowLargeConfirm(true)
      return
    }

    doSubmit(transactionData)
  }

  const confirmLargeTransaction = useCallback(() => {
    if (!pendingSubmit) return
    setShowLargeConfirm(false)
    doSubmit(pendingSubmit)
  }, [pendingSubmit, doSubmit])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">Add Transaction</h1>

      {/* Purpose Selector */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {PURPOSE_ORDER.map((p) => {
          const Icon = PURPOSE_ICONS[p]
          const isActive = purpose === p
          return (
            <button
              key={p}
              onClick={() => { setPurpose(p); setCategory(''); setError(''); if (!isTradingPurpose) setTradingPlatform('') }}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                isActive ? PURPOSE_COLORS[p] : 'bg-matte-100 text-gray-500 border-transparent hover:text-white'
              } ${p === TRANSACTION_PURPOSE.INCOME || p === TRANSACTION_PURPOSE.EXPENSE ? 'col-span-1' : ''}`}
            >
              <Icon size={18} />
              <span className="text-[10px] leading-tight text-center">{PURPOSE_LABELS[p]}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold pointer-events-none">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
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
                ₹{q >= 1000 ? `${(q / 1000).toFixed(0)}k` : q}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setCategory(cat.id); setError('') }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150 ${
                  category === cat.id
                    ? transactionType === TRANSACTION_TYPES.INCOME
                      ? 'border-neon/50 bg-neon/10 text-neon shadow-sm shadow-neon/10'
                      : 'border-red-500/50 bg-red-500/10 text-red-400 shadow-sm shadow-red-500/10'
                    : 'border-glass-border text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                <CategoryIcon icon={cat.icon} size={20} />
                <span className="text-[10px] font-medium text-center leading-tight">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Note <span className="text-gray-600 font-normal">(optional)</span></label>
          <input
            type="text"
            value={note}
            onChange={handleNoteChange}
            placeholder="e.g. Swiggy order, Salary, Amazon..."
            className="input-field"
            maxLength={100}
          />
        </div>

        {/* Trading Platform */}
        {isTradingPurpose && (
          <div>
            <label className="text-xs text-gray-500 font-medium mb-2 block">Trading Platform</label>
            <div className="flex flex-wrap gap-2">
              {TRADING_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTradingPlatform(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    tradingPlatform === p.id
                      ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                      : 'border-glass-border text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 font-medium">Tags <span className="text-gray-600 font-normal">(optional)</span></label>
            <button
              type="button"
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="flex items-center gap-1 text-xs text-neon/70 hover:text-neon transition-colors"
            >
              <Tag size={12} />
              {showTagPicker ? 'Done' : 'Add tags'}
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

        {/* Date */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
          />
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
            <p className="text-xs font-medium">Recurring Transaction</p>
            <p className="text-[11px] text-gray-500">Set up automatic recurring entries</p>
          </div>
          {isRecurring && (
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="input-field text-xs !py-1.5 w-24"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
        </div>

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
          disabled={!amount || !category}
          className={`w-full btn-primary flex items-center justify-center gap-2 ${
            success ? '!bg-neon !text-black' : ''
          }`}
        >
          {success ? (
            <>
              <Check size={18} />
              Added!
            </>
          ) : (
            `Add ${PURPOSE_LABELS[purpose] || 'Transaction'}`
          )}
        </button>
      </form>

      <ConfirmationModal
        open={showLargeConfirm}
        onClose={() => { setShowLargeConfirm(false); setPendingSubmit(null) }}
        onConfirm={confirmLargeTransaction}
        title="Confirm Large Transaction"
        description={`This transaction is for ${formatCurrency(pendingSubmit?.amount || 0)}. Are you sure you want to proceed?`}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </div>
  )
}
