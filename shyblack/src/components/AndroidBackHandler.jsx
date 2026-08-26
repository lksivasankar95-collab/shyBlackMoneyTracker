import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function AndroidBackHandler({ canGoBack, onGoBack }) {
  const { t } = useTranslation()
  const lastBackTime = useRef(-Infinity)
  const [showExitHint, setShowExitHint] = useState(false)
  const canGoBackRef = useRef(canGoBack)
  const onGoBackRef = useRef(onGoBack)
  useEffect(() => { canGoBackRef.current = canGoBack }, [canGoBack])
  useEffect(() => { onGoBackRef.current = onGoBack }, [onGoBack])

  useEffect(() => {
    let cancelled = false
    let handler
    let toastTimer

    App.addListener('backButton', () => {
      if (cancelled) return

      if (canGoBackRef.current) {
        onGoBackRef.current()
      } else {
        const now = Date.now()
        const elapsed = now - lastBackTime.current
        // Require at least 400ms between presses to ignore duplicate events from
        // Android gesture navigation, while still allowing intentional double-press.
        if (elapsed >= 400 && elapsed < 2000) {
          App.exitApp()
        } else {
          lastBackTime.current = now
          setShowExitHint(true)
          clearTimeout(toastTimer)
          toastTimer = setTimeout(() => setShowExitHint(false), 2000)
        }
      }
    }).then(h => {
      if (cancelled) {
        h.remove()
      } else {
        handler = h
      }
    }).catch(() => {})

    return () => {
      cancelled = true
      clearTimeout(toastTimer)
      setShowExitHint(false)
      if (handler) handler.remove()
    }
  }, [])

  if (!showExitHint) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-glass-border bg-glass backdrop-blur-xl shadow-lg">
        <AlertCircle size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-400">{t('app.press_back_exit')}</span>
      </div>
    </div>
  )
}
