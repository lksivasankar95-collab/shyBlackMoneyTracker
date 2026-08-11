import { useState, useMemo, useCallback } from 'react'
import { ArrowLeft, Calculator, Landmark, TrendingUp, Info, PiggyBank } from 'lucide-react'
import { useTranslation } from '../i18n'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import {
  FINANCIAL_YEARS, estimateIncomeTax, aggregateIncomeByFY, estimateCapitalGainsTax,
} from '../utils/incomeTax'
import GlassCard from '../components/GlassCard'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

function NumericInput({ label, value, placeholder, onChange, hint, max }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="text-[11px] text-gray-500 font-medium mb-1 block">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        placeholder={placeholder}
        className="input-field text-sm tabular-nums"
      />
      {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
      {max && (
        <p className="text-[10px] text-gray-600 mt-1">
          {t('income_tax.cap')} {formatCurrency(max)}
        </p>
      )}
    </div>
  )
}

function RegimeCard({ title, regime, recommended, t }) {
  return (
    <GlassCard className={`!p-4 ${recommended ? 'border-neon/40' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {recommended && (
          <span className="text-[10px] font-semibold text-neon bg-neon/10 px-2 py-0.5 rounded-full">
            {t('income_tax.recommended')}
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">{t('income_tax.taxable_income')}</span>
          <span className="tabular-nums text-gray-300">₹{fmt(regime.taxableIncome)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('income_tax.tax_before_rebate')}</span>
          <span className="tabular-nums text-gray-300">₹{fmt(regime.taxBeforeRebate)}</span>
        </div>
        {regime.rebateApplied && (
          <div className="flex justify-between text-emerald-400">
            <span>{t('income_tax.rebate_87a')}</span>
            <span className="tabular-nums">−₹{fmt(regime.rebateAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">{t('income_tax.cess')} (4%)</span>
          <span className="tabular-nums text-gray-300">₹{fmt(regime.cess)}</span>
        </div>
        <div className="flex justify-between border-t border-white/[0.06] pt-2 text-sm font-bold">
          <span>{t('income_tax.total_tax')}</span>
          <span className="tabular-nums text-neon">₹{fmt(regime.total)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>{t('income_tax.effective_rate')}</span>
          <span className="tabular-nums">{(regime.effectiveRate * 100).toFixed(1)}%</span>
        </div>
      </div>
    </GlassCard>
  )
}

export default function IncomeTaxPage({ onNavigate }) {
  const { t } = useTranslation()
  const { transactions } = useFinance()
  const [fy, setFy] = useState('2026-27')
  const [overrides, setOverrides] = useState({})
  const [deductions, setDeductions] = useState({ d80c: '', nps: '' })
  const [cg, setCg] = useState({ equitySTCG: '', equityLTCG: '' })

  const autoIncome = useMemo(() => aggregateIncomeByFY(transactions, fy), [transactions, fy])

  const hasAutoIncome = useMemo(
    () => autoIncome.salary + autoIncome.freelance + autoIncome.investment + autoIncome.otherIncome > 0,
    [autoIncome]
  )

  const income = useMemo(() => {
    const merged = {
      salary: autoIncome.salary,
      freelance: autoIncome.freelance,
      investment: autoIncome.investment,
      otherIncome: autoIncome.otherIncome,
    }
    for (const key of Object.keys(merged)) {
      if (overrides[key] !== undefined && overrides[key] !== '') {
        merged[key] = Number(overrides[key]) || 0
      }
    }
    return merged
  }, [autoIncome, overrides])

  const estimate = useMemo(() => estimateIncomeTax({
    fy,
    salary: income.salary,
    freelance: income.freelance,
    investment: income.investment,
    otherIncome: income.otherIncome,
    deductions80C: Number(deductions.d80c) || 0,
    nps: Number(deductions.nps) || 0,
  }), [fy, income, deductions])

  const capitalGains = useMemo(() => estimateCapitalGainsTax({
    equitySTCG: Number(cg.equitySTCG) || 0,
    equityLTCG: Number(cg.equityLTCG) || 0,
  }), [cg])

  const setIncomeOverride = useCallback((key, value) => {
    setOverrides((prev) => ({ ...prev, [key]: value }))
  }, [])

  const inputValue = useCallback((key) => {
    return overrides[key] !== undefined ? overrides[key] : autoIncome[key] || ''
  }, [overrides, autoIncome])

  const totalLiability = estimate.recommended === 'new'
    ? estimate.newRegime.total + capitalGains.total
    : estimate.oldRegime.total + capitalGains.total

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => onNavigate?.('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold">{t('income_tax.title')}</h1>
          <p className="text-[10px] text-gray-500">{t('income_tax.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {FINANCIAL_YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setFy(y)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              fy === y ? 'bg-neon/10 text-neon border border-neon/40' : 'text-gray-500 border border-white/[0.06] hover:text-white'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <GlassCard className="mb-4 !p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-neon" />
          <h2 className="text-sm font-semibold">{t('income_tax.income_heading')}</h2>
        </div>
        {hasAutoIncome && (
          <p className="text-[10px] text-gray-500">{t('income_tax.auto_fill_note')}</p>
        )}
        {!hasAutoIncome && (
          <p className="text-[10px] text-gray-500">{t('income_tax.no_income_note')}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumericInput label={t('income_tax.salary')} value={inputValue('salary')} placeholder="0" onChange={(v) => setIncomeOverride('salary', v)} />
          <NumericInput label={t('income_tax.freelance')} value={inputValue('freelance')} placeholder="0" onChange={(v) => setIncomeOverride('freelance', v)} />
          <NumericInput label={t('income_tax.investment')} value={inputValue('investment')} placeholder="0" onChange={(v) => setIncomeOverride('investment', v)} />
          <NumericInput label={t('income_tax.other_income')} value={inputValue('otherIncome')} placeholder="0" onChange={(v) => setIncomeOverride('otherIncome', v)} />
        </div>
      </GlassCard>

      <GlassCard className="mb-4 !p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PiggyBank size={16} className="text-amber-400" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">{t('income_tax.deductions_heading')}</h2>
            <p className="text-[10px] text-gray-500">{t('income_tax.deductions_note')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumericInput
            label="80C"
            value={deductions.d80c}
            placeholder="0"
            onChange={(v) => setDeductions((prev) => ({ ...prev, d80c: v }))}
            hint={t('income_tax.d80c_hint')}
          />
          <NumericInput
            label="NPS (80CCD(1B))"
            value={deductions.nps}
            placeholder="0"
            onChange={(v) => setDeductions((prev) => ({ ...prev, nps: v }))}
            hint={t('income_tax.nps_hint')}
          />
        </div>
      </GlassCard>

      <GlassCard className="mb-4 !p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">{t('income_tax.capital_gains_heading')}</h2>
            <p className="text-[10px] text-gray-500">{t('income_tax.capital_gains_note')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumericInput label={t('income_tax.equity_stcg')} value={cg.equitySTCG} placeholder="0" onChange={(v) => setCg((prev) => ({ ...prev, equitySTCG: v }))} />
          <NumericInput label={t('income_tax.equity_ltcg')} value={cg.equityLTCG} placeholder="0" onChange={(v) => setCg((prev) => ({ ...prev, equityLTCG: v }))} />
        </div>
        {capitalGains.total > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('income_tax.cg_tax')}</span>
            <span className="tabular-nums text-gray-300">₹{fmt(capitalGains.total)}</span>
          </div>
        )}
      </GlassCard>

      {estimate.gross > 0 && (
        <div className="space-y-3">
          <RegimeCard title={t('income_tax.new_regime')} regime={estimate.newRegime} recommended={estimate.recommended === 'new'} t={t} />
          <RegimeCard title={t('income_tax.old_regime')} regime={estimate.oldRegime} recommended={estimate.recommended === 'old'} t={t} />

          <GlassCard className="!p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={16} className="text-neon" />
              <h3 className="text-sm font-semibold">{t('income_tax.liability_heading')}</h3>
            </div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs text-gray-500">{t('income_tax.total_liability')}</span>
              <span className="text-xl font-extrabold text-neon tabular-nums">₹{fmt(totalLiability)}</span>
            </div>
            <p className="text-[10px] text-gray-600">
              {t('income_tax.regime_saved', {
                regime: t(`income_tax.${estimate.recommended}_regime`),
                amount: formatCurrency(estimate.savings),
              })}
            </p>
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-white/[0.03]">
              <Info size={13} className="text-gray-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-gray-500 leading-relaxed">{t('income_tax.disclaimer')}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {estimate.gross === 0 && (
        <GlassCard className="!p-4 text-center">
          <p className="text-xs text-gray-500">{t('income_tax.enter_income')}</p>
        </GlassCard>
      )}
    </div>
  )
}
