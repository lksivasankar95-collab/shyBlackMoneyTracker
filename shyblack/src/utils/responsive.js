export function getResponsiveClass(base, sm, md, lg) {
  const parts = [base]
  if (sm) parts.push(`sm:${sm}`)
  if (md) parts.push(`md:${md}`)
  if (lg) parts.push(`lg:${lg}`)
  return parts.join(' ')
}

export function isTablet() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches
}

export function isMobile() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

export function isDesktop() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(min-width: 1024px)').matches
}

export function getTouchTargetSize() {
  if (typeof window === 'undefined') return 44
  const hasCoarse = window.matchMedia('(pointer: coarse)').matches
  return hasCoarse ? 48 : 44
}

export function useResponsive() {
  if (typeof window === 'undefined') {
    return { isMobile: true, isTablet: false, isDesktop: false }
  }
  return {
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
  }
}
