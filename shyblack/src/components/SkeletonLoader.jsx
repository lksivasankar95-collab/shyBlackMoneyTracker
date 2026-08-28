import { memo } from 'react'

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-text w-1/3 mb-2" />
      <div className="skeleton-text w-2/3" />
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton-text w-1/2" />
        <div className="skeleton-text w-1/3" />
      </div>
    </div>
  )
}

function SkeletonStat() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="skeleton-text w-1/4" />
      <div className="skeleton-text w-1/2 h-4" />
      <div className="skeleton-text w-1/3" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="h-48 w-full rounded-xl skeleton" />
  )
}

function SkeletonCustom({ className }) {
  return <div className={`skeleton ${className || ''}`} />
}

const renderers = {
  card: SkeletonCard,
  list: SkeletonList,
  stat: SkeletonStat,
  chart: SkeletonChart,
  custom: SkeletonCustom,
}

const SkeletonLoader = memo(function SkeletonLoader({ variant = 'card', count = 1, className }) {
  const Renderer = renderers[variant] || renderers.card
  return (
    <div className="animate-fade-in" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={variant === 'list' && i < count - 1 ? 'border-b border-glass-border' : ''}>
          <Renderer className={className} />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
})

export default SkeletonLoader
