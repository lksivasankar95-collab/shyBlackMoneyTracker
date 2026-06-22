import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, AlertCircle, RotateCcw, X } from 'lucide-react'
import { useTranslation } from '../i18n'

const ToastContext = createContext()

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
}

const colors = {
  success: 'border-neon/30 text-neon bg-neon/5',
  error: 'border-red-500/30 text-red-400 bg-red-500/5',
  info: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
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

  const addToast = useCallback((message, type = 'success', duration = 3000, undoAction = null) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    setToasts((prev) => [...prev, { id, message, type, undoAction }])
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
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${colors[toast.type]}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-sm font-medium flex-1">{toast.message}</span>
              {toast.undoAction && (
                <button
                  onClick={() => handleUndo(toast.id, toast.undoAction)}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors"
                  aria-label={t('common.undo')}
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors opacity-50 hover:opacity-100"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
