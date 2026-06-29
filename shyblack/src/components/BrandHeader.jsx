import { memo, useCallback, useRef } from 'react'
import logoSrc from '../assets/logo.png'

const SECRET_TAPS = 5
const TAP_WINDOW_MS = 3000

const BrandHeader = memo(function BrandHeader({ compact, onSecretTap }) {
  const tapCount = useRef(0)
  const tapTimer = useRef(null)

  const handleLogoPress = useCallback(() => {
    if (!onSecretTap) return
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    if (tapCount.current >= SECRET_TAPS) {
      tapCount.current = 0
      onSecretTap()
      return
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, TAP_WINDOW_MS)
  }, [onSecretTap])

  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'py-2' : 'py-3'}`}>
      <div className="relative shrink-0" onClick={handleLogoPress}>
        <div className="absolute inset-0 rounded-full bg-neon/10 blur-sm" />
        <img
          src={logoSrc}
          alt="FINORA"
          width={compact ? 28 : 32}
          height={compact ? 28 : 32}
          className={`object-contain relative ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}
          style={{ filter: 'brightness(1.15) contrast(1.15) drop-shadow(0 0 6px rgba(57,255,20,0.2))' }}
        />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-extrabold tracking-tight text-white ${compact ? 'text-sm' : 'text-base'}`}>
          FINORA
        </span>
        <span className={`text-neon font-semibold tracking-wider ${compact ? 'text-[10px]' : 'text-xs'}`}>
          SMART FINANCE
        </span>
      </div>
    </div>
  )
})

export default BrandHeader
