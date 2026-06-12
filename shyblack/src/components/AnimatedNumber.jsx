import { useState, useEffect, useRef } from 'react'

export default function AnimatedNumber({ value, format = (v) => v, duration = 600 }) {
  const [display, setDisplay] = useState(0)
  const startTime = useRef(null)
  const startValue = useRef(0)

  useEffect(() => {
    startValue.current = display
    startTime.current = null
    const target = value
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue.current + (target - startValue.current) * eased
      setDisplay(Math.round(current))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{format(display)}</span>
}
