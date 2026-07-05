import { useState, useMemo, useEffect } from 'react'
import {
  TrendingUp, AlertTriangle, Settings,
  BarChart3, 
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import {
  calculateCashFlowForecast,
  getForecastConfig,
  saveForecastConfig,
} from '../utils/cashFlowForecast'
import GlassCard from '../components/GlassCard'

export default function CashFlowForecastPage() {
  const { t } = useTranslation()
  const { transactions, budgets, recurring, emis, debts } = useFinance()
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState(getForecastConfig)

  const forecast = useMemo(() => {
    return calculateCashFlowForecast({
      transactions,
      budgets,
      recurring,
      emis,
      debts,
      ...config,
    })
  }, [transactions, budgets, recurring, emis, debts, config])

  const handleConfigChange = (key, value) => {
    const updated = { ...config, [key]: value }
    setConfig(updated)
    saveForecastConfig(updated)
  }

  const [barHeights, setBarHeights] = useState({})

  useEffect(() => {
    const maxVal = Math.max(
      ...forecast.incomeProjections.map(Math.abs),
      ...forecast.expenseProjections.map(Math.abs),
      1
    )
    const heights = {}
    forecast.months.forEach((_, i) => {
      heights[`inc-${i}`] = (Math.abs(forecast.incomeProjections[i]) / maxVal) * 100
      heights[`exp-${i}`] = (Math.abs(forecast.expenseProjections[i]) / maxVal) * 100
      heights[`bal-${i}`] = Math.min(
        ((forecast.balanceProjections[i] - Math.min(...forecast.balanceProjections)) /
          Math.max(Math.max(...forecast.balanceProjections) - Math.min(...forecast.balanceProjections), 1)) *
          100,
        100
      )
    })
    setBarHeights(heights)
  }, [forecast])

  const summary = forecast.summary
  const healthColors = {
    strong: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
    stable: { text: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
    declining: { text: 'text-orange-400', bg: 'bg-orange-500/10', dot: 'bg-orange-400' },
    critical: { text: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
  }
  const hc = healthColors[summary.overallHealth] || healthColors.stable

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-cyan-400" />
          </div>
          <h1 className="text-xl font-bold">{t('cashflow.title')}</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <GlassCard className="mb-4 border-cyan-500/20">
          <h3 className="text-xs font-bold mb-3">{t('cashflow.settings')}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">{t('cashflow.forecastMonths')}</label>
              <input
                type="range"
                min="1"
                max="12"
                value={config.forecastMonths}
                onChange={(e) => handleConfigChange('forecastMonths', Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <span className="text-xs text-gray-400">{t('cashflow.months', { count: config.forecastMonths })}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={config.includeRecurring}
                  onChange={(e) => handleConfigChange('includeRecurring', e.target.checked)}
                  className="accent-cyan-400"
                /> {t('cashflow.includeRecurring')}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={config.includeEmis}
                  onChange={(e) => handleConfigChange('includeEmis', e.target.checked)}
                  className="accent-cyan-400"
                /> {t('cashflow.includeEmis')}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={config.includeDebts}
                  onChange={(e) => handleConfigChange('includeDebts', e.target.checked)}
                  className="accent-cyan-400"
                /> {t('cashflow.includeDebts')}
              </label>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Health Card */}
      <GlassCard brand className="mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${hc.dot}`} />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              {t('cashflow.financialHealth')}
            </p>
          </div>
          <p className={`text-2xl font-extrabold tabular-nums ${hc.text}`}>
            {summary.overallHealth.charAt(0).toUpperCase() + summary.overallHealth.slice(1)}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
            <span>{t('cashflow.savingsRate', { rate: summary.savingsRate })}</span>
            <span>{t('cashflow.forecastMonthsLabel', { count: summary.forecastMonths })}</span>
          </div>
        </div>
      </GlassCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <GlassCard>
          <p className="text-[10px] text-gray-500 mb-0.5">{t('cashflow.currentCash')}</p>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(summary.currentCash)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] text-gray-500 mb-0.5">{t('cashflow.avgIncome')}</p>
          <p className="text-sm font-bold tabular-nums text-emerald-400">
            {formatCurrency(summary.avgMonthlyIncome)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] text-gray-500 mb-0.5">{t('cashflow.avgExpenses')}</p>
          <p className="text-sm font-bold tabular-nums text-red-400">
            {formatCurrency(summary.avgMonthlyExpenses)}
          </p>
        </GlassCard>
      </div>

      {/* Risk Flags */}
      {summary.riskFlags.length > 0 && (
        <GlassCard className={`mb-4 ${
          summary.riskFlags[0].severity === 'critical' ? 'border-red-500/20' : 'border-orange-500/20'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-orange-400" />
            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
              {t('cashflow.riskAlerts', { count: summary.riskFlags.length })}
            </span>
          </div>
          <div className="space-y-1.5">
            {summary.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  flag.severity === 'critical' ? 'bg-red-400' : 'bg-orange-400'
                }`} />
                <span className="text-gray-400">{flag.month}:</span>
                <span className={`${flag.severity === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>
                  {flag.message}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Monthly Projections Chart */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 size={12} className="text-cyan-400" />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {t('cashflow.incomeVsExpenses')}
          </span>
        </div>
        <div className="flex items-end justify-between gap-1.5 h-32">
          {forecast.months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
              <div className="w-full flex justify-center gap-0.5">
                <div
                  className="w-2 bg-emerald-400/70 rounded-t-sm transition-all"
                  style={{ height: `${barHeights[`inc-${i}`] || 0}%` }}
                />
                <div
                  className="w-2 bg-red-400/70 rounded-t-sm transition-all"
                  style={{ height: `${barHeights[`exp-${i}`] || 0}%` }}
                />
              </div>
              <span className="text-[8px] text-gray-600 mt-1 truncate w-full text-center">
                {m.month.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-3 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-400/70" /> {t('cashflow.income')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-red-400/70" /> {t('cashflow.expenses')}
          </span>
        </div>
      </GlassCard>

      {/* Monthly Detail */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">{t('cashflow.monthlyProjections')}</h2>
        {forecast.months.map((m, i) => (
          <GlassCard key={i}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold">{m.month}</p>
              <div className={`text-[10px] font-medium tabular-nums ${
                m.netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {m.netCashflow >= 0 ? '+' : ''}{formatCurrency(m.netCashflow)}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex-1">
                <div className="flex justify-between text-gray-500 mb-0.5">
                  <span>{t('cashflow.income')}</span>
                  <span className="text-emerald-400 font-medium tabular-nums">{formatCurrency(m.income)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{t('cashflow.expenses')}</span>
                  <span className="text-red-400 font-medium tabular-nums">{formatCurrency(m.expenses)}</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="text-right">
                <p className="text-gray-600">{t('cashflow.balance')}</p>
                <p className={`text-xs font-semibold tabular-nums ${
                  m.runningBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {formatCurrency(m.runningBalance)}
                </p>
              </div>
            </div>

            {/* Mini range bar */}
            <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-600">
              <span>{t('cashflow.pessimistic')}</span>
              <div className="flex-1 h-1 rounded-full bg-matte-200 overflow-hidden relative">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-orange-400 to-emerald-400"
                  style={{
                    left: `${Math.min(Math.max(((m.pessimistic.netCashflow + Math.abs(Math.min(...forecast.months.map((x) => x.pessimistic.netCashflow)))) /
                      Math.max(Math.max(...forecast.months.map((x) => x.optimistic.netCashflow)) - Math.min(...forecast.months.map((x) => x.pessimistic.netCashflow)), 1)) * 100, 0), 100)}%`,
                    width: `${Math.min(Math.max(((m.optimistic.netCashflow - m.pessimistic.netCashflow) /
                      Math.max(Math.max(...forecast.months.map((x) => x.optimistic.netCashflow)) - Math.min(...forecast.months.map((x) => x.pessimistic.netCashflow)), 1)) * 100, 0), 100)}%`,
                  }}
                />
              </div>
              <span>{t('cashflow.optimistic')}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
