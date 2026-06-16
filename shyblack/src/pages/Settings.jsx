import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Target, Download, Upload, Trash2, Shield, Lock, Eye, EyeOff,
  DollarSign, AlertTriangle, Repeat2, FileText, ChevronRight,
  Fingerprint, Handshake, History, Database, CheckCircle2, XCircle, Bell, KeyRound,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import SavingsProgress from '../components/SavingsProgress'
import { formatCurrency } from '../utils/helpers'
import { exportBackup, parseAndValidateBackup, restoreFromBackup, exportEncryptedBackup, parseAndValidateEncryptedBackup } from '../utils/backup'
import { safeStorage } from '../utils/safeStorage'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import {
  getReminderPreference, setReminderPreference,
  requestNotificationPermission, checkNotificationPermission,
  refreshReminderSchedule, cancelAllReminders,
} from '../utils/reminders'
import { isPinSet, setPin, verifyPin, clearPin, getTimeout, setTimeoutPref } from '../utils/privacy'

export default function Settings({ onNavigate }) {
  const {
    savingsGoal, updateSavings, clearAllData, transactions, importData,
    security, updateSecurity, recurring, debts,
  } = useFinance()
  const { addToast } = useToast()
  const [target, setTarget] = useState(String(savingsGoal.target || ''))
  const [saved, setSaved] = useState(String(savingsGoal.saved || ''))
  const [privacyEnabled, setPrivacyEnabled] = useState(isPinSet())
  const [lockTimeout, setLockTimeout] = useState(getTimeout())
  const [pinModal, setPinModal] = useState(null)
  const [modalPin, setModalPin] = useState('')
  const [modalPin2, setModalPin2] = useState('')
  const [modalPin3, setModalPin3] = useState('')
  const [pinError, setPinError] = useState('')
  const fileInputRef = useRef()
  const encFileInputRef = useRef()
  const [encModal, setEncModal] = useState(null) // 'export' | 'import'
  const [encPassword, setEncPassword] = useState('')
  const [encPassword2, setEncPassword2] = useState('')
  const [encError, setEncError] = useState('')
  const [encWorking, setEncWorking] = useState(false)
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

  const handleEncImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPendingRestore({ _raw: ev.target.result, _encrypted: true })
      setEncPassword('')
      setEncError('')
      setEncModal('import')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleEncExportSubmit = useCallback(async () => {
    if (encPassword.length < 6) { setEncError('Password must be at least 6 characters'); return }
    if (encPassword !== encPassword2) { setEncError('Passwords do not match'); return }
    setEncWorking(true)
    try {
      await exportEncryptedBackup(encPassword)
      setEncModal(null)
      setEncPassword('')
      setEncPassword2('')
      addToast('Encrypted backup exported!', 'success')
    } catch {
      setEncError('Export failed. Please try again.')
    }
    setEncWorking(false)
  }, [encPassword, encPassword2, addToast])

  const handleEncImportSubmit = useCallback(async () => {
    if (!encPassword) { setEncError('Enter the backup password'); return }
    if (!pendingRestore?._raw) return
    setEncWorking(true)
    const result = await parseAndValidateEncryptedBackup(pendingRestore._raw, encPassword)
    if (!result.success) {
      setEncError(result.error)
      setEncWorking(false)
      return
    }
    setEncWorking(false)
    setPendingRestore(result.data)
    setEncModal(null)
    setEncPassword('')
    setEncError('')
    setShowRestoreConfirm(true)
  }, [encPassword, pendingRestore])

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

          {/* Privacy Lock */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <Lock size={16} className={privacyEnabled ? 'text-neon' : 'text-gray-400'} />
              <div>
                <p className="text-xs font-medium">Privacy Lock</p>
                <p className="text-[10px] text-gray-500">{privacyEnabled ? 'Lock app on resume' : 'Protect your data'}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (privacyEnabled) {
                  setModalPin('')
                  setModalPin2('')
                  setPinError('')
                  setPinModal('disable')
                } else if (isPinSet()) {
                  setPrivacyEnabled(true)
                } else {
                  setModalPin('')
                  setModalPin2('')
                  setPinError('')
                  setPinModal('setup')
                }
              }}
              className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
                privacyEnabled ? 'bg-neon/30' : 'bg-matte-200'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                privacyEnabled ? 'bg-neon left-[18px]' : 'bg-gray-500 left-0.5'
              }`} />
            </button>
          </div>

          {privacyEnabled && (
            <>
              {/* Timeout Selector */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-gray-400" />
                  <div>
                    <p className="text-xs font-medium">Auto-Lock</p>
                    <p className="text-[10px] text-gray-500">Lock after being away</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[
                    { label: 'Now', value: 0 },
                    { label: '30s', value: 30 },
                    { label: '1m', value: 60 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setLockTimeout(opt.value); setTimeoutPref(opt.value) }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                        lockTimeout === opt.value
                          ? 'border-neon/50 text-neon bg-neon/10'
                          : 'border-glass-border text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change PIN */}
              <button
                onClick={() => { setModalPin(''); setModalPin2(''); setModalPin3(''); setPinError(''); setPinModal('change') }}
                className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
              >
                <Lock size={16} />
                Change PIN
              </button>
            </>
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
              <p className="text-xs text-gray-500">All transactions and debts in one view</p>
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

          <div className="w-full h-px bg-glass-border my-1" />

          <button
            onClick={() => { setEncPassword(''); setEncPassword2(''); setEncError(''); setEncModal('export') }}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <KeyRound size={16} />
            Export Encrypted Backup
          </button>
          <button onClick={() => encFileInputRef.current?.click()} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <KeyRound size={16} />
            Import Encrypted Backup
          </button>
          <input ref={encFileInputRef} type="file" accept=".json" onChange={handleEncImportFile} className="hidden" />
          <p className="text-[10px] text-gray-600 text-center px-2">Encrypted backups require a password to restore</p>
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

      {/* Privacy PIN Modals */}
      <Modal
        open={pinModal === 'setup'}
        onClose={() => { setPinModal(null); setModalPin(''); setModalPin2(''); setPinError('') }}
        title="Set Privacy PIN"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">Set a 4-digit PIN to lock the app.</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Enter PIN</label>
            <input
              type="password"
              value={modalPin}
              onChange={(e) => { setModalPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Confirm PIN</label>
            <input
              type="password"
              value={modalPin2}
              onChange={(e) => { setModalPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
            />
          </div>
          {pinError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{pinError}</p>}
          <button
            onClick={async () => {
              if (modalPin.length < 4) { setPinError('PIN must be 4 digits'); return }
              if (modalPin !== modalPin2) { setPinError('PINs do not match'); return }
              await setPin(modalPin)
              setPrivacyEnabled(true)
              setPinModal(null)
              setModalPin('')
              setModalPin2('')
              addToast('Privacy PIN set', 'success')
            }}
            disabled={!modalPin || !modalPin2}
            className="btn-primary w-full text-sm"
          >
            Enable Privacy Lock
          </button>
        </div>
      </Modal>

      <Modal
        open={pinModal === 'change'}
        onClose={() => { setPinModal(null); setModalPin(''); setModalPin2(''); setModalPin3(''); setPinError('') }}
        title="Change PIN"
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Current PIN</label>
            <input
              type="password"
              value={modalPin}
              onChange={(e) => { setModalPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">New PIN</label>
            <input
              type="password"
              value={modalPin2}
              onChange={(e) => { setModalPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Confirm New PIN</label>
            <input
              type="password"
              value={modalPin3}
              onChange={(e) => { setModalPin3(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
            />
          </div>
          {pinError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{pinError}</p>}
          <button
            onClick={async () => {
              if (modalPin.length < 4) { setPinError('Enter current PIN'); return }
              if (!(await verifyPin(modalPin))) { setPinError('Current PIN is incorrect'); return }
              if (modalPin2.length < 4) { setPinError('New PIN must be 4 digits'); return }
              if (modalPin2 !== modalPin3) { setPinError('New PINs do not match'); return }
              await setPin(modalPin2)
              setPinModal(null)
              setModalPin('')
              setModalPin2('')
              setModalPin3('')
              addToast('PIN changed', 'success')
            }}
            disabled={!modalPin || !modalPin2 || !modalPin3}
            className="btn-primary w-full text-sm"
          >
            Change PIN
          </button>
        </div>
      </Modal>

      <Modal
        open={pinModal === 'disable'}
        onClose={() => { setPinModal(null); setModalPin(''); setPinError('') }}
        title="Disable Privacy Lock"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">Enter your current PIN to disable privacy lock.</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Current PIN</label>
            <input
              type="password"
              value={modalPin}
              onChange={(e) => { setModalPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              className="input-field text-center text-lg tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
              autoFocus
            />
          </div>
          {pinError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{pinError}</p>}
          <button
            onClick={async () => {
              if (modalPin.length < 4) { setPinError('Enter your PIN'); return }
              if (!(await verifyPin(modalPin))) { setPinError('PIN is incorrect'); return }
              clearPin()
              setPrivacyEnabled(false)
              setPinModal(null)
              setModalPin('')
              addToast('Privacy lock disabled', 'info')
            }}
            disabled={!modalPin}
            className="btn-primary w-full text-sm"
          >
            Disable Privacy Lock
          </button>
        </div>
      </Modal>

      {/* Encrypted Export Modal */}
      <Modal
        open={encModal === 'export'}
        onClose={() => { setEncModal(null); setEncPassword(''); setEncPassword2(''); setEncError('') }}
        title="Export Encrypted Backup"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">Set a password to protect your backup. You'll need it to restore.</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Password</label>
            <input
              type="password"
              value={encPassword}
              onChange={(e) => { setEncPassword(e.target.value); setEncError('') }}
              placeholder="At least 6 characters"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Confirm Password</label>
            <input
              type="password"
              value={encPassword2}
              onChange={(e) => { setEncPassword2(e.target.value); setEncError('') }}
              placeholder="Repeat password"
              className="input-field"
            />
          </div>
          {encError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{encError}</p>}
          <button
            onClick={handleEncExportSubmit}
            disabled={encWorking || !encPassword || !encPassword2}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <KeyRound size={16} />
            {encWorking ? 'Encrypting...' : 'Export Encrypted Backup'}
          </button>
        </div>
      </Modal>

      {/* Encrypted Import Password Modal */}
      <Modal
        open={encModal === 'import'}
        onClose={() => { setEncModal(null); setEncPassword(''); setEncError(''); setPendingRestore(null) }}
        title="Enter Backup Password"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">Enter the password used when this backup was created.</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Password</label>
            <input
              type="password"
              value={encPassword}
              onChange={(e) => { setEncPassword(e.target.value); setEncError('') }}
              placeholder="Backup password"
              className="input-field"
              autoFocus
            />
          </div>
          {encError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{encError}</p>}
          <button
            onClick={handleEncImportSubmit}
            disabled={encWorking || !encPassword}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {encWorking ? 'Decrypting...' : 'Decrypt & Restore'}
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

