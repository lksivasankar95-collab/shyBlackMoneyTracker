import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first_transaction',
    name: 'First Step',
    description: 'Add your first transaction',
    icon: 'sparkles',
    category: 'milestone',
    check: (state) => state.transactions.length >= 1,
  },
  {
    id: 'first_10',
    name: 'Getting Started',
    description: 'Add 10 transactions',
    icon: 'trending-up',
    category: 'milestone',
    check: (state) => state.transactions.length >= 10,
  },
  {
    id: 'first_100',
    name: 'Power User',
    description: 'Add 100 transactions',
    icon: 'zap',
    category: 'milestone',
    check: (state) => state.transactions.length >= 100,
  },
  {
    id: 'first_1000',
    name: 'Finance Guru',
    description: 'Add 1,000 transactions',
    icon: 'award',
    category: 'milestone',
    check: (state) => state.transactions.length >= 1000,
  },
  {
    id: 'budget_set',
    name: 'Budget Planner',
    description: 'Set up your first budget',
    icon: 'wallet',
    category: 'milestone',
    check: (state) => Object.keys(state.budgets || {}).length >= 1,
  },
  {
    id: 'budget_all',
    name: 'Full Coverage',
    description: 'Set budgets for all spending categories',
    icon: 'pie-chart',
    category: 'milestone',
    check: (state) => {
      const cats = Object.values(state.budgets || {}).filter((b) => b.limit > 0)
      return cats.length >= 5
    },
  },
  {
    id: 'goal_set',
    name: 'Goal Setter',
    description: 'Create your first financial goal',
    icon: 'target',
    category: 'milestone',
    check: (state) => state.goals.length >= 1,
  },
  {
    id: 'goal_achieved',
    name: 'Goal Crusher',
    description: 'Complete a financial goal',
    icon: 'check-circle',
    category: 'achievement',
    check: (state) => state.goals.some((g) => {
      const p = state.getGoalProjection ? state.getGoalProjection(g) : null
      return p?.isAchieved
    }),
  },
  {
    id: 'debt_recorded',
    name: 'Debt Tracker',
    description: 'Record your first debt',
    icon: 'landmark',
    category: 'milestone',
    check: (state) => state.debts.length >= 1,
  },
  {
    id: 'debt_cleared',
    name: 'Debt Free',
    description: 'Clear all your debts',
    icon: 'check-circle',
    category: 'achievement',
    check: (state) => state.debts.length > 0 && state.debts.every((d) => d.remainingAmount <= 0),
  },
  {
    id: 'net_worth_positive',
    name: 'In the Green',
    description: 'Net worth becomes positive',
    icon: 'trending-up',
    category: 'achievement',
    check: (state) => state.netWorth > 0,
  },
  {
    id: 'net_worth_1lakh',
    name: 'First ₹1L',
    description: 'Reach ₹1,00,000 net worth',
    icon: 'star',
    category: 'milestone',
    check: (state) => state.netWorth >= 100000,
  },
  {
    id: 'net_worth_10lakh',
    name: 'Lakhpati',
    description: 'Reach ₹10,00,000 net worth',
    icon: 'award',
    category: 'milestone',
    check: (state) => state.netWorth >= 1000000,
  },
  {
    id: 'savings_rate_20',
    name: 'Smart Saver',
    description: 'Maintain 20%+ savings rate',
    icon: 'piggy-bank',
    category: 'achievement',
    check: (state) => state.savingsRate >= 20,
  },
  {
    id: 'health_score_80',
    name: 'Financially Fit',
    description: 'Achieve 80+ financial health score',
    icon: 'heart',
    category: 'achievement',
    check: (state) => state.healthScore >= 80,
  },
  {
    id: 'streak_7',
    name: 'Weekly Warrior',
    description: 'Log in 7 days in a row',
    icon: 'flame',
    category: 'streak',
    check: (state) => state.streak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Log in 30 days in a row',
    icon: 'flame',
    category: 'streak',
    check: (state) => state.streak >= 30,
  },
  {
    id: 'account_created',
    name: 'Account Holder',
    description: 'Create your first net worth account',
    icon: 'wallet',
    category: 'milestone',
    check: (state) => (state.accounts || []).length >= 1,
  },
  {
    id: 'transfer_made',
    name: 'Money Mover',
    description: 'Make your first transfer between accounts',
    icon: 'arrow-left-right',
    category: 'milestone',
    check: (state) => (state.transfers || []).length >= 1,
  },
  {
    id: 'emi_set',
    name: 'EMI Tracker',
    description: 'Track your first EMI',
    icon: 'credit-card',
    category: 'milestone',
    check: (state) => (state.emis || []).length >= 1,
  },
  {
    id: 'recurring_set',
    name: 'Subscription Manager',
    description: 'Set up your first recurring transaction',
    icon: 'repeat-2',
    category: 'milestone',
    check: (state) => (state.recurring || []).length >= 1,
  },
  {
    id: 'backup_done',
    name: 'Safe & Secure',
    description: 'Export your first backup',
    icon: 'download',
    category: 'achievement',
    check: (state) => state.backupCount >= 1,
  },
  {
    id: 'multi_month',
    name: 'Dedicated',
    description: 'Use the app for 3+ different months',
    icon: 'calendar',
    category: 'streak',
    check: (state) => state.activeMonths >= 3,
  },
  {
    id: 'review_done',
    name: 'Monthly Review',
    description: 'Complete a monthly review',
    icon: 'sparkles',
    category: 'achievement',
    check: (state) => state.reviewCompleted >= 1,
  },
]

export function getUnlockedAchievements() {
  return safeStorage.get(STORAGE_KEYS.ACHIEVEMENTS, [])
}

export function saveUnlockedAchievements(achievements) {
  safeStorage.set(STORAGE_KEYS.ACHIEVEMENTS, achievements)
}

export function checkAndUnlockAchievements(state) {
  const unlocked = getUnlockedAchievements()
  const unlockedIds = new Set(unlocked.map((a) => a.id))
  const newlyUnlocked = []

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIds.has(def.id)) continue
    if (def.check(state)) {
      const entry = {
        id: def.id,
        unlockedAt: Date.now(),
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
      }
      unlocked.push(entry)
      newlyUnlocked.push(entry)
      unlockedIds.add(def.id)
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedAchievements(unlocked)
  }

  return { unlocked, newlyUnlocked }
}

export function getAchievementsWithStatus(_state) {
  const unlocked = getUnlockedAchievements()
  const unlockedIds = new Set(unlocked.map((a) => a.id))

  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const isUnlocked = unlockedIds.has(def.id)
    const unlockedData = unlocked.find((a) => a.id === def.id)
    return {
      ...def,
      unlocked: isUnlocked,
      unlockedAt: unlockedData?.unlockedAt || null,
    }
  })
}

export function getAchievementStats(achievements) {
  const total = ACHIEVEMENT_DEFINITIONS.length
  const unlocked = achievements.filter((a) => a.unlocked).length
  const byCategory = {}
  for (const a of achievements) {
    byCategory[a.category] = byCategory[a.category] || { total: 0, unlocked: 0 }
    byCategory[a.category].total++
    if (a.unlocked) byCategory[a.category].unlocked++
  }
  return { total, unlocked, progress: total > 0 ? Math.round((unlocked / total) * 100) : 0, byCategory }
}
