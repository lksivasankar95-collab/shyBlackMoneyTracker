import { memo } from 'react'
import logoSrc from '../assets/logo.png'

const BrandHeader = memo(function BrandHeader({ compact }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'py-2' : 'py-3'}`}>
      <div className="relative shrink-0">
        <img
          src={logoSrc}
          alt="ShyBlack"
          width={compact ? 28 : 32}
          height={compact ? 28 : 32}
          className={`object-contain glow-neon-sm ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}
          style={{ filter: 'brightness(1.1) contrast(1.1)' }}
        />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-extrabold tracking-tight text-white ${compact ? 'text-sm' : 'text-base'}`}>
          ShyBlack
        </span>
        <span className={`text-neon font-semibold tracking-wide ${compact ? 'text-[10px]' : 'text-xs'}`}>
          FINANCE
        </span>
      </div>
    </div>
  )
})

export default BrandHeader
