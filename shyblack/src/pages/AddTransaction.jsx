import { useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Check } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSACTION_TYPES } from '../utils/constants'
import CategoryIcon from '../components/CategoryIcon'
import GlassCard from '../components/GlassCard'

export default function AddTransaction({ onNavigate }) {
  const { addTransaction } = useFinance()
  const [type, setType] = useState(TRANSACTION_TYPES.EXPENSE)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [success, setSuccess] = useState(false)

  const categories = type === TRANSACTION_TYPES.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSubmit = (e) => {
    e.preventDefault()

    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) return
    if (!category) return

    addTransaction({
      type,
      amount: numAmount,
      category,
      note: note.trim(),
      date,
    })

    setAmount('')
    setCategory('')
    setNote('')
    setDate(new Date().toISOString().split('T')[0])
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000]

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Add Transaction</h1>

      {/* Type Toggle */}
      <div className="flex bg-matte-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => { setType(TRANSACTION_TYPES.INCOME); setCategory('') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            type === TRANSACTION_TYPES.INCOME
              ? 'bg-neon text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpCircle size={18} />
          Income
        </button>
        <button
          onClick={() => { setType(TRANSACTION_TYPES.EXPENSE); setCategory('') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            type === TRANSACTION_TYPES.EXPENSE
              ? 'bg-red-500 text-white'
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
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              className="input-field text-2xl font-bold pl-10 py-4"
            />
          </div>
          {/* Quick Amounts */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
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
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  category === cat.id
                    ? type === TRANSACTION_TYPES.INCOME
                      ? 'border-neon/50 bg-neon/10 text-neon'
                      : 'border-red-500/50 bg-red-500/10 text-red-400'
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
          <label className="text-xs text-gray-500 font-medium mb-2 block">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="input-field"
          />
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
