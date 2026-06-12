import { useState, useRef } from 'react'
import {
  Target, Download, Upload, Trash2, Shield,
  DollarSign, AlertTriangle,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'

export default function Settings() {
  const { savingsGoal, updateSavings, clearAllData, transactions, importData } = useFinance()
  const { addToast } = useToast()
  const [target, setTarget] = useState(String(savingsGoal.target || ''))
  const [saved, setSaved] = useState(String(savingsGoal.saved || ''))
  const [showConfirm, setShowConfirm] = useState(false)
  const fileInputRef = useRef()

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

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {/* Savings Goal */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
            <Target size={16} className="text-neon" />
          </div>
          <h2 className="text-sm font-semibold">Savings Goal</h2>
        </div>
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
            Export Data
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            Import Data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
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
        <button onClick={() => setShowConfirm(true)} className="btn-secondary w-full text-sm flex items-center justify-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10">
          <Trash2 size={16} />
          Clear All Data
        </button>
      </GlassCard>

      {/* Confirm Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Clear All Data?">
        <p className="text-xs text-gray-400 flex items-start gap-2 mb-4 leading-relaxed">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          This will permanently delete all your transactions and savings data. This action cannot be undone.
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
