import { useState, useMemo, useCallback} from 'react'
import {
  ArrowLeft, Shield, Download, Upload, Trash2, RefreshCw,
  XCircle, AlertTriangle, Clock, 
  FileText, Lock, RotateCcw, 
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import ConfirmationModal from '../components/ConfirmationModal'
import { getBackupGenerations, deleteBackup, clearAllBackups, BACKUP_TYPES } from '../utils/backup'
import { createManualBackup, createEmergencyBackup, verifyBackup, restoreBackup, performRollback, getBackupHealth, getAutoSnapshots, deleteAutoSnapshot, restoreAutoSnapshot, getBackupDashboardStats } from '../utils/backupManager'


const BACKUP_TYPE_LABELS = {
  [BACKUP_TYPES.MANUAL]: 'Manual',
  [BACKUP_TYPES.SCHEDULED]: 'Scheduled',
  [BACKUP_TYPES.EMERGENCY]: 'Emergency',
  [BACKUP_TYPES.PRE_IMPORT]: 'Pre-Import',
  [BACKUP_TYPES.PRE_MIGRATION]: 'Pre-Migration',
}

const TAB_LABELS = ['Backups', 'Snapshots', 'Health']

const MODULES = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'debts', label: 'Debts' },
  { id: 'savingsGoal', label: 'Savings Goal' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'emis', label: 'EMIs' },
  { id: 'goals', label: 'Goals' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'budgetsV2', label: 'Budgets V2' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'wealthAssets', label: 'Wealth' },
  { id: 'documents', label: 'Documents' },
]

