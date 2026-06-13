import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Target, Download, Upload, Trash2, Shield, Lock, Eye, EyeOff,
  DollarSign, AlertTriangle, Repeat2, FileText, ChevronRight,
  Fingerprint, Handshake, History, Database, CheckCircle2, XCircle, Bell,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import SavingsProgress from '../components/SavingsProgress'
import { formatCurrency } from '../utils/helpers'
import { exportBackup, parseAndValidateBackup, restoreFromBackup } from '../utils/backup'
import { safeStorage } from '../utils/safeStorage'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import {
  getReminderPreference, setReminderPreference,
  requestNotificationPermission, checkNotificationPermission,
  refreshReminderSchedule, cancelAllReminders,
} from '../utils/reminders'

export default function Settings({ onNavigate }) {
  const {
    savingsGoal, updateSavings, clearAllData, transactions, importData,
    security, updateSecurity, recurring, debts,
  } = useFinance()
  const { addToast } = useToast()
  const [target, setTarget] = useState(String(savingsGoal.target || ''))
  const [saved, setSaved] = useState(String(savingsGoal.saved || ''))
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [pinError, setPinError] = useState('')
  const fileInputRef = useRef()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [backupSchemaWarning, setBackupSchemaWarning] = useState(null)
  const [restoreSummary, setRestoreSummary] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const schemaVersion = getSchemaVersion()
  const [reminderEnabled, setReminderEnabled] = useState(getReminderPreference())

  useEffect(() => {
    setTarget(String(savingsGoal.target || ''))
    setSaved(String(savingsGoal.saved || ''))
  }, [savingsGoal])

  const handleSavingsSave = () => {
    const t = parseFloat(target) || 0
    const s = parseFloat(saved) || 0
    updateSavings({ target: t, saved: s })
    addToast('Savings goal updated!', 'success')
  }

  const handleExport = () => {
    try {
      exportBackup()
      addToast('Backup exported successfully!', 'success')
    } catch {
      addToast('Failed to export backup. Please try again.', 'error')
    }
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = parseAndValidateBackup(ev.target.result)
      if (!result.success) {
        addToast(result.error, 'error')
        return
      }
      const backupVersion = result.data.schemaVersion
      if (backupVersion !== undefined && backupVersion !== schemaVersion) {
        setBackupSchemaWarning(
          `Backup schema v${backupVersion} differs from current v${schemaVersion}. Data will be imported as-is.`
        )
      } else {
        setBackupSchemaWarning(null)
      }
      setPendingRestore(result.data)
      setShowRestoreConfirm(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmRestore = useCallback(() => {
    if (!pendingRestore) return
    setIsRestoring(true)
    try {
      const results = restoreFromBackup(pendingRestore)
      setRestoreSummary(results)
      setPendingRestore(null)
      setShowRestoreConfirm(false)
      addToast(
        `Restored ${results.restored.length} sections${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}`,
        results.failed.length > 0 ? 'warning' : 'success'
      )
    } catch {
      addToast('Restore failed. Data may be corrupted.', 'error')
    }
    setIsRestoring(false)
  }, [pendingRestore, addToast])

  const handleResetData = useCallback(() => {
    clearAllData()
    setTarget('')
    setSaved('')
    addToast('All local data has been reset', 'info')
  }, [clearAllData, addToast])

  const hashPin = (s) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
    return Math.abs(h).toString(36)
  }

  const constantTimeEq = (a, b) => {
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return result === 0
  }

  const handleSetupPin = () => {
    if (pin.length < 4 || pin.length > 6) {
      setPinError('PIN must be 4-6 digits')
      return
    }
    if (!constantTimeEq(pin, confirmPin)) {
      setPinError('PINs do not match')
      return
    }
    updateSecurity({ pinEnabled: true, pinHash: hashPin(pin), pinCode: '' })
    setShowPinSetup(false)
    setPin('')
    setConfirmPin('')
    setPinError('')
    addToast('PIN lock enabled!', 'success')
  }

  const handleDisablePin = () => {
    updateSecurity({ pinEnabled: false, pinHash: '', pinCode: '' })
    addToast('PIN lock disabled', 'info')
  }

  const toggleHideBalance = () => {
    updateSecurity({ hideBalance: !security.hideBalance })
    addToast(security.hideBalance ? 'Balance visible' : 'Balance hidden', 'info')
  }

  const togglePrivacyMode = () => {
    updateSecurity({ privacyMode: !security.privacyMode })
    addToast(security.privacyMode ? 'Privacy mode off' : 'Privacy mode on', 'info')
  }

  const toggleReminder = useCallback(async () => {
    const newState = !reminderEnabled
    setReminderEnabled(newState)
    setReminderPreference(newState)

    if (newState) {
      const perm = await requestNotificationPermission()
      if (perm.granted) {
        const result = await refreshReminderSchedule(transactions, debts)
        if (result.active) {
          addToast('Daily reminder enabled at 7:00 PM', 'success')
        } else if (result.reason === 'activity-exists') {
          addToast('Already tracked today — reminder will activate tomorrow', 'info')
        } else {
          addToast('Reminder enabled', 'success')
        }
      } else {
        if (perm.reason === 'denied' || perm.reason === 'prompt-with-rationale') {
          addToast('Notification permission denied. Enable in Settings.', 'error')
        } else {
          addToast('Reminder preference saved', 'info')
        }
      }
    } else {
      await cancelAllReminders()
      addToast('Daily reminder disabled', 'info')
    }
  }, [reminderEnabled, transactions, debts, addToast])

  const subCount = recurring.filter((r) => r.active !== false).length
  const subMonthly = recurring
    .filter((r) => r.active !== false && r.type === 'expense')
    .reduce((s, r) => {
      if (r.frequency === 'monthly') return s + r.amount
      if (r.frequency === 'yearly') return s + (r.amount / 12)
      if (r.frequency === 'weekly') return s + (r.amount * 4.33)
      return s
    }, 0)

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {/* Security */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Lock size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">Security & Privacy</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <Fingerprint size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium">Hide Balance</p>
                <p className="text-[10px] text-gray-500">Hide amounts on dashboard</p>
              </div>
            </div>
            <button
              onClick={toggleHideBalance}
              className={`p-2 rounded-lg transition-all ${security.hideBalance ? 'bg-neon/10 text-neon' : 'bg-matte-100 text-gray-500'}`}
            >
              {security.hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium">Privacy Mode</p>
                <p className="text-[10px] text-gray-500">Blur screen in app switcher</p>
              </div>
            </div>
            <button
              onClick={togglePrivacyMode}
              className={`p-2 rounded-lg transition-all ${security.privacyMode ? 'bg-neon/10 text-neon' : 'bg-matte-100 text-gray-500'}`}
            >
              <Shield size={14} />
            </button>
          </div>

          {security.pinEnabled ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-neon" />
                <div>
                  <p className="text-xs font-medium text-neon">PIN Lock Active</p>
                  <p className="text-[10px] text-gray-500">Tap to disable</p>
                </div>
              </div>
              <button onClick={handleDisablePin} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Disable
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPinSetup(true)}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              Set PIN Lock
            </button>
          )}
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Bell size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Bell size={16} className={reminderEnabled ? 'text-neon' : 'text-gray-500'} />
            <div>
              <p className="text-xs font-medium">Daily Reminder</p>
              <p className="text-[10px] text-gray-500">Get reminded at 7:00 PM if no activity logged</p>
            </div>
          </div>
          <button
            onClick={toggleReminder}
            className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
              reminderEnabled ? 'bg-neon/30' : 'bg-matte-200'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
              reminderEnabled ? 'bg-neon left-[18px]' : 'bg-gray-500 left-0.5'
            }`} />
          </button>
        </div>
      </GlassCard>

      {/* Navigation Links */}
      <GlassCard brand className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('budgets')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Target size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Budget Management</p>
              <p className="text-xs text-gray-500">Set spending limits per category</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('debts')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Handshake size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Borrow & Lend</p>
              <p className="text-xs text-gray-500">Track money lent or borrowed</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('timeline')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <History size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Smart Money Timeline</p>
              <p className="text-xs text-gray-500">All transactions, debts & trades in one view</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('insights')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <FileText size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Financial Insights</p>
              <p className="text-xs text-gray-500">Score, trends & recommendations</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('reports')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Download size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Reports & Export</p>
              <p className="text-xs text-gray-500">CSV exports and monthly statements</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>
        </div>
      </GlassCard>

      {/* Recurring Summary */}
      {subCount > 0 && (
        <GlassCard className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Repeat2 size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">Subscriptions</h2>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 mb-1">Active</p>
              <p className="text-lg font-extrabold tabular-nums">{subCount}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 mb-1">Monthly</p>
              <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(Math.round(subMonthly))}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Savings Goal */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Target size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">Savings Goal</h2>
        </div>

        {savingsGoal.target > 0 && (
          <div className="mb-4">
            <SavingsProgress savingsGoal={savingsGoal} />
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Target Amount</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Saved Amount</label>
            <input
              type="number"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0"
              className="input-field"
            />
          </div>
          <button onClick={handleSavingsSave} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
            <DollarSign size={16} />
            Update Savings
          </button>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Database size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">Data Management</h2>
        </div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[10px] text-gray-600 font-medium">Schema</span>
          <span className="text-[10px] text-neon font-semibold">v{schemaVersion}</span>
          <span className="text-[10px] text-gray-600 mx-1">·</span>
          <span className="text-[10px] text-gray-600 font-medium">Target</span>
          <span className="text-[10px] text-neon font-semibold">v{APP_SCHEMA_VERSION}</span>
        </div>
        <div className="space-y-2">
          <button onClick={handleExport} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Download size={16} />
            Export Backup
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Upload size={16} />
            Import Backup
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="btn-secondary w-full text-sm flex items-center justify-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
          Reset All Local Data
        </button>
      </GlassCard>

      {/* PIN Setup Modal */}
      <Modal open={showPinSetup} onClose={() => { setShowPinSetup(false); setPin(''); setConfirmPin(''); setPinError('') }} title="Set PIN Lock">
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">Enter a secure PIN to lock the app.</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Enter PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={6}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Confirm PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={6}
            />
          </div>
          {pinError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{pinError}</p>}
          <button onClick={handleSetupPin} disabled={!pin || !confirmPin} className="btn-primary w-full text-sm">
            Enable PIN Lock
          </button>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        open={showRestoreConfirm}
        onClose={() => { setShowRestoreConfirm(false); setPendingRestore(null); setBackupSchemaWarning(null) }}
        onConfirm={handleConfirmRestore}
        title="Restore Backup?"
        description={`${backupSchemaWarning ? backupSchemaWarning + ' ' : ''}This will replace your current data with the backup. Make sure you have exported your current data first.`}
        confirmLabel={isRestoring ? 'Restoring...' : 'Restore'}
        cancelLabel="Cancel"
        loading={isRestoring}
      />

      {/* Restore Summary Modal */}
      <Modal open={!!restoreSummary} onClose={() => setRestoreSummary(null)} title="Restore Complete">
        <div className="space-y-3">
          {restoreSummary?.restored?.length > 0 && (
            <div>
              <p className="text-xs text-neon font-medium mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Restored
              </p>
              <div className="flex flex-wrap gap-1.5">
                {restoreSummary.restored.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-neon/10 text-neon">{s}</span>
                ))}
              </div>
            </div>
          )}
          {restoreSummary?.failed?.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-medium mb-1.5 flex items-center gap-1.5">
                <XCircle size={12} /> Failed
              </p>
              <div className="flex flex-wrap gap-1.5">
                {restoreSummary.failed.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{s}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setRestoreSummary(null)} className="btn-primary w-full text-sm mt-1">
            Reload App
          </button>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetData}
        title="Reset All Data?"
        description="This will permanently delete all your transactions, debts, budgets, savings, and settings. Export a backup first to avoid data loss."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        danger
        typedConfirm
        typedConfirmWord="DELETE"
      />
    </div>
  )
}

