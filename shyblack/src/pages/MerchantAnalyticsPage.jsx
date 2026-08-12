import { useState, useMemo } from 'react'
import { ArrowLeft, Store, TrendingUp, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatInCurrency, getBaseCurrencyCode } from '../utils/multiCurrency'
import { getMerchantSummary } from '../utils/merchantAnalytics'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const fmt = (v) => formatInCurrency(v || 0, getBaseCurrencyCode())

export default function MerchantAnalyticsPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const [expanded, setExpanded] = useState(null)
  const [minCount, setMinCount] = useState(1)

  const { stats, merchantCount, totalMerchantSpend, topMerchant, topMerchantSpend } = useMemo(
    () => getMerchantSummary(transactions, { minCount }),
    [transactions, minCount]
  )

  const monthlyLabels = useMemo(() => {
    if (!stats[0]?.monthly) return []
    return stats[0].monthly.map((b) => b.bucket.slice(5))
  }, [stats])

  const maxMonthAmount = useMemo(() => {
    if (!expanded) return 0
    const entry = stats.find((s) => s.merchant === expanded)
    if (!entry) return 0
    return Math.max(...entry.monthly.map((b) => b.amount), 1)
  }, [expanded, stats])

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <Store size={18} className="text-teal-400" />
        <h1 className="text-xl font-bold">{t('merchant_analytics.title')}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <GlassCard className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('merchant_analytics.merchants')}</p>
          <p className="text-lg font-bold text-white tabular-nums">{merchantCount}</p>
        </GlassCard>
        <GlassCard className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('merchant_analytics.total_spend')}</p>
          <p className="text-lg font-bold text-white tabular-nums">{fmt(totalMerchantSpend)}</p>
        </GlassCard>
      </div>

      <GlassCard className="p-4 mb-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-teal-400" />
          <span className="text-gray-400">{t('merchant_analytics.top')}</span>
          <span className="font-semibold text-white capitalize">{topMerchant || '—'}</span>
        </div>
        <span className="text-gray-500 tabular-nums">{fmt(topMerchantSpend)}</span>
      </GlassCard>

      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={14} className="text-gray-500" />
        <span className="text-[10px] text-gray-500">{t('merchant_analytics.filter_hint')}</span>
        <select
          value={minCount}
          onChange={(e) => setMinCount(Number(e.target.value))}
          className="ml-auto px-2 py-1 rounded-lg text-[10px] font-medium border border-glass-border bg-matte-100 text-gray-300 focus:outline-none"
        >
          <option value={1}>{t('merchant_analytics.all')}</option>
          <option value={2}>{t('merchant_analytics.two_plus')}</option>
          <option value={3}>{t('merchant_analytics.three_plus')}</option>
        </select>
      </div>

      {stats.length === 0 ? (
        <GlassCard>
          <EmptyState icon={Store} title={t('merchant_analytics.empty')} description={t('merchant_analytics.empty_desc')} />
        </GlassCard>
      ) : (
        <div className="space-y-2.5">
          {stats.slice(0, 25).map((m) => (
            <GlassCard key={m.merchant} className="p-3.5">
              <button
                className="w-full flex items-center justify-between gap-2"
                onClick={() => setExpanded(expanded === m.merchant ? null : m.merchant)}
              >
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-white capitalize truncate">{m.merchant}</p>
                  <p className="text-[10px] text-gray-500">
                    {m.count} {m.count === 1 ? t('merchant_analytics.txn') : t('merchant_analytics.txns')} · {t('merchant_analytics.avg')} {fmt(m.avg)}
                    {m.topCategory ? ` · ${m.topCategory}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm font-bold text-white tabular-nums">{fmt(m.total)}</p>
                  {expanded === m.merchant ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </div>
              </button>
              {expanded === m.merchant && (
                <div className="mt-3 pt-3 border-t border-glass-border space-y-3 animate-slide-up">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1.5">{t('merchant_analytics.monthly')}</p>
                    <div className="flex items-end gap-1 h-14">
                      {m.monthly.map((b, i) => (
                        <div key={b.bucket} className="flex-1 flex flex-col items-center gap-0.5" title={`${monthlyLabels[i]}: ${fmt(b.amount)}`}>
                          <div
                            className="w-full rounded-t bg-teal-500/40 hover:bg-teal-500/70 transition-colors"
                            style={{ height: `${Math.max((b.amount / maxMonthAmount) * 44, 2)}px` }}
                          />
                          <span className="text-[8px] text-gray-600 tabular-nums">{monthlyLabels[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1.5">{t('merchant_analytics.weekdays')}</p>
                    <div className="flex gap-1">
                      {m.weekday.map((w, i) => (
                        <div key={i} className="flex-1 text-center">
                          <div className="rounded bg-white/[0.06] py-1 text-[10px] text-gray-400 tabular-nums">{fmt(w)}</div>
                          <span className="text-[8px] text-gray-600">{m.weeklyLabels[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600">
                    {t('merchant_analytics.period')} {m.firstDate} → {m.lastDate}
                  </p>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}