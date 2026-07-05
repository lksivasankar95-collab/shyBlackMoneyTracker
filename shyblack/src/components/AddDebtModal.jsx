import { useState, useCallback } from 'react'
import { ArrowUpRight, ArrowDownLeft, AlertTriangle, Contact, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { pickContact } from '../utils/contacts'
import { useToast } from './Toast'
import { useTranslation } from '../i18n'

export default function AddDebtModal({ open, onClose, onSave }) {
  const { t } = useTranslation()
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
        addToast(t('debts.contact_imported', { name: result.contact.name }), 'success')
      } else if (result.error) {
        setError(result.error)
      }
    } catch {
      setError(t('debts.error_import_contact'))
    } finally {
      setImportingContact(false)
    }
  }, [addToast, t])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose])

  const handleAmountChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      setAmount(val)
      setError('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (!personName.trim()) {
      setError(t('debts.error_name_required'))
      return
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(t('debts.error_invalid_amount'))
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

  return (
    <Modal open={open} onClose={handleClose} title={t('debts.add')}>
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
            {t('debts.lent')}
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
            {t('debts.borrowed')}
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
            <><Loader2 size={14} className="animate-spin" /> {t('debts.importing')}</>
          ) : (
            <><Contact size={14} /> {t('debts.import_contact')}</>
          )}
        </button>

        <div className="relative">
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t('debts.person_name')}</label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder={t('debts.person_placeholder')}
            className="input-field"
            maxLength={50}
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">
            {t('common.phone')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
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
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t('debts.amount')} (₹)</label>
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
            {t('debts.due_date')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
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
            {t('debts.notes')} <span className="text-gray-600 font-normal">({t('common.optional')})</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('debts.notes_placeholder')}
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
          {type === 'lent' ? t('debts.add_lent') : t('debts.add_borrowed')}
        </button>
      </form>
    </Modal>
  )
}
