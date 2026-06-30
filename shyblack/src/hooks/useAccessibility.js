import { useEffect, useCallback, useRef, useState } from 'react'

export function useKeyboardNavigation(handler, key = 'Enter') {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === key) {
        handler(e)
      }
    },
    [handler, key]
  )
  return handleKeyDown
}

export function useAnnouncement(message) {
  const [announce, setAnnounce] = useState('')

  useEffect(() => {
    if (message) {
      setAnnounce(message)
      const timer = setTimeout(() => setAnnounce(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const AnnouncementElement = announce ? (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announce}
    </div>
  ) : null

  return AnnouncementElement
}

export function useFocusTrap(ref, active = true) {
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!active || !ref.current) return

    previousFocusRef.current = document.activeElement

    const trapElement = ref.current
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function getFocusableElements() {
      return Array.from(trapElement.querySelectorAll(focusableSelector))
    }

    function focusFirstElement() {
      const elements = getFocusableElements()
      if (elements.length > 0) {
        elements[0].focus()
      }
    }

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return
      const elements = getFocusableElements()
      if (elements.length === 0) return

      const firstElement = elements[0]
      const lastElement = elements[elements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    focusFirstElement()
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus()
      }
    }
  }, [ref, active])
}
