import { Component } from 'react'
import { AlertTriangle, RefreshCw, Trash2, Shield } from 'lucide-react'

const BRAND_GRADIENT = 'bg-gradient-to-br from-[#39ff14]/5 via-transparent to-[#39ff14]/5'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, isResetting: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    if (typeof window !== 'undefined') {
      try {
        const diagnostics = {
          type: error.name,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }
        const crashLog = JSON.parse(sessionStorage.getItem('shyblack_crash_log') || '[]')
        crashLog.push(diagnostics)
        if (crashLog.length > 5) crashLog.shift()
        sessionStorage.setItem('shyblack_crash_log', JSON.stringify(crashLog))
      } catch {}
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleResetData = () => {
    this.setState({ isResetting: true })
    try {
      const keysToPreserve = []
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('shyblack_')) {
          if (keysToPreserve.includes(key)) continue
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => {
        try { localStorage.removeItem(k) } catch {}
      })
      sessionStorage.removeItem('shyblack_crash_log')
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`min-h-screen bg-matte flex items-center justify-center p-4 ${BRAND_GRADIENT}`}>
          <div className="w-full max-w-sm animate-fade-in">
            <div className="glass-brand p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-400" />
              </div>

              <h1 className="text-lg font-bold text-white mb-1">Something went wrong</h1>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-[260px] mx-auto">
                ShyBlack encountered an unexpected error. Your data is safe and no information has been lost.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={this.handleReload}
                  disabled={this.state.isResetting}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} className={this.state.isResetting ? 'animate-spin' : ''} />
                  Reload App
                </button>

                <button
                  onClick={this.handleResetData}
                  disabled={this.state.isResetting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                    bg-red-500/10 text-red-400 border border-red-500/30
                    hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Reset Local Data
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-glass-border">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Shield size={12} className="text-neon" />
                  <span className="text-[10px] text-neon font-medium">Encrypted Offline Storage</span>
                </div>
                <p className="text-[9px] text-gray-600">
                  Error code: {this.state.error?.name || 'UNKNOWN'} · Auto-recovery active
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
