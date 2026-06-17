import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Landmark, Smartphone, X, Clock, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'

const EMI_NAME_SUGGESTIONS = [
  'Bike Loan', 'Car Loan', 'Home Loan', 'Mobile EMI',
  'Credit Card EMI', 'Personal Loan', 'Education Loan',
]

const TENURE_OPTIONS = [6, 12, 18, 24, 36, 48, 60]

const REMINDER_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '12:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00']

const DEFAULT_REMINDERS = ['07:00', '08:00', '09:00']
const MAX_AMOUNT = 99999999

export default function AddEmi({ onNavigate, currentPage }) {
  const { addEmi, updateEmi, emis } = useFinance()

  const isEditMode = currentPage && currentPage.startsWith('edit-emi/')
  const editEmiId = isEditMode ? currentPage.replace('edit-emi/', '') : null
  const editEmi = isEditMode && editEmiId ? emis.find((e) => e.id === editEmiId) : null

  const [name, setName] = useState(editEmi?.name || '')
  const [amount, setAmount] = useState(editEmi ? String(editEmi.amount) : '')
  const [dueDay, setDueDay] = useState(editEmi ? String(editEmi.dueDay) : '')
  const [tenure, setTenure] = useState(editEmi ? String(editEmi.tenure) : '36')
  const [lender, setLender] = useState(editEmi?.lender || '')
  const [contactName, setContactName] = useState(editEmi?.contactName || '')
  const [phoneNumber, setPhoneNumber] = useState(editEmi?.phoneNumber || '')
  const [reminderTimes, setReminderTimes] = useState(editEmi?.reminderTimes?.length ? [...editEmi.reminderTimes] : [...DEFAULT_REMINDERS])
  const [notes, setNotes] = useState(editEmi?.notes || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [pickingContact, setPickingContact] = useState(false)

  const hasPayments = editEmi ? (editEmi.totalPaidCount > 0) : false

  const nameSuggestions = useMemo(() => {
    if (!name.trim()) return []
    const q = name.toLowerCase()
    return EMI_NAME_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
  }, [name])

  const handlePickContact = useCallback(async () => {
    try {
      if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform()) {
        setError('Contact picker is only available on Android')
        return
      }
      setPickingContact(true)
      const { Contacts } = await import('@capacitor-community/contacts')
      const result = await Contacts.pickContact()
      if (result) {
        if (result.displayName) {
          setContactName(result.displayName)
          if (!lender) setLender(result.displayName)
        }
        if (result.phoneNumbers && result.phoneNumbers.length > 0) {
          setPhoneNumber(result.phoneNumbers[0].number || '')
        }
      }
    } catch (err) {
      if (err.message?.includes('permission') || err.message?.includes('denied')) {
        setError('Contact access denied. You can type the name manually.')
      } else {
        console.warn('[AddEmi] Contact picker error:', err)
      }
    } finally {
      setPickingContact(false)
    }
  }, [lender])

  const clearContact = useCallback(() => {
    setContactName('')
    setPhoneNumber('')
  }, [])

  const addReminderTime = useCallback(() => {
    if (reminderTimes.length >= 5) return
    setReminderTimes((prev) => [...prev, '09:00'])
  }, [reminderTimes.length])

  const removeReminderTime = useCallback((index) => {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateReminderTime = useCallback((index, value) => {
    setReminderTimes((prev) => prev.map((t, i) => (i === index ? value : t)))
  }, [])

  const isValidTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter an EMI name')
      return
    }

    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (numAmount > MAX_AMOUNT) {
      setError('Amount exceeds maximum limit')
      return
    }

    const numDueDay = parseInt(dueDay, 10)
    if (!dueDay || isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
      setError('Due day must be between 1 and 31')
      return
    }

    const numTenure = parseInt(tenure, 10)
    if (!tenure || isNaN(numTenure) || numTenure < 1) {
      setError('Please select a valid tenure')
      return
    }

    if (reminderTimes.length < 1) {
      setError('At least 1 reminder time is required')
      return
    }
    if (reminderTimes.length > 5) {
      setError('Maximum 5 reminder times allowed')
      return
    }
    for (const time of reminderTimes) {
      if (!isValidTime(time)) {
        setError(`Invalid reminder time: ${time}`)
        return
      }
    }

    const payload = {
      name: name.trim(),
      amount: numAmount,
      dueDay: numDueDay,
      tenure: numTenure,
      lender: lender.trim(),
      contactName: contactName.trim(),
      phoneNumber: phoneNumber.trim(),
      reminderTimes: [...reminderTimes],
      notes: notes.trim(),
    }

    if (isEditMode && editEmiId) {
      updateEmi(editEmiId, payload)
    } else {
      addEmi(payload)
    }

    setSuccess(true)
    setError('')
    setTimeout(() => {
      onNavigate('emi-center')
    }, 1200)
  }

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('emi-center')}
          className="w-9 h-9 rounded-xl bg-matte-100 flex items-center justify-center hover:bg-matte-200 transition-all shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Landmark size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{isEditMode ? 'Edit EMI' : 'Add EMI'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {isEditMode && hasPayments && (
          <div className="px-3.5 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium">
            Payments already recorded. Amount, Due Day, and Tenure cannot be changed.
          </div>
        )}

        {/* EMI Name */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">EMI Name</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setShowNameSuggestions(true) }}
              onFocus={() => setShowNameSuggestions(true)}
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              placeholder="e.g. Bike Loan, Mobile EMI"
              className="input-field"
              maxLength={100}
              autoComplete="off"
            />
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-matte-200 border border-glass-border rounded-xl overflow-hidden shadow-lg animate-fade-in">
                {nameSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => { setName(s); setShowNameSuggestions(false) }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold pointer-events-none">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                if (isEditMode && hasPayments) return
                const val = e.target.value
                if (val === '' || /^\d+$/.test(val)) setAmount(val)
              }}
              placeholder="0"
              className={`input-field text-2xl font-bold pl-10 py-4 tabular-nums ${isEditMode && hasPayments ? 'opacity-50 cursor-not-allowed' : ''}`}
              readOnly={isEditMode && hasPayments}
            />
          </div>
        </div>

        {/* Due Day */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Due Day (1–31)</label>
          <input
            type="text"
            inputMode="numeric"
            value={dueDay}
            onChange={(e) => {
              if (isEditMode && hasPayments) return
              const val = e.target.value
              if (val === '' || /^\d{0,2}$/.test(val)) setDueDay(val)
            }}
            placeholder="e.g. 5, 15, 25"
            className={`input-field ${isEditMode && hasPayments ? 'opacity-50 cursor-not-allowed' : ''}`}
            maxLength={2}
            readOnly={isEditMode && hasPayments}
          />
          <p className="text-[10px] text-gray-600 mt-1">Auto-adjusts for month-end (Feb 28/29, Apr 30)</p>
        </div>

        {/* Tenure */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Tenure (Months)</label>
          <div className="flex gap-2 flex-wrap">
            {TENURE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { if (!(isEditMode && hasPayments)) setTenure(String(t)) }}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  isEditMode && hasPayments ? 'opacity-40 cursor-not-allowed' :
                  tenure === String(t)
                    ? 'border-neon/50 text-neon bg-neon/10'
                    : 'border-glass-border text-gray-500 hover:text-white hover:border-gray-500'
                }`}
              >
                {t} mo
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              value={tenure}
              onChange={(e) => {
                if (isEditMode && hasPayments) return
                const val = e.target.value
                if (val === '' || /^\d{0,3}$/.test(val)) setTenure(val)
              }}
              placeholder="Custom"
              className={`input-field !py-2 !px-3 w-20 text-xs ${isEditMode && hasPayments ? 'opacity-50 cursor-not-allowed' : ''}`}
              maxLength={3}
              readOnly={isEditMode && hasPayments}
            />
          </div>
        </div>

        {/* Lender */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Lender / Company <span className="text-gray-600 font-normal">(optional)</span></label>
          <input
            type="text"
            value={lender}
            onChange={(e) => setLender(e.target.value)}
            placeholder="e.g. HDFC, SBI, Bajaj Finance"
            className="input-field"
            maxLength={100}
          />
        </div>

        {/* Contact Picker */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Select Contact <span className="text-gray-600 font-normal">(optional)</span></label>
          {contactName ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-glass-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{contactName}</p>
                {phoneNumber && <p className="text-xs text-gray-500">{phoneNumber}</p>}
              </div>
              <button
                type="button"
                onClick={clearContact}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickContact}
              disabled={pickingContact}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-glass-border text-gray-400 hover:text-white hover:border-gray-500 transition-all w-full text-sm disabled:opacity-50"
            >
              <Smartphone size={16} />
              {pickingContact ? 'Opening contact picker...' : 'Select Contact'}
            </button>
          )}
        </div>

        {/* Reminder Times */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 font-medium">
              Reminder Times <span className="text-gray-600 font-normal">(1–5)</span>
            </label>
            {reminderTimes.length < 5 && (
              <button
                type="button"
                onClick={addReminderTime}
                className="flex items-center gap-1 text-xs text-neon/70 hover:text-neon transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
            )}
          </div>
          <div className="space-y-2">
            {reminderTimes.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <Clock size={14} className="text-gray-500 shrink-0" />
                <select
                  value={time}
                  onChange={(e) => updateReminderTime(index, e.target.value)}
                  className="input-field !py-2 text-xs flex-1"
                >
                  {REMINDER_PRESETS.map((t) => (
                    <option key={t} value={t}>
                      {parseInt(t.split(':')[0]) > 12
                        ? `${parseInt(t.split(':')[0]) - 12}:${t.split(':')[1]} PM`
                        : `${parseInt(t.split(':')[0])}:${t.split(':')[1]} ${parseInt(t.split(':')[0]) === 0 ? 'AM' : parseInt(t.split(':')[0]) < 12 ? 'AM' : 'PM'}`
                      }
                    </option>
                  ))}
                </select>
                {reminderTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReminderTime(index)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Notes <span className="text-gray-600 font-normal">(optional)</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information..."
            className="input-field resize-none"
            rows={2}
            maxLength={500}
          />
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
          disabled={success}
          className={`w-full btn-primary flex items-center justify-center gap-2 ${
            success ? '!bg-neon !text-black' : ''
          }`}
        >
          {success ? (
            <>{isEditMode ? 'EMI Updated' : 'Added to EMI Center'}</>
          ) : (
            isEditMode ? 'Update EMI' : 'Create EMI'
          )}
        </button>
      </form>
    </div>
  )
}
