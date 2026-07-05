import { memo, useMemo } from 'react'
import { Landmark, ChevronRight, Clock, AlertTriangle, Calendar } from 'lucide-react'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import GlassCard from './GlassCard'

const DashboardEmiWidget = memo(function DashboardEmiWidget({ emiSummary, onNavigate }) {
  const { t } = useTranslation()
  const overdue = emiSummary?.overdue || []
  const dueToday = emiSummary?.dueToday || []
  const dueTomorrow = emiSummary?.dueTomorrow || []
  const upcoming = emiSummary?.upcoming || []
  const dueWithin7 = emiSummary?.dueWithin7 || []

  const nextDueItems = useMemo(() => {
    const innerOverdue = emiSummary?.overdue || []
    const innerDueToday = emiSummary?.dueToday || []
    const innerDueTomorrow = emiSummary?.dueTomorrow || []
    const innerDueWithin7 = emiSummary?.dueWithin7 || []
    const items = [
      ...innerOverdue.map((e) => ({ ...e, _priority: 0, _labelKey: 'overdue' })),
      ...innerDueToday.map((e) => ({ ...e, _priority: 1, _labelKey: 'due_today' })),
      ...innerDueTomorrow.map((e) => ({ ...e, _priority: 2, _labelKey: 'due_tomorrow' })),
      ...innerDueWithin7.filter((e) => !e.isDueToday && !e.isDueTomorrow).map((e) => ({
        ...e, _priority: 3,
        _labelKey: 'due_in_days',
        _dueInDays: e.dueInDays,
      })),
    ]
    items.sort((a, b) => a._priority - b._priority)
    return items.slice(0, 5)
  }, [emiSummary])

  const hasData = emiSummary && (emiSummary.totalActive > 0 || nextDueItems.length > 0)

  if (!hasData) return null

  return (
    <div className="mb-4">
      <button onClick={() => onNavigate('emi-center')} className="w-full text-left">
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={14} className="text-purple-400" />
            <h2 className="text-xs font-semibold text-gray-300">{t('emi_widget.title')}</h2>
            <span className="text-[10px] text-gray-600 ml-auto">{t('review_center.active_count', { count: emiSummary.totalActive })}</span>
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className="text-sm font-extrabold text-white">{emiSummary.totalActive}</p>
              <p className="text-[9px] text-gray-500">{t('emi_widget.active')}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className={`text-sm font-extrabold ${dueToday.length > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                {dueToday.length}
              </p>
              <p className="text-[9px] text-gray-500">{t('emi_widget.today')}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className={`text-sm font-extrabold ${overdue.length > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                {overdue.length}
              </p>
              <p className="text-[9px] text-gray-500">{t('emi_widget.overdue')}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2 text-center">
              <p className="text-sm font-extrabold text-amber-400">{dueWithin7.length}</p>
              <p className="text-[9px] text-gray-500">{t('emi_widget.seven_days')}</p>
            </div>
          </div>

          {/* Upcoming items */}
          {nextDueItems.length > 0 && (
            <div className="space-y-1.5">
              {nextDueItems.map((emi) => (
                <div key={emi.id} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    emi._labelKey === 'overdue' ? 'bg-red-500/10' : emi._labelKey === 'due_today' ? 'bg-yellow-500/10' : 'bg-amber-500/10'
                  }`}>
                    {emi._labelKey === 'overdue' ? (
                      <AlertTriangle size={12} className="text-red-400" />
                    ) : emi._labelKey === 'due_today' ? (
                      <Clock size={12} className="text-yellow-400" />
                    ) : (
                      <Calendar size={12} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{emi.name}</p>
                    <p className="text-[10px] text-gray-500">{formatCurrency(emi.amount)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[10px] font-semibold ${
                      emi._labelKey === 'overdue' ? 'text-red-400' : emi._labelKey === 'due_today' ? 'text-yellow-400' : 'text-amber-400'
                    }`}>
                      {emi._labelKey === 'due_in_days'
                        ? t('emi_widget.due_in_days', { count: emi._dueInDays })
                        : t(`emi_widget.${emi._labelKey}`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end mt-2">
            <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
              {t('emi_widget.view_all')} <ChevronRight size={10} />
            </span>
          </div>
        </GlassCard>
      </button>
    </div>
  )
})

export default DashboardEmiWidget
