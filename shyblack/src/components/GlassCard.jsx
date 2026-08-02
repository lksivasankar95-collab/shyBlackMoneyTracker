import { memo } from 'react'

const GlassCard = memo(function GlassCard({ children, className = '', glow = false, hover = false, brand = false, onClick, role, ariaLabel }) {
  const clickable = onClick ? true : false
  const hoverClass = hover && !clickable ? 'hover:bg-glass-hover' : ''
  const clickClass = clickable ? 'cursor-pointer glass-card-clickable active:scale-[0.985] transition-transform duration-100' : ''

  const Component = clickable ? 'button' : 'div'

  if (brand) {
    return (
      <Component
        className={`glass-brand p-4 ${hover ? 'hover:border-neon/30 hover:shadow-brand transition-all duration-300' : ''} ${clickClass} ${className}`}
        onClick={onClick}
        role={role || (clickable ? 'button' : undefined)}
        aria-label={ariaLabel}
        tabIndex={clickable ? 0 : undefined}
      >
        {children}
      </Component>
    )
  }

  return (
    <Component
      className={`glass p-4 ${glow ? 'shadow-brand-sm' : ''} ${hoverClass} ${clickClass} ${className}`}
      onClick={onClick}
      role={role || (clickable ? 'button' : undefined)}
      aria-label={ariaLabel}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </Component>
  )
})

export default GlassCard
