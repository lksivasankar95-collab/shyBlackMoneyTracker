import { useState, useCallback } from 'react'
import { Plus, Trash2, ArrowLeft, TrendingUp, TrendingDown, Landmark, Wallet } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useTranslation } from '../i18n'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ConfirmationModal from '../components/ConfirmationModal'
import {
  addBuy, addSell, addDividend, updateMarketPrice,
  getPortfolioSummary, getInvestmentSummary, deleteAsset,
} from '../utils/investmentLots'
import { formatInCurrency, getBaseCurrencyCode } from '../utils/multiCurrency'

const fmt = (v) => formatInCurrency(v || 0, getBaseCurrencyCode())
const KIND_LABELS = { stock: 'Stock', mutual_fund: 'Mutual Fund', crypto: 'Crypto', gold: 'Gold', other: 'Other' }

const emptyBuy = { name: '', kind: 'stock', date: new Date().toISOString().split('T')[0], quantity: '', price: '', fees: '' }

export default function InvestmentCenterPage({ onNavigate }) {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [, setVersion] = useState(0)
  const [summary, setSummary] = useState(() => getPortfolioSummary())
  const [view, setView] = useState(null)
  const [showBuy, setShowBuy] = useState(false)
  const [modal, setModal] = useState(null)
  const [buyForm, setBuyForm] = useState(emptyBuy)
  const [sellForm, setSellForm] = useState({ ...emptyBuy, price: '' })
  const [divForm, setDivForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], amount: '', kind: 'dividend' })
  const [priceForm, setPriceForm] = useState({ name: '', price: '' })
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const refresh = useCallback(() => {
    setVersion((v) => v + 1)
    setSummary(getPortfolioSummary())
  }, [])

  const saveBuy = () => {
    const res = addBuy(buyForm.name, buyForm)
    if (!res) {
      setError(t('investments.buy_error'))
      return
    }
    setShowBuy(false)
    setBuyForm(emptyBuy)
    setError('')
    refresh()
    addToast(t('investments.buy_done'), 'success')
  }

  const saveSell = () => {
    const res = addSell(sellForm.name, sellForm)
    if (!res.success) {
      setError(t('investments.sell_error'))
      return
    }
    setModal(null)
    setError('')
    refresh()
    addToast(`${t('investments.sell_done')} ${fmt(res.realized.gain)}`, 'success')
  }

  const saveDividend = () => {
    const res = addDividend(divForm.name, divForm)
    if (!res) {
      setError(t('investments.div_error'))
      return
    }
    setModal(null)
    setError('')
    refresh()
    addToast(t('investments.div_done'), 'success')
  }

  const savePrice = () => {
    const res = updateMarketPrice(priceForm.name, priceForm.price)
    if (!res) {
      setError(t('investments.price_error'))
      return
    }
    setModal(null)
    setError('')
    refresh()
    addToast(t('investments.price_done'), 'success')
  }

  const openModal = (kind, name) => {
    setError('')
    if (kind === 'sell') setSellForm({ ...emptyBuy, name, price: '' })
    if (kind === 'dividend') setDivForm({ ...divForm, name })
    if (kind === 'price') setPriceForm({ name, price: '' })
    setModal(kind)
  }

  const detail = view ? getInvestmentSummary(view) : null

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-matte-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-glass-border">
        <button onClick={() => onNavigate('wealth-center')} className="p-2 rounded-xl hover:bg-white/5" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t('investments.title')}</h1>
          <p className="text-xs text-gray-400">{t('investments.subtitle')}</p>
        </div>
        <button onClick={() => { setShowBuy(true); setError('') }} className="btn-primary text-sm flex items-center gap-2 px-4 py-2.5">
          <Plus className="w-4 h-4" />
          {t('investments.buy')}
        </button>
      </div>

      <div className="space-y-4 p-4">
        {view ? (
          <>
            <div className="flex items-center justify-between">
              <button onClick={() => setView(null)} className="text-xs text-gray-400 hover:text-white">
                ← {t('investments.back')}
              </button>
              <button onClick={() => setDeleteTarget(view)} className="p-1.5 text-gray-500 hover:text-red-400" aria-label="Delete asset">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <GlassCard className="p-4 space-y-2">
              <p className="text-base font-bold text-white">{view}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{t('investments.held')}</span>
                <span className="text-white font-semibold">{detail.quantity}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{t('investments.invested')}</span>
                <span className="text-white font-semibold">{fmt(detail.invested)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{t('investments.current_value')}</span>
                <span className="text-white font-semibold">
                  {detail.lastPrice ? fmt(detail.currentValue) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{t('investments.unrealized')}</span>
                <span className={`font-semibold ${detail.unrealizedGain >= 0 ? 'text-neon' : 'text-red-400'}`}>
                  {detail.unrealizedGain != null ? fmt(detail.unrealizedGain) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{t('investments.dividend_income')}</span>
                <span className="text-neon font-semibold">{fmt(detail.dividendIncome)}</span>
              </div>
            </GlassCard>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => openModal('sell', view)} className="btn-secondary text-xs py-2.5"><TrendingDown className="w-3 h-3" />{t('investments.sell')}</button>
              <button onClick={() => openModal('dividend', view)} className="btn-secondary text-xs py-2.5"><Landmark className="w-3 h-3" />{t('investments.dividend')}</button>
              <button onClick={() => openModal('price', view)} className="btn-secondary text-xs py-2.5"><TrendingUp className="w-3 h-3" />{t('investments.update_price')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <GlassCard className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('investments.market_value')}</p>
                <p className="text-lg font-bold text-white">{summary.marketValue != null ? fmt(summary.marketValue) : '—'}</p>
              </GlassCard>
              <GlassCard className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('investments.unrealized')}</p>
                <p className={`text-lg font-bold ${summary.unrealized >= 0 ? 'text-neon' : 'text-red-400'}`}>
                  {summary.unrealized != null ? fmt(summary.unrealized) : '—'}
                </p>
              </GlassCard>
            </div>

            <GlassCard className="p-4 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <p className="text-gray-400">{t('investments.invested')}: <span className="text-white font-semibold">{fmt(summary.invested)}</span></p>
                <p className="text-gray-400">{t('investments.dividend_income')}: <span className="text-neon font-semibold">{fmt(summary.dividends)}</span></p>
                <p className="text-gray-400">{t('investments.realized')}: <span className={`font-semibold ${summary.realizedGain >= 0 ? 'text-neon' : 'text-red-400'}`}>{fmt(summary.realizedGain)}</span></p>
              </div>
              <Wallet size={18} className="text-gray-600" />
            </GlassCard>

            {summary.holdings.length === 0 ? (
              <GlassCard className="p-8 text-center space-y-3">
                <TrendingUp className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400">{t('investments.empty')}</p>
                <button onClick={() => { setShowBuy(true); setError('') }} className="btn-secondary text-sm inline-flex items-center gap-2 mx-auto">
                  <Plus className="w-4 h-4" />
                  {t('investments.buy')}
                </button>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {summary.holdings.map((h) => (
                  <GlassCard key={h.name} className="p-4" onClick={() => setView(h.name)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                        <p className="text-xs text-gray-400">
                          {KIND_LABELS[h.kind]} · {h.quantity} @ {fmt(h.averageCost)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white">{h.lastPrice ? fmt(h.currentValue) : '—'}</p>
                        <p className={`text-xs ${h.unrealizedGain >= 0 ? 'text-neon' : 'text-red-400'}`}>
                          {h.unrealizedGain != null ? fmt(h.unrealizedGain) : ''}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={showBuy} onClose={() => setShowBuy(false)} title={t('investments.new_buy')}>
        <div className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-400">{t('investments.name')}</label>
            <input value={buyForm.name} onChange={(e) => setBuyForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. NIFTY 50, RELIANCE, BTC" className="input-field w-full mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('investments.kind')}</label>
              <select value={buyForm.kind} onChange={(e) => setBuyForm((f) => ({ ...f, kind: e.target.value }))} className="input-field w-full mt-1">
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('investments.date')}</label>
              <input type="date" value={buyForm.date} onChange={(e) => setBuyForm((f) => ({ ...f, date: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('investments.quantity')}</label>
              <input type="number" value={buyForm.quantity} onChange={(e) => setBuyForm((f) => ({ ...f, quantity: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('investments.price')}</label>
              <input type="number" value={buyForm.price} onChange={(e) => setBuyForm((f) => ({ ...f, price: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('investments.fees')}</label>
              <input type="number" value={buyForm.fees} onChange={(e) => setBuyForm((f) => ({ ...f, fees: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <button onClick={saveBuy} className="btn-primary w-full text-sm py-3">{t('investments.confirm_buy')}</button>
        </div>
      </Modal>

      <Modal open={modal === 'sell'} onClose={() => setModal(null)} title={`${t('investments.sell')} — ${sellForm.name}`}>
        <div className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('investments.date')}</label>
              <input type="date" value={sellForm.date} onChange={(e) => setSellForm((f) => ({ ...f, date: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('investments.quantity')}</label>
              <input type="number" value={sellForm.quantity} onChange={(e) => setSellForm((f) => ({ ...f, quantity: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('investments.sell_price')}</label>
              <input type="number" value={sellForm.price} onChange={(e) => setSellForm((f) => ({ ...f, price: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('investments.fees')}</label>
              <input type="number" value={sellForm.fees} onChange={(e) => setSellForm((f) => ({ ...f, fees: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <button onClick={saveSell} className="btn-primary w-full text-sm py-3">{t('investments.confirm_sell')}</button>
        </div>
      </Modal>

      <Modal open={modal === 'dividend'} onClose={() => setModal(null)} title={`${t('investments.dividend')} — ${divForm.name}`}>
        <div className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('investments.date')}</label>
              <input type="date" value={divForm.date} onChange={(e) => setDivForm((f) => ({ ...f, date: e.target.value }))} className="input-field w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">{t('investments.amount')}</label>
              <input type="number" value={divForm.amount} onChange={(e) => setDivForm((f) => ({ ...f, amount: e.target.value }))} className="input-field w-full mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">{t('investments.kind')}</label>
              <select value={divForm.kind} onChange={(e) => setDivForm((f) => ({ ...f, kind: e.target.value }))} className="input-field w-full mt-1">
                <option value="dividend">Dividend</option>
                <option value="interest">Interest</option>
              </select>
            </div>
          </div>
          <button onClick={saveDividend} className="btn-primary w-full text-sm py-3">{t('investments.confirm_div')}</button>
        </div>
      </Modal>

      <Modal open={modal === 'price'} onClose={() => setModal(null)} title={`${t('investments.update_price')} — ${priceForm.name}`}>
        <div className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-400">{t('investments.price')}</label>
            <input type="number" value={priceForm.price} onChange={(e) => setPriceForm((f) => ({ ...f, price: e.target.value }))} className="input-field w-full mt-1" />
          </div>
          <button onClick={savePrice} className="btn-primary w-full text-sm py-3">{t('investments.confirm_price')}</button>
        </div>
      </Modal>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteAsset(deleteTarget); setDeleteTarget(null); refresh() }}
        title={t('investments.delete_asset')}
        message={t('investments.delete_desc')}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}