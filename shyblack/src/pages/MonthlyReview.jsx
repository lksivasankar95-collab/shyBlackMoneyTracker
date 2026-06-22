import { useState, useMemo, useEffect } from 'react'
import { Sparkles, TrendingUp, TrendingDown, Flame, Repeat2, Target, AlertTriangle, PieChart, DollarSign, CheckCircle2, Minus, History } from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { generateMonthlyReview, wasReviewGenerated, markReviewGenerated } from '../utils/review'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const ICON_MAP = {
  TrendingUp, TrendingDown, Flame, Repeat2, Target,
  AlertTriangle, PieChart, DollarSign, CheckCircle2, Minus, Sparkles,
}

const TYPE_STYLES = {
  positive: 'border-neon/20 bg-neon/5',
  info: 'border-blue-400/20 bg-blue-400/5',
  warning: 'border-yellow-400/20 bg-yellow-400/5',
}

const TYPE_ICON_COLORS = {
  positive: 'text-neon bg-neon/10',
  info: 'text-blue-400 bg-blue-400/10',
  warning: 'text-yellow-400 bg-yellow-400/10',
}

export default function MonthlyReview() {
  const { t } = useTranslation()
  const { transactions, recurring, insights } = useFinance()
  const [review, setReview] = useState(null)

  useEffect(() => {
    const now = new Date()
    if (!wasReviewGenerated(now.getFullYear(), now.getMonth())) {
      const r = generateMonthlyReview(transactions, recurring)
      if (r) {
        setReview(r)
        markReviewGenerated(now.getFullYear(), now.getMonth())
      }
    } else {
      const r = generateMonthlyReview(transactions, recurring)
      setReview(r)
    }
  }, [transactions, recurring])

  if (!review || transactions.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Sparkles size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('settings.monthly_review')}</h1>
        </div>
        <GlassCard>
          <EmptyState icon={Sparkles} title={t('common.no_data')} description={t('monthlyReview.noDataDesc')} />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Sparkles size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">{t('settings.monthly_review')}</h1>
      </div>
      <p className="text-xs text-gray-500 mb-5">{review.month}</p>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">{t('common.income')}</p>
          <p className="text-sm font-extrabold text-neon tabular-nums">{formatCurrency(review.income)}</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">{t('common.expense')}</p>
          <p className="text-sm font-extrabold text-red-400 tabular-nums">{formatCurrency(review.expense)}</p>
        </GlassCard>
        <GlassCard className="!p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">{t('common.balance')}</p>
          <p className={`text-sm font-extrabold tabular-nums ${review.balance >= 0 ? 'text-neon' : 'text-red-400'}`}>
            {review.balance >= 0 ? '+' : ''}{formatCurrency(review.balance)}
          </p>
        </GlassCard>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <History size={14} className="text-gray-500" />
        <p className="text-xs font-semibold text-gray-500">{t('monthlyReview.highlights')}</p>
        <span className="text-[10px] text-gray-600">{t('monthlyReview.transactionCount', { count: review.transactionCount })}</span>
      </div>

      <div className="space-y-2">
        {review.items.map((item, i) => {
          const Icon = ICON_MAP[item.icon] || Sparkles
          const colorClass = TYPE_ICON_COLORS[item.type] || TYPE_ICON_COLORS.info
          const borderClass = TYPE_STYLES[item.type] || TYPE_STYLES.info
          return (
            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${borderClass} animate-fade-in`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-medium">{item.text}</p>
              </div>
            </div>
          )
        })}
      </div>

      {review.score !== null && (
        <GlassCard className="mt-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              review.score >= 650 ? 'bg-neon/10 text-neon' : review.score >= 500 ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('monthlyReview.financialScore', { score: review.score })}</p>
              <p className="text-[11px] text-gray-500">
                {review.score >= 800 ? t('health.excellent') : review.score >= 650 ? t('health.good') : review.score >= 500 ? t('health.fair') : t('health.poor')}
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
