import { useState, useMemo } from 'react'
import { ArrowLeft, Download, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  calculateSIP,
  getYearwiseBreakdown,
  getSavedSIPs,
  saveSIPCalculation,
  deleteSIPCalculation,
} from '../utils/sipCalculator'
import { formatCurrency } from '../utils/helpers'

const INVESTMENT_PRESETS = [500, 1000, 2000, 5000, 10000, 25000, 50000]
const RETURN_PRESETS = [8, 10, 12, 15, 18]
const PERIOD_PRESETS = [1, 3, 5, 10, 15, 20, 25, 30]

const PIE_COLORS = ['#6366f1', '#39ff14']

function PresetBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
        active
          ? 'bg-neon/20 text-neon border border-neon/30'
          : 'bg-white/[0.04] text-gray-500 border border-glass-border hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

export default function SIPCalculatorPage({ onNavigate }) {
  const [monthlyInvestment, setMonthlyInvestment] = useState(5000)
  const [annualReturn, setAnnualReturn] = useState(12)
  const [years, setYears] = useState(10)
  const [extraMonths, setExtraMonths] = useState(0)
  const [showTable, setShowTable] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [savedSIPs, setSavedSIPs] = useState(getSavedSIPs)

  const totalMonths = years * 12 + extraMonths

  const results = useMemo(() => {
    if (monthlyInvestment > 0 && annualReturn > 0 && totalMonths > 0) {
      return calculateSIP(monthlyInvestment, annualReturn, totalMonths)
    }
    return null
  }, [monthlyInvestment, annualReturn, totalMonths])

  const breakdown = useMemo(() => {
    if (!results) return []
    return getYearwiseBreakdown(monthlyInvestment, annualReturn, totalMonths)
  }, [monthlyInvestment, annualReturn, totalMonths, results])

  const pieData = results
    ? [
        { name: 'Invested', value: results.totalInvested },
        { name: 'Returns', value: results.estimatedReturns },
      ]
    : []

  const handleSave = () => {
    if (!results) return
    saveSIPCalculation({ monthlyInvestment, annualReturn, years, months: extraMonths, results })
    setSavedSIPs(getSavedSIPs())
  }

  const handleDelete = (id) => {
    deleteSIPCalculation(id)
    setSavedSIPs(getSavedSIPs())
  }

  const handleLoad = (sip) => {
    setMonthlyInvestment(sip.monthlyInvestment)
    setAnnualReturn(sip.annualReturn)
    setYears(sip.years)
    setExtraMonths(sip.months || 0)
    setShowSaved(false)
  }

  const exportPDF = async () => {
    if (!results) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('SIP Calculator Results', 14, 20)

    doc.setFontSize(11)
    doc.text(`Monthly Investment: ${formatCurrency(monthlyInvestment)}`, 14, 35)
    doc.text(`Annual Return Rate: ${annualReturn}%`, 14, 43)
    doc.text(
      `Investment Period: ${years} year${years !== 1 ? 's' : ''}${extraMonths > 0 ? ` ${extraMonths} month${extraMonths !== 1 ? 's' : ''}` : ''}`,
      14,
      51
    )

    doc.setFontSize(14)
    doc.text('Summary', 14, 65)

    autoTable(doc, {
      startY: 70,
      head: [['', 'Amount']],
      body: [
        ['Total Invested', formatCurrency(results.totalInvested)],
        ['Estimated Returns', formatCurrency(results.estimatedReturns)],
        ['Maturity Value', formatCurrency(results.maturityValue)],
      ],
      theme: 'grid',
    })

    if (breakdown.length > 0) {
      const afterSummary = doc.lastAutoTable.finalY + 15
      doc.setFontSize(14)
      doc.text('Year-wise Breakdown', 14, afterSummary)

      autoTable(doc, {
        startY: afterSummary + 5,
        head: [['Year', 'Total Invested', 'Estimated Value', 'Profit']],
        body: breakdown.map((r) => [
          r.year,
          formatCurrency(r.totalInvested),
          formatCurrency(r.estimatedValue),
          formatCurrency(r.profit),
        ]),
        theme: 'grid',
      })
    }

    doc.save('SIP-Calculation.pdf')
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gradient-brand">SIP Calculator</h1>
          <p className="text-xs text-gray-500">Systematic Investment Plan</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!results}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors disabled:opacity-40"
            title="Save calculation"
          >
            <Save size={16} className="text-neon" />
          </button>
          <button
            onClick={exportPDF}
            disabled={!results}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors disabled:opacity-40"
            title="Export PDF"
          >
            <Download size={16} className="text-amber-400" />
          </button>
        </div>
      </div>

      {/* Monthly Investment */}
      <GlassCard className="mb-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Monthly Investment</p>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-gray-500 text-base">₹</span>
          <input
            type="number"
            value={monthlyInvestment}
            onChange={(e) => setMonthlyInvestment(Math.max(1, Number(e.target.value)))}
            className="flex-1 bg-transparent text-2xl font-extrabold text-gradient-brand outline-none tabular-nums"
            min="1"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INVESTMENT_PRESETS.map((p) => (
            <PresetBtn
              key={p}
              active={monthlyInvestment === p}
              onClick={() => setMonthlyInvestment(p)}
              label={p >= 1000 ? `₹${p / 1000}K` : `₹${p}`}
            />
          ))}
        </div>
      </GlassCard>

      {/* Annual Return */}
      <GlassCard className="mb-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Annual Return Rate</p>
        <div className="flex items-baseline gap-1.5 mb-3">
          <input
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Math.max(0.1, Math.min(100, Number(e.target.value))))}
            className="flex-1 bg-transparent text-2xl font-extrabold text-gradient-brand outline-none tabular-nums"
            min="0.1"
            max="100"
            step="0.1"
          />
          <span className="text-gray-500 text-base">%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RETURN_PRESETS.map((p) => (
            <PresetBtn
              key={p}
              active={annualReturn === p}
              onClick={() => setAnnualReturn(p)}
              label={`${p}%`}
            />
          ))}
        </div>
      </GlassCard>

      {/* Investment Period */}
      <GlassCard className="mb-4">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Investment Period</p>
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-1">
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(Math.max(0, Number(e.target.value)))}
              className="w-full bg-transparent text-2xl font-extrabold text-gradient-brand outline-none tabular-nums"
              min="0"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">Years</p>
          </div>
          <div className="w-px h-10 bg-glass-border mt-1" />
          <div className="flex-1">
            <input
              type="number"
              value={extraMonths}
              onChange={(e) => setExtraMonths(Math.min(11, Math.max(0, Number(e.target.value))))}
              className="w-full bg-transparent text-2xl font-extrabold text-gradient-brand outline-none tabular-nums"
              min="0"
              max="11"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">Months</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_PRESETS.map((p) => (
            <PresetBtn
              key={p}
              active={years === p && extraMonths === 0}
              onClick={() => { setYears(p); setExtraMonths(0) }}
              label={`${p}Y`}
            />
          ))}
        </div>
      </GlassCard>

      {/* Results */}
      {results && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <GlassCard className="!p-3">
              <p className="text-[10px] text-gray-500 mb-1">Invested</p>
              <p className="text-xs font-bold text-white tabular-nums leading-tight">
                {formatCurrency(results.totalInvested)}
              </p>
            </GlassCard>
            <GlassCard className="!p-3">
              <p className="text-[10px] text-gray-500 mb-1">Returns</p>
              <p className="text-xs font-bold text-neon tabular-nums leading-tight">
                {formatCurrency(results.estimatedReturns)}
              </p>
            </GlassCard>
            <GlassCard brand className="!p-3">
              <p className="text-[10px] text-gray-500 mb-1">Maturity</p>
              <p className="text-xs font-bold text-gradient-brand tabular-nums leading-tight">
                {formatCurrency(results.maturityValue)}
              </p>
            </GlassCard>
          </div>

          {/* Pie Chart */}
          <GlassCard className="mb-4">
            <p className="text-xs font-semibold text-gray-300 mb-3">Investment Breakdown</p>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value, entry) => (
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>
                      {value}: {formatCurrency(entry.payload.value)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Year-wise Table */}
          <GlassCard className="mb-4">
            <button
              onClick={() => setShowTable(!showTable)}
              className="flex items-center justify-between w-full"
            >
              <p className="text-xs font-semibold text-gray-300">Year-wise Breakdown</p>
              {showTable ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>
            {showTable && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-glass-border">
                      <th className="text-left pb-1.5 pr-2 font-medium">Yr</th>
                      <th className="text-right pb-1.5 pr-2 font-medium">Invested</th>
                      <th className="text-right pb-1.5 pr-2 font-medium">Value</th>
                      <th className="text-right pb-1.5 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border/40">
                    {breakdown.map((row) => (
                      <tr key={row.year}>
                        <td className="py-1.5 pr-2 text-gray-500">{row.year}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-400 tabular-nums">
                          {formatCurrency(row.totalInvested)}
                        </td>
                        <td className="py-1.5 pr-2 text-right text-white tabular-nums">
                          {formatCurrency(row.estimatedValue)}
                        </td>
                        <td className="py-1.5 text-right text-neon tabular-nums">
                          {formatCurrency(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* Saved Calculations */}
      {savedSIPs.length > 0 && (
        <GlassCard className="mb-4">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center justify-between w-full"
          >
            <p className="text-xs font-semibold text-gray-300">
              Saved ({savedSIPs.length})
            </p>
            {showSaved ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
          </button>
          {showSaved && (
            <div className="mt-3 space-y-2">
              {savedSIPs.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-glass-border"
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => handleLoad(s)}
                  >
                    <p className="text-xs font-medium text-gray-300">
                      ₹{s.monthlyInvestment.toLocaleString('en-IN')}/mo · {s.annualReturn}% ·{' '}
                      {s.years}Y{s.months > 0 ? `${s.months}M` : ''}
                    </p>
                    <p className="text-[10px] text-neon tabular-nums mt-0.5">
                      {formatCurrency(s.results.maturityValue)}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
