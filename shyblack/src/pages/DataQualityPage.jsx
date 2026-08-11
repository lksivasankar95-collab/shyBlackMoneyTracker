import { useMemo } from 'react'
import {
  AlertCircle, CheckCircle2, ShieldAlert, ArrowLeft, FileText, Tag, Calendar, Wallet, Link2,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency } from '../utils/helpers'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const CHECK_ICONS = {
  'Missing Categories': Tag,
  'Duplicate Transactions': FileText,
  'Similar Transactions': FileText,
  'Orphaned Documents': FileText,
  'Inactive Accounts': Wallet,
  'Broken Relationships': Link2,
  'Invalid Dates': Calendar,
}

const SEVERITY_COLORS = {
  low: 'text-gray-400 bg-gray-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  high: 'text-red-400 bg-red-500/10',
}

export default function DataQualityPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions, dataQuality } = useFinance()

  const checks = useMemo(() => {
    if (!dataQuality || !dataQuality.issues) return []
    const grouped = {}
    for (const issue of dataQuality.issues) {
      if (!grouped[issue.check]) grouped[issue.check] = []
      grouped[issue.check].push(issue)
    }
    return Object.entries(grouped).map(([name, items]) => ({
      name,
      count: items.length,
      items,
      icon: CHECK_ICONS[name] || AlertCircle,
    }))
  }, [dataQuality])

  if (!dataQuality || dataQuality.total === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <ShieldAlert size={18} className="text-emerald-400" />
          <h1 className="text-xl font-bold">{t('data_quality.title')}</h1>
        </div>
        <GlassCard>
          <EmptyState icon={CheckCircle2} title={t('data_quality.all_clear')} description={t('data_quality.all_clear_desc')} />
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
        <ShieldAlert size={18} className="text-amber-400" />
        <h1 className="text-xl font-bold">{t('data_quality.title')}</h1>
        <span className="text-xs text-gray-500 ml-auto">{t('transactions.transactions_count', { count: transactions.length })}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <GlassCard className="!p-3 text-center">
          <p className="text-2xl font-bold text-white tabular-nums">{dataQuality.total}</p>
          <p className="text-[10px] text-gray-500">{t('data_quality.total_issues')}</p>
        </GlassCard>
        <GlassCard className="!p-3 text-center">
          <p className="text-2xl font-bold text-amber-400 tabular-nums">{dataQuality.bySeverity.medium || 0}</p>
          <p className="text-[10px] text-gray-500">{t('data_quality.medium')}</p>
        </GlassCard>
        <GlassCard className="!p-3 text-center">
          <p className="text-2xl font-bold text-gray-400 tabular-nums">{dataQuality.bySeverity.low || 0}</p>
          <p className="text-[10px] text-gray-500">{t('data_quality.low')}</p>
        </GlassCard>
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <GlassCard key={check.name}>
            <div className="flex items-center gap-2 mb-2">
              <check.icon size={14} className="text-amber-400" />
              <h2 className="text-xs font-semibold text-gray-300">{check.name}</h2>
              <span className="text-[10px] text-gray-600 ml-auto">{check.count !== 1 ? t('data_quality.issues_count_plural', { count: check.count }) : t('data_quality.issues_count', { count: check.count })}</span>
            </div>
            <div className="space-y-1.5">
              {check.items.slice(0, 10).map((issue) => (
                <div key={issue.id || Math.random()} className="flex items-start gap-2 py-1">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_COLORS[issue.severity]?.split(' ')[0].replace('text-', 'bg-') || 'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">{issue.issue}</p>
                    {issue.note && <p className="text-[10px] text-gray-600 truncate">{issue.note} · {formatCurrency(Math.abs(issue.amount || 0))}</p>}
                    {issue.title && <p className="text-[10px] text-gray-600 truncate">{issue.title}</p>}
                    {issue.name && <p className="text-[10px] text-gray-600 truncate">{issue.name} · {formatCurrency(Math.abs(issue.balance || 0))}</p>}
                  </div>
                </div>
              ))}
              {check.items.length > 10 && (
                <p className="text-[10px] text-gray-600 text-center pt-1">+{check.items.length - 10} more</p>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
