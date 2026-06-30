import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, AlertTriangle, RotateCcw, X } from 'lucide-react'
import { useTranslation } from '../i18n'

const ToastContext = createContext()

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
  warning: AlertTriangle,
}

const colors = {
  success: 'border-neon/30 text-neon bg-neon/5',
  error: 'border-red-500/30 text-red-400 bg-red-500/5',
  info: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
  warning: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
}

function ToastItem({ toast, onRemove, onUndo }) {
  const [progress, setProgress] = useState(100)
  const startTimeRef = useRef(Date.now())
  const duration = toast.duration || 3000

  useEffect(() => {
    if (duration <= 0) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [duration])

  const Icon = icons[toast.type] || AlertCircle

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-[toastSlideIn_0.3s_ease-out] ${colors[toast.type] || colors.info} relative overflow-hidden`}
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action.onClick?.()
            onRemove(toast.id)
          }}
          className="shrink-0 px-2 py-0.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
        >
          {toast.action.label || 'Action'}
        </button>
      )}
      {toast.undoAction && (
        <button
          onClick={() => onUndo(toast.id, toast.undoAction)}
          className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Undo"
        >
          <RotateCcw size={14} />
        </button>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors opacity-50 hover:opacity-100"
        aria-label="Close"
      >
        <X size={14} />
      </button>
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-white/30 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function ToastProvider({ children }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  const addToast = useCallback((message, type = 'success', duration = 3000, undoAction = null, action = null) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    setToasts((prev) => [...prev, { id, message, type, duration, undoAction, action }])
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const handleUndo = useCallback((id, undoAction) => {
    if (undoAction) undoAction()
    removeToast(id)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} onUndo={handleUndo} />
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(100%) translateY(-10px); }
          to { opacity: 1; transform: translateX(0) translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
