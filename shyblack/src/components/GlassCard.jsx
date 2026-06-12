import { memo } from 'react'

const GlassCard = memo(function GlassCard({ children, className = '', glow = false, hover = false, brand = false }) {
  if (brand) {
    return (
      <div className={`glass-brand p-4 ${hover ? 'hover:border-neon/30 hover:shadow-brand transition-all duration-300' : ''} ${className}`}>
        {children}
      </div>
    )
  }
  return (
    <div className={`glass p-4 ${glow ? 'shadow-brand-sm' : ''} ${hover ? 'hover:bg-glass-hover transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  )
})

export default GlassCard
