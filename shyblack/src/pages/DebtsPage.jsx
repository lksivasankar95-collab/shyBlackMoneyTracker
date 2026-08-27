import { useState, useMemo, useCallback } from 'react'
import {
  ArrowUpRight, ArrowDownLeft, Handshake, Plus, 
  Search, X, CheckCircle2, TrendingDown,
  User, FileText, RotateCcw, Pencil, Trash2,
  ArrowUpDown,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate } from '../utils/helpers'
import { getLedgerStatement, generateLedgerExportData, searchLedgers, filterLedgers, sortLedgers, SORT_OPTIONS } from '../utils/debts'
import { getDebtPayoffPlan } from '../utils/debtPlanner'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import AddDebtModal from '../components/AddDebtModal'
import ConfirmationModal from '../components/ConfirmationModal'

const TYPE_OPTIONS = [
  { id: 'all', label: 'debts.all' },
  { id: 'lent', label: 'debts.lent' },
  { id: 'borrowed', label: 'debts.borrowed' },
]

const STATUS_OPTIONS = [
  { id: 'all', label: 'debts.all' },
  { id: 'active', label: 'debts.active' },
  { id: 'settled', label: 'debts.settled' },
]

const SORT_OPTIONS_LIST = [
  { id: SORT_OPTIONS.DATE_DESC, label: 'debts.sort_date_desc' },
  { id: SORT_OPTIONS.DATE_ASC, label: 'debts.sort_date_asc' },
  { id: SORT_OPTIONS.NAME_ASC, label: 'debts.sort_name_asc' },
  { id: SORT_OPTIONS.NAME_DESC, label: 'debts.sort_name_desc' },
  { id: SORT_OPTIONS.AMOUNT_DESC, label: 'debts.sort_amount_desc' },
  { id: SORT_OPTIONS.AMOUNT_ASC, label: 'debts.sort_amount_asc' },
  { id: SORT_OPTIONS.BALANCE_DESC, label: 'debts.sort_balance_desc' },
  { id: SORT_OPTIONS.BALANCE_ASC, label: 'debts.sort_balance_asc' },
]

function ProgressBar({ pct, color = 'bg-neon' }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-matte-200 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function PaymentRow({ payment, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.02] group hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
        <span className="text-[11px] text-gray-400">{formatDate(payment.date)}</span>
        {payment.notes && <span className="text-[10px] text-gray-600 truncate max-w-[100px]">{payment.notes}</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-semibold tabular-nums text-emerald-400">{formatCurrency(payment.amount)}</span>
        <button onClick={() => onEdit(payment)} className="p-0.5 text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all">
          <Pencil size={10} />
        </button>
        <button onClick={() => onDelete(payment)} className="p-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

export default function DebtsPage({ _onNavigate }) {
  const { t } = useTranslation()
  const {
    debts, addDebt, deleteDebt, 
    addLedgerPayment, undoLedgerPayment, editLedgerPayment,
    deleteLedgerPayment, doSettleLedger, ledgerInsights, debtsSummary,
    emis,
  } = useFinance()
  const { addToast } = useToast()

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLedger, setSelectedLedger] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState(SORT_OPTIONS.DATE_DESC)

  // Payment modal state
  const [payModal, setPayModal] = useState({ open: false, ledger: null, amount: '', notes: '' })
  // Payment edit state
  const [editPayment, setEditPayment] = useState(null)
  // Confirm delete payment
  const [deletePaymentTarget, setDeletePaymentTarget] = useState(null)
  // Confirm delete ledger
  const [deleteLedgerTarget, setDeleteLedgerTarget] = useState(null)

  const processed = useMemo(() => {
    let result = searchLedgers(debts, searchQuery)
    result = filterLedgers(result, { type: typeFilter, status: statusFilter })
    result = sortLedgers(result, sortKey)
    return result
  }, [debts, searchQuery, typeFilter, statusFilter, sortKey])

  const payoffPlan = useMemo(() => getDebtPayoffPlan({ debts, emis }), [debts, emis])
  const showPayoff = payoffPlan.structured.length > 0 || payoffPlan.borrowed.length > 0

  const handleSave = useCallback((data) => {
    addDebt(data)
    addToast(
      data.type === 'lent' ? t('debts.record_added_lent') : t('debts.record_added_borrowed'),
      'success'
    )
    setShowAddModal(false)
  }, [addDebt, addToast, t])

  const handleDeleteLedger = useCallback(() => {
    if (!deleteLedgerTarget) return
    deleteDebt(deleteLedgerTarget)
    addToast(t('debts.record_deleted'), 'info')
    setDeleteLedgerTarget(null)
    setSelectedLedger(null)
  }, [deleteLedgerTarget, deleteDebt, addToast, t])

  const openPayModal = useCallback((ledger) => {
    setPayModal({ open: true, ledger, amount: '', notes: '' })
  }, [])

  const submitPayment = useCallback(() => {
    const { ledger, amount, notes } = payModal
    if (!ledger || !amount) return
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      addToast(t('debts.enter_valid_amount'), 'error')
      return
    }
    if (num > (ledger.currentBalance ?? ledger.remainingAmount ?? 0)) {
      addToast(t('debts.amount_exceeds_balance'), 'error')
      return
    }
    addLedgerPayment(ledger.id, num, notes)
    addToast(t('debts.payment_recorded'), 'success')
    setPayModal({ open: false, ledger: null, amount: '', notes: '' })
  }, [payModal, addLedgerPayment, addToast, t])

  const handleUndoLast = useCallback((ledgerId) => {
    const result = undoLedgerPayment(ledgerId)
    if (result.success) {
      addToast(t('debts.last_payment_undone'), 'info')
    }
  }, [undoLedgerPayment, addToast, t])

  const handleEditPayment = useCallback((payment) => {
    setEditPayment(payment)
  }, [])

  const submitEditPayment = useCallback(() => {
    if (!editPayment || !selectedLedger) return
    const newAmount = parseFloat(editPayment.amount)
    if (isNaN(newAmount) || newAmount <= 0) {
      addToast(t('debts.enter_valid_amount'), 'error')
      return
    }
    editLedgerPayment(selectedLedger.id, editPayment.id, { amount: newAmount, notes: editPayment.notes })
    addToast(t('debts.payment_updated'), 'success')
    setEditPayment(null)
  }, [editPayment, selectedLedger, editLedgerPayment, addToast, t])

  const confirmDeletePayment = useCallback(() => {
    if (!deletePaymentTarget || !selectedLedger) return
    deleteLedgerPayment(selectedLedger.id, deletePaymentTarget.id)
    addToast(t('debts.payment_deleted'), 'info')
    setDeletePaymentTarget(null)
  }, [deletePaymentTarget, selectedLedger, deleteLedgerPayment, addToast, t])

  const handleSettle = useCallback((ledgerId) => {
    doSettleLedger(ledgerId)
    addToast(t('debts.ledger_settled'), 'success')
  }, [doSettleLedger, addToast, t])

  const getStatement = useCallback((ledger) => {
    return getLedgerStatement(ledger)
  }, [])

  const handleExportPdf = useCallback((ledger) => {
    const data = generateLedgerExportData(ledger)
    if (!data) return
    addToast(t('debts.statement_ready', { name: ledger.personName }), 'info')
  }, [addToast, t])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Handshake size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('debts.title')}</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
        >
          <Plus size={14} />
          {t('debts.add')}
        </button>
      </div>

      {/* Summary Cards */}
      {debts.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">{t('debts.lent')}</p>
            <p className="text-sm font-extrabold text-green-400 tabular-nums">{formatCurrency(debtsSummary.totalLent)}</p>
            <p className="text-[9px] text-gray-600">{debtsSummary.totalReceivable > 0 ? `${formatCurrency(debtsSummary.totalReceivable)} ${t('debts.receivable_short')}` : t('debts.settled')}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">{t('debts.borrowed')}</p>
            <p className="text-sm font-extrabold text-orange-400 tabular-nums">{formatCurrency(debtsSummary.totalBorrowed)}</p>
            <p className="text-[9px] text-gray-600">{debtsSummary.totalPayable > 0 ? `${formatCurrency(debtsSummary.totalPayable)} ${t('debts.payable_short')}` : t('debts.settled')}</p>
          </GlassCard>
          <GlassCard className="!p-2.5">
            <p className="text-[10px] text-gray-500 font-medium truncate">{t('debts.status_label')}</p>
            <p className="text-sm font-extrabold text-white tabular-nums">{debtsSummary.totalActive}</p>
            <p className="text-[9px] text-gray-600">{debtsSummary.totalSettled} {t('debts.settled')}</p>
          </GlassCard>
        </div>
      )}

      {/* Insights */}
      {ledgerInsights.length > 0 && (
        <div className="mb-4 space-y-1">
          {ledgerInsights.slice(0, 3).map((insight, i) => (
            <div key={i} className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-neon shrink-0" />
              {insight}
            </div>
          ))}
        </div>
      )}

      {/* Payoff Plan */}
      {showPayoff && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-neon" />
            <h2 className="text-sm font-semibold">{t('debts.payoff_plan')}</h2>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">{t('debts.payoff_desc')}</p>

          <div className="space-y-3">
            {[
              { title: t('debts.payoff_avalanche'), list: payoffPlan.avalanche, accent: 'text-red-400' },
              { title: t('debts.payoff_snowball'), list: payoffPlan.snowball, accent: 'text-blue-400' },
            ].map((strat) => {
              const order = strat.list
              if (order.length === 0) return null
              return (
                <div key={strat.title} className="bg-white/[0.03] rounded-xl p-3">
                  <p className={`text-[10px] font-semibold mb-2 ${strat.accent}`}>{strat.title}</p>
                  <div className="space-y-1.5">
                    {order.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-lg bg-matte-200 text-gray-400 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        <span className="text-gray-300 truncate flex-1">{item.name}</span>
                        {item.kind === 'emi' && item.monthsLeft ? (
                          <span className="text-[10px] text-gray-500 tabular-nums">{t('debts.payoff_months', { count: item.monthsLeft })}</span>
                        ) : (
                          <span className="text-[10px] text-gray-500 tabular-nums">{formatCurrency(item.remaining)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {payoffPlan.structured.length > 0 && (
            <div className="mt-3 pt-3 border-t border-glass-border grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-500">{t('debts.payoff_monthly')}</p>
                <p className="text-sm font-bold text-white tabular-nums">
                  {formatCurrency(payoffPlan.structured.reduce((s, i) => s + (i.monthlyMin || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">{t('debts.payoff_interest')}</p>
                <p className="text-sm font-bold text-amber-400 tabular-nums">{formatCurrency(payoffPlan.totalInterestRemaining)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">{t('debts.payoff_total')}</p>
                <p className="text-sm font-bold text-neon tabular-nums">{formatCurrency(payoffPlan.totalStructuredRemaining)}</p>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Search + Filters */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('debts.search_name')}
            className="w-full bg-matte-200 rounded-lg pl-7 pr-2.5 py-2 text-xs placeholder-gray-600 border border-white/[0.06] focus:border-neon/30 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <ArrowUpDown size={13} className="text-gray-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="bg-matte-200 rounded-lg pl-6 pr-2 py-2 text-xs border border-white/[0.06] focus:border-neon/30 focus:outline-none transition-all appearance-none"
          >
            {SORT_OPTIONS_LIST.map((o) => (
              <option key={o.id} value={o.id}>{t(o.label)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type + Status filter chips */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
        {TYPE_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
              typeFilter === f.id
                ? 'bg-neon/15 text-neon border border-neon/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white'
            }`}
          >
            {t(f.label)}
          </button>
        ))}
        <div className="w-px bg-white/[0.06]" />
        {STATUS_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
              statusFilter === f.id
                ? 'bg-neon/15 text-neon border border-neon/30'
                : 'bg-matte-100 text-gray-500 border border-transparent hover:text-white'
            }`}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {/* Ledger List */}
      {processed.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={debts.length === 0 ? t('debts.no_records') : t('debts.no_matching_records')}
          description={debts.length === 0 ? t('debts.no_records_desc') : t('debts.try_different_filters')}
          action={debts.length === 0 ? (
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs !px-4 !py-2">
              {t('debts.add_first_record')}
            </button>
          ) : null}
        />
      ) : (
        <div className="space-y-2">
          {processed.map((ledger) => {
            const stmt = getStatement(ledger)
            const isExpanded = selectedLedger?.id === ledger.id
            const isLent = ledger.type === 'lent'
            return (
              <div key={ledger.id}>
                <button
                  onClick={() => setSelectedLedger(isExpanded ? null : ledger)}
                  className="w-full text-left"
                >
                  <GlassCard className={`transition-all hover:border-neon/20 ${isExpanded ? 'border-neon/20' : ''} ${ledger.status === 'settled' ? 'opacity-70' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        ledger.status === 'settled' ? 'bg-emerald-500/10' : isLent ? 'bg-green-500/10' : 'bg-orange-500/10'
                      }`}>
                        <User size={18} className={
                          ledger.status === 'settled' ? 'text-emerald-400' : isLent ? 'text-green-400' : 'text-orange-400'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">{ledger.personName}</h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            ledger.status === 'settled'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {ledger.status === 'settled' ? t('debts.settled') : t('debts.active')}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isLent ? 'text-green-400' : 'text-orange-400'}`}>
                          {isLent ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                          <span className="text-lg font-extrabold">{formatCurrency(ledger.currentBalance)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                          <span>{t('debts.total_label')}: {formatCurrency(ledger.originalAmount)}</span>
                          {stmt && <span>{t('debts.paid_label')}: {formatCurrency(stmt.totalPaid)}</span>}
                        </div>
                        {stmt && stmt.progress > 0 && (
                          <div className="mt-2">
                            <ProgressBar pct={stmt.progress} color={ledger.status === 'settled' ? 'bg-emerald-500' : 'bg-gradient-to-r from-neon to-green-400'} />
                            <span className="text-[9px] text-gray-600 mt-0.5 block">{t('debts.repaid_percent', { progress: stmt.progress })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </button>

                {/* Expanded Statement */}
                {isExpanded && stmt && (
                  <GlassCard className="-mt-1 border-t-0 !pt-0 rounded-t-none border-neon/10">
                    <div className="pt-3 space-y-3">
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <span className="text-gray-600">{t('debts.original')}</span>
                        <span className="font-semibold text-right">{formatCurrency(stmt.originalAmount)}</span>
                        <span className="text-gray-600">{t('debts.total_repaid')}</span>
                        <span className="font-semibold text-right text-emerald-400">{formatCurrency(stmt.totalPaid)}</span>
                        <span className="text-gray-600">{t('debts.remaining')}</span>
                        <span className="font-semibold text-right">{formatCurrency(stmt.currentBalance)}</span>
                        <span className="text-gray-600">{t('debts.progress')}</span>
                        <span className="font-semibold text-right">{stmt.progress}%</span>
                        <span className="text-gray-600">{t('debts.payments')}</span>
                        <span className="font-semibold text-right">{stmt.paymentCount}</span>
                        {stmt.settlementDate && (
                          <>
                            <span className="text-gray-600">{t('debts.settled')}</span>
                            <span className="font-semibold text-right text-emerald-400">{formatDate(new Date(stmt.settlementDate).toISOString().split('T')[0])}</span>
                          </>
                        )}
                        {ledger.notes && (
                          <>
                            <span className="text-gray-600">{t('common.notes')}</span>
                            <span className="font-semibold text-right truncate">{ledger.notes}</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <ProgressBar pct={stmt.progress} color={stmt.status === 'settled' ? 'bg-emerald-500' : 'bg-gradient-to-r from-neon to-green-400'} />
                      </div>

                      {/* Payment History */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold text-gray-500">{t('debts.payment_history')}</p>
                          <div className="flex gap-1">
                            {stmt.paymentCount > 0 && (
                              <button
                                onClick={() => handleUndoLast(ledger.id)}
                                className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 px-1.5 py-0.5 rounded"
                              >
                                <RotateCcw size={10} /> {t('debts.undo')}
                              </button>
                            )}
                            <button
                              onClick={() => openPayModal(ledger)}
                              className="text-[10px] text-neon hover:text-neon/80 flex items-center gap-1 px-1.5 py-0.5 rounded"
                            >
                              <Plus size={10} /> {t('debts.pay')}
                            </button>
                          </div>
                        </div>
                        {stmt.payments.length === 0 ? (
                          <p className="text-[10px] text-gray-600 text-center py-2">{t('debts.no_payments')}</p>
                        ) : (
                          <div className="space-y-0.5 max-h-40 overflow-y-auto">
                            {stmt.payments.map((p) => (
                              <PaymentRow key={p.id} payment={p} onEdit={handleEditPayment} onDelete={setDeletePaymentTarget} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        {stmt.currentBalance === 0 && stmt.status !== 'settled' && (
                          <button
                            onClick={() => handleSettle(ledger.id)}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 size={13} />
                            {t('debts.mark_settled')}
                          </button>
                        )}
                        <button
                          onClick={() => { handleExportPdf(ledger) }}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/[0.05] text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <FileText size={13} />
                          {t('debts.statement')}
                        </button>
                        <button
                          onClick={() => setDeleteLedgerTarget(ledger.id)}
                          className="py-2 px-3 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddDebtModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSave}
      />

      {/* Payment Modal */}
      {payModal.open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setPayModal({ open: false, ledger: null, amount: '', notes: '' }) }}
        >
          <div className="glass-brand p-5 w-full max-w-sm animate-scale-in">
            <h2 className="text-sm font-semibold mb-1">
              {payModal.ledger?.type === 'lent' ? t('debts.record_repayment') : t('debts.make_payment')}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {t('debts.remaining_format', { name: payModal.ledger?.personName, amount: formatCurrency(payModal.ledger?.currentBalance ?? 0) })}
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={payModal.amount}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || /^\d*\.?\d*$/.test(v)) setPayModal({ ...payModal, amount: v })
              }}
              placeholder={t('debts.enter_amount')}
              className="input-field text-lg font-bold tabular-nums mb-2"
              autoFocus
            />
            <input
              type="text"
              value={payModal.notes}
              onChange={(e) => setPayModal({ ...payModal, notes: e.target.value })}
              placeholder={t('debts.notes_optional')}
              className="input-field text-xs mb-4"
              maxLength={100}
            />
            <div className="flex gap-2">
              <button onClick={submitPayment} disabled={!payModal.amount} className="flex-1 btn-primary text-sm">
                {t('common.confirm')}
              </button>
              <button onClick={() => setPayModal({ open: false, ledger: null, amount: '', notes: '' })} className="flex-1 btn-secondary text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editPayment && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setEditPayment(null) }}
        >
          <div className="glass-brand p-5 w-full max-w-sm animate-scale-in">
            <h2 className="text-sm font-semibold mb-4">{t('debts.edit_payment')}</h2>
            <input
              type="text"
              inputMode="numeric"
              value={editPayment.amount}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || /^\d+$/.test(v)) setEditPayment({ ...editPayment, amount: v })
              }}
              placeholder={t('common.amount')}
              className="input-field text-lg font-bold tabular-nums mb-2"
              autoFocus
            />
            <input
              type="text"
              value={editPayment.notes || ''}
              onChange={(e) => setEditPayment({ ...editPayment, notes: e.target.value })}
              placeholder={t('debts.notes_optional')}
              className="input-field text-xs mb-4"
              maxLength={100}
            />
            <div className="flex gap-2">
              <button onClick={submitEditPayment} disabled={!editPayment.amount} className="flex-1 btn-primary text-sm">
                {t('debts.update')}
              </button>
              <button onClick={() => setEditPayment(null)} className="flex-1 btn-secondary text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Payment */}
      <ConfirmationModal
        open={!!deletePaymentTarget}
        onClose={() => setDeletePaymentTarget(null)}
        onConfirm={confirmDeletePayment}
        title={t('debts.delete_payment_title')}
        description={t('debts.delete_payment_desc')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
      />

      {/* Confirm Delete Ledger */}
      <ConfirmationModal
        open={!!deleteLedgerTarget}
        onClose={() => setDeleteLedgerTarget(null)}
        onConfirm={handleDeleteLedger}
        title={t('debts.delete_record_title')}
        description={t('debts.delete_record_desc')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
      />
    </div>
  )
}
