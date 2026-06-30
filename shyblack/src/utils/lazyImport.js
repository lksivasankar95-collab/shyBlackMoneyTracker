import { lazy, Suspense } from 'react'

export function lazyImport(fn) {
  const Component = lazy(fn)
  return Component
}

export function withSuspense(Component, fallback = null) {
  return function SuspensedComponent(props) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}

export function createLazyPage(importFn, LoadingFallback = null) {
  const LazyPage = lazy(importFn)
  return withSuspense(LazyPage, LoadingFallback)
}
