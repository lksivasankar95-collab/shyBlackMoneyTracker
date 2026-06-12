import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  const overlayRef = useRef()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="glass-strong p-5 w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
