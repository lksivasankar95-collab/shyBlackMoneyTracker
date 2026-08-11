import { useState, useCallback } from 'react'
import { Plus, Trash2, ArrowLeft, TrendingUp, TrendingDown, Scale, Landmark } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import {
  getPortfolio, getHoldings, addLot, sellLots, getTaxSummary, estimate80CDeductions,
  clearRealizedGains, ASSET_TAX_CLASSES,
} from '../utils/capitalGains'
import { formatInCurrency, getBaseCurrencyCode } from '../utils/multiCurrency'
import { useFinance } from '../hooks/useFinance'

const emptyLot = { name: '', taxClass: 'equity', buyDate: '', quantity: '', buyPrice: '', fees: '' }
const emptySell = { name: '', date: '', quantity: '', price: '', fees: '' }

const TAX_CLASS_LABELS = { equity: 'Equity', debt: 'Debt', crypto: 'Crypto', other: 'Other' }

const fmt = (v) => formatInCurrency(v || 0, getBaseCurrencyCode())

export default function CapitalGainsPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const { addToast } = useToast()

  const [holdings, setHoldings] = useState(() => getHoldings())
  const [portfolio, setPortfolio] = useState(() => getPortfolio())
  const [showAdd, setShowAdd] = useState(false)
  const [showSell, setShowSell] = useState(null)
  const [lotForm, setLotForm] = useState(emptyLot)
  const [sellForm, setSellForm] = useState(emptySell)
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const refresh = useCallback(() => {
    setHoldings(getHoldings())
    setPortfolio(getPortfolio())
  }, [])

  const taxSummary = getTaxSummary()
  const deduction = estimate80CDeductions(transactions)

  const saveLot = () => {
    const lot = addLot({
      name: lotForm.name,
      taxClass: lotForm.taxClass,
      buyDate: lotForm.buyDate,
      quantity: lotForm.quantity,
      buyPrice: lotForm.buyPrice,
      fees: lotForm.fees,
    })
    if (!lot) {
      setError(t('capital_gains.add_error'))
      return
    }
    setShowAdd(false)
    setLotForm(emptyLot)
    setError('')
    refresh()
    addToast(t('capital_gains.lot_added'), 'success')
  }

  const doSell = () => {
    const result = sellLots(showSell, {
      date: sellForm.date,
      quantity: sellForm.quantity,
      price: sellForm.price,
      fees: sellForm.fees,
    })
    if (!result.success) {
      setError(t('capital_gains.sell_error'))
      return
    }
    setShowSell(null)
    setSellForm(emptySell)
    setError('')
    refresh()
    addToast(t('capital_gains.sold_toast'), 'success')
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-matte-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-glass-border">
        <button onClick={() => onNavigate('wealth-center')} className="p-2 rounded-xl hover:bg-white/5" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t('capital_gains.title')}</h1>
          <p className="text-xs text-gray-400">{t('capital_gains.subtitle')}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-2 px-4 py-2.5">
          <Plus className="w-4 h-4" />
          {t('capital_gains.add_lot')}
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('capital_gains.total_realized')}</p>
            <p className={`text-lg font-bold ${taxSummary.totalGain >= 0 ? 'text-neon' : 'text-red-400'}`}>
              {fmt(taxSummary.totalGain)}
            </p>
          </GlassCard>
          <GlassCard className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('capital_gains.est_tax')}</p>
            <p className="text-lg font-bold text-white">{fmt(taxSummary.totalTax)}</p>
          </GlassCard>
        </div>

        {taxSummary.trades > 0 && (
          <GlassCard className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-neon" />
              {t('capital_gains.class_breakdown')}
            </h2>
            {Object.entries(taxSummary.perClass).map(([cls, b]) => (
              <div key={cls} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 capitalize">{TAX_CLASS_LABELS[cls] || cls}</span>
                <span className="text-gray-300">
                  STCG {fmt(b.stcg)} · LTCG {fmt(b.ltcg)}
                  <span className="text-white font-semibold ml-2">Tax {fmt(b.tax)}</span>
                </span>
              </div>
            ))}
          </GlassCard>
        )}

        <GlassCard className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-400" />
            {t('capital_gains.section_80c')}
          </h2>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{t('capital_gains.eligible_deductions')}</span>
            <span className="text-white font-semibold">{fmt(deduction.eligible)}</span>
          </div>
          {deduction.capReached && (
            <p className="text-xs text-amber-400">{t('capital_gains.80c_cap')}</p>
          )}
          {deduction.items.length === 0 && (
            <p className="text-xs text-gray-500">{t('capital_gains.no_80c')}</p>
          )}
        </GlassCard>

        {holdings.length === 0 ? (
          <GlassCard className="p-8 text-center space-y-3">
            <TrendingUp className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-400">{t('capital_gains.empty')}</p>
            <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm inline-flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              {t('capital_gains.add_lot')}
            </button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {holdings.map((h) => (
              <GlassCard key={h.name} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                    <p className="text-xs text-gray-400">
                      {h.quantity} @ {fmt(h.averageCost)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setShowSell(h.name)
                        setSellForm({ name: h.name, date: new Date().toISOString().split('T')[0], quantity: '', price: '', fees: '' })
                        setError('')
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      <TrendingDown className="w-3 h-3" />
                      {t('capital_gains.sell')}
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {portfolio.realized.length > 0 && (
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{t('capital_gains.realized_history')}</h2>
              <button onClick={() => setConfirmClear(true)} className="text-xs text-gray-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {portfolio.realized.slice(0, 15).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 truncate">
                  {r.name} · {r.quantity} · {r.buyDate} → {r.sellDate} ({r.holdingDays}d)
                </span>
                <span className={r.gain >= 0 ? 'text-neon' : 'text-red-400'}>
                  {fmt(r.gain)} {r.isLongTerm ? '(' + t('capital_gains.ltcg') + ')' : '(' + t('capital_gains.stcg') + ')'}
                </span>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('capital_gains.add_lot')}>
        <div className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-400">{t('capital_gains.name')}</label>
            <input value={lotForm.name} onChange={(e) => setLotForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. RELIANCE" className="input-field w-full mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.tax_class')}</label>
              <select value={lotForm.taxClass} onChange={(e) => setLotForm((f) => ({ ...f, taxClass: e.target.value }))} className="input-field w-full mt-1">
                {ASSET_TAX_CLASSES.map((c) => <option key={c} value={c}>{TAX_CLASS_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.buy_date')}</label>
              <input type="date" value={lotForm.buyDate} onChange={(e) => setLotForm((f) => ({ ...f, buyDate: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.quantity')}</label>
              <input type="number" value={lotForm.quantity} onChange={(e) => setLotForm((f) => ({ ...f, quantity: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.buy_price')}</label>
              <input type="number" value={lotForm.buyPrice} onChange={(e) => setLotForm((f) => ({ ...f, buyPrice: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.fees')}</label>
              <input type="number" value={lotForm.fees} onChange={(e) => setLotForm((f) => ({ ...f, fees: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <button onClick={saveLot} className="btn-primary w-full text-sm py-3">{t('common.save')}</button>
        </div>
      </Modal>

      <Modal open={!!showSell} onClose={() => setShowSell(null)} title={`${t('capital_gains.sell')} — ${showSell || ''}`}>
        <div className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-400">{t('capital_gains.sell_date')}</label>
            <input type="date" value={sellForm.date} onChange={(e) => setSellForm((f) => ({ ...f, date: e.target.value }))} className="input-field w-full mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.quantity')}</label>
              <input type="number" value={sellForm.quantity} onChange={(e) => setSellForm((f) => ({ ...f, quantity: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.sell_price')}</label>
              <input type="number" value={sellForm.price} onChange={(e) => setSellForm((f) => ({ ...f, price: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('capital_gains.fees')}</label>
              <input type="number" value={sellForm.fees} onChange={(e) => setSellForm((f) => ({ ...f, fees: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <button onClick={doSell} className="btn-primary w-full text-sm py-3">{t('capital_gains.confirm_sell')}</button>
        </div>
      </Modal>

      <ConfirmationModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { clearRealizedGains(); setConfirmClear(false); refresh() }}
        title={t('capital_gains.clear_history')}
        message={t('capital_gains.clear_history_desc')}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}