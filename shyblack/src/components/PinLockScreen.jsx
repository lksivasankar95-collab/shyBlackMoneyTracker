import { useState, useRef, useEffect, useCallback } from 'react'
import { Lock, AlertTriangle } from 'lucide-react'
import * as privacy from '../utils/privacy'

export default function PinLockScreen({ onUnlock, onResetData }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleDigit = useCallback((d) => {
    if (pin.length >= 4) return
    setPin((prev) => prev + d)
    setError('')
  }, [pin])

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }, [])

  const handleUnlock = useCallback(() => {
    if (pin.length < 4) {
      setError('Enter 4-digit PIN')
      return
    }
    try {
      privacy.verifyPin(pin).then((ok) => {
        if (ok) {
          onUnlock()
        } else {
          setError('Incorrect PIN')
          setPin('')
        }
      }).catch(() => {
        setError('Unlock failed. Try again.')
        setPin('')
      })
    } catch {
      setError('Unlock failed. Try again.')
      setPin('')
    }
  }, [pin, onUnlock])

  const handleReset = useCallback(() => {
    onResetData()
  }, [onResetData])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleUnlock()
  }, [handleUnlock])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 z-50 bg-matte flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center mb-5">
        <Lock size={28} className="text-neon" />
      </div>

      <h1 className="text-lg font-bold text-white mb-1">ShyBlack</h1>
      <p className="text-xs text-gray-500 font-medium mb-8">Enter PIN to unlock</p>

      {/* PIN Dots */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              pin.length > i
                ? 'border-neon bg-neon shadow-sm shadow-neon/40'
                : 'border-gray-600 bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 mb-4">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 mb-8 max-w-[220px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="w-14 h-14 rounded-2xl bg-white/[0.04] text-white text-xl font-bold hover:bg-white/[0.08] active:scale-95 transition-all duration-150"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit(0)}
          className="w-14 h-14 rounded-2xl bg-white/[0.04] text-white text-xl font-bold hover:bg-white/[0.08] active:scale-95 transition-all duration-150"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-14 h-14 rounded-2xl text-gray-500 text-sm font-medium hover:text-white active:scale-95 transition-all duration-150"
        >
          DEL
        </button>
      </div>

      <button
        onClick={handleUnlock}
        disabled={pin.length < 4}
        className="btn-primary w-full max-w-[220px] text-sm flex items-center justify-center gap-2"
      >
        <Lock size={14} />
        Unlock
      </button>

      {/* Forgot PIN */}
      {!showForgot ? (
        <button
          onClick={() => setShowForgot(true)}
          className="text-xs text-gray-600 hover:text-gray-400 mt-6 transition-colors"
        >
          Forgot PIN?
        </button>
      ) : (
        <div className="mt-6 text-center max-w-[260px]">
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            ShyBlack stores all data offline. There is no way to recover a forgotten PIN.
          </p>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
            >
              Reset All App Data
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-400 font-medium">This will permanently delete all your data.</p>
              <button
                onClick={handleReset}
                className="text-xs px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="text-xs text-gray-500 block mx-auto mt-1 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
