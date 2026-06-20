import { useState, useCallback } from 'react'
import { ArrowUpRight, ArrowDownLeft, AlertTriangle, Contact, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { pickContact } from '../utils/contacts'
import { useToast } from './Toast'

export default function AddDebtModal({ open, onClose, onSave }) {
  const { addToast } = useToast()
  const [personName, setPersonName] = useState('')
  const [personPhone, setPersonPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('lent')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [importingContact, setImportingContact] = useState(false)

  const reset = () => {
    setPersonName('')
    setPersonPhone('')
    setAmount('')
    setType('lent')
    setDueDate('')
    setNotes('')
    setError('')
    setImportingContact(false)
  }

  const handleImportContact = useCallback(async () => {
    setImportingContact(true)
    setError('')
    try {
      const result = await pickContact()
      if (result.success && result.contact) {
        setPersonName(result.contact.name)
        setPersonPhone(result.contact.primaryPhone)
        addToast(`Imported ${result.contact.name}`, 'success')
      } else if (result.error) {
        setError(result.error)
      }
    } catch {
      setError('Failed to import contact')
    } finally {
      setImportingContact(false)
    }
  }, [addToast])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (!personName.trim()) {
      setError('Please enter a name')
      return
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    onSave({
      personName: personName.trim(),
      amount: numAmount,
      type,
      dueDate,
      notes: notes.trim(),
      personPhone: personPhone.trim() || undefined,
    })
    reset()
  }

  const handleAmountChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d+$/.test(val)) {
      setAmount(val)
      setError('')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Borrow & Lend">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setType('lent'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              type === 'lent'
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white'
            }`}
          >
            <ArrowUpRight size={16} />
            Lent
          </button>
          <button
            type="button"
            onClick={() => { setType('borrowed'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              type === 'borrowed'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white'
            }`}
          >
            <ArrowDownLeft size={16} />
            Borrowed
          </button>
        </div>

        {/* Import from Contacts */}
        <button
          type="button"
          onClick={handleImportContact}
          disabled={importingContact}
          className="w-full py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {importingContact ? (
            <><Loader2 size={14} className="animate-spin" /> Importing...</>
          ) : (
            <><Contact size={14} /> Import from Contacts</>
          )}
        </button>

        <div className="relative">
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">Person Name</label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Rahul, Priya..."
            className="input-field"
            maxLength={50}
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">
            Phone <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={personPhone}
            onChange={(e) => setPersonPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="input-field"
            maxLength={20}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">Amount (₹)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0"
            className="input-field text-lg font-bold tabular-nums"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">
            Due Date <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">
            Notes <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Purpose, terms..."
            className="input-field"
            maxLength={100}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!personName.trim() || !amount}
          className="w-full btn-primary text-sm flex items-center justify-center gap-2"
        >
          {type === 'lent' ? 'Add Lent Record' : 'Add Borrowed Record'}
        </button>
      </form>
    </Modal>
  )
}
