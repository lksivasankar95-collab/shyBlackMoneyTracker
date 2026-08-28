import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import i18n from 'i18next'

export default class PageErrorBoundary extends Component {
  state = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' }
  }

  componentDidCatch(error, _errorInfo) {
    try {
      const log = JSON.parse(sessionStorage.getItem('finora_crash_log') || '[]')
      log.push({
        page: this.props.page || 'unknown',
        type: error?.name,
        message: error?.message,
        ts: new Date().toISOString(),
      })
      if (log.length > 10) log.shift()
      sessionStorage.setItem('finora_crash_log', JSON.stringify(log))
    } catch { /* silent */ }
  }

  componentDidUpdate(prevProps) {
    // Reset when the page route changes so the new page gets a clean boundary
    if (prevProps.page !== this.props.page && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <div className="mt-8 p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-400 mb-1">{i18n.t('error_page.section_crashed')}</p>
              <p className="text-[11px] text-gray-500 mb-3 break-words">{this.state.errorMessage}</p>
              <button
                onClick={() => this.props.onNavigate?.('dashboard')}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-300 border border-glass-border rounded-lg px-3 py-2 hover:bg-white/[0.05] transition-colors"
              >
                <RotateCcw size={12} />
                {i18n.t('error_page.go_to_dashboard')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
