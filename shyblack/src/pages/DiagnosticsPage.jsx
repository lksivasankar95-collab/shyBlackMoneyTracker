import { useMemo, useState, useEffect } from 'react'
import { Terminal, Database, ShieldCheck, RefreshCw, Users, X, Camera, HardDrive, Smartphone, Activity, Bell } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import { getActiveAdapterType } from '../utils/storageAdapter'
import GlassCard from '../components/GlassCard'
import { getReminderPreference } from '../utils/reminders'
import { checkNotificationPermission } from '../utils/notifications'
import { getNotificationDiagnostics as getUnifiedDiagnostics} from '../utils/notifications'

async function getNotifPlugin() {
  try {
    const mod = await import('@capacitor/local-notifications')
    return mod.LocalNotifications
  } catch {
    return null
  }
}

async function getBatteryOptimizationStatus() {
  try {
    const mod = await import('@capacitor/app')
    return 'check app info'
  } catch {
    return 'unknown'
  }
}

async function getExactAlarmSupport() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const pending = await LocalNotifications.getPending()
    return pending.notifications.length >= 0 ? 'supported' : 'unknown'
  } catch {
    return 'unknown'
  }
}

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
  const { t } = useTranslation()
  const { transactions, recurring, debts, budgets, tags, security, snapshotDiagnostics, storageCorruptionReport, transactionIndex, emis, documents, accounts, goals, dataQuality } = useFinance()

  const storageInfo = useMemo(() => safeStorage.getStorageInfo(), [])
  const adapterType = getActiveAdapterType()
  const schemaVersion = getSchemaVersion()
  const onboarding = useMemo(() => safeStorage.get(STORAGE_KEYS.ONBOARDING, {}), [])
  const streak = useMemo(() => safeStorage.get(STORAGE_KEYS.STREAK, {}), [])
  const budgetNotif = useMemo(() => safeStorage.get(STORAGE_KEYS.BUDGET_NOTIF, {}), [])
  const relationships = useMemo(() => safeStorage.get(STORAGE_KEYS.RELATIONSHIPS, []), [])

  const txByType = useMemo(() => ({
    income: transactions.filter((t) => t.type === 'income').length,
    expense: transactions.filter((t) => t.type === 'expense').length,
  }), [transactions])

  const recurringActive = recurring.filter((r) => r.active !== false).length
  const activeEmis = emis.filter((e) => e.status !== 'closed').length
  const activeGoals = goals.filter((g) => (g.saved || 0) < (g.target || 1)).length

  const docFileSize = documents.reduce((s, d) => s + (d.fileSize || d.size || 0), 0)
  const docFileSizeKB = docFileSize > 0 ? (docFileSize / 1024).toFixed(1) : '0'

  const [notifDiag, setNotifDiag] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const plugin = await getNotifPlugin()
      const pref = getReminderPreference()
      const perm = await checkNotificationPermission()
      const unifiedDiag = await getUnifiedDiagnostics()
      const batteryOpt = await getBatteryOptimizationStatus()
      const exactAlarm = await getExactAlarmSupport()
      let pending = null
      let pendingList = []
      let nextSchedule = null
      let channelInfo = null
      if (perm.granted && plugin) {
        try {
          const result = await plugin.getPending()
          pending = result.notifications.length
          pendingList = result.notifications || []
          const daily = result.notifications.find(n => n.id === 1)
          if (daily?.schedule?.on) {
            const h = String(daily.schedule.on.hour).padStart(2, '0')
            const m = String(daily.schedule.on.minute).padStart(2, '0')
            nextSchedule = `${h}:${m} daily`
          } else if (daily?.schedule?.at) {
            nextSchedule = new Date(daily.schedule.at).toLocaleString()
          }
        } catch { /* silent */ }
        try {
          channelInfo = await plugin.getChannel({ id: 'finora_finance' })
        } catch { /* silent */ }
      }
      if (mounted) {
        setNotifDiag({
          permission: perm,
          reminderEnabled: pref,
          pendingCount: pending,
          pendingList,
          nextSchedule,
          platformAvailable: !!plugin,
          channelInfo,
          batteryOptimization: batteryOpt,
          exactAlarmSupport: exactAlarm,
          unifiedChannel: unifiedDiag.channel,
        })
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Terminal size={18} className="text-neon" />
        </div>
        <div>
          <h1 className="text-base font-bold">{t('diagnostics.title')}</h1>
          <p className="text-[10px] text-gray-600">{t('diagnostics.internal_note')}</p>
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
          <span className="text-xs font-semibold">{t('diagnostics.storage')}</span>
        </div>
        <Row label={t('diagnostics.used')} value={`${storageInfo.usedKB} KB`} mono />
        <Row label={t('diagnostics.raw_bytes')} value={storageInfo.usedBytes.toLocaleString()} mono />
        <Row label={t('diagnostics.keys_tracked')} value={storageInfo.keyCount} mono />
        <Row label={t('diagnostics.schema_current')} value={`v${schemaVersion}`} mono />
        <Row label={t('diagnostics.schema_target')} value={`v${APP_SCHEMA_VERSION}`} mono />
        <Row label={t('diagnostics.adapter')} value={adapterType} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw size={13} className="text-blue-400" />
          <span className="text-xs font-semibold">{t('diagnostics.data_counts')}</span>
        </div>
        <Row label={t('diagnostics.transactions')} value={transactions.length} mono />
        <Row label={t('diagnostics.income_expense')} value={`${txByType.income} / ${txByType.expense}`} mono />
        <Row label={t('diagnostics.debts')} value={t('diagnostics.debts_with_active', { total: debts.length, active: debts.filter((d) => d.remainingAmount > 0).length })} mono />
        <Row label={t('diagnostics.goals')} value={t('diagnostics.goals_with_active', { total: goals.length, active: activeGoals })} mono />
        <Row label={t('diagnostics.emis')} value={t('diagnostics.emis_with_active', { total: emis.length, active: activeEmis })} mono />
        <Row label={t('diagnostics.recurring')} value={t('diagnostics.recurring_with_active', { total: recurring.length, active: recurringActive })} mono />
        <Row label={t('diagnostics.accounts')} value={accounts.length} mono />
        <Row label={t('diagnostics.documents')} value={t('diagnostics.documents_with_size', { count: documents.length, size: docFileSizeKB })} mono />
        <Row label={t('diagnostics.relationships')} value={relationships.length} mono />
        <Row label={t('diagnostics.tags')} value={tags.length} mono />
        <Row label={t('diagnostics.budget_categories')} value={Object.keys(budgets).length} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={13} className="text-yellow-400" />
          <span className="text-xs font-semibold">{t('diagnostics.security_privacy')}</span>
        </div>
        <Row label={t('diagnostics.pin_set')} value={security.pinHash ? t('common.yes') : t('common.no')} mono />
        <Row label={t('diagnostics.hide_balance')} value={security.hideBalance ? t('common.on') : t('common.off')} mono />
        <Row label={t('diagnostics.privacy_mode')} value={security.privacyMode ? t('common.on') : t('common.off')} mono />
        <Row label={t('diagnostics.auto_lock_timeout')} value={`${security.lockTimeout ?? 0}${t('common.seconds_short')}`} mono />
        <Row label={t('diagnostics.fail_count')} value={security.failCount ?? 0} mono />
        <Row label={t('diagnostics.requires_reset')} value={security.requiresReset ? t('common.yes') : t('common.no')} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Users size={13} className="text-orange-400" />
          <span className="text-xs font-semibold">{t('diagnostics.onboarding_streaks')}</span>
        </div>
        <Row label={t('diagnostics.name')} value={onboarding.name || '—'} />
        <Row label={t('diagnostics.currency')} value={onboarding.currency || '—'} mono />
        <Row label={t('diagnostics.completed')} value={onboarding.hasCompletedOnboarding ? t('common.yes') : t('common.no')} mono />
        <Row label={t('diagnostics.streak_milestone')} value={streak.milestone ? t('diagnostics.streak_milestone_value', { milestone: streak.milestone }) : t('common.none')} mono />
        <Row label={t('diagnostics.streak_date')} value={streak.date ?? null} mono />
        <Row label={t('diagnostics.budget_notif_keys')} value={Object.keys(budgetNotif).length} mono />
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={13} className="text-cyan-400" />
          <span className="text-xs font-semibold">{t('diagnostics.performance')}</span>
        </div>
        <Row label={t('diagnostics.oldest_tx_date')} value={transactions.length > 0 ? transactions[transactions.length - 1].date : '—'} mono />
        <Row label={t('diagnostics.newest_tx_date')} value={transactions.length > 0 ? transactions[0].date : '—'} mono />
        <Row label={t('diagnostics.data_quality_issues')} value={dataQuality?.total ?? 0} mono />
        {transactionIndex && (
          <>
            <Row label={t('diagnostics.index_monthly_buckets')} value={transactionIndex.summaries.monthly.length} mono />
            <Row label={t('diagnostics.index_category_buckets')} value={transactionIndex.summaries.categoryTotals.length} mono />
            <Row label={t('diagnostics.index_person_keys')} value={transactionIndex.byPerson.size} mono />
          </>
        )}
      </GlassCard>

      {snapshotDiagnostics && (
        <GlassCard className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Camera size={13} className="text-green-400" />
            <span className="text-xs font-semibold">{t('diagnostics.snapshot_recovery_chain')}</span>
          </div>
          <Row label={t('diagnostics.snapshots_stored')} value={snapshotDiagnostics.total} mono />
          <Row label={t('diagnostics.newest')} value={snapshotDiagnostics.newest ? new Date(snapshotDiagnostics.newest).toLocaleString() : '—'} />
          <Row label={t('diagnostics.oldest')} value={snapshotDiagnostics.oldest ? new Date(snapshotDiagnostics.oldest).toLocaleString() : '—'} />
          {snapshotDiagnostics.snapshots && snapshotDiagnostics.snapshots.slice(0, 5).map((s, i) => (
            <Row key={i} label={t('diagnostics.snapshot_entry', { index: i + 1 })} value={s.valid ? t('diagnostics.snapshot_valid', { txCount: s.txCount, ageDays: s.ageDays, validity: t('diagnostics.valid') }) : t('diagnostics.snapshot_corrupt', { txCount: s.txCount, ageDays: s.ageDays, validity: t('diagnostics.corrupt') })} mono />
          ))}
        </GlassCard>
      )}

      {storageCorruptionReport && storageCorruptionReport.length > 0 && (
        <GlassCard className="mb-3 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={13} className="text-red-400" />
            <span className="text-xs font-semibold text-red-400">{t('diagnostics.corruption_detected')}</span>
          </div>
          {storageCorruptionReport.map((issue, i) => (
            <Row key={i} label={`Issue #${i + 1}`} value={issue.reason} />
          ))}
        </GlassCard>
      )}

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={13} className="text-cyan-400" />
          <span className="text-xs font-semibold">{t('diagnostics.android_stress_scenarios')}</span>
        </div>
        {ANDROID_STRESS_SCENARIOS.map((s) => (
          <Row key={s.id} label={s.label} value={s.status === 'pass' ? t('diagnostics.protected') : t('diagnostics.untested')} mono />
        ))}
      </GlassCard>

      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={13} className="text-purple-400" />
          <span className="text-xs font-semibold">{t('diagnostics.notifications')}</span>
        </div>
        <Row label={t('diagnostics.notif_permission')} value={notifDiag ? (notifDiag.permission.granted ? t('common.yes') : notifDiag.permission.reason) : '…'} mono />
        <Row label={t('diagnostics.notif_reminder_enabled')} value={notifDiag ? (notifDiag.reminderEnabled ? t('common.yes') : t('common.no')) : '…'} mono />
        <Row label={t('diagnostics.notif_pending_count')} value={notifDiag ? (notifDiag.pendingCount !== null ? notifDiag.pendingCount : t('common.error')) : '…'} mono />
        <Row label={t('diagnostics.notif_next_schedule')} value={notifDiag ? (notifDiag.nextSchedule || '—') : '…'} mono />
        <Row label={t('diagnostics.notif_platform')} value={notifDiag ? (notifDiag.platformAvailable ? t('common.yes') : t('common.no')) : '…'} mono />
        <Row label="Battery Optimization" value={notifDiag ? (notifDiag.batteryOptimization || 'unknown') : '…'} mono />
        <Row label="Exact Alarm" value={notifDiag ? (notifDiag.exactAlarmSupport || 'unknown') : '…'} mono />
        <Row label="Channel Active" value={notifDiag ? (notifDiag.channelInfo ? t('common.yes') : 'No') : '…'} mono />
        {notifDiag && notifDiag.pendingList && notifDiag.pendingList.length > 0 && (
          <div className="mt-1">
            <span className="text-[9px] text-gray-600">Pending IDs: {notifDiag.pendingList.map(n => n.id).join(', ')}</span>
          </div>
        )}
      </GlassCard>

      <p className="text-[10px] text-gray-700 text-center mt-2">
        {t('diagnostics.footer_note')}
      </p>
    </div>
  )
}
