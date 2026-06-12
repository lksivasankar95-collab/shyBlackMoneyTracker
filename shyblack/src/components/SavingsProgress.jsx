import { Target, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'

export default function SavingsProgress({ savingsGoal, compact }) {
  const progress = savingsGoal.target > 0 ? Math.min((savingsGoal.saved / savingsGoal.target) * 100, 100) : 0
  const remaining = Math.max(0, savingsGoal.target - savingsGoal.saved)

  if (savingsGoal.target === 0) return null

  return (
    <div className={`${compact ? '' : 'glass p-4'}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`${compact ? '' : 'w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center'}`}>
            <Target size={compact ? 14 : 16} className="text-neon" />
          </div>
          <div>
            <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>Savings Goal</p>
            {!compact && <p className="text-[11px] text-gray-500">{formatCurrency(savingsGoal.saved)} of {formatCurrency(savingsGoal.target)}</p>}
          </div>
        </div>
        {!compact && (
          <span className="text-xs font-semibold text-neon tabular-nums">{progress.toFixed(0)}%</span>
        )}
      </div>
      <div className="w-full h-2.5 bg-matte-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full relative transition-all duration-1000 ease-out"
          style={{
            width: `${Math.max(progress, 2)}%`,
            background: `linear-gradient(90deg, #39ff14, #22c55e${progress > 50 ? ', #16a34a' : ''})`,
            boxShadow: '0 0 8px rgba(57, 255, 20, 0.3)',
          }}
        >
          {progress > 15 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded-full" />
          )}
        </div>
      </div>
      {remaining > 0 && compact && (
        <p className="text-[10px] text-gray-500 mt-1 tabular-nums">{formatCurrency(remaining)} remaining</p>
      )}
      {!compact && progress >= 100 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-neon">
          <TrendingUp size={12} />
          <span>Goal completed! Great job!</span>
        </div>
      )}
    </div>
  )
}
