import { useState, useMemo } from 'react'
import {
  Award, Sparkles, TrendingUp, Zap, Wallet, PieChart, Target, CheckCircle,
  Landmark, Star, PiggyBank, Heart, Flame, ArrowLeftRight, CreditCard,
  Repeat2, Download, Calendar, Trophy,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import { getStoredNetWorthHistory } from '../utils/networth'
import { calculateHealthScore } from '../utils/financialHealth'
import {
  getAchievementsWithStatus, getAchievementStats,
  checkAndUnlockAchievements,
} from '../utils/achievements'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const ICON_MAP = {
  sparkles: Sparkles, 'trending-up': TrendingUp, zap: Zap, award: Award,
  wallet: Wallet, 'pie-chart': PieChart, target: Target, 'check-circle': CheckCircle,
  landmark: Landmark, star: Star, 'piggy-bank': PiggyBank, heart: Heart,
  flame: Flame, 'arrow-left-right': ArrowLeftRight, 'credit-card': CreditCard,
  'repeat-2': Repeat2, download: Download, calendar: Calendar,
}

const CATEGORY_COLORS = {
  milestone: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  achievement: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  streak: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
}

export default function AchievementsPage() {
  const { t } = useTranslation()
  const { transactions, budgets, debts, goals, emis, recurring } = useFinance()
  const [activeCategory, setActiveCategory] = useState('all')
  const [justUnlocked, setJustUnlocked] = useState([])

  const CATEGORY_LABELS = {
    milestone: t('achievements.categoryMilestones'),
    achievement: t('achievements.categoryAchievements'),
    streak: t('achievements.categoryStreaks'),
  }

  const accounts = useMemo(() => {
    try {
      const raw = localStorage.getItem('shyblack_net_worth_accounts')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }, [])

  const transfers = useMemo(() => {
    try {
      const raw = localStorage.getItem('shyblack_transfers')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }, [])

  const nwHistory = useMemo(() => getStoredNetWorthHistory(), [])
  const lastNw = nwHistory.length > 0 ? nwHistory[nwHistory.length - 1].netWorth : 0

  const healthResult = useMemo(() => {
    try { return calculateHealthScore(transactions, budgets, debts, goals) }
    catch { return { score: 0 } }
  }, [transactions, budgets, debts, goals])

  const streak = 0
  const backupCount = 0
  const activeMonths = useMemo(() => {
    const months = new Set()
    transactions.forEach((t) => {
      if (t.date) months.add(t.date.substring(0, 7))
    })
    return months.size
  }, [transactions])
  const reviewCompleted = 0

  const state = useMemo(() => ({
    transactions, budgets, debts, goals, emis, recurring, accounts, transfers,
    netWorth: lastNw,
    savingsRate: healthResult.categories?.find((c) => c.key === 'savingsRate')?.detail
      ? parseInt(healthResult.categories.find((c) => c.key === 'savingsRate').detail) : 0,
    healthScore: healthResult.score,
    streak, backupCount, activeMonths, reviewCompleted,
    getGoalProjection: null,
  }), [transactions, budgets, debts, goals, emis, recurring, accounts, transfers, lastNw, healthResult, streak, backupCount, activeMonths, reviewCompleted])

  const achievements = useMemo(() => {
    const result = getAchievementsWithStatus(state)
    const { newlyUnlocked } = checkAndUnlockAchievements(state)
    if (newlyUnlocked.length > 0) setJustUnlocked(newlyUnlocked)
    return result
  }, [state])

  const stats = useMemo(() => getAchievementStats(achievements), [achievements])

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return achievements
    return achievements.filter((a) => a.category === activeCategory)
  }, [achievements, activeCategory])

  const categories = ['all', ...new Set(achievements.map((a) => a.category))]

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Award size={18} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold">{t('achievements.title')}</h1>
      </div>

      {/* Just unlocked banner */}
      {justUnlocked.length > 0 && (
        <GlassCard className="mb-4 border-amber-500/20 animate-fade-in">
          <div className="text-center">
            <Trophy size={24} className="text-amber-400 mx-auto mb-1" />
            <p className="text-xs font-bold text-amber-400">{t('achievements.newAchievementUnlocked', { count: justUnlocked.length })}</p>
            {justUnlocked.map((a) => (
              <p key={a.id} className="text-[10px] text-gray-400 mt-0.5">{a.name}: {a.description}</p>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Stats */}
      <GlassCard brand className="mb-4">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-gradient-brand">{stats.progress}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{stats.unlocked} / {stats.total} {t('achievements.label')}</p>
          <div className="w-full h-1.5 bg-matte-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-neon transition-all"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="flex justify-center gap-3 mt-2 text-[9px] text-gray-600">
            {Object.entries(stats.byCategory).map(([cat, data]) => (
              <span key={cat}>{CATEGORY_LABELS[cat] || cat}: {data.unlocked}/{data.total}</span>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Category Filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {cat === 'all' ? t('achievements.all') : CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      {filtered.length === 0 ? (
        <GlassCard>
          <EmptyState icon={Award} title={t('achievements.emptyTitle')} description={t('achievements.emptyDescription')} />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((ach) => {
            const Icon = ICON_MAP[ach.icon] || Award
            const catColor = CATEGORY_COLORS[ach.category] || CATEGORY_COLORS.milestone
            return (
              <GlassCard
                key={ach.id}
                className={`!p-3 transition-all ${ach.unlocked ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${catColor.bg}`}>
                    <Icon size={16} className={ach.unlocked ? catColor.text : 'text-gray-600'} />
                  </div>
                  <p className="text-[11px] font-semibold leading-tight">{ach.name}</p>
                  <p className="text-[9px] text-gray-500 leading-tight">{ach.description}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <p className="text-[8px] text-gray-600">
                      {new Date(ach.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
