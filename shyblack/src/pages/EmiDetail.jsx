import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft, Landmark, CheckCircle, PauseCircle, PlayCircle, XCircle,
  Edit3, Clock, Phone, User, CalendarDays, FileText, CreditCard,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import ConfirmationModal from '../components/ConfirmationModal'

const remindersDisplay = (times) => {
  if (!times || times.length === 0) return []
  return times.map((t) => {
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${m} ${ampm}`
  })
}

export default function EmiDetail({ onNavigate, currentPage }) {
  const emiId = currentPage.replace('emi-detail/', '')
  const { emis, markEmiPaid, pauseEmi, resumeEmi, closeEmi } = useFinance()

  const emi = useMemo(() => emis.find((e) => e.id === emiId), [emis, emiId])

  const [confirmAction, setConfirmAction] = useState(null)
  const [showPaidSuccess, setShowPaidSuccess] = useState(false)

  const totalMonths = emi ? (emi.tenure || emi.totalPaidCount + emi.remainingMonths) : 0
  const progressPct = totalMonths > 0 ? ((totalMonths - emi.remainingMonths) / totalMonths) * 100 : 0
  const sortedHistory = useMemo(() => {
    if (!emi?.paymentHistory) return []
    return [...emi.paymentHistory].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [emi?.paymentHistory])

  const handleMarkPaid = useCallback(() => {
    markEmiPaid(emiId)
    setShowPaidSuccess(true)
    setTimeout(() => setShowPaidSuccess(false), 2000)
  }, [markEmiPaid, emiId])

  const handlePause = useCallback(() => {
    pauseEmi(emiId)
    setConfirmAction(null)
  }, [pauseEmi, emiId])

  const handleResume = useCallback(() => {
    resumeEmi(emiId)
    setConfirmAction(null)
  }, [resumeEmi, emiId])

  const handleClose = useCallback(() => {
    closeEmi(emiId)
    setConfirmAction(null)
  }, [closeEmi, emiId])

  const handleEdit = useCallback(() => {
    onNavigate(`edit-emi/${emiId}`)
  }, [onNavigate, emiId])

  if (!emi) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => onNavigate('emi-center')} className="w-9 h-9 rounded-xl bg-matte-100 flex items-center justify-center hover:bg-matte-200 transition-all shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <h1 className="text-xl font-bold">EMI not found</h1>
        </div>
        <p className="text-sm text-gray-500">This EMI may have been deleted or does not exist.</p>
      </div>
    )
  }

  const isActive = emi.status === 'active'
  const isPaused = emi.status === 'paused'
  const isClosed = emi.status === 'closed'
  const isCompleted = isClosed && emi.remainingMonths === 0

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => onNavigate('emi-center')}
          className="w-9 h-9 rounded-xl bg-matte-100 flex items-center justify-center hover:bg-matte-200 transition-all shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center shrink-0">
            <Landmark size={18} className="text-neon" />
          </div>
          <h1 className="text-lg font-bold truncate">{emi.name}</h1>
        </div>
        {isActive && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all shrink-0"
          >
            <Edit3 size={13} />
            Edit
          </button>
        )}
      </div>

      {/* Status Banner */}
      {isClosed && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2.5 ${
          isCompleted
            ? 'bg-neon/10 border-neon/20 text-neon'
            : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
        }`}>
          {isCompleted ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {isCompleted ? 'EMI Completed — All payments done' : 'EMI Closed'}
        </div>
      )}
      {isPaused && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium flex items-center gap-2.5">
          <PauseCircle size={16} />
          EMI Paused — No reminders will fire
        </div>
      )}

      {/* Success Animation */}
      {showPaidSuccess && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-neon/10 border border-neon/20 text-neon text-sm font-medium flex items-center gap-2.5 animate-fade-in">
          <CheckCircle size={16} />
          Payment recorded for {formatCurrency(emi.amount)}
        </div>
      )}

      {/* Amount + Progress */}
      <GlassCard className="mb-4">
        <p className="text-3xl font-extrabold text-white tabular-nums">{formatCurrency(emi.amount)}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>Due Day: <span className="text-gray-300 font-semibold">{emi.dueDay}</span></span>
          <span className="text-gray-600">|</span>
          <span>{totalMonths - emi.remainingMonths} / {totalMonths} months paid</span>
        </div>
        <div className="mt-3 h-1.5 bg-matte-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isClosed ? 'bg-gray-500' : 'bg-neon'}`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </GlassCard>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <GlassCard className="!p-3">
          <div className="text-[10px] text-gray-500 mb-1 font-medium">Tenure</div>
          <p className="text-sm font-semibold text-white">{emi.tenure} months</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <div className="text-[10px] text-gray-500 mb-1 font-medium">Remaining</div>
          <p className="text-sm font-semibold text-white">{emi.remainingMonths} months</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <div className="text-[10px] text-gray-500 mb-1 font-medium">Total Paid</div>
          <p className="text-sm font-semibold text-white">{emi.totalPaidCount} times</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <div className="text-[10px] text-gray-500 mb-1 font-medium">Last Paid</div>
          <p className="text-sm font-semibold text-white">{emi.lastPaidDate ? formatDate(emi.lastPaidDate) : '—'}</p>
        </GlassCard>
      </div>

      {/* Lender & Contact */}
      {emi.lender && (
        <GlassCard className="!p-3 mb-2.5">
          <div className="flex items-center gap-2">
            <CreditCard size={13} className="text-gray-500 shrink-0" />
            <span className="text-xs text-gray-500">Lender:</span>
            <span className="text-xs font-medium text-white">{emi.lender}</span>
          </div>
        </GlassCard>
      )}
      {emi.contactName && (
        <GlassCard className="!p-3 mb-2.5">
          <div className="flex items-center gap-2">
            <User size={13} className="text-gray-500 shrink-0" />
            <span className="text-xs text-gray-500">Contact:</span>
            <span className="text-xs font-medium text-white">{emi.contactName}</span>
            {emi.phoneNumber && <span className="text-xs text-gray-400">{emi.phoneNumber}</span>}
          </div>
        </GlassCard>
      )}

      {/* Reminder Times */}
      {emi.reminderTimes && emi.reminderTimes.length > 0 && (
        <GlassCard className="!p-3 mb-2.5">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-gray-500 shrink-0" />
            <span className="text-xs text-gray-500">Reminders:</span>
            <span className="text-xs text-gray-300">{remindersDisplay(emi.reminderTimes).join(', ')}</span>
          </div>
        </GlassCard>
      )}

      {/* Created Date */}
      <GlassCard className="!p-3 mb-2.5">
        <div className="flex items-center gap-2">
          <CalendarDays size={13} className="text-gray-500 shrink-0" />
          <span className="text-xs text-gray-500">Created:</span>
          <span className="text-xs text-gray-300">{formatDate(new Date(emi.createdAt).toISOString().split('T')[0])}</span>
        </div>
      </GlassCard>

      {/* Notes */}
      {emi.notes && (
        <GlassCard className="!p-3 mb-4">
          <div className="flex gap-2">
            <FileText size={13} className="text-gray-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-gray-500 font-medium block mb-0.5">Notes</span>
              <p className="text-xs text-gray-300 leading-relaxed">{emi.notes}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Action Buttons */}
      {!isClosed && (
        <div className="flex gap-2 mb-4">
          {isActive && (
            <button
              onClick={handleMarkPaid}
              disabled={showPaidSuccess}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neon/10 text-neon text-xs font-medium border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-50"
            >
              <CheckCircle size={15} />
              {showPaidSuccess ? 'Done!' : 'Mark Paid'}
            </button>
          )}
          {isActive ? (
            <button
              onClick={() => setConfirmAction('pause')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20 hover:bg-yellow-500/20 transition-all"
            >
              <PauseCircle size={15} />
              Pause
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neon/10 text-neon text-xs font-medium border border-neon/20 hover:bg-neon/20 transition-all"
            >
              <PlayCircle size={15} />
              Resume
            </button>
          ) : null}
          {!isClosed && (
            <button
              onClick={() => setConfirmAction('close')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <XCircle size={15} />
              Close
            </button>
          )}
        </div>
      )}

      {/* Payment History */}
      {sortedHistory.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Payment History
          </h3>
          <div className="space-y-1.5">
            {sortedHistory.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-glass-border">
                <div className="flex items-center gap-2.5">
                  <CheckCircle size={12} className="text-neon shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-white">{formatDate(p.date)}</p>
                    {p.transactionId && (
                      <p className="text-[9px] text-gray-600">Tx: {p.transactionId.slice(0, 8)}...</p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-white tabular-nums">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        open={confirmAction === 'pause'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handlePause}
        title="Pause EMI?"
        description="Pausing will stop reminders until you resume. Your payment history is preserved."
        confirmLabel="Pause"
        cancelLabel="Cancel"
      />
      <ConfirmationModal
        open={confirmAction === 'close'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleClose}
        title="Close EMI?"
        description="This will mark the EMI as closed. You can view it later under the Closed filter."
        confirmLabel="Close EMI"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}
