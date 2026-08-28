import { useState, useMemo } from 'react'
import {
  ArrowLeftRight, ArrowRight, AlertCircle, CheckCircle2, History, RefreshCw,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { executeTransfer, getTransferHistory } from '../utils/transfers'
import { getAccounts, saveAccounts } from '../utils/networth'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

export default function TransferPage({ onNavigate: _onNavigate }) {
  const { t } = useTranslation()
  const [, setRefreshKey] = useState(0)
  const accounts = useMemo(() => getAccounts(), [])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const transferHistory = useMemo(() => {
    return getTransferHistory(getAccounts())
  }, [])

  const handleTransfer = () => {
    if (!fromId || !toId || !amount) return
    if (fromId === toId) {
      setResult({ success: false, error: t('transfer.sameAccountError') })
      return
    }

    const res = executeTransfer(fromId, toId, Number(amount), getAccounts())
    if (res.success) {
      saveAccounts(res.accounts)
      setResult(res)
      setFromId('')
      setToId('')
      setAmount('')
      setRefreshKey((k) => k + 1)
    } else {
      setResult(res)
    }
  }

  const handleSwap = () => {
    const temp = fromId
    setFromId(toId)
    setToId(temp)
    setResult(null)
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ArrowLeftRight size={18} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold">{t('transfer.title')}</h1>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-lg transition-all ${
            showHistory ? 'bg-amber-500/10 text-amber-400' : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <History size={16} />
        </button>
      </div>

      {showHistory ? (
        <>
          <h2 className="text-xs font-semibold text-gray-400 mb-2">{t('transfer.history')}</h2>
          {transferHistory.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={History}
                title={t('transfer.noTransfers')}
                description={t('transfer.noTransfersDesc')}
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {transferHistory.map((t) => (
                <GlassCard key={t.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ArrowLeftRight size={15} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{t.fromName}</span>
                        <ArrowRight size={10} className="text-gray-600 shrink-0" />
                        <span className="text-xs font-medium truncate">{t.toName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500">{formatDate(t.date)}</span>
                        {t.note && <span className="text-[10px] text-gray-600">· {t.note}</span>}
                      </div>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-amber-400">
                      {formatCurrency(t.amount)}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <GlassCard className="mb-4 border-amber-500/20">
            <h3 className="text-xs font-bold mb-3">{t('transfer.newTransfer')}</h3>

            {/* From Account */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 block mb-1">{t('transfer.fromAccount')}</label>
              <select
                value={fromId}
                onChange={(e) => { setFromId(e.target.value); setResult(null) }}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm border border-white/[0.06] focus:border-amber-400/30 focus:outline-none transition-all"
              >
                <option value="">{t('transfer.selectAccount')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap + Amount */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={handleSwap}
                className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-gray-500 transition-all"
                title={t('transfer.swapAccounts')}
              >
                <RefreshCw size={14} />
              </button>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-1">{t('transfer.amount')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setResult(null) }}
                  min="1"
                  className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-600 border border-white/[0.06] focus:border-amber-400/30 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* To Account */}
            <div className="mb-4">
              <label className="text-[10px] text-gray-500 block mb-1">{t('transfer.toAccount')}</label>
              <select
                value={toId}
                onChange={(e) => { setToId(e.target.value); setResult(null) }}
                className="w-full bg-matte-200 rounded-lg px-3.5 py-2.5 text-sm border border-white/[0.06] focus:border-amber-400/30 focus:outline-none transition-all"
              >
                <option value="">{t('transfer.selectAccount')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTransfer}
              disabled={!fromId || !toId || !amount}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeftRight size={14} />
              {t('transfer.button')}
            </button>

            {/* Result Message */}
            {result && (
              <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                result.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {result.success ? t('transfer.success') : result.error}
              </div>
            )}
          </GlassCard>

          {/* Account Balances */}
          <h2 className="text-xs font-semibold text-gray-400 mb-2">{t('transfer.accountBalances')}</h2>
          <div className="space-y-2">
            {accounts.map((a) => (
              <GlassCard key={a.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{a.name}</p>
                    <p className="text-[10px] text-gray-500">{a.type}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(a.balance)}</p>
                </div>
              </GlassCard>
            ))}
            {accounts.length === 0 && (
              <GlassCard>
                <EmptyState
                  icon={ArrowLeftRight}
                  title={t('transfer.noAccounts')}
                  description={t('transfer.noAccountsDesc')}
                />
              </GlassCard>
            )}
          </div>
        </>
      )}
    </div>
  )
}
