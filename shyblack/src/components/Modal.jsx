import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function Modal({ open, onClose, title, children }) {
  const { t } = useTranslation()
  const overlayRef = useRef()
  const dialogRef = useRef()
  const previousFocus = useRef()
  const mountedRef = useRef(false)
  const effectCountRef = useRef(0)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && open) onClose()
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [open, onClose])

  useEffect(() => {
    effectCountRef.current++
    if (!mountedRef.current) {
      mountedRef.current = true
      console.log(`[DIAG:Bug#3] Modal MOUNTED (first render only)`)
    }
    console.log(`[DIAG:Bug#3] Modal useEffect RUN #${effectCountRef.current}: open=${open}, handleKeyDown ref changed: ${effectCountRef.current > 1 ? 'YES (onClose/handleKeyDown new reference!)' : 'initial mount'}`)
    const activeBefore = document.activeElement
    if (activeBefore) {
      console.log(`[DIAG:Bug#3] Active element BEFORE effect: ${activeBefore.tagName}${activeBefore.id ? '#' + activeBefore.id : ''}${activeBefore.getAttribute('name') ? '[name=' + activeBefore.getAttribute('name') + ']' : ''}`)
    }

    if (open) {
      previousFocus.current = document.activeElement
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        if (dialogRef.current) {
          const first = dialogRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
          if (first) {
            const activeAfter = document.activeElement
            if (activeAfter && activeAfter !== first) {
              console.log(`[DIAG:Bug#3:FOCUS STEAL] rAF stealing focus from ${activeAfter.tagName} to ${first.tagName}`)
              console.log(`[DIAG:Bug#3:FOCUS STEAL] This causes Android keyboard to CLOSE`)
              console.log(`[DIAG:Bug#3:FOCUS STEAL] Effect run #${effectCountRef.current}`)
            }
            first.focus()
          }
        }
      })
    } else {
      document.body.style.overflow = ''
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus()
      }
    }
    return () => {
      console.log(`[DIAG:Bug#3] Modal useEffect CLEANUP #${effectCountRef.current}`)
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div ref={dialogRef} className="glass-brand p-5 w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
