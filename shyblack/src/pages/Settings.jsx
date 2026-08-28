import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Target, Download, Upload, Trash2, Shield, Lock, Eye, EyeOff,
  DollarSign, AlertTriangle, Repeat2, FileText, ChevronRight,
  Fingerprint, Handshake, History, Database, CheckCircle2, XCircle, Bell, KeyRound, Landmark,
  Calendar, Zap, Sparkles, Smartphone, Receipt as ReceiptIcon, BarChart3, ShieldCheck, Info, ExternalLink,
  Sun, Moon, Coins, RefreshCcw, FileSpreadsheet, Users, Wand2, Calculator, Store, Link as LinkIcon,
  Tag, Plus,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import SavingsProgress from '../components/SavingsProgress'
import { formatCurrency } from '../utils/helpers'
import { exportBackup, parseAndValidateBackup, restoreFromBackup, exportEncryptedBackup, parseAndValidateEncryptedBackup } from '../utils/backup'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import {
  getReminderPreference, setReminderPreference,
  refreshReminderSchedule, cancelAllReminders,
} from '../utils/reminders'
import { requestNotificationPermission, checkNotificationPermission } from '../utils/notifications'
import { isPinSet, setPin, verifyPin, clearPin, getTimeout, setTimeoutPref } from '../utils/privacy'
import { checkBiometricAvailability, isBiometricEnabled, setBiometricEnabled, authenticateWithBiometric, getBiometricTypeLabel } from '../utils/biometrics'
import { PRIVACY_POLICY_URL } from '../utils/constants'
import { getTheme, setTheme, THEMES } from '../utils/theme'
import { getCurrencySettings, setCurrencyRate, setBaseCurrency, setMultiCurrencyEnabled, CURRENCIES } from '../utils/multiCurrency'
import { getAutoBackupSettings, saveAutoBackupSettings, AUTO_BACKUP_FREQUENCIES, runAutoBackupIfDue } from '../utils/autoBackup'
import { formatDate } from '../utils/helpers'
import { getCustomCategories, addCustomCategory, removeCustomCategory } from '../utils/customCategories'

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
]

