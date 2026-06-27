import { useState, useRef, useCallback, lazy, Suspense, useEffect } from 'react'
import { FinanceProvider } from './context/FinanceContext'
import { ToastProvider } from './components/Toast'
import { I18nProvider } from './i18n'
import BrandHeader from './components/BrandHeader'
import BottomNav from './components/BottomNav'
import AndroidBackHandler from './components/AndroidBackHandler'
import ErrorBoundary from './components/ErrorBoundary'
import PageErrorBoundary from './components/PageErrorBoundary'
import { safeStorage, STORAGE_KEYS } from './utils/safeStorage'
import Onboarding from './pages/Onboarding'
import { refreshReminderSchedule, getReminderPreference, checkAndScheduleMonthlyRecap, checkDebtReminders } from './utils/reminders'
import { registerNotificationListeners } from './utils/notifications'
import { useFinance } from './hooks/useFinance'
import * as privacy from './utils/privacy'
import PinLockScreen from './components/PinLockScreen'
import QuickActionCenter from './components/QuickActionCenter'
import ScrollRestoration from './components/ScrollRestoration'
import { App as CapApp } from '@capacitor/app'

const DEBUG = import.meta.env.DEV
const debug = (msg, data) => {
  if (DEBUG) console.log(`[App] ${msg}`, data !== undefined ? data : '')
}

