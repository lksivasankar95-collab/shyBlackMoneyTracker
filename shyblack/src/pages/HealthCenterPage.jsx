import { useState, useMemo, useCallback } from 'react'
import {
  ShieldCheck, ArrowLeft, Download, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Activity, Database,
  Clock, ChevronRight,
} from 'lucide-react'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import { getBackupGenerations, getBackupHealthScore, deleteBackup } from '../utils/backup'
import { getBackupHealth, getBackupStats } from '../utils/backupHealth'
import { validateAllModules } from '../utils/dataValidator'
import { exportBackup } from '../utils/backup'
import { formatBackupFileSize } from '../utils/backupMetadata'

function ago(ts) {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function HealthCenterPage({ onNavigate }) {
  const { addToast } = useToast()
  const [backups, setBackups] = useState(() => getBackupGenerations())
  const [validation, setValidation] = useState(() => validateAllModules())
  const [exporting, setExporting] = useState(false)

  const health = useMemo(() => getBackupHealth(), [])
  const stats = useMemo(() => getBackupStats(), [])
  const score = useMemo(() => getBackupHealthScore(backups), [backups])

  const refresh = useCallback(() => {
    setBackups(getBackupGenerations())
    setValidation(validateAllModules())
  }, [])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const result = await exportBackup()
      if (result.success) {
        if (result.shared) {
          addToast('Backup exported and shared', 'success')
        } else {
          const reason = result.shareError ? `: ${result.shareError}` : ''
          addToast(`Backup saved to device (share unavailable${reason})`, 'warning')
        }
      } else {
        addToast(result.error || 'Export failed', 'error')
      }
    } catch (err) {
      addToast(err.message || 'Export error', 'error')
    }
    setExporting(false)
  }, [addToast])

  const handleDeleteBackup = useCallback((id) => {
    deleteBackup(id)
    setBackups(getBackupGenerations())
    addToast('Backup deleted', 'info')
  }, [addToast])

  const scoreColor = score.status === 'excellent' || score.status === 'good' ? 'text-neon' : 'text-amber-400'
  const scoreBg = score.status === 'excellent' || score.status === 'good' ? 'bg-neon/10' : 'bg-amber-500/10'

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center hover:bg-neon/10 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} className="text-gray-400" />
        </button>
        <h1 className="text-xl font-bold">Backup Health Center</h1>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-2xl mb-4 border" style={{ borderColor: health.status === 'good' ? 'rgba(0,255,136,0.2)' : 'rgba(251,191,36,0.2)', backgroundColor: health.status === 'good' ? 'rgba(0,255,136,0.05)' : 'rgba(251,191,36,0.05)' }}>
        <div className={`w-10 h-10 rounded-xl ${scoreBg} flex items-center justify-center`}>
          <ShieldCheck size={20} className={scoreColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-extrabold ${scoreColor}`}>{score.grade}</span>
            <span className="text-xs text-gray-400">{score.message}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {health.status === 'good' ? '✓ ' : ''}{health.message}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${scoreColor}`}>{score.score}</p>
          <p className="text-[10px] text-gray-600">/ 100</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <GlassCard className="!p-3">
          <Database size={14} className="text-neon mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{stats.totalExports + stats.totalEncryptedExports}</p>
          <p className="text-[10px] text-gray-500">Total Backups</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <Activity size={14} className="text-neon mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{backups.length}</p>
          <p className="text-[10px] text-gray-500">Generations</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <Clock size={14} className="text-neon mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{score.daysSince !== null ? score.daysSince : '—'}</p>
          <p className="text-[10px] text-gray-500">Days Since</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <ArrowLeft size={14} className="text-neon mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{stats.totalRestores}</p>
          <p className="text-[10px] text-gray-500">Restores</p>
        </GlassCard>
      </div>

      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-neon" />
          <h2 className="text-xs font-semibold">Data Validation</h2>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${validation.valid ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'}`}>
            {validation.valid ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {validation.valid ? 'All modules valid' : `${validation.errors} errors`}
          </div>
          {validation.warnings > 0 && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertTriangle size={10} /> {validation.warnings} warnings
            </span>
          )}
        </div>
        {validation.issues.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {validation.issues.slice(0, 10).map((issue, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                {issue.severity === 'error' ? (
                  <XCircle size={10} className="text-red-400 mt-0.5 shrink-0" />
                ) : issue.severity === 'warning' ? (
                  <AlertTriangle size={10} className="text-amber-400 mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={10} className="text-gray-600 mt-0.5 shrink-0" />
                )}
                <span className="text-[10px] text-gray-400">{issue.message}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={refresh} className="mt-2 text-[10px] text-neon/70 hover:text-neon flex items-center gap-1">
          <RefreshCw size={10} /> Re-validate
        </button>
      </GlassCard>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary flex-1 text-xs flex items-center justify-center gap-2"
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export Backup'}
        </button>
        <button
          onClick={() => onNavigate('recovery-center')}
          className="btn-secondary flex-1 text-xs flex items-center justify-center gap-2"
        >
          <Activity size={14} />
          Recovery Center
        </button>
      </div>

      <h2 className="text-xs font-semibold text-gray-300 mb-2.5 flex items-center gap-1.5">
        <Clock size={12} className="text-neon" />
        Backup Generations ({backups.length})
      </h2>

      {backups.length === 0 ? (
        <GlassCard className="!p-6 text-center">
          <Database size={20} className="text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No backup generations yet</p>
          <p className="text-[10px] text-gray-600 mt-1">Backups created via Settings or Recovery Center appear here</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {backups.slice(0, 15).map((b) => (
            <GlassCard key={b.id} className="!p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${b.encrypted ? 'bg-purple-400' : 'bg-neon'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {b.type === 'manual' ? 'Manual' : b.type === 'emergency' ? 'Emergency' : b.type === 'scheduled' ? 'Scheduled' : b.type || 'Backup'}
                      {b.encrypted ? ' (Encrypted)' : ''}
                    </p>
                    <p className="text-[10px] text-gray-500">{ago(b.createdAt)} · {formatBackupFileSize(b.size || 0)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBackup(b.id)}
                  className="text-[10px] text-red-400/60 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
        >
          <Database size={16} className="text-gray-400" />
          <div className="flex-1 text-left">
            <p className="text-xs font-medium">Backup Settings</p>
            <p className="text-[10px] text-gray-500">Export, import, encrypted backup</p>
          </div>
          <ChevronRight size={14} className="text-gray-500" />
        </button>
      </div>
    </div>
  )
}
