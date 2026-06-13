import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, TriangleAlert } from 'lucide-react'

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  typedConfirm = false,
  typedConfirmWord = 'DELETE',
  loading = false,
}) {
  const [typedValue, setTypedValue] = useState('')
  const inputRef = useRef()
  const isTypedValid = typedValue === typedConfirmWord

  useEffect(() => {
    if (open) {
      setTypedValue('')
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleConfirm = () => {
    if (typedConfirm && !isTypedValid) return
    onConfirm()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-brand p-5 w-full max-w-sm animate-scale-in">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto ${
          danger ? 'bg-red-500/10' : 'bg-yellow-500/10'
        }`}>
          {danger ? (
            <TriangleAlert size={22} className="text-red-400" />
          ) : (
            <AlertTriangle size={22} className="text-yellow-400" />
          )}
        </div>

        <h2 className="text-sm font-semibold text-center mb-1.5">{title}</h2>

        {description && (
          <p className="text-xs text-gray-400 text-center leading-relaxed mb-4 max-w-[280px] mx-auto">
            {description}
          </p>
        )}

        {typedConfirm && (
          <div className="mb-4">
            <p className="text-[11px] text-gray-500 mb-2 text-center">
              Type <span className="text-red-400 font-bold">{typedConfirmWord}</span> to confirm
            </p>
            <input
              ref={inputRef}
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={`Type "${typedConfirmWord}"`}
              className={`input-field text-center text-sm tracking-widest uppercase ${
                typedValue && !isTypedValid ? 'border-red-500/30 text-red-400' : ''
              } ${isTypedValid ? 'border-neon/30 text-neon' : ''}`}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={(typedConfirm && !isTypedValid) || loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              danger
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40'
                : 'bg-neon/10 text-neon border border-neon/30 hover:bg-neon/20 disabled:opacity-40'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-secondary text-sm"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