export default function Settings({ onNavigate }) {
  const { t, lang, setLang } = useTranslation()
  const {
    savingsGoal, updateSavings, clearAllData, transactions, 
    security, updateSecurity, recurring, debts, reloadFromStorage,
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
  const [biometricState, setBiometricState] = useState({ available: false, enabled: isBiometricEnabled(), type: null, checking: true })
  const [notifDiag, setNotifDiag] = useState(null)
  const [theme, setThemeState] = useState(getTheme())
  const [currencyState, setCurrencyState] = useState(() => getCurrencySettings())
  const [autoBackup, setAutoBackup] = useState(() => getAutoBackupSettings())
  const [runningBackup, setRunningBackup] = useState(false)
  const [customCats, setCustomCats] = useState(() => getCustomCategories())
  const [addingCat, setAddingCat] = useState(false)
  const [catForm, setCatForm] = useState({ label: '', type: 'expense', color: '#10b981' })

  useEffect(() => {
    setTarget(String(savingsGoal.target || ''))
    setSaved(String(savingsGoal.saved || ''))
  }, [savingsGoal])

  useEffect(() => {
    checkBiometricAvailability().then((result) => {
      setBiometricState((prev) => ({ ...prev, available: result.available, type: result.type, checking: false }))
    })
  }, [])

  const refreshCustomCategories = useCallback(() => setCustomCats(getCustomCategories()), [])

  const handleSaveCategory = useCallback(() => {
    const entry = addCustomCategory(catForm)
    if (entry) {
      refreshCustomCategories()
      addToast(t('settings.custom_category_added'), 'success')
      setCatForm({ label: '', type: 'expense', color: '#10b981' })
      setAddingCat(false)
    }
  }, [catForm, refreshCustomCategories, addToast, t])

  const handleDeleteCategory = useCallback((id) => {
    removeCustomCategory(id)
    refreshCustomCategories()
    addToast(t('settings.custom_category_deleted'), 'info')
  }, [refreshCustomCategories, addToast, t])

  const handleCheckNotifications = useCallback(async () => {
    const perm = await checkNotificationPermission()
    setNotifDiag({
      permissionGranted: perm.granted,
      permissionReason: perm.reason,
      checkTime: new Date().toLocaleTimeString(),
      platform: typeof Capacitor !== 'undefined' ? 'Capacitor' : 'Web',
    })
  }, [])

  const handleToggleBiometric = useCallback(async () => {
    if (biometricState.enabled) {
      setBiometricEnabled(false)
      setBiometricState((prev) => ({ ...prev, enabled: false }))
      addToast(t('settings.biometric_disabled'), 'info')
      return
    }

    const result = await checkBiometricAvailability()
    if (!result.available) {
      addToast(t('settings.biometric_unavailable_device'), 'error')
      return
    }

    const verified = await authenticateWithBiometric(t('settings.biometric_enable'))
    if (verified) {
      setBiometricEnabled(true)
      setBiometricState((prev) => ({ ...prev, enabled: true }))
      addToast(t('settings.biometric_enabled_toast', { type: getBiometricTypeLabel() }), 'success')
    } else {
      addToast(t('settings.biometric_failed_toast'), 'error')
    }
  }, [biometricState.enabled, addToast, t])

  const handleSavingsSave = () => {
    const targetAmt = parseFloat(target) || 0
    const s = parseFloat(saved) || 0
    updateSavings({ target: targetAmt, saved: s })
    addToast(t('notifications.savings_goal_updated'), 'success')
  }

  const handleExport = async () => {
    try {
      const result = await exportBackup()
      if (result.success) {
        if (result.shared) {
          addToast(t('settings.backup_exported'), 'success')
        } else {
          addToast('Backup saved to device (share unavailable)', 'warning')
        }
      } else {
        addToast(result.error || t('settings.backup_export_failed'), 'error')
      }
    } catch (err) {
      addToast(err.message || t('settings.backup_export_error'), 'error')
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
          t('settings.backup_schema_warning', { backup: backupVersion, current: schemaVersion })
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
    if (encPassword.length < 6) { setEncError(t('settings.pin_min_4')); return }
    if (encPassword !== encPassword2) { setEncError(t('settings.pins_mismatch')); return }
    setEncWorking(true)
    try {
      const result = await exportEncryptedBackup(encPassword)
      if (result.success) {
        setEncModal(null)
        setEncPassword('')
        setEncPassword2('')
        setEncError('')
        addToast(t('settings.backup_exported'), 'success')
      } else {
        setEncError(result.error || t('settings.backup_export_failed'))
      }
    } catch (err) {
      setEncError(err.message || t('settings.backup_export_failed'))
    }
    setEncWorking(false)
  }, [encPassword, encPassword2, addToast, t])

  const handleEncImportSubmit = useCallback(async () => {
    if (!encPassword) { setEncError(t('settings.enter_your_pin_error')); return }
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
  }, [encPassword, pendingRestore, t])

  const handleConfirmRestore = useCallback(() => {
    if (!pendingRestore) return
    setIsRestoring(true)
    const hadPin = isPinSet()
    try {
      const results = restoreFromBackup(pendingRestore)
      reloadFromStorage()
      setRestoreSummary({ ...results, pinWarning: hadPin })
      setPendingRestore(null)
      setShowRestoreConfirm(false)
      addToast(
        results.failed.length > 0
          ? t('settings.restore_result_with_failed', { count: results.restored.length, failCount: results.failed.length })
          : t('settings.restore_result', { count: results.restored.length }),
        results.failed.length > 0 ? 'warning' : 'success'
      )
    } catch {
      addToast(t('settings.restore_failed'), 'error')
    }
    setIsRestoring(false)
  }, [pendingRestore, addToast, reloadFromStorage, t])

  const handleResetData = useCallback(() => {
    clearAllData()
    setTarget('')
    setSaved('')
    addToast(t('settings.data_reset'), 'info')
  }, [clearAllData, addToast, t])

  const toggleHideBalance = () => {
    updateSecurity({ hideBalance: !security.hideBalance })
    addToast(security.hideBalance ? t('settings.balance_visible') : t('settings.balance_hidden'), 'info')
  }

  const togglePrivacyMode = () => {
    const next = !security.privacyMode
    updateSecurity({ privacyMode: next, hideBalance: next ? true : security.hideBalance })
    addToast(next ? t('settings.privacy_on') : t('settings.privacy_off'), 'info')
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
          addToast(t('settings.reminder_on'), 'success')
        } else {
          addToast(t('settings.reminder_enabled'), 'info')
        }
      } else {
        if (perm.reason === 'denied' || perm.reason === 'prompt-with-rationale') {
          addToast(t('settings.notif_permission_denied_msg'), 'error')
        } else {
          addToast(t('settings.reminder_pref_saved'), 'info')
        }
      }
    } else {
      await cancelAllReminders()
      addToast(t('settings.reminder_disabled'), 'info')
    }
  }, [reminderEnabled, transactions, debts, addToast, t])

  const handleThemeChange = useCallback((nextTheme) => {
    const applied = setTheme(nextTheme)
    setThemeState(applied)
    addToast(applied === THEMES.LIGHT ? t('settings.theme_light') + ' ✓' : t('settings.theme_dark') + ' ✓', 'success', 2000)
  }, [addToast, t])

  const handleCurrencyToggle = useCallback((enabled) => {
    const result = setMultiCurrencyEnabled(enabled)
    setCurrencyState({ ...result })
    addToast(enabled ? t('settings.multi_currency_on') : t('settings.multi_currency_off'), enabled ? 'success' : 'info')
  }, [addToast, t])

  const handleBaseCurrencyChange = useCallback((code) => {
    if (setBaseCurrency(code)) {
      setCurrencyState((prev) => ({ ...prev, base: code, rates: { ...prev.rates, [code]: 1 } }))
      addToast(t('settings.base_changed'), 'success')
    }
  }, [addToast, t])

  const handleRateChange = useCallback((code, value) => {
    if (setCurrencyRate(code, value)) {
      setCurrencyState((prev) => ({ ...prev, rates: { ...prev.rates, [code]: parseFloat(value) } }))
      addToast(t('settings.rate_saved'), 'success', 2000)
    } else {
      addToast(t('settings.rate_invalid'), 'error')
    }
  }, [addToast, t])

  const handleAutoBackupToggle = useCallback((enabled) => {
    const next = { ...autoBackup, enabled }
    saveAutoBackupSettings(next)
    setAutoBackup(next)
    addToast(enabled ? t('settings.auto_backup_on') : t('settings.auto_backup_off'), enabled ? 'success' : 'info')
  }, [autoBackup, addToast, t])

  const handleAutoBackupFrequency = useCallback((frequency) => {
    const next = { ...autoBackup, frequency }
    saveAutoBackupSettings(next)
    setAutoBackup(next)
  }, [autoBackup])

  const handleRunBackupNow = useCallback(async () => {
    setRunningBackup(true)
    try {
      const result = await runAutoBackupIfDue()
      if (result.ran && !result.failed) {
        addToast('Backup completed', 'success')
      } else {
        addToast('Backup already ran recently', 'info')
      }
      setAutoBackup(getAutoBackupSettings())
    } finally {
      setRunningBackup(false)
    }
  }, [addToast])

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
      <h1 className="text-xl font-bold mb-6">{t('settings.title')}</h1>

      {/* Language */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Zap size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.language')}</h2>
        </div>
        <p className="text-[10px] text-gray-500 mb-3">{t('settings.language_desc')}</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                lang === l.code
                  ? 'bg-neon/10 text-neon border border-neon/30'
                  : 'text-gray-500 border border-white/[0.06] hover:text-white'
              }`}
            >
              {l.nativeLabel}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Appearance */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Sun size={16} className="text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.appearance')}</h2>
        </div>
        <p className="text-[10px] text-gray-500 mb-3">{t('settings.appearance_desc')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleThemeChange(THEMES.DARK)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
              theme === THEMES.DARK ? 'bg-neon/10 text-neon border-neon/30' : 'text-gray-500 border-white/[0.06] hover:text-white'
            }`}
          >
            <Moon size={14} /> {t('settings.theme_dark')}
          </button>
          <button
            onClick={() => handleThemeChange(THEMES.LIGHT)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
              theme === THEMES.LIGHT ? 'bg-neon/10 text-neon border-neon/30' : 'text-gray-500 border-white/[0.06] hover:text-white'
            }`}
          >
            <Sun size={14} /> {t('settings.theme_light')}
          </button>
        </div>
      </GlassCard>

      {/* Advanced: Import & Splits */}
      <GlassCard className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('csv-import')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <FileSpreadsheet size={16} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.csv_import')}</p>
              <p className="text-xs text-gray-500">{t('settings.csv_import_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
          </button>

          <button onClick={() => onNavigate('statement-import')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <FileText size={16} className="text-indigo-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.statement_import')}</p>
              <p className="text-xs text-gray-500">{t('settings.statement_import_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
          </button>

          <button onClick={() => onNavigate('splits')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <Users size={16} className="text-teal-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.split_bills')}</p>
              <p className="text-xs text-gray-500">{t('settings.split_bills_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-teal-400 transition-colors" />
          </button>

          <button onClick={() => onNavigate('rules')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <Wand2 size={16} className="text-violet-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.rules')}</p>
              <p className="text-xs text-gray-500">{t('settings.rules_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-violet-400 transition-colors" />
          </button>
        </div>
      </GlassCard>

      {/* Multi-Currency */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Coins size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">{t('settings.multi_currency')}</h2>
            <p className="text-[10px] text-gray-500">{t('settings.multi_currency_desc')}</p>
          </div>
          <button
            onClick={() => handleCurrencyToggle(!currencyState.enabled)}
            className={`relative w-10 h-6 rounded-full transition-all duration-200 ${currencyState.enabled ? 'bg-neon/30' : 'bg-matte-200'}`}
            aria-pressed={currencyState.enabled}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${currencyState.enabled ? 'bg-neon left-[18px]' : 'bg-gray-500 left-0.5'}`} />
          </button>
        </div>

        {currencyState.enabled && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.base_currency')}</label>
              <select
                value={currencyState.base}
                onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                className="input-field"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">{t('settings.conversion_rates')}</p>
              <div className="space-y-2">
                {CURRENCIES.filter((c) => c.code !== currencyState.base).map((c) => (
                  <div key={c.code} className="flex items-center gap-2">
                    <span className="w-16 text-xs text-gray-400 shrink-0">{c.code}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.0001"
                      step="any"
                      value={currencyState.rates[c.code] || ''}
                      onChange={(e) => handleRateChange(c.code, e.target.value)}
                      placeholder="0"
                      className="input-field py-2 text-sm tabular-nums flex-1"
                    />
                    <span className="text-[10px] text-gray-600 shrink-0">{t('csv_import.base')}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">{t('currencies.base_tip')}</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Automated Backups */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <RefreshCcw size={16} className="text-neon" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">{t('settings.auto_backup')}</h2>
            <p className="text-[10px] text-gray-500">{t('settings.auto_backup_desc')}</p>
          </div>
          <button
            onClick={() => handleAutoBackupToggle(!autoBackup.enabled)}
            className={`relative w-10 h-6 rounded-full transition-all duration-200 ${autoBackup.enabled ? 'bg-neon/30' : 'bg-matte-200'}`}
            aria-pressed={autoBackup.enabled}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${autoBackup.enabled ? 'bg-neon left-[18px]' : 'bg-gray-500 left-0.5'}`} />
          </button>
        </div>

        {autoBackup.enabled && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">{t('settings.auto_backup_frequency')}</p>
              <div className="flex gap-1.5">
                {AUTO_BACKUP_FREQUENCIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleAutoBackupFrequency(f.id)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-medium border transition-all ${
                      autoBackup.frequency === f.id
                        ? 'border-neon/50 text-neon bg-neon/10'
                        : 'border-glass-border text-gray-500 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
              <span className="text-xs text-gray-400">{t('settings.auto_backup_last')}</span>
              <span className="text-xs text-gray-500 tabular-nums">
                {autoBackup.lastRunAt
                  ? `${formatDate(new Date(autoBackup.lastRunAt).toISOString().split('T')[0])}${autoBackup.lastStatus && !autoBackup.lastStatus.ok ? ` · ${t('settings.auto_backup_failed')}` : ''}`
                  : t('settings.auto_backup_never')}
              </span>
            </div>
            <button
              onClick={handleRunBackupNow}
              disabled={runningBackup}
              className="btn-secondary w-full text-xs flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RefreshCcw size={13} className={runningBackup ? 'animate-spin' : ''} />
              {runningBackup ? t('settings.biometric_checking') : 'Run backup now'}
            </button>
          </div>
        )}
      </GlassCard>

      {/* Security */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Lock size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.security')}</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <Fingerprint size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium">{t('settings.hide_balance')}</p>
                <p className="text-[10px] text-gray-500">{t('settings.hide_balance_dashboard_desc')}</p>
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
                <p className="text-xs font-medium">{t('settings.privacy_mode')}</p>
                <p className="text-[10px] text-gray-500">{t('settings.privacy_mode_blur_desc')}</p>
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
                <p className="text-xs font-medium">{t('settings.privacy_lock')}</p>
                <p className="text-[10px] text-gray-500">{privacyEnabled ? t('settings.privacy_lock_on_desc') : t('settings.privacy_lock_off_desc')}</p>
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
                    <p className="text-xs font-medium">{t('settings.auto_lock')}</p>
                    <p className="text-[10px] text-gray-500">{t('settings.auto_lock_away_desc')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[
                    { label: t('settings.lock_now'), value: 0 },
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
                {t('settings.change_pin')}
              </button>
            </>
          )}
        </div>
      </GlassCard>

      {/* Biometric Authentication */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Fingerprint size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.biometric')}</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <Smartphone size={16} className={biometricState.enabled ? 'text-neon' : 'text-gray-500'} />
              <div>
                <p className="text-xs font-medium">
                  {biometricState.checking ? t('settings.biometric_checking') : biometricState.enabled ? t('settings.biometric_type_enabled', { type: getBiometricTypeLabel() }) : t('settings.biometric_enable')}
                </p>
                <p className="text-[10px] text-gray-500">
                  {biometricState.checking ? t('settings.biometric_checking') : biometricState.enabled ? t('settings.biometric_use_to_unlock', { type: getBiometricTypeLabel().toLowerCase() }) : biometricState.available ? t('settings.biometric_setup_unlock', { type: getBiometricTypeLabel().toLowerCase() }) : t('settings.biometric_unavailable')}
                </p>
              </div>
            </div>
            {biometricState.available && !biometricState.checking && (
              <button
                onClick={handleToggleBiometric}
                className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
                  biometricState.enabled ? 'bg-neon/30' : 'bg-matte-200'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                  biometricState.enabled ? 'bg-neon left-[18px]' : 'bg-gray-500 left-0.5'
                }`} />
              </button>
            )}
            {!biometricState.available && !biometricState.checking && (
              <span className="text-[10px] text-gray-600">{t('common.na')}</span>
            )}
          </div>
          {biometricState.enabled && (
            <p className="text-[10px] text-gray-600 px-1">{t('settings.biometric_tip')}</p>
          )}
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Bell size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.notifications')}</h2>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Bell size={16} className={reminderEnabled ? 'text-neon' : 'text-gray-500'} />
            <div>
              <p className="text-xs font-medium">{t('settings.daily_reminder')}</p>
              <p className="text-[10px] text-gray-500">{t('settings.daily_reminder_desc')}</p>
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

        {/* Notification Diagnostics */}
        <button
          onClick={handleCheckNotifications}
          className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center gap-3 mt-2"
        >
          <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center">
            <Smartphone size={14} className="text-gray-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-medium text-white">{t('settings.notification_diag')}</p>
            <p className="text-[10px] text-gray-500">{t('settings.notification_diag_desc')}</p>
          </div>
          <ChevronRight size={14} className="text-gray-500" />
        </button>

        {notifDiag && (
          <div className="mt-2 p-3 rounded-xl bg-white/[0.03] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{t('settings.permission_label')}</span>
              <span className={`text-[10px] font-medium flex items-center gap-1 ${notifDiag.permissionGranted ? 'text-neon' : 'text-red-400'}`}>
                {notifDiag.permissionGranted ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                {notifDiag.permissionGranted ? t('settings.permission_granted') : t('settings.permission_denied')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{t('settings.status_label')}</span>
              <span className="text-[10px] text-gray-400">{notifDiag.permissionReason}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{t('settings.platform_label')}</span>
              <span className="text-[10px] text-gray-400">{notifDiag.platform}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{t('settings.checked_label')}</span>
              <span className="text-[10px] text-gray-400">{notifDiag.checkTime}</span>
            </div>
            {!notifDiag.permissionGranted && (
              <button
                onClick={async () => {
                  const result = await requestNotificationPermission()
                  setNotifDiag((prev) => ({ ...prev, permissionGranted: result.granted, permissionReason: result.reason }))
                  if (result.granted) {
                    addToast(t('settings.notif_permission_granted_toast'), 'success')
                  } else {
                    addToast(t('settings.notif_permission_denied_android'), 'error')
                  }
                }}
                className="w-full py-2 rounded-lg bg-neon/10 text-neon text-xs font-medium border border-neon/20 hover:bg-neon/20 transition-all mt-1"
              >
                {t('settings.request_permission')}
              </button>
            )}
          </div>
        )}
      </GlassCard>

      {/* Navigation Links */}
      <GlassCard brand className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('budgets')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Target size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.budget_management')}</p>
              <p className="text-xs text-gray-500">{t('settings.budget_management_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('budget-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <Target size={16} className="text-teal-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Budget Center</p>
              <p className="text-xs text-gray-500">Advanced budgets with smart alerts</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-teal-400 transition-colors" />
          </button>

          <button onClick={() => onNavigate('wealth-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <BarChart3 size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Wealth Center</p>
              <p className="text-xs text-gray-500">Assets, net worth & portfolio health</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-amber-400 transition-colors" />
          </button>

          <button onClick={() => onNavigate('debts')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Handshake size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('nav.debts')}</p>
              <p className="text-xs text-gray-500">{t('settings.borrow_lend_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('emi-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Landmark size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('nav.emis')}</p>
              <p className="text-xs text-gray-500">{t('settings.emi_center_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('timeline')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <History size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.timeline_title')}</p>
              <p className="text-xs text-gray-500">{t('settings.timeline_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('insights')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <FileText size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('insights.title')}</p>
              <p className="text-xs text-gray-500">{t('settings.insights_page_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('reports')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Download size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('nav.reports')}</p>
              <p className="text-xs text-gray-500">{t('settings.reports_page_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('income-tax')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Calculator size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.income_tax')}</p>
              <p className="text-xs text-gray-500">{t('settings.income_tax_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('merchant-analytics')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Store size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.merchant_analytics')}</p>
              <p className="text-xs text-gray-500">{t('settings.merchant_analytics_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('reconciliation')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <LinkIcon size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.reconciliation')}</p>
              <p className="text-xs text-gray-500">{t('settings.reconciliation_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('recurring-transactions')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Repeat2 size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('nav.recurring_transactions')}</p>
              <p className="text-xs text-gray-500">{t('settings.recurring_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>
        </div>
      </GlassCard>

      {/* Premium Features */}
      <GlassCard brand className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('goals')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Target size={16} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('dashboard.financial_goals')}</p>
              <p className="text-xs text-gray-500">{t('settings.goals_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('subscriptions')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Repeat2 size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('nav.subscriptions')}</p>
              <p className="text-xs text-gray-500">{t('settings.subscriptions_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('calendar')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Calendar size={16} className="text-gray-400 group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.calendar_title')}</p>
              <p className="text-xs text-gray-500">{t('settings.calendar_desc')}</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>

          <button onClick={() => onNavigate('receipt-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <ReceiptIcon size={16} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Receipt Scanner</p>
              <p className="text-xs text-gray-500">Scan bills & auto-create expenses</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
          </button>

          <button onClick={() => onNavigate('monthly-review')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Sparkles size={16} className="text-gray-400 group-hover:text-yellow-400 transition-colors" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">{t('settings.monthly_review')}</p>
              <p className="text-xs text-gray-500">{t('settings.monthly_review_desc')}</p>
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
            <h2 className="text-sm font-semibold">{t('nav.subscriptions')}</h2>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 mb-1">{t('common.active')}</p>
              <p className="text-lg font-extrabold tabular-nums">{subCount}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 mb-1">{t('budgets.monthly')}</p>
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
          <h2 className="text-sm font-semibold">{t('settings.savings_goal')}</h2>
        </div>

        {savingsGoal.target > 0 && (
          <div className="mb-4">
            <SavingsProgress savingsGoal={savingsGoal} />
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('goals.target')}</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('goals.saved')}</label>
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
            {t('settings.update_savings')}
          </button>
        </div>
      </GlassCard>

      {/* Forecast Center */}
      <GlassCard className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('forecast-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Zap size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Forecast Center</p>
              <p className="text-xs text-gray-500">Cashflow, goals, EMI, wealth & retirement</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>
        </div>
      </GlassCard>

      {/* Backup & Recovery Center */}
      <GlassCard className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('recovery-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
              <ShieldCheck size={16} className="text-neon" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Backup & Recovery Center</p>
              <p className="text-xs text-gray-500">Generations, snapshots, rollback & health</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-matte-200 flex items-center justify-center">
            <Database size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.data_management')}</h2>
        </div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[10px] text-gray-600 font-medium">{t('settings.schema_label')}</span>
          <span className="text-[10px] text-neon font-semibold">v{schemaVersion}</span>
          <span className="text-[10px] text-gray-600 mx-1">·</span>
          <span className="text-[10px] text-gray-600 font-medium">{t('settings.target_label')}</span>
          <span className="text-[10px] text-neon font-semibold">v{APP_SCHEMA_VERSION}</span>
        </div>
        <div className="space-y-2">
          <button onClick={handleExport} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Download size={16} />
            {t('settings.export_backup')}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Upload size={16} />
            {t('settings.import_backup')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

          <div className="w-full h-px bg-glass-border my-1" />

          <button
            onClick={() => { setEncPassword(''); setEncPassword2(''); setEncError(''); setEncModal('export') }}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <KeyRound size={16} />
            {t('settings.encrypted_export')}
          </button>
          <button onClick={() => encFileInputRef.current?.click()} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <KeyRound size={16} />
            {t('settings.encrypted_import')}
          </button>
          <input ref={encFileInputRef} type="file" accept=".json" onChange={handleEncImportFile} className="hidden" />
          <p className="text-[10px] text-gray-600 text-center px-2">{t('settings.enc_backup_tip')}</p>
        </div>
      </GlassCard>

      {/* Custom Categories */}
      <GlassCard className="mb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Tag size={16} className="text-yellow-400" />
          </div>
          <h2 className="text-sm font-semibold">{t('settings.custom_categories')}</h2>
        </div>
        <div className="space-y-2 mb-3">
          {customCats.length === 0 && <p className="text-[10px] text-gray-600 text-center py-1">{t('settings.custom_categories_empty')}</p>}
          {customCats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03]">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <Tag size={12} className="text-yellow-400 shrink-0" />
              <span className="text-xs text-gray-200 flex-1 truncate">{c.label}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-gray-400 shrink-0">
                {t(c.type === 'income' ? 'settings.custom_type_income' : 'settings.custom_type_expense')}
              </span>
              <button
                onClick={() => handleDeleteCategory(c.id)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {addingCat ? (
          <div className="space-y-2">
            <input
              value={catForm.label}
              onChange={(e) => setCatForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={t('settings.custom_category_placeholder')}
              className="input-field text-sm"
            />
            <div className="flex gap-2">
              <select
                value={catForm.type}
                onChange={(e) => setCatForm((f) => ({ ...f, type: e.target.value }))}
                className="input-field text-sm flex-1"
              >
                <option value="expense">{t('settings.custom_type_expense')}</option>
                <option value="income">{t('settings.custom_type_income')}</option>
              </select>
              <input
                type="color"
                value={catForm.color}
                onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-12 rounded-lg bg-transparent border border-glass-border"
                aria-label={t('settings.custom_category_color')}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveCategory}
                disabled={!catForm.label.trim()}
                className="btn-primary flex-1 text-sm disabled:opacity-40"
              >
                {t('settings.custom_category_save')}
              </button>
              <button onClick={() => setAddingCat(false)} className="btn-secondary text-sm px-4">{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingCat(true)} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Plus size={15} />
            {t('settings.custom_category_add')}
          </button>
        )}
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <h2 className="text-sm font-semibold text-red-400">{t('settings.danger_zone')}</h2>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="btn-secondary w-full text-sm flex items-center justify-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
          {t('settings.reset_data')}
        </button>
      </GlassCard>

      {/* Privacy PIN Modals */}
      <Modal
        open={pinModal === 'setup'}
        onClose={() => { setPinModal(null); setModalPin(''); setModalPin2(''); setPinError('') }}
        title={t('settings.set_privacy_pin')}
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">{t('settings.set_pin_desc')}</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.enter_pin')}</label>
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
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.confirm_pin')}</label>
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
              if (modalPin.length < 4) { setPinError(t('settings.pin_min_4')); return }
              if (modalPin !== modalPin2) { setPinError(t('settings.pins_mismatch')); return }
              await setPin(modalPin)
              setPrivacyEnabled(true)
              setPinModal(null)
              setModalPin('')
              setModalPin2('')
              addToast(t('settings.pin_set_toast'), 'success')
            }}
            disabled={!modalPin || !modalPin2}
            className="btn-primary w-full text-sm"
          >
            {t('settings.enable_privacy_lock')}
          </button>
        </div>
      </Modal>

      <Modal
        open={pinModal === 'change'}
        onClose={() => { setPinModal(null); setModalPin(''); setModalPin2(''); setModalPin3(''); setPinError('') }}
        title={t('settings.change_pin')}
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.current_pin')}</label>
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
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.new_pin')}</label>
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
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.confirm_new_pin')}</label>
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
              if (modalPin.length < 4) { setPinError(t('settings.enter_current_pin_error')); return }
              if (!(await verifyPin(modalPin))) { setPinError(t('settings.current_pin_wrong')); return }
              if (modalPin2.length < 4) { setPinError(t('settings.new_pin_min_4')); return }
              if (modalPin2 !== modalPin3) { setPinError(t('settings.new_pins_mismatch')); return }
              await setPin(modalPin2)
              setPinModal(null)
              setModalPin('')
              setModalPin2('')
              setModalPin3('')
              addToast(t('settings.pin_changed_toast'), 'success')
            }}
            disabled={!modalPin || !modalPin2 || !modalPin3}
            className="btn-primary w-full text-sm"
          >
            {t('settings.change_pin')}
          </button>
        </div>
      </Modal>

      <Modal
        open={pinModal === 'disable'}
        onClose={() => { setPinModal(null); setModalPin(''); setPinError('') }}
        title={t('settings.disable_privacy_lock')}
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">{t('settings.disable_privacy_lock_desc')}</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.current_pin')}</label>
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
              if (modalPin.length < 4) { setPinError(t('settings.enter_your_pin_error')); return }
              if (!(await verifyPin(modalPin))) { setPinError(t('settings.pin_wrong')); return }
              clearPin()
              setPrivacyEnabled(false)
              setPinModal(null)
              setModalPin('')
              addToast(t('settings.privacy_lock_disabled_toast'), 'info')
            }}
            disabled={!modalPin}
            className="btn-primary w-full text-sm"
          >
            {t('settings.disable_privacy_lock')}
          </button>
        </div>
      </Modal>

      {/* Encrypted Export Modal */}
      <Modal
        open={encModal === 'export'}
        onClose={() => { setEncModal(null); setEncPassword(''); setEncPassword2(''); setEncError('') }}
        title={t('settings.encrypted_export')}
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">{t('settings.enc_export_desc')}</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.enter_pin')}</label>
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
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.confirm_pin')}</label>
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
            {encWorking ? t('settings.biometric_checking') : t('settings.encrypted_export')}
          </button>
        </div>
      </Modal>

      {/* Encrypted Import Password Modal */}
      <Modal
        open={encModal === 'import'}
        onClose={() => { setEncModal(null); setEncPassword(''); setEncError(''); setPendingRestore(null) }}
        title={t('settings.enc_import_title')}
      >
        <div className="space-y-3.5">
          <p className="text-xs text-gray-400">{t('settings.enc_export_desc')}</p>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">{t('settings.enter_pin')}</label>
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
            {encWorking ? t('settings.biometric_checking') : t('settings.encrypted_import')}
          </button>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        open={showRestoreConfirm}
        onClose={() => { setShowRestoreConfirm(false); setPendingRestore(null); setBackupSchemaWarning(null) }}
        onConfirm={handleConfirmRestore}
        title={t('settings.restore_backup_title')}
        description={`${backupSchemaWarning ? backupSchemaWarning + ' ' : ''}${t('settings.restore_backup_desc')}`}
        confirmLabel={isRestoring ? t('settings.restoring') : t('settings.restore')}
        cancelLabel={t('common.cancel')}
        loading={isRestoring}
      />

      {/* Restore Summary Modal */}
      <Modal open={!!restoreSummary} onClose={() => setRestoreSummary(null)} title={t('settings.restore_complete')}>
        <div className="space-y-3">
          {restoreSummary?.pinWarning && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2.5">
              <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-yellow-300 leading-relaxed">
                {t('settings.pin_not_in_backup_warning')}
              </p>
            </div>
          )}
          {restoreSummary?.restored?.length > 0 && (
            <div>
              <p className="text-xs text-neon font-medium mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {t('settings.restored_label')}
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
                <XCircle size={12} /> {t('settings.failed_label')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {restoreSummary.failed.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{s}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setRestoreSummary(null)} className="btn-primary w-full text-sm mt-1">
            {t('settings.reload_app')}
          </button>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetData}
        title={t('settings.reset_data_title')}
        description={t('settings.reset_data_desc')}
        confirmLabel={t('settings.reset_everything')}
        cancelLabel={t('common.cancel')}
        danger
        typedConfirm
        typedConfirmWord="DELETE"
      />

      {/* About & Privacy */}
      <GlassCard className="mb-4">
        <div className="space-y-1">
          <button onClick={() => onNavigate('app-info')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
              <Info size={16} className="text-neon" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">About</p>
              <p className="text-xs text-gray-500">Version, build, release notes</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>
          <button onClick={() => onNavigate('privacy-center')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Shield size={16} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Privacy Center</p>
              <p className="text-xs text-gray-500">Data ownership, security & local storage</p>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </button>
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <ExternalLink size={16} className="text-purple-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium">Privacy Policy</p>
              <p className="text-xs text-gray-500">Read our full privacy policy</p>
            </div>
            <ExternalLink size={14} className="text-gray-500 group-hover:text-neon transition-colors" />
          </a>
        </div>
      </GlassCard>
    </div>
  )
}

