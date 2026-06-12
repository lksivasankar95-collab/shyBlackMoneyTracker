import { memo } from 'react'

const GlassCard = memo(function GlassCard({ children, className = '', glow = false }) {
  return (
    <div className={`glass p-4 ${glow ? 'glow-sm' : ''} ${className}`}>
      {children}
    </div>
  )
})

export default GlassCard