export default function RecoveryCenterPage({ onNavigate }) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState(0)
  const [backups, setBackups] = useState(() => getBackupGenerations())
  const [snapshots, setSnapshots] = useState(() => getAutoSnapshots())
  const [health, setHealth] = useState(() => getBackupHealth())
  const [loading, setLoading] = useState(null)
  const [verifyResult, setVerifyResult] = useState(null)
  const [selectedModules, setSelectedModules] = useState([])
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [showModuleSelect, setShowModuleSelect] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [snapshotRestoreTarget, setSnapshotRestoreTarget] = useState(null)

  const refresh = useCallback(() => {
    setBackups(getBackupGenerations())
    setSnapshots(getAutoSnapshots())
    setHealth(getBackupHealth())
  }, [])

  const handleCreateBackup = useCallback(async () => {
    setLoading('Creating backup...')
    try {
      await createManualBackup()
      addToast('Backup created', 'success')
      refresh()
    } catch { addToast('Backup failed', 'error') }
    setLoading(null)
  }, [addToast, refresh])

  const handleEmergencyBackup = useCallback(async () => {
    setLoading('Creating emergency backup...')
    try {
      await createEmergencyBackup()
      addToast('Emergency backup saved', 'success')
      refresh()
    } catch { addToast('Emergency backup failed', 'error') }
    setLoading(null)
  }, [addToast, refresh])

  const handleVerify = useCallback(async (id) => {
    setVerifyResult({ id, loading: true })
    const result = await verifyBackup(id)
    setVerifyResult({ id, ...result, loading: false })
    if (result.valid) addToast('Backup verified', 'success')
    else addToast('Backup corrupt', 'error')
  }, [addToast])

  const handleRestore = useCallback(() => {
    if (!restoreTarget) return
    const modules = selectedModules.length > 0 ? selectedModules : undefined
    const result = restoreBackup(restoreTarget, modules)
    if (result.success) {
      addToast(`Restored ${result.result.restored.length} modules`, 'success')
      refresh()
    } else {
      addToast(result.error || 'Restore failed', 'error')
    }
    setRestoreTarget(null)
    setSelectedModules([])
  }, [restoreTarget, selectedModules, addToast, refresh])

  const handleRollback = useCallback(() => {
    const result = performRollback()
    if (result.success) {
      addToast('Rolled back to previous state', 'success')
      refresh()
    } else {
      addToast(result.error || 'Rollback failed', 'error')
    }
  }, [addToast, refresh])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteBackup(deleteTarget)
    addToast('Backup deleted', 'success')
    setDeleteTarget(null)
    refresh()
  }, [deleteTarget, addToast, refresh])

  const handleClearAll = useCallback(() => {
    clearAllBackups()
    addToast('All backups cleared', 'success')
    refresh()
  }, [addToast, refresh])

  const handleSnapshotRestore = useCallback(() => {
    if (!snapshotRestoreTarget) return
    const result = restoreAutoSnapshot(snapshotRestoreTarget)
    if (result.success) {
      addToast('Snapshot restored', 'success')
      refresh()
    } else {
      addToast(result.error || 'Snapshot restore failed', 'error')
    }
    setSnapshotRestoreTarget(null)
  }, [snapshotRestoreTarget, addToast, refresh])

  const stats = useMemo(() => getBackupDashboardStats(), [])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate?.('dashboard')} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t('backup.title')}</h1>
          <p className="text-xs text-gray-500">{t('backup.protect_data')}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleCreateBackup}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neon text-matte text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
        >
          <Download size={14} />
          {loading || t('backup.backup_now')}
        </button>
        <button
          onClick={handleEmergencyBackup}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          <AlertTriangle size={14} />
          {t('backup.emergency')}
        </button>
        {backups.length > 1 && (
          <button onClick={handleRollback} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all">
            <RotateCcw size={14} />
            {t('backup.rollback')}
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none">
        {TAB_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === i ? 'bg-neon/10 text-neon' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div>
          {backups.length === 0 ? (
            <EmptyState icon={Shield} title={t('backup.no_backups_title')} description={t('backup.no_backups_desc')} />
          ) : (
            <div className="space-y-2">
              {backups.map((b) => {
                const date = new Date(b.createdAt)
                const daysAgo = Math.floor((Date.now() - b.createdAt) / 86400000)
                return (
                  <GlassCard key={b.id} className="!p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        {b.encrypted ? <Lock size={14} className="text-green-400" /> : <FileText size={14} className="text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white">
                            {BACKUP_TYPE_LABELS[b.type] || b.type}
                          </p>
                          {b.encrypted && <Lock size={10} className="text-green-400" />}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           {' · '}{daysAgo === 0 ? t('time.today') : t('time.days_ago', { count: daysAgo })}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {t('backup.modules_count', { count: b.modules?.length || 0 })} · {(b.size / 1024).toFixed(1)} {t('common.kilobytes')}
                          {verifyResult?.id === b.id && !verifyResult?.loading && (
                            <span className={`ml-1 ${verifyResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                              · {verifyResult.valid ? t('backup.verified') : t('backup.corrupt')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleVerify(b.id)} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                          <Shield size={12} className="text-gray-400" />
                        </button>
                        <button onClick={() => { setRestoreTarget(b.id); setShowModuleSelect(true) }} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                          <Upload size={12} className="text-neon" />
                        </button>
                        <button onClick={() => setDeleteTarget(b.id)} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                    {verifyResult?.id === b.id && verifyResult?.loading && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <RefreshCw size={10} className="text-gray-500 animate-spin" />
                        <span className="text-[10px] text-gray-500">{t('backup.verifying')}</span>
                      </div>
                    )}
                  </GlassCard>
                )
              })}
            </div>
          )}
          {backups.length > 0 && (
            <button onClick={handleClearAll} className="w-full mt-3 py-2 rounded-xl bg-red-500/5 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors">
              {t('backup.clear_all')}
            </button>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div>
          {snapshots.length === 0 ? (
            <EmptyState icon={Clock} title={t('backup.no_snapshots_title')} description={t('backup.no_snapshots_desc')} />
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => {
                const date = new Date(s.ts)
                return (
                  <GlassCard key={s.id} className="!p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Clock size={14} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{s.label}</p>
                        <p className="text-[10px] text-gray-500">
                          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {s.data ? t('backup.storage_keys_count', { count: Object.keys(s.data).length }) : t('common.no_data')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSnapshotRestoreTarget(s.id)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          <RotateCcw size={12} className="text-amber-400" />
                        </button>
                        <button
                          onClick={() => { deleteAutoSnapshot(s.id); setSnapshots(getAutoSnapshots()) }}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-3">
          <GlassCard className="!p-4">
            <div className="text-center mb-3">
              <p className={`text-4xl font-extrabold ${health.score >= 75 ? 'text-neon' : health.score >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                {health.score}
              </p>
              <p className="text-lg font-bold text-white">{health.grade}</p>
              <p className="text-[10px] text-gray-500">{t('backup.health_score')}</p>
              <p className="text-xs text-gray-400 mt-1">{health.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{health.backupCount || 0}</p>
                <p className="text-[10px] text-gray-500">{t('backup.backups_label')}</p>
              </div>
              <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                <p className={`text-lg font-bold ${health.daysSince <= 7 ? 'text-green-400' : health.daysSince <= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {health.daysSince !== null ? `${health.daysSince}d` : '-'}
                </p>
                <p className="text-[10px] text-gray-500">Since Last</p>
              </div>
              <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{stats.totalSize > 0 ? `${(stats.totalSize / 1024).toFixed(0)}KB` : '-'}</p>
                <p className="text-[10px] text-gray-500">Total Size</p>
              </div>
              <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                <p className={`text-lg font-bold ${health.status === 'excellent' || health.status === 'good' ? 'text-neon' : 'text-yellow-400'}`}>
                  {health.status === 'excellent' || health.status === 'good' ? 'Ready' : 'Review'}
                </p>
                <p className="text-[10px] text-gray-500">Readiness</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="!p-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Recommendations</p>
            {health.backupCount === 0 && <p className="text-xs text-red-400">Create your first backup immediately</p>}
            {health.backupCount > 0 && health.daysSince > 7 && <p className="text-xs text-yellow-400">Backup is {health.daysSince} days old — create a fresh one</p>}
            {health.backupCount < 3 && <p className="text-xs text-yellow-400">Aim for at least 3 backup generations</p>}
            {health.backupCount >= 10 && <p className="text-xs text-green-400">Maximum backup generations reached</p>}
            {health.status === 'excellent' && <p className="text-xs text-green-400">All backup systems operational</p>}
          </GlassCard>
        </div>
      )}

      {showModuleSelect && restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-matte rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Select Modules to Restore</h2>
              <button onClick={() => { setShowModuleSelect(false); setRestoreTarget(null) }} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Choose which data modules to restore. Leave all unchecked for full restore.</p>
            <div className="space-y-1.5 mb-4">
              {MODULES.map((m) => (
                <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(m.id)}
                    onChange={() => {
                      setSelectedModules((prev) =>
                        prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                      )
                    }}
                    className="accent-neon"
                  />
                  <span className="text-xs text-gray-300">{m.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleRestore}
              className="w-full py-2.5 rounded-xl bg-neon text-matte font-bold text-sm hover:brightness-110 transition-all"
            >
              {selectedModules.length > 0 ? `Restore ${selectedModules.length} Modules` : 'Full Restore'}
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmationModal
          title="Delete Backup"
          description="Delete this backup permanently?"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {snapshotRestoreTarget && (
        <ConfirmationModal
          title="Restore Snapshot"
          description="Restore data from this snapshot? Current data will be overwritten."
          confirmLabel="Restore"
          onConfirm={handleSnapshotRestore}
          onCancel={() => setSnapshotRestoreTarget(null)}
        />
      )}
    </div>
  )
}
