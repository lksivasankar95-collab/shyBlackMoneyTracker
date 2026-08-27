import { useState, useMemo } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, PiggyBank, Calendar, Trophy, AlertTriangle, PieChart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import { getYearReview } from '../utils/yearReview'
import GlassCard from '../components/GlassCard'

const SummaryCard = ({ label, value, icon: Icon, accent }) => (
  <GlassCard className="p-3">
    <div className={`flex items-center gap-1.5 mb-1 ${accent || 'text-gray-500'}`}>
      <Icon size={12} />
      <p className="text-[10px] uppercase tracking-wider">{label}</p>
    </div>
    <p className="text-base font-bold tabular-nums text-white">{value}</p>
  </GlassCard>
)

export default function YearInReviewPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const nowYear = new Date().getFullYear()
  const years = useMemo(() => [nowYear, nowYear - 1, nowYear - 2], [nowYear])
  const [year, setYear] = useState(nowYear)

  const review = useMemo(() => getYearReview(transactions, year), [transactions, year])

  const chartData = review.months
    .filter((m) => m.savings !== 0 || m.income > 0 || m.expense > 0)
    .map((m) => ({ name: m.label, savings: m.savings }))

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-matte-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-glass-border">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-xl hover:bg-white/5" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t('yearReview.title')}</h1>
          <p className="text-xs text-gray-400">{t('yearReview.subtitle', { year })}</p>
        </div>
      </div>

      <div className="space-y-4 p-4 max-w-lg mx-auto">
        <div className="flex gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                y === year ? 'bg-neon text-black' : 'bg-matte-100 text-gray-500 hover:text-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {review.txCount === 0 ? (
          <GlassCard className="p-8 text-center space-y-3">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-400">{t('yearReview.empty', { year })}</p>
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <SummaryCard label={t('yearReview.income')} value={formatCurrency(review.income)} icon={TrendingUp} accent="text-neon" />
              <SummaryCard label={t('yearReview.expense')} value={formatCurrency(review.expense)} icon={TrendingDown} accent="text-red-400" />
              <SummaryCard label={t('yearReview.savings')} value={formatCurrency(review.savings)} icon={PiggyBank} accent="text-amber-400" />
              <SummaryCard label={t('yearReview.savings_rate')} value={`${review.savingsRate}%`} icon={PieChart} accent="text-purple-400" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {review.bestMonth && (
                <GlassCard className="p-3 border-neon/20">
                  <div className="flex items-center gap-1.5 mb-1 text-neon">
                    <Trophy size={12} />
                    <p className="text-[10px] uppercase tracking-wider">{t('yearReview.best_month')}</p>
                  </div>
                  <p className="text-base font-bold text-white">{review.bestMonth.label}</p>
                  <p className="text-xs text-neon tabular-nums">{formatCurrency(review.bestMonth.savings)}</p>
                </GlassCard>
              )}
              {review.worstMonth && (
                <GlassCard className="p-3 border-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1 text-red-400">
                    <AlertTriangle size={12} />
                    <p className="text-[10px] uppercase tracking-wider">{t('yearReview.worst_month')}</p>
                  </div>
                  <p className="text-base font-bold text-white">{review.worstMonth.label}</p>
                  <p className="text-xs text-red-400 tabular-nums">{formatCurrency(review.worstMonth.expense)}</p>
                </GlassCard>
              )}
            </div>

            <GlassCard className="p-4">
              <p className="text-sm font-semibold mb-3">{t('yearReview.monthly_chart')}</p>
              <div className="h-40 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="glass p-3 text-xs shadow-lg">
                            <p className="text-gray-400 mb-1 font-medium">{label}</p>
                            <p className="font-semibold tabular-nums">{formatCurrency(payload[0].value)}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="savings" radius={[3, 3, 0, 0]} maxBarSize={16}>
                      {chartData.map((d) => (
                        <Cell key={d.name} fill={d.savings >= 0 ? '#39ff14' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-neon" /> {t('yearReview.savings')}</span>
              </div>
            </GlassCard>

            {review.topCategories.length > 0 && (
              <GlassCard className="p-4">
                <p className="text-sm font-semibold mb-3">{t('yearReview.top_category')}</p>
                <div className="space-y-2">
                  {review.topCategories.map((c, i) => (
                    <div key={c.category} className="flex items-center justify-between">
                      <span className="text-xs capitalize text-gray-400">{c.category}</span>
                      <span className={`text-xs font-semibold tabular-nums ${i === 0 ? 'text-neon' : 'text-gray-300'}`}>
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </div>
  )
}