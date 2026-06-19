import { useMemo, useState } from 'react'
import { ArrowLeft, Calendar, BarChart3, TrendingUp, TrendingDown, Target, CreditCard, Users, Wallet, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const REVIEW_TABS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
]

function ReviewCard({ review, expanded, onToggle }) {
  if (!review) return null
  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">{review.label}</h2>
          {expanded ? <ChevronUp size={14} className="text-gray-500 ml-auto" /> : <ChevronDown size={14} className="text-gray-500 ml-auto" />}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="text-center">
            <p className="text-xs text-emerald-400 font-semibold tabular-nums">{formatCurrency(review.income)}</p>
            <p className="text-[9px] text-gray-600">Income</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-red-400 font-semibold tabular-nums">{formatCurrency(review.expense)}</p>
            <p className="text-[9px] text-gray-600">Expense</p>
          </div>
          <div className="text-center">
            <p className={`text-xs font-semibold tabular-nums ${review.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(review.savings)}
            </p>
            <p className="text-[9px] text-gray-600">Savings</p>
          </div>
        </div>
        {review.transactionCount > 0 && (
          <p className="text-[10px] text-gray-500">
            {review.transactionCount} transactions · {review.savingsRate.toFixed(1)}% savings rate
          </p>
        )}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
          {review.topCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Top Spending</p>
              <div className="space-y-1">
                {review.topCategories.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{cat}</span>
                    <span className="text-xs text-gray-300 tabular-nums">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500">Debts Owed</p>
              <p className="text-xs text-emerald-400 font-semibold tabular-nums">{formatCurrency(review.debts.owed)}</p>
              <p className="text-[9px] text-gray-600">{review.debts.activeCount} active</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Debts Borrowed</p>
              <p className="text-xs text-red-400 font-semibold tabular-nums">{formatCurrency(review.debts.borrowed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Active EMIs</p>
              <p className="text-xs text-orange-400 font-semibold tabular-nums">{review.emis.activeCount}</p>
              <p className="text-[9px] text-gray-600">{formatCurrency(review.emis.monthlyTotal)}/mo</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Goal Savings</p>
              <p className="text-xs text-purple-400 font-semibold tabular-nums">{formatCurrency(review.goals.saved)}</p>
              <p className="text-[9px] text-gray-600">of {formatCurrency(review.goals.target)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-gray-500">Net Worth</span>
            <span className={`text-xs font-bold tabular-nums ${review.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(review.netWorth)}
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export default function ReviewCenterPage({ onNavigate }) {
  const { transactions, reviewSummary } = useFinance()
  const [activeTab, setActiveTab] = useState('monthly')
  const [expandedId, setExpandedId] = useState(null)

  const currentReview = useMemo(() => {
    if (!reviewSummary) return null
    return reviewSummary[activeTab]
  }, [reviewSummary, activeTab])

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <BarChart3 size={18} className="text-blue-400" />
          <h1 className="text-xl font-bold">Financial Review</h1>
        </div>
        <GlassCard>
          <EmptyState icon={FileText} title="No Data Yet" description="Add transactions to generate financial reviews" />
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <BarChart3 size={18} className="text-blue-400" />
        <h1 className="text-xl font-bold">Financial Review</h1>
      </div>

      <div className="flex gap-1.5 mb-4">
        {REVIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {currentReview && (
          <ReviewCard
            review={currentReview}
            expanded={expandedId === activeTab}
            onToggle={() => setExpandedId(expandedId === activeTab ? null : activeTab)}
          />
        )}
      </div>
    </div>
  )
}
