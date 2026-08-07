import { useState, useEffect, useRef } from 'react'
import { useFinance } from '../hooks/useFinance'
import * as privacy from '../utils/privacy'
import { App as CapApp } from '@capacitor/app'

export default function PrivacyGuard() {
  const { security } = useFinance()
  const privacyMode = !!security?.privacyMode
  const [backgrounded, setBackgrounded] = useState(() => privacy.isBackgrounded())

  const pending = useRef(null)

  useEffect(() => {
    const handleVisibility = () => setBackgrounded(document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)

    let capListener = null
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (pending.current) clearTimeout(pending.current)
      pending.current = setTimeout(() => setBackgrounded(!isActive), 100)
    }).then((l) => { capListener = l }).catch(() => {})

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (pending.current) clearTimeout(pending.current)
      if (capListener) capListener.remove()
    }
  }, [])

  const pinSet = privacy.isPinSet()
  const shouldBlur = backgrounded && privacy.shouldBlurOnBackground({ privacyMode, pinSet })

  return (
    <div
      className={`privacy-overlay ${shouldBlur ? 'active' : ''}`}
      data-testid="privacy-guard"
    />
  )
}