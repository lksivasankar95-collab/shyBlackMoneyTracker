import { useState, useRef, useCallback, lazy, Suspense } from 'react'
import { FinanceProvider } from './context/FinanceContext'
import { ToastProvider } from './components/Toast'
import BrandHeader from './components/BrandHeader'
import BottomNav from './components/BottomNav'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const AddTransaction = lazy(() => import('./pages/AddTransaction'))
const History = lazy(() => import('./pages/History'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Settings = lazy(() => import('./pages/Settings'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))

const pages = {
  dashboard: Dashboard,
  add: AddTransaction,
  history: History,
  analytics: Analytics,
  settings: Settings,
  insights: InsightsPage,
  budgets: BudgetsPage,
  reports: ReportsPage,
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

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [animDir, setAnimDir] = useState('forward')
  const prevPage = useRef(currentPage)

  const handleNavigate = useCallback((page) => {
    const prevIdx = navPages.indexOf(prevPage.current)
    const nextIdx = navPages.indexOf(page)
    const isNavChange = prevIdx >= 0 && nextIdx >= 0
    setAnimDir(isNavChange && nextIdx >= prevIdx ? 'forward' : 'backward')
    prevPage.current = page
    setCurrentPage(page)
  }, [])

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
  return (
    <FinanceProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </FinanceProvider>
  )
}
