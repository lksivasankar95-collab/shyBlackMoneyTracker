import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft, FileText, Download, Landmark, Users, BarChart3, Wallet,
  Share2, ExternalLink, CheckCircle2,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { generateEmiStatement, generateLedgerStatement, generateMonthlyStatement, generateNetWorthStatement } from '../utils/statementGenerator'
import { downloadBlob, shareBlob, openFileNative } from '../utils/downloadUtils'
import { useToast } from '../components/Toast'

const STATEMENT_TYPES = [
  { id: 'emi', label: 'EMI Statement', icon: Landmark, desc: 'Loan details, payment history, and remaining schedule' },
  { id: 'ledger', label: 'Borrow/Lend Statement', icon: Users, desc: 'Person-wise ledger with running balance and payments' },
  { id: 'monthly', label: 'Monthly Finance Statement', icon: BarChart3, desc: 'Income, expenses, savings, and category breakdown' },
  { id: 'networth', label: 'Net Worth Statement', icon: Wallet, desc: 'Assets, accounts, debts, and total net worth' },
]

export default function StatementCenterPage({ onNavigate }) {
  const { transactions, debts, emis, accounts, documents } = useFinance()
  const { addToast } = useToast()
  const [selectedType, setSelectedType] = useState(null)
  const [config, setConfig] = useState({})
  const [generated, setGenerated] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [downloadResult, setDownloadResult] = useState(null)
  const [showDownloadInfo, setShowDownloadInfo] = useState(false)

  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), i, 1)
    return { value: i, label: d.toLocaleString('en-US', { month: 'long' }) }
  })
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  const activeEmis = useMemo(() => {
    const allEmis = emis.length > 0 ? emis : []
    return allEmis.filter((e) => e.status !== 'closed')
  }, [emis])



  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenerated(null)
    setDownloadResult(null)
    setShowDownloadInfo(false)
    try {
      let result
      const typeMap = { emi: 'EMI_Statement', ledger: 'Ledger_Statement', monthly: 'Monthly_Statement', networth: 'NetWorth_Statement' }
      if (selectedType === 'emi') {
        const emiId = config.emiId
        const emi = emis.find((e) => e.id === emiId)
        if (!emi) return
        const paymentHistory = emi.paymentHistory || []
        result = generateEmiStatement(emi, paymentHistory)
      } else if (selectedType === 'ledger') {
        const ledgerId = config.ledgerId
        const ledger = debts.find((d) => d.id === ledgerId)
        if (!ledger) return
        const payments = ledger.payments || []
        result = generateLedgerStatement(ledger, payments)
      } else if (selectedType === 'monthly') {
        const year = config.year || now.getFullYear()
        const month = config.month ?? now.getMonth()
        result = generateMonthlyStatement(transactions, year, month)
      } else if (selectedType === 'networth') {
        result = generateNetWorthStatement(accounts, debts, transactions)
      }
      if (result) {
        setGenerated(result)
        const filename = `${typeMap[selectedType] || 'Statement'}_${new Date().toISOString().split('T')[0]}.pdf`
        const saveResult = await downloadBlob(result.blob, filename)
        if (saveResult.success) {
          setDownloadResult(saveResult)
          setShowDownloadInfo(true)
          addToast(`${result.pageCount}-page statement saved!`, 'success')
        } else {
          addToast('Statement generated', 'info')
        }
      }
    } catch (err) {
      console.error('Statement generation failed:', err)
      addToast('Failed to generate statement', 'error')
    } finally {
      setGenerating(false)
    }
  }, [selectedType, config, emis, debts, transactions, accounts, now, addToast])

  const handleOpenPDF = useCallback(async () => {
    if (!generated?.blob) return
    const typeMap = { emi: 'EMI_Statement', ledger: 'Ledger_Statement', monthly: 'Monthly_Statement', networth: 'NetWorth_Statement' }
    const filename = `${typeMap[selectedType] || 'Statement'}_${new Date().toISOString().split('T')[0]}.pdf`
    await openFileNative(generated.blob, filename)
  }, [generated, selectedType])

  const handleDownload = useCallback(async () => {
    if (!generated) return
    const typeMap = { emi: 'EMI_Statement', ledger: 'Ledger_Statement', monthly: 'Monthly_Statement', networth: 'NetWorth_Statement' }
    const filename = `${typeMap[selectedType] || 'Statement'}_${new Date().toISOString().split('T')[0]}.pdf`
    const result = await downloadBlob(generated.blob, filename)
    if (result.success) {
      setDownloadResult(result)
      setShowDownloadInfo(true)
      addToast('Statement saved!', 'success')
    }
  }, [generated, selectedType, addToast])

  const handleShare = useCallback(async () => {
    if (!generated) return
    const filename = `Statement_${new Date().toISOString().split('T')[0]}.pdf`
    const result = await shareBlob(generated.blob, filename, 'ShyBlack Finance Statement')
    if (result.shared) {
      addToast('Statement shared!', 'success')
    } else if (result.method === 'unsupported') {
      addToast('Share not supported', 'info')
    }
  }, [generated, addToast])

  if (!selectedType) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-white">Statement Center</h1>
        </div>

        <p className="text-xs text-gray-500 mb-4">Generate and export financial statements in PDF format</p>

        <div className="grid grid-cols-1 gap-3">
          {STATEMENT_TYPES.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="glass p-4 rounded-xl text-left hover:border-neon/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-neon transition-colors">{type.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{type.desc}</p>
                  </div>
                  <ChevronLeft size={16} className="text-gray-600 rotate-180 shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => { setSelectedType(null); setGenerated(null) }} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] transition-colors">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-white">
          {STATEMENT_TYPES.find((t) => t.id === selectedType)?.label}
        </h1>
      </div>

      {/* Config */}
      {!showDownloadInfo && (
        <div className="space-y-4">
          {selectedType === 'emi' && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Select EMI</label>
              <select
                value={config.emiId || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, emiId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
              >
                <option value="">Select an EMI...</option>
                {emis.map((emi) => (
                  <option key={emi.id} value={emi.id}>
                    {emi.name} - {formatCurrency(emi.amount)} ({emi.status === 'closed' ? 'Closed' : 'Active'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedType === 'ledger' && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Select Person</label>
              <select
                value={config.ledgerId || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, ledgerId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
              >
                <option value="">Select a person...</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.personName} - {formatCurrency(d.originalAmount || d.amount || 0)} ({d.type === 'lent' ? 'Lent' : 'Borrowed'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedType === 'monthly' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1.5 block">Year</label>
                <select
                  value={config.year ?? now.getFullYear()}
                  onChange={(e) => setConfig((prev) => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1.5 block">Month</label>
                <select
                  value={config.month ?? now.getMonth()}
                  onChange={(e) => setConfig((prev) => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedType === 'networth' && (
            <div className="glass p-4 rounded-xl">
              <p className="text-xs text-gray-400">
                Generates a snapshot of your current net worth including all accounts, debts, and cash balance.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || (selectedType === 'emi' && !config.emiId) || (selectedType === 'ledger' && !config.ledgerId)}
            className="w-full py-3 rounded-xl bg-neon/10 text-neon text-sm font-semibold border border-neon/20 hover:bg-neon/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            {generating ? 'Generating...' : 'Generate Statement'}
          </button>
        </div>
      )}

      {/* Download Info */}
      {showDownloadInfo && downloadResult && (
        <div className="space-y-4">
          <div className="glass p-4 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-neon" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Statement Saved</p>
                {generated && (
                  <p className="text-[10px] text-gray-500">{generated.pageCount} page{generated.pageCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-gray-500 mb-0.5">File Name</p>
                <p className="text-xs text-white font-medium break-all">{downloadResult.filename}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-gray-500 mb-0.5">Location</p>
                <p className="text-xs text-gray-300 font-mono">{downloadResult.path}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleOpenPDF}
                className="flex-1 py-2.5 rounded-xl bg-neon/10 text-neon text-xs font-medium border border-neon/20 hover:bg-neon/20 transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} />
                Open
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-medium hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
              >
                <Share2 size={13} />
                Share
              </button>
            </div>
            <button
              onClick={handleDownload}
              className="w-full mt-2 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-medium hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
            >
              <Download size={13} />
              Save Again
            </button>
          </div>

          <button
            onClick={() => { setShowDownloadInfo(false); setGenerated(null); setDownloadResult(null) }}
            className="w-full py-2.5 text-xs text-gray-500 hover:text-white transition-colors"
          >
            Generate Another Statement
          </button>
        </div>
      )}
    </div>
  )
}
