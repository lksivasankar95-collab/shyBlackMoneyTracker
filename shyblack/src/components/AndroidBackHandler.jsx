import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import { AlertCircle } from 'lucide-react'

export default function AndroidBackHandler({ canGoBack, onGoBack }) {
  const lastBackTime = useRef(0)
  const [showExitHint, setShowExitHint] = useState(false)

  useEffect(() => {
    let cancelled = false
    let handler
    let toastTimer

    App.addListener('backButton', () => {
      if (cancelled) return

      if (canGoBack) {
        onGoBack()
      } else {
        const now = Date.now()
        if (now - lastBackTime.current > 0 && now - lastBackTime.current < 2000) {
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
  }, [canGoBack, onGoBack])

  if (!showExitHint) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-glass-border bg-glass backdrop-blur-xl shadow-lg">
        <AlertCircle size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-400">Press back again to exit</span>
      </div>
    </div>
  )
}
