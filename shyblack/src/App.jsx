import { useState, useRef, useCallback, lazy, Suspense, useEffect } from 'react'
import { FinanceProvider } from './context/FinanceContext'
import { ToastProvider } from './components/Toast'
import BrandHeader from './components/BrandHeader'
import BottomNav from './components/BottomNav'
import AndroidBackHandler from './components/AndroidBackHandler'
import ErrorBoundary from './components/ErrorBoundary'
import { safeStorage, STORAGE_KEYS } from './utils/safeStorage'
import Onboarding from './pages/Onboarding'
import { refreshReminderSchedule, getReminderPreference } from './utils/reminders'
import { useFinance } from './hooks/useFinance'

const onboardingDone = () => {
  const data = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
  return data && data.hasCompletedOnboarding === true
}

const Dashboard = lazy(() => import('./pages/Dashboard'))
const AddTransaction = lazy(() => import('./pages/AddTransaction'))
const History = lazy(() => import('./pages/History'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Settings = lazy(() => import('./pages/Settings'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const DebtsPage = lazy(() => import('./pages/DebtsPage'))
const TimelinePage = lazy(() => import('./pages/TimelinePage'))

const pages = {
  dashboard: Dashboard,
  add: AddTransaction,
  history: History,
  analytics: Analytics,
  settings: Settings,
  insights: InsightsPage,
  budgets: BudgetsPage,
  reports: ReportsPage,
  debts: DebtsPage,
  timeline: TimelinePage,
}

const navPages = ['dashboard', 'add', 'history', 'analytics', 'settings']

function PageLoader() {
  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="space-y-4">
        <div className="h-8 w-48 bg-matte-200 rounded-lg animate-pulse" />
        <div className="h-16 bg-matte-200 rounded-2xl animate-pulse" />
        <div className="flex gap-3">
          <div className="flex-1 h-24 bg-matte-200 rounded-2xl animate-pulse" />
          <div className="flex-1 h-24 bg-matte-200 rounded-2xl animate-pulse" />
        </div>
        <div className="h-48 bg-matte-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

function ReminderInit() {
  const { transactions, debts } = useFinance()

  useEffect(() => {
    if (!getReminderPreference()) return
    const timer = setTimeout(() => {
      refreshReminderSchedule(transactions, debts)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return null
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [animDir, setAnimDir] = useState('forward')
  const [history, setHistory] = useState(['dashboard'])
  const prevPage = useRef(currentPage)

  const handleNavigate = useCallback((page) => {
    const prevIdx = navPages.indexOf(prevPage.current)
    const nextIdx = navPages.indexOf(page)
    const isNavChange = prevIdx >= 0 && nextIdx >= 0
    setAnimDir(isNavChange && nextIdx >= prevIdx ? 'forward' : 'backward')
    prevPage.current = page
    setHistory(prev => prev[prev.length - 1] !== page ? [...prev, page] : prev)
    setCurrentPage(page)
  }, [])

  const handleGoBack = useCallback(() => {
    const newHistory = history.slice(0, -1)
    if (newHistory.length < 1) return

    const targetPage = newHistory[newHistory.length - 1]
    const pIdx = navPages.indexOf(prevPage.current)
    const nIdx = navPages.indexOf(targetPage)
    setAnimDir(pIdx >= 0 && nIdx >= 0 && nIdx <= pIdx ? 'backward' : 'forward')
    prevPage.current = targetPage
    setHistory(newHistory)
    setCurrentPage(targetPage)
  }, [history])

  const canGoBack = history.length > 1
  const Page = pages[currentPage]
  const showHeader = currentPage === 'dashboard' || navPages.includes(currentPage)

  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && (
        <div className="sticky top-0 z-40 bg-matte/80 backdrop-blur-xl border-b border-glass-border">
          <div className="max-w-lg mx-auto px-4">
            <BrandHeader compact />
          </div>
        </div>
      )}
      <AndroidBackHandler canGoBack={canGoBack} onGoBack={handleGoBack} />
      <Suspense fallback={<PageLoader />}>
        <div className={`flex-1 ${animDir === 'forward' ? 'animate-slide-up' : 'animate-fade-in'}`} key={currentPage}>
          <Page onNavigate={handleNavigate} currentPage={currentPage} />
        </div>
      </Suspense>
      {navPages.includes(currentPage) && (
        <BottomNav active={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(onboardingDone)

  const handleOnboardingComplete = useCallback(() => {
    setIsOnboarded(true)
  }, [])

  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <ErrorBoundary>
      <FinanceProvider>
        <ToastProvider>
          <ReminderInit />
          <AppContent />
        </ToastProvider>
      </FinanceProvider>
    </ErrorBoundary>
  )
}
