import { useState, useMemo } from 'react'
import { Target, CreditCard, BarChart3, Activity, Zap, Shield, AlertCircle } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import {
  forecastCashflow, forecastGoal, getGoalHealthScore, getGoalRecommendations,
  forecastEmiPayoff, forecastWealth, getOverspendingDetection,
  calculateRetirement, getEmergencyFundFromTransactions,
  generateForecastRecommendations, simulateScenario,
} from '../utils/forecastEngine'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const TABS = [
  { id: 'cashflow', label: 'Cashflow', icon: Activity },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'emi', label: 'EMI', icon: CreditCard },
  { id: 'wealth', label: 'Wealth', icon: BarChart3 },
  { id: 'retirement', label: 'Retirement', icon: Shield },
  { id: 'scenarios', label: 'Scenarios', icon: Zap },
]

function StatBox({ label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-3 flex-1 min-w-0">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max = 100, color = 'bg-neon', label }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div className="w-full h-2 bg-matte-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ═══ Cashflow Tab ═══ */

function CashflowTab({ transactions, recurring, emis, debts, budgets }) {
  const forecast = useMemo(() => forecastCashflow({ transactions, recurring, emis, debts, budgets }), [transactions, recurring, emis, debts, budgets])

  if (!forecast) return <EmptyState title="No data" description="Add transactions to see cashflow forecasts" />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Current Balance" value={formatCurrency(forecast.currentBalance)} color={forecast.currentBalance >= 0 ? 'text-neon' : 'text-red-400'} />
        <StatBox label="90d Projected" value={formatCurrency(forecast.projectedBalance)} color={forecast.projectedBalance >= 0 ? 'text-neon' : 'text-red-400'} />
        <StatBox label="Confidence" value={`${forecast.confidenceScore}%`} color={forecast.confidenceScore >= 60 ? 'text-neon' : 'text-amber-400'} />
      </div>

      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Cashflow Scenarios (90 days)</h3>
        <div className="space-y-2">
          {['bestCase', 'expectedCase', 'worstCase'].map((sc) => {
            const p = forecast.scenarios[sc]
            const p90 = p?.find((x) => x.periodDays === 90)
            if (!p90) return null
            const labels = { bestCase: 'Best Case', expectedCase: 'Expected', worstCase: 'Worst Case' }
            const colors = { bestCase: 'text-neon', expectedCase: 'text-white', worstCase: 'text-red-400' }
            const bars = { bestCase: 'bg-neon', expectedCase: 'bg-blue-400', worstCase: 'bg-red-400' }
            const maxVal = Math.max(1, ...['bestCase', 'expectedCase', 'worstCase'].map((s) => forecast.scenarios[s]?.find((x) => x.periodDays === 90)?.balance || 1))
            const pct = Math.max(0, (p90.balance / maxVal) * 100)
            return (
              <div key={sc} className="flex items-center gap-3">
                <span className="text-[10px] w-20 text-gray-500 shrink-0">{labels[sc]}</span>
                <div className="flex-1 h-3 bg-matte-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${bars[sc]} opacity-70`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-[10px] font-semibold w-24 text-right tabular-nums ${colors[sc]}`}>{formatCurrency(p90.balance)}</span>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Period Breakdown</h3>
        <div className="space-y-3">
          {forecast.periods.map((p) => (
            <div key={p.periodDays} className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">{p.periodLabel}</span>
                <span className={`text-xs font-bold tabular-nums ${p.expectedCase.projectedBalance >= 0 ? 'text-neon' : 'text-red-400'}`}>
                  {formatCurrency(p.expectedCase.projectedBalance)}
                </span>
              </div>
              <div className="flex gap-2 text-[10px] text-gray-500">
                <span>Income: {formatCurrency(p.expectedCase.projectedIncome)}</span>
                <span>Exp: {formatCurrency(p.expectedCase.projectedExpenses)}</span>
                <span>Savings: {formatCurrency(p.expectedCase.projectedSavings)}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {forecast.lowCashAlerts.length > 0 && (
        <div className="space-y-2">
          {forecast.lowCashAlerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300">{alert}</p>
            </div>
          ))}
        </div>
      )}

      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Month-End Prediction</h3>
        <p className="text-2xl font-bold text-gradient-brand">{formatCurrency(forecast.predictedMonthEndBalance)}</p>
        <p className="text-[10px] text-gray-500 mt-1">Expected balance at month end</p>
      </GlassCard>
    </div>
  )
}

/* ═══ Goals Tab ═══ */

function GoalsTab({ goals, transactions }) {
  const forecasts = useMemo(() => goals.map((g) => ({ goal: g, forecast: forecastGoal(g), health: getGoalHealthScore(g), recs: getGoalRecommendations(g, transactions) })), [goals, transactions])

  if (goals.length === 0) return <EmptyState title="No Goals" description="Create goals to see forecasts" />

  return (
    <div className="space-y-4">
      {forecasts.map(({ goal, forecast: f, health, recs }) => (
        <GlassCard key={goal.id}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white">{goal.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              health.status === 'on_track' ? 'bg-neon/10 text-neon' :
              health.status === 'slightly_delayed' ? 'bg-amber-500/10 text-amber-400' :
              health.status === 'high_risk' ? 'bg-orange-500/10 text-orange-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              {health.level}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatBox label="Target" value={formatCurrency(goal.target)} />
            <StatBox label="Saved" value={formatCurrency(goal.saved)} />
            <StatBox label="Monthly" value={formatCurrency(goal.monthlyContribution)} />
          </div>

          <ProgressBar value={f?.progress || 0} color="bg-gradient-to-r from-purple-500 to-neon" label="Progress" />

          {f && !f.isAchieved && (
            <div className="mt-3 p-2 bg-white/[0.03] rounded-lg">
              <p className="text-[10px] text-gray-500">
                Target Date: <span className="text-white font-medium">{f.targetLabel}</span>
                {f.monthsToGoal !== null && ` (${f.monthsToGoal} months)`}
              </p>
              <p className="text-[10px] text-gray-500">Remaining: <span className="text-white font-medium">{formatCurrency(f.remaining)}</span></p>
            </div>
          )}

          {f?.isAchieved && (
            <div className="mt-2 text-[10px] text-neon font-medium">Goal Achieved!</div>
          )}

          {recs.length > 0 && (
            <div className="mt-2 space-y-1">
              {recs.map((r, i) => (
                <p key={i} className="text-[10px] text-amber-400 flex items-start gap-1">
                  <span>•</span> {r}
                </p>
              ))}
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

/* ═══ EMI Tab ═══ */

function EmiTab({ emis }) {
  const activeEmis = useMemo(() => emis.filter((e) => e.status === 'active'), [emis])
  const [extraAmounts, setExtraAmounts] = useState({})

  const handleExtraChange = (id, value) => {
    setExtraAmounts((prev) => ({ ...prev, [id]: Math.max(0, parseInt(value) || 0) }))
  }

  const forecasts = useMemo(() => activeEmis.map((emi) => ({
    emi,
    forecast: forecastEmiPayoff(emi, extraAmounts[emi.id] || 0),
  })), [activeEmis, extraAmounts])

  if (activeEmis.length === 0) return <EmptyState title="No Active EMIs" description="Add EMIs to see payoff forecasts" />

  return (
    <div className="space-y-4">
      {forecasts.map(({ emi, forecast: f }) => {
        if (!f) return null
        return (
          <GlassCard key={emi.id}>
            <h3 className="text-xs font-semibold text-white mb-3">{f.loanName}</h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <StatBox label="Remaining" value={formatCurrency(emi.remainingAmount || 0)} />
              <StatBox label="Monthly EMI" value={formatCurrency(emi.emiAmount || emi.amount || 0)} />
            </div>

            <div className="p-2.5 bg-neon/5 border border-neon/10 rounded-lg mb-3">
              <p className="text-[10px] text-gray-500 mb-1">Current Pace — Closure: <span className="text-white font-medium">{f.current.closureLabel}</span></p>
              <p className="text-[10px] text-gray-500">Interest payable: <span className="text-red-400 font-medium">{formatCurrency(f.current.totalInterest)}</span></p>
            </div>

            {f.accelerated && (
              <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg mb-3">
                <p className="text-[10px] text-gray-500 mb-1">
                  Accelerated (extra ₹{f.accelerated.extraMonthly.toLocaleString()}/mo) — Closure: <span className="text-neon font-medium">{f.accelerated.closureLabel}</span>
                </p>
                <p className="text-[10px] text-gray-500">Interest saved: <span className="text-neon font-medium">{formatCurrency(f.interestSaved)}</span></p>
                <p className="text-[10px] text-gray-500">Months saved: <span className="text-neon font-medium">{f.monthsSaved} months</span></p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 shrink-0">Extra /mo:</label>
              <input
                type="number"
                min={0}
                step={100}
                value={extraAmounts[emi.id] || ''}
                onChange={(e) => handleExtraChange(emi.id, e.target.value)}
                className="flex-1 bg-matte-200 border border-glass-border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-neon/50"
                placeholder="0"
              />
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

/* ═══ Wealth Tab ═══ */

function WealthTab({ wealthAssets, accounts, transactions, debts, emis }) {
  const [model, setModel] = useState('balanced')
  const forecast = useMemo(() => forecastWealth({ wealthAssets, accounts, transactions, debts, emis, model }), [wealthAssets, accounts, transactions, debts, emis, model])

  const models = [
    { id: 'conservative', label: 'Conservative' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'aggressive', label: 'Aggressive' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            className={`text-[10px] font-medium py-1.5 px-2 rounded-lg border transition-colors ${
              model === m.id ? 'bg-neon/10 border-neon/30 text-neon' : 'bg-white/[0.03] border-glass-border text-gray-500'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Current Net Worth" value={formatCurrency(forecast.currentNetWorth)} color={forecast.currentNetWorth >= 0 ? 'text-neon' : 'text-red-400'} />
        <StatBox label="Assets" value={formatCurrency(forecast.currentAssets)} color="text-neon" />
        <StatBox label="Liabilities" value={formatCurrency(forecast.currentLiabilities)} color="text-red-400" />
        <StatBox label="Model" value={model.charAt(0).toUpperCase() + model.slice(1)} color="text-amber-400" />
      </div>

      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Net Worth Forecast</h3>
        <div className="space-y-2">
          {forecast.periods.map((p) => (
            <div key={p.periodDays} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-500">{p.periodLabel}</span>
              <div className="flex-1 mx-3">
                <div className="h-2 bg-matte-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon to-amber-400"
                    style={{ width: `${Math.max(0, (p.projectedNetWorth / Math.max(1, forecast.periods[forecast.periods.length - 1]?.projectedNetWorth)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${p.projectedNetWorth >= 0 ? 'text-neon' : 'text-red-400'}`}>
                {formatCurrency(p.projectedNetWorth)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

/* ═══ Retirement Tab ═══ */

function RetirementTab({ transactions }) {
  const monthly = useMemo(() => {
    const now = new Date()
    const txs = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return {
      income: txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  }, [transactions])

  const [age, setAge] = useState(30)
  const [retAge, setRetAge] = useState(60)
  const [monthlyInv, setMonthlyInv] = useState(Math.round(monthly.income * 0.1))
  const [returnRate, setReturnRate] = useState(8)
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const currentSavings = Math.max(0, totalIncome - totalExpense)

  const retirement = useMemo(() => calculateRetirement({
    currentAge: age,
    retirementAge: retAge,
    monthlyInvestment: monthlyInv,
    currentSavings,
    expectedReturn: returnRate,
  }), [age, retAge, monthlyInv, currentSavings, returnRate])

  return (
    <div className="space-y-4">
      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Your Inputs</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Current Age: {age}</label>
            <input type="range" min={18} max={70} value={age} onChange={(e) => setAge(parseInt(e.target.value))} className="w-full accent-neon" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Retirement Age: {retAge}</label>
            <input type="range" min={age + 1} max={80} value={retAge} onChange={(e) => setRetAge(parseInt(e.target.value))} className="w-full accent-neon" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Monthly Investment (₹)</label>
            <input type="number" value={monthlyInv} onChange={(e) => setMonthlyInv(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-matte-200 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-neon/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Expected Return: {returnRate}%</label>
            <input type="range" min={1} max={20} step={0.5} value={returnRate} onChange={(e) => setReturnRate(parseFloat(e.target.value))} className="w-full accent-neon" />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Retirement Forecast</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatBox label="Retirement Corpus" value={formatCurrency(retirement.retirementCorpus)} color="text-neon" />
          <StatBox label="Monthly Income" value={formatCurrency(retirement.monthlyRetirementIncome)} color="text-amber-400" />
        </div>

        <ProgressBar
          value={retirement.readinessScore}
          color={retirement.readinessScore >= 75 ? 'bg-neon' : retirement.readinessScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}
          label={`Readiness: ${retirement.readinessLevel}`}
        />

        <div className="grid grid-cols-3 gap-2 mt-3">
          <StatBox label="Years to Retire" value={retirement.yearsToRetirement.toString()} />
          <StatBox label="Target Monthly" value={formatCurrency(retirement.targetMonthlyIncome)} />
          <StatBox label="Current Savings" value={formatCurrency(currentSavings)} />
        </div>
      </GlassCard>
    </div>
  )
}

/* ═══ Scenarios Tab ═══ */

function ScenariosTab({ transactions, goals, emis, debts, budgets }) {
  const [salaryInc, setSalaryInc] = useState(0)
  const [emiRed, setEmiRed] = useState(0)
  const [savingsInc, setSavingsInc] = useState(0)

  const scenario = useMemo(() => ({
    salaryIncrease: salaryInc,
    emiReduction: emiRed,
    savingsIncrease: savingsInc,
  }), [salaryInc, emiRed, savingsInc])

  const result = useMemo(() => simulateScenario(transactions, scenario), [transactions, scenario])

  const forecastRecs = useMemo(() => generateForecastRecommendations({ transactions, goals, emis, debts, budgets }), [transactions, goals, emis, debts, budgets])

  return (
    <div className="space-y-4">
      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">What-If Simulator</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Salary Increase: {salaryInc}%</label>
            <input type="range" min={0} max={50} value={salaryInc} onChange={(e) => setSalaryInc(parseInt(e.target.value))} className="w-full accent-neon" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">EMI Reduction: ₹{emiRed.toLocaleString()}</label>
            <input type="range" min={0} max={20000} step={500} value={emiRed} onChange={(e) => setEmiRed(parseInt(e.target.value))} className="w-full accent-neon" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Extra Savings/mo: ₹{savingsInc.toLocaleString()}</label>
            <input type="range" min={0} max={20000} step={500} value={savingsInc} onChange={(e) => setSavingsInc(parseInt(e.target.value))} className="w-full accent-neon" />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Simulation Result</h3>
        <p className="text-sm text-white mb-3">{result.summary}</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatBox label="Monthly Surplus" value={formatCurrency(result.monthlySurplus)} color={result.monthlySurplus >= 0 ? 'text-neon' : 'text-red-400'} />
          <StatBox label="Annual Savings" value={formatCurrency(result.annualSavings)} color="text-neon" />
          <StatBox label="Current Balance" value={formatCurrency(result.currentBalance)} />
        </div>

        <h4 className="text-[10px] font-semibold text-gray-500 mb-2">Period Projections</h4>
        <div className="space-y-1.5">
          {result.periods.map((p) => (
            <div key={p.periodDays} className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">{p.periodLabel}</span>
              <span className={`font-semibold tabular-nums ${p.projectedBalance >= 0 ? 'text-neon' : 'text-red-400'}`}>
                {formatCurrency(p.projectedBalance)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {forecastRecs.length > 0 && (
        <GlassCard>
          <h3 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" /> Recommendations
          </h3>
          <div className="space-y-2">
            {forecastRecs.map((r, i) => (
              <div key={i} className={`p-2 rounded-lg text-[10px] ${
                r.impact === 'high' ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-white/[0.03]'
              }`}>
                <span className={r.impact === 'high' ? 'text-amber-300' : 'text-gray-400'}>{r.text}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}

/* ═══ Main Page ═══ */

export default function ForecastCenterPage() {
  const [activeTab, setActiveTab] = useState('cashflow')
  const {
    transactions, recurring, emis, debts, budgets, goals,
    wealthAssets, accounts,
  } = useFinance()

  const ef = useMemo(() => getEmergencyFundFromTransactions(transactions, 0), [transactions])

  const budgetRiskAlerts = useMemo(() => getOverspendingDetection(transactions, budgets), [transactions, budgets])

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-white">Forecast Center</h1>
        <p className="text-[10px] text-gray-500">Financial prediction & planning engine</p>
      </div>

      {/* Emergency Fund Summary */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Shield size={12} className="text-neon" /> Emergency Fund
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            ef.status === 'fully_funded' ? 'bg-neon/10 text-neon' :
            ef.status === 'partially_funded' ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400'
          }`}>{ef.statusLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(ef.recommendedFund)}</p>
            <p className="text-[10px] text-gray-500">Recommended</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(ef.currentCoverage)}</p>
            <p className="text-[10px] text-gray-500">Current</p>
          </div>
          <div>
            <p className={`text-lg font-bold tabular-nums ${ef.gap > 0 ? 'text-red-400' : 'text-neon'}`}>
              {ef.gap > 0 ? formatCurrency(ef.gap) : '✔'}
            </p>
            <p className="text-[10px] text-gray-500">{ef.gap > 0 ? 'Gap' : 'Funded'}</p>
          </div>
        </div>
        <ProgressBar value={ef.coveragePercent} color={ef.coveragePercent >= 100 ? 'bg-neon' : ef.coveragePercent >= 50 ? 'bg-amber-400' : 'bg-red-400'} label={`Coverage: ${ef.monthsCovered}/${ef.monthsToCover} months`} />
      </GlassCard>

      {/* Budget Risk Alerts */}
      {budgetRiskAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {budgetRiskAlerts.slice(0, 3).map((alert) => (
            <div key={alert.categoryId} className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-amber-300">{alert.categoryId} budget at {alert.breachProbability}% risk</p>
                <p className="text-[9px] text-gray-500">{formatCurrency(alert.currentSpend)} of {formatCurrency(alert.budget)} — projected {formatCurrency(alert.projectedTotal)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-neon/10 text-neon border border-neon/20' : 'bg-white/[0.03] text-gray-500 border border-transparent'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'cashflow' && <CashflowTab transactions={transactions} recurring={recurring} emis={emis} debts={debts} budgets={budgets} />}
      {activeTab === 'goals' && <GoalsTab goals={goals} transactions={transactions} />}
      {activeTab === 'emi' && <EmiTab emis={emis} />}
      {activeTab === 'wealth' && <WealthTab wealthAssets={wealthAssets} accounts={accounts} transactions={transactions} debts={debts} emis={emis} />}
      {activeTab === 'retirement' && <RetirementTab transactions={transactions} />}
      {activeTab === 'scenarios' && <ScenariosTab transactions={transactions} goals={goals} emis={emis} debts={debts} budgets={budgets} />}
    </div>
  )
}
