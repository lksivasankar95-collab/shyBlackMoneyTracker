import { useMemo } from 'react'
import { Terminal, Database, ShieldCheck, RefreshCw, Users, Repeat2, Tag, X } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import GlassCard from '../components/GlassCard'

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[11px] font-medium ${mono ? 'font-mono text-neon' : 'text-gray-200'}`}>{value ?? '—'}</span>
    </div>
  )
}

export default function DiagnosticsPage({ onNavigate }) {
  const { transactions, recurring, debts, budgets, tags, security } = useFinance()

  const storageInfo = useMemo(() => safeStorage.getStorageInfo(), [])
  const schemaVersion = getSchemaVersion()
  const onboarding = useMemo(() => safeStorage.get(STORAGE_KEYS.ONBOARDING, {}), [])
  const streak = useMemo(() => safeStorage.get(STORAGE_KEYS.STREAK, {}), [])
  const budgetNotif = useMemo(() => safeStorage.get(STORAGE_KEYS.BUDGET_NOTIF, {}), [])

  const txByType = useMemo(() => ({
    income: transactions.filter((t) => t.type === 'income').length,
    expense: transactions.filter((t) => t.type === 'expense').length,
  }), [transactions])

  const recurringActive = recurring.filter((r) => r.active !== false).length

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Terminal size={18} className="text-neon" />
        </div>
        <div>
          <h1 className="text-base font-bold">Dev Diagnostics</h1>
          <p className="text-[10px] text-gray-600">Internal — not visible to users</p>
        </div>
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="ml-auto p-2 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Database size={13} className="text-neon" />
          <span className="text-xs font-semibold">Storage</span>
        </div>
        <Row label="Used" value={`${storageInfo.usedKB} KB`} mono />
        <Row label="Raw bytes" value={storageInfo.usedBytes.toLocaleString()} mono />
        <Row label="Keys tracked" value={storageInfo.keyCount} mono />
        <Row label="Schema (current)" value={`v${schemaVersion}`} mono />
        <Row label="Schema (target)" value={`v${APP_SCHEMA_VERSION}`} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw size={13} className="text-blue-400" />
          <span className="text-xs font-semibold">Transactions</span>
        </div>
        <Row label="Total" value={transactions.length} mono />
        <Row label="Income" value={txByType.income} mono />
        <Row label="Expense" value={txByType.expense} mono />
        <Row label="Oldest date" value={transactions.length > 0 ? transactions[transactions.length - 1].date : null} mono />
        <Row label="Newest date" value={transactions.length > 0 ? transactions[0].date : null} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Repeat2 size={13} className="text-purple-400" />
          <span className="text-xs font-semibold">Recurring / Debts / Tags</span>
        </div>
        <Row label="Recurring total" value={recurring.length} mono />
        <Row label="Recurring active" value={recurringActive} mono />
        <Row label="Debts total" value={debts.length} mono />
        <Row label="Debts pending" value={debts.filter((d) => d.status === 'pending').length} mono />
        <Row label="Tags" value={tags.length} mono />
        <Row label="Budget categories" value={Object.keys(budgets).length} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={13} className="text-yellow-400" />
          <span className="text-xs font-semibold">Security & Privacy</span>
        </div>
        <Row label="PIN set" value={security.pinHash ? 'Yes' : 'No'} mono />
        <Row label="Hide balance" value={security.hideBalance ? 'On' : 'Off'} mono />
        <Row label="Privacy mode" value={security.privacyMode ? 'On' : 'Off'} mono />
        <Row label="Auto-lock timeout" value={`${security.lockTimeout ?? 0}s`} mono />
        <Row label="Fail count" value={security.failCount ?? 0} mono />
        <Row label="Requires reset" value={security.requiresReset ? 'Yes' : 'No'} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Users size={13} className="text-orange-400" />
          <span className="text-xs font-semibold">Onboarding & Streaks</span>
        </div>
        <Row label="Name" value={onboarding.name || '—'} />
        <Row label="Currency" value={onboarding.currency || '—'} mono />
        <Row label="Completed" value={onboarding.hasCompletedOnboarding ? 'Yes' : 'No'} mono />
        <Row label="Streak milestone" value={streak.milestone ? `${streak.milestone} days` : 'None'} mono />
        <Row label="Streak date" value={streak.date ?? null} mono />
        <Row label="Budget notif keys" value={Object.keys(budgetNotif).length} mono />
      </GlassCard>

      <p className="text-[10px] text-gray-700 text-center mt-2">
        Tap logo 5× on any screen to open · Not shown in production builds
      </p>
    </div>
  )
}
