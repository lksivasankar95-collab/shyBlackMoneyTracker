import { useEffect, useRef } from 'react'

const SCROLL_POSITIONS = new Map()

export default function ScrollRestoration({ pageKey }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const saved = SCROLL_POSITIONS.get(pageKey)
    if (saved && containerRef.current) {
      requestAnimationFrame(() => {
        window.scrollTo(0, saved)
      })
    }
  }, [pageKey])

  useEffect(() => {
    const handleScroll = () => {
      SCROLL_POSITIONS.set(pageKey, window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pageKey])

  return null
}
