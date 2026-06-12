import { useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Check, Repeat2, Tag, X } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSACTION_TYPES } from '../utils/constants'
import { getSmartCategoryPrediction } from '../utils/insights'
import { getSuggestedTags } from '../utils/tags'
import CategoryIcon from '../components/CategoryIcon'

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]
const MAX_AMOUNT = 99999999

export default function AddTransaction({ onNavigate }) {
  const { addTransaction, addRecurring, tags, addTag } = useFinance()
  const [type, setType] = useState(TRANSACTION_TYPES.EXPENSE)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTags, setSelectedTags] = useState([])
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showTagPicker, setShowTagPicker] = useState(false)

  const categories = type === TRANSACTION_TYPES.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
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

    const transactionData = {
      type,
      amount: numAmount,
      category,
      note: note.trim(),
      date,
      tags: selectedTags,
    }

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
    setSuccess(true)
    setError('')
    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">Add Transaction</h1>

      {/* Type Toggle */}
      <div className="flex bg-matte-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => { setType(TRANSACTION_TYPES.INCOME); setCategory(''); setError('') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            type === TRANSACTION_TYPES.INCOME
              ? 'bg-neon text-black shadow-lg shadow-neon/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpCircle size={18} />
          Income
        </button>
        <button
          onClick={() => { setType(TRANSACTION_TYPES.EXPENSE); setCategory(''); setError('') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            type === TRANSACTION_TYPES.EXPENSE
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownCircle size={18} />
          Expense
        </button>
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
                    ? type === TRANSACTION_TYPES.INCOME
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
            `Add ${type === TRANSACTION_TYPES.INCOME ? 'Income' : 'Expense'}`
          )}
        </button>
      </form>
    </div>
  )
}
