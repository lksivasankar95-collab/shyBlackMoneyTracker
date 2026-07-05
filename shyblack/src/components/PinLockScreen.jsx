import { useState, useRef, useEffect, useCallback } from 'react'
import { Lock, AlertTriangle, Clock, Fingerprint } from 'lucide-react'
import * as privacy from '../utils/privacy'
import { hapticSuccess } from '../utils/haptics'
import { tryBiometricUnlock, checkBiometricAvailability, isBiometricEnabled } from '../utils/biometrics'
import { useTranslation } from '../i18n'

export default function PinLockScreen({ onUnlock, onResetData }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [requiresReset, setRequiresReset] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioAttempted, setBioAttempted] = useState(false)
  const inputRef = useRef(null)
  const cooldownTimer = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const { cooldownRemaining, requiresReset: locked } = privacy.getFailState()
    if (locked) {
      setRequiresReset(true)
      setError(t('pin_lock.too_many_attempts'))
    } else if (cooldownRemaining > 0) {
      startCooldown(cooldownRemaining)
    }
  }, [t])

  useEffect(() => {
    if (isBiometricEnabled()) {
      checkBiometricAvailability().then((r) => setBioAvailable(r.available))
    }
    if (isBiometricEnabled() && !bioAttempted && !requiresReset && cooldown === 0) {
      setBioAttempted(true)
      tryBiometricUnlock().then((result) => {
        if (result.unlocked) {
          hapticSuccess()
          onUnlock()
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bioAvailable && !bioAttempted && !requiresReset && cooldown === 0) {
      // bioAvailable just became true — retry biometric unlock
      setBioAttempted(true)
      tryBiometricUnlock().then((result) => {
        if (result.unlocked) {
          hapticSuccess()
          onUnlock()
        }
      })
    }
  }, [bioAvailable, bioAttempted, requiresReset, cooldown, onUnlock])

  const handleBiometricUnlock = useCallback(async () => {
    const result = await tryBiometricUnlock()
    if (result.unlocked) {
      hapticSuccess()
      onUnlock()
    } else if (result.reason === 'failed') {
      setError(t('pin_lock.biometric_failed'))
    }
  }, [onUnlock, t])

  function startCooldown(seconds) {
    setCooldown(seconds)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current)
          setError('')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current) }, [])

  const handleDigit = useCallback((d) => {
    if (pin.length >= 4 || cooldown > 0 || requiresReset) return
    setPin((prev) => prev + d)
    setError('')
  }, [pin, cooldown, requiresReset])

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }, [])

  const handleUnlock = useCallback(() => {
    if (pin.length < 4 || cooldown > 0 || requiresReset) return
    privacy.verifyPin(pin).then((ok) => {
      if (ok) {
        hapticSuccess()
        onUnlock()
      } else {
        setPin('')
        const { cooldownRemaining, requiresReset: locked, failCount } = privacy.getFailState()
        if (locked) {
          setRequiresReset(true)
          setError(t('pin_lock.too_many_attempts'))
        } else if (cooldownRemaining > 0) {
          startCooldown(cooldownRemaining)
          setError(t('pin_lock.wait_cooldown', { count: cooldownRemaining }))
        } else {
          const remaining = 5 - failCount
          setError(remaining > 0 ? t('pin_lock.wrong_pin_with_count', { count: remaining }) : t('pin_lock.wrong_pin'))
        }
      }
    }).catch(() => {
      setError(t('pin_lock.unlock_failed'))
      setPin('')
    })
  }, [pin, cooldown, requiresReset, onUnlock, t])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleUnlock()
  }, [handleUnlock])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const isBlocked = cooldown > 0 || requiresReset

  return (
    <div className="fixed inset-0 z-50 bg-matte flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center mb-5">
        <Lock size={28} className="text-neon" />
      </div>

      <h1 className="text-lg font-bold text-white mb-1">FINORA</h1>
      <p className="text-xs text-gray-500 font-medium mb-8">{t('pin_lock.enter_pin_prompt')}</p>

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

      {cooldown > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Clock size={14} className="text-yellow-400" />
          <p className="text-xs text-yellow-400 font-medium">{t('pin_lock.try_again_cooldown', { count: cooldown })}</p>
        </div>
      )}

      {error && !cooldown && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 mb-4">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8 max-w-[220px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={isBlocked}
            className="w-14 h-14 rounded-2xl bg-white/[0.04] text-white text-xl font-bold hover:bg-white/[0.08] active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit(0)}
          disabled={isBlocked}
          className="w-14 h-14 rounded-2xl bg-white/[0.04] text-white text-xl font-bold hover:bg-white/[0.08] active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
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
        disabled={pin.length < 4 || isBlocked}
        className="btn-primary w-full max-w-[220px] text-sm flex items-center justify-center gap-2"
      >
        <Lock size={14} />
        {t('pin_lock.unlock')}
      </button>

      {(bioAvailable || isBiometricEnabled()) && (
        <button
          onClick={handleBiometricUnlock}
          className="mt-4 w-full max-w-[220px] py-2.5 rounded-xl border border-glass-border text-gray-400 text-sm font-medium hover:text-white hover:border-neon/30 transition-all flex items-center justify-center gap-2"
        >
          <Fingerprint size={16} />
          {t('pin_lock.use_fingerprint')}
        </button>
      )}

      {!showForgot ? (
        <button
          onClick={() => setShowForgot(true)}
          className="text-xs text-gray-600 hover:text-gray-400 mt-6 transition-colors"
        >
          {t('pin_lock.forgot_pin')}
        </button>
      ) : (
        <div className="mt-6 text-center max-w-[260px]">
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            {t('pin_lock.forgot_pin_desc')}
          </p>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
            >
              {t('pin_lock.reset_all_data')}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-400 font-medium">{t('pin_lock.confirm_reset_warning')}</p>
              <button
                onClick={onResetData}
                className="text-xs px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
              >
                {t('pin_lock.confirm_reset')}
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="text-xs text-gray-500 block mx-auto mt-1 hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