const onboardingDone = () => {
  const data = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
  debug('onboardingDone', { hasCompletedOnboarding: data && data.hasCompletedOnboarding === true })
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
const DiagnosticsPage = lazy(() => import('./pages/DiagnosticsPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'))
const FinancialCalendar = lazy(() => import('./pages/FinancialCalendarPage'))
const EmiCenter = lazy(() => import('./pages/EmiCenterPage'))
const NetWorthPage = lazy(() => import('./pages/NetWorthPage'))
const FinancialHealthPage = lazy(() => import('./pages/FinancialHealthPage'))
const StatementExportPage = lazy(() => import('./pages/StatementExportPage'))
const TransferPage = lazy(() => import('./pages/TransferPage'))
const CashFlowForecastPage = lazy(() => import('./pages/CashFlowForecastPage'))
const FinancialTimelinePage = lazy(() => import('./pages/FinancialTimelinePage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'))
const DocumentVaultPage = lazy(() => import('./pages/DocumentVaultPage'))
const StatementCenterPage = lazy(() => import('./pages/StatementCenterPage'))
const PersonCenterPage = lazy(() => import('./pages/PersonCenterPage'))
const AccountCenterPage = lazy(() => import('./pages/AccountCenterPage'))
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'))
const ReviewCenterPage = lazy(() => import('./pages/ReviewCenterPage'))
const TrendsPage = lazy(() => import('./pages/TrendsPage'))
const RecurringTransactionsPage = lazy(() => import('./pages/RecurringTransactionsPage'))
const BudgetCenterPage = lazy(() => import('./pages/BudgetCenterPage'))
const ReceiptCenterPage = lazy(() => import('./pages/ReceiptCenterPage'))
const WealthCenterPage = lazy(() => import('./pages/WealthCenterPage'))
const RecoveryCenterPage = lazy(() => import('./pages/RecoveryCenterPage'))
const ForecastCenterPage = lazy(() => import('./pages/ForecastCenterPage'))
const AppInfoPage = lazy(() => import('./pages/AppInfoPage'))
const PrivacyCenter = lazy(() => import('./pages/PrivacyCenter'))

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
  diagnostics: DiagnosticsPage,
  goals: GoalsPage,
  subscriptions: SubscriptionsPage,
  calendar: FinancialCalendar,
  'emi-center': EmiCenter,
  networth: NetWorthPage,
  'budget-center': BudgetCenterPage,
  'receipt-center': ReceiptCenterPage,
  'financial-health': FinancialHealthPage,
  'statement-export': StatementExportPage,
  transfers: TransferPage,
  'cash-flow-forecast': CashFlowForecastPage,
  'financial-timeline': FinancialTimelinePage,
  achievements: AchievementsPage,
  search: SearchPage,
  'category-detail': CategoryDetail,
  documents: DocumentVaultPage,
  statements: StatementCenterPage,
  people: PersonCenterPage,
  'account-center': AccountCenterPage,
  'data-quality': DataQualityPage,
  review: ReviewCenterPage,
  trends: TrendsPage,
  'recurring-transactions': RecurringTransactionsPage,
  'wealth-center': WealthCenterPage,
  'recovery-center': RecoveryCenterPage,
  'forecast-center': ForecastCenterPage,
  'app-info': AppInfoPage,
  'privacy-center': PrivacyCenter,
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
  const transactionsRef = useRef(transactions)
  const debtsRef = useRef(debts)
  useEffect(() => { transactionsRef.current = transactions }, [transactions])
  useEffect(() => { debtsRef.current = debts }, [debts])

  useEffect(() => {
    const timer = setTimeout(() => {
      const txs = transactionsRef.current
      const dts = debtsRef.current
      if (getReminderPreference()) {
        refreshReminderSchedule(txs, dts)
      }
      checkAndScheduleMonthlyRecap(txs).catch(() => {})
      checkDebtReminders(dts).catch(() => {})
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return null
}

function NotificationTapHandler({ onNavigate }) {
  useEffect(() => {
    const cleanup = registerNotificationListeners((deepLink, extra) => {
      if (deepLink && pages[deepLink]) {
        onNavigate(deepLink)
      }
    })
    return cleanup
  }, [onNavigate])

  return null
}

function LockGate({ isLocked, onUnlock }) {
  const { clearAllData } = useFinance()

  if (!isLocked) return null

  debug('LockGate: showing PinLockScreen')

  return (
    <PinLockScreen
      onUnlock={onUnlock}
      onResetData={() => {
        debug('LockGate: reset all data requested')
        clearAllData()
        privacy.clearPin()
        onUnlock()
      }}
    />
  )
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
    window.scrollTo({ top: 0, behavior: 'instant' })
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
  const pageKey = currentPage
  const Page = pages[pageKey]
  const showHeader = currentPage === 'dashboard' || navPages.includes(currentPage)

  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && (
        <div className="sticky top-0 z-40 bg-matte/80 backdrop-blur-xl border-b border-glass-border">
          <div className="max-w-lg mx-auto px-4">
            <BrandHeader compact onSecretTap={() => handleNavigate('diagnostics')} />
          </div>
        </div>
      )}
      <AndroidBackHandler canGoBack={canGoBack} onGoBack={handleGoBack} />
      <ScrollRestoration pageKey={currentPage} />
      <Suspense fallback={<PageLoader />}>
        <div className={`flex-1 ${animDir === 'forward' ? 'animate-slide-up' : 'animate-fade-in'}`} key={currentPage}>
          <PageErrorBoundary page={currentPage} onNavigate={handleNavigate}>
            <Page onNavigate={handleNavigate} currentPage={currentPage} />
          </PageErrorBoundary>
        </div>
      </Suspense>
      {navPages.includes(currentPage) && (
        <BottomNav active={currentPage} onNavigate={handleNavigate} />
      )}
      <QuickActionCenter onNavigate={handleNavigate} />
      <NotificationTapHandler onNavigate={handleNavigate} />
    </div>
  )
}

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(() => {
    const done = onboardingDone()
    debug('isOnboarded initial', done)
    return done
  })
  const [isLocked, setIsLocked] = useState(() => {
    debug('initializing privacy state')
    privacy.initLockState()
    const locked = privacy.isLocked()
    debug('isLocked initial', locked)
    return locked
  })

  const handleOnboardingComplete = useCallback(() => {
    debug('onboarding complete')
    setIsOnboarded(true)
  }, [])

  const sessionStarted = useRef(false)

  const handleUnlock = useCallback(() => {
    debug('handleUnlock called')
    sessionStarted.current = true
    privacy.unlockSession()
    setIsLocked(false)
    debug('session unlocked')
  }, [])

  const isLockedRef = useRef(isLocked)
  useEffect(() => { isLockedRef.current = isLocked }, [isLocked])
  const resumeHandled = useRef(false)

  useEffect(() => {
    debug('visibility effect mounted')
    console.log('[DIAG:Bug#1] visibility effect mounted - adding resume listeners')

    const handleResume = () => {
      if (resumeHandled.current) {
        console.log('[DIAG:Bug#1] handleResume SKIPPED - resumeHandled guard active')
        return
      }
      if (!sessionStarted.current) {
        console.log('[DIAG:Bug#1] handleResume SKIPPED - cold start, initLockState already set lock correctly')
        resumeHandled.current = true
        setTimeout(() => { resumeHandled.current = false }, 200)
        return
      }
      resumeHandled.current = true
      setTimeout(() => { resumeHandled.current = false }, 200)
      const shouldLock = privacy.shouldLockOnResume()
      console.log(`[DIAG:Bug#1] handleResume: shouldLockOnResume()=${shouldLock}, isLockedRef=${isLockedRef.current}, timeout=${privacy.getTimeout()}, isPinSet=${privacy.isPinSet()}`)
      debug('shouldLockOnResume result', shouldLock)
      if (shouldLock !== isLockedRef.current) {
        console.log(`[DIAG:Bug#1] CHANGING isLocked: ${isLockedRef.current} → ${shouldLock}`)
        debug('updating isLocked to', shouldLock)
        setIsLocked(shouldLock)
      } else {
        console.log('[DIAG:Bug#1] isLocked unchanged')
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        console.log('[DIAG:Bug#1] visibilitychange: app backgrounded')
        debug('app backgrounded (visibilitychange)')
        privacy.onAppBackground()
      } else {
        console.log('[DIAG:Bug#1] visibilitychange: app resumed')
        debug('app resumed (visibilitychange)')
        handleResume()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    let capListener = null
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('[DIAG:Bug#1] Capacitor appStateChange: resumed')
        debug('app resumed (Capacitor)')
        handleResume()
      } else {
        console.log('[DIAG:Bug#1] Capacitor appStateChange: backgrounded')
        debug('app backgrounded (Capacitor)')
        privacy.onAppBackground()
      }
    }).then(l => { capListener = l }).catch(() => {})

    return () => {
      console.log('[DIAG:Bug#1] visibility effect CLEANUP')
      debug('visibility effect cleanup')
      document.removeEventListener('visibilitychange', handleVisibility)
      if (capListener) capListener.remove()
    }
  }, [])

  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <FinanceProvider>
          <ToastProvider>
            <LockGate isLocked={isLocked} onUnlock={handleUnlock} />
            {!isLocked && (
              <>
                <ReminderInit />
                <AppContent />
              </>
            )}
          </ToastProvider>
        </FinanceProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}
