import { useState, useRef, useEffect } from 'react'
import {
  Target, Download, Upload, Trash2, Shield, Lock, Eye, EyeOff,
  DollarSign, AlertTriangle, Repeat2, FileText, ChevronRight,
  Fingerprint, Handshake,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import SavingsProgress from '../components/SavingsProgress'
import { formatCurrency } from '../utils/helpers'

export default function Settings({ onNavigate }) {
  const {
    savingsGoal, updateSavings, clearAllData, transactions, importData,
    security, updateSecurity, recurring,
  } = useFinance()
  const { addToast } = useToast()
  const [target, setTarget] = useState(String(savingsGoal.target || ''))
  const [saved, setSaved] = useState(String(savingsGoal.saved || ''))
  const [showConfirm, setShowConfirm] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [pinError, setPinError] = useState('')
  const fileInputRef = useRef()

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
    const data = { transactions, savings: savingsGoal }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shyblack_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Data exported successfully!', 'success')
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        importData(data)
        addToast('Data imported successfully!', 'success')
      } catch {
        addToast('Invalid file format. Please check the file.', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClear = () => {
    clearAllData()
    setTarget('')
    setSaved('')
    setShowConfirm(false)
    addToast('All data cleared!', 'success')
  }

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
            <Shield size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">Data Management</h2>
        </div>
        <div className="space-y-2">
          <button onClick={handleExport} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Download size={16} />
            Export Data (JSON)
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Upload size={16} />
            Import Data
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
          onClick={() => setShowConfirm(true)}
          className="btn-secondary w-full text-sm flex items-center justify-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
          Clear All Data
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

      {/* Confirm Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Clear All Data?">
        <p className="text-xs text-gray-400 flex items-start gap-2 mb-4 leading-relaxed">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          This will permanently delete all your transactions, budgets, and savings data. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={handleClear} className="flex-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-red-500/20 transition-all">
            Yes, Delete All
          </button>
          <button onClick={() => setShowConfirm(false)} className="flex-1 btn-secondary text-sm">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}

