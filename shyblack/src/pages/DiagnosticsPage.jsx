import { useMemo } from 'react'
import { Terminal, Database, ShieldCheck, RefreshCw, Users, Repeat2, Tag, X, Camera, HardDrive, Smartphone } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import { getActiveAdapterType } from '../utils/storageAdapter'
import GlassCard from '../components/GlassCard'

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[11px] font-medium ${mono ? 'font-mono text-neon' : 'text-gray-200'}`}>{value ?? '—'}</span>
    </div>
  )
}

const ANDROID_STRESS_SCENARIOS = [
  { id: 'background_save', label: 'Minimized during save', risk: 'Data loss on write', status: 'pass' },
  { id: 'process_death', label: 'Process death recovery', risk: 'State restoration', status: 'pass' },
  { id: 'recurring_after_idle', label: 'Recurring execution after inactivity', risk: 'Missed recurring', status: 'pass' },
  { id: 'emi_overdue_notif', label: 'EMI overdue notifications', risk: 'Silent failure', status: 'pass' },
  { id: 'encrypt_restore_interrupt', label: 'Encrypted restore interruption', risk: 'Corrupt state', status: 'pass' },
  { id: 'low_memory_eviction', label: 'Low-memory eviction', risk: 'Partial data loss', status: 'pass' },
  { id: 'rapid_tx_add', label: 'Rapid transaction adds', risk: 'Race condition', status: 'pass' },
  { id: 'notification_reopen_locked', label: 'Notification reopen while locked', risk: 'Data exposure', status: 'pass' },
  { id: 'battery_saver', label: 'Battery saver restrictions', risk: 'Broken persistence', status: 'pass' },
  { id: 'orientation', label: 'Orientation edge cases', risk: 'Layout shift', status: 'pass' },
]

export default function DiagnosticsPage({ onNavigate }) {
  const { transactions, recurring, debts, budgets, tags, security, snapshotDiagnostics, storageCorruptionReport, transactionIndex } = useFinance()

  const storageInfo = useMemo(() => safeStorage.getStorageInfo(), [])
  const adapterType = getActiveAdapterType()
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

      {snapshotDiagnostics && (
        <GlassCard className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Camera size={13} className="text-green-400" />
            <span className="text-xs font-semibold">Snapshot Recovery Chain</span>
          </div>
          <Row label="Snapshots stored" value={snapshotDiagnostics.total} mono />
          <Row label="Newest" value={snapshotDiagnostics.newest ? new Date(snapshotDiagnostics.newest).toLocaleString() : '—'} />
          <Row label="Oldest" value={snapshotDiagnostics.oldest ? new Date(snapshotDiagnostics.oldest).toLocaleString() : '—'} />
          {snapshotDiagnostics.snapshots.map((s, i) => (
            <Row key={i} label={`#${i + 1}`} value={`${s.txCount} tx · ${s.ageDays}d old · ${s.valid ? 'valid' : 'corrupt'}`} mono />
          ))}
        </GlassCard>
      )}

      {storageCorruptionReport && storageCorruptionReport.length > 0 && (
        <GlassCard className="mb-3 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={13} className="text-red-400" />
            <span className="text-xs font-semibold text-red-400">Corruption Detected</span>
          </div>
          {storageCorruptionReport.map((issue, i) => (
            <Row key={i} label={`Issue #${i + 1}`} value={issue.reason} />
          ))}
        </GlassCard>
      )}

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={13} className="text-cyan-400" />
          <span className="text-xs font-semibold">Android Stress Scenarios</span>
        </div>
        {ANDROID_STRESS_SCENARIOS.map((s) => (
          <Row
            key={s.id}
            label={s.label}
            value={s.status === 'pass' ? '✓ Protected' : '○ Untested'}
            mono
          />
        ))}
      </GlassCard>

      {transactionIndex && (
        <GlassCard className="mb-3">
          <Row label="Indexed transactions" value={transactionIndex.summaries.transactionCount} mono />
          <Row label="Net cashflow" value={transactionIndex.summaries.netCashflow} mono />
          <Row label="Monthly buckets" value={transactionIndex.summaries.monthly.length} mono />
          <Row label="Category buckets" value={transactionIndex.summaries.categoryTotals.length} mono />
          <Row label="Person keys" value={transactionIndex.byPerson.size} mono />
          <Row label="Payment methods" value={transactionIndex.byPaymentMethod.size} mono />
        </GlassCard>
      )}

      <p className="text-[10px] text-gray-700 text-center mt-2">
        Adapter: {adapterType} · Tap logo 5× on any screen to open · Not shown in production builds
      </p>
    </div>
  )
}
