import { useState } from 'react'
import { FinanceProvider } from './context/FinanceContext'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

const pages = {
  dashboard: Dashboard,
  add: AddTransaction,
  history: History,
  analytics: Analytics,
  settings: Settings,
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const Page = pages[currentPage]

  return (
    <div className="min-h-screen">
      <Page
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />
      <BottomNav
        active={currentPage}
        onNavigate={setCurrentPage}
      />
    </div>
  )
}

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  )
}
