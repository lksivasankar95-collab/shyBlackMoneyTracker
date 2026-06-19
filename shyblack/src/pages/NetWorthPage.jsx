import { useMemo, useState } from 'react'
import {
  Wallet, Landmark, TrendingUp, ArrowUpRight, ArrowDownRight,
  Plus, Pencil, Trash2, Check, X, BarChart3, PieChart as PieChartIcon, DollarSign,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency } from '../utils/helpers'
import {
  getAccounts, saveAccounts, createAccount, updateAccount, deleteAccount,
  calculateNetWorth, getNetWorthHistory, getMonthlyGrowth, ACCOUNT_TYPES,
} from '../utils/networth'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'

const COLORS = ['#39ff14', '#22c55e', '#3b82f6', '#a855f7', '#ef4444']
const ACCOUNT_ICONS = { cash: Wallet, bank: Landmark, trading: TrendingUp }
const ACCOUNT_LABELS = { cash: 'Cash', bank: 'Bank Account', trading: 'Trading' }

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 text-xs shadow-lg">
        <p className="text-gray-400 mb-1 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold tabular-nums" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function NetWorthPage() {
  const { transactions, debts, accounts: contextAccounts, updateAccounts } = useFinance()
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState(() => contextAccounts || getAccounts())
  const [showAddModal, setShowAddModal] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'bank', balance: '' })

  const netWorth = useMemo(() => calculateNetWorth(transactions, debts, accounts), [transactions, debts, accounts])
  const history = useMemo(() => getNetWorthHistory(transactions, debts, accounts, 6), [transactions, debts, accounts])
  const growth = useMemo(() => getMonthlyGrowth(history), [history])

  const resetForm = () => setForm({ name: '', type: 'bank', balance: '' })

  const openAdd = () => { resetForm(); setShowAddModal(true); setEditAccount(null) }

  const openEdit = (acc) => {
    setForm({ name: acc.name, type: acc.type, balance: String(acc.balance) })
    setEditAccount(acc)
    setShowAddModal(true)
  }

  const handleSave = () => {
    const name = form.name.trim()
    const balance = parseFloat(form.balance) || 0
    if (!name) { addToast('Enter account name', 'error'); return }

    if (editAccount) {
      const updated = updateAccount(editAccount.id, { name, type: form.type, balance })
      if (updated) addToast('Account updated', 'success')
    } else {
      createAccount({ name, type: form.type, balance })
      addToast('Account added', 'success')
    }
    setAccounts(getAccounts())
    setShowAddModal(false)
    setEditAccount(null)
    resetForm()
  }

  const handleDelete = (id) => {
    deleteAccount(id)
    setAccounts(getAccounts())
    addToast('Account removed', 'info')
  }

  const chartData = history.map((h) => ({
    ...h,
    assetsLabel: 'Assets',
    liabilitiesLabel: 'Liabilities',
  }))

  const breakdownData = netWorth.breakdown
    .filter((b) => b.value !== 0)
    .map((b) => ({ name: b.label, value: Math.abs(b.value), rawValue: b.value }))

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">Net Worth</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neon/10 text-neon text-xs font-medium hover:bg-neon/20 transition-all"
        >
          <Plus size={14} />
          Add Account
        </button>
      </div>

      {/* Net Worth Hero */}
      <GlassCard brand className="mb-4 text-center">
        <p className="text-xs text-gray-500 font-medium mb-1">Current Net Worth</p>
        <p className={`text-3xl font-extrabold tracking-tight ${netWorth.netWorth >= 0 ? 'text-gradient-brand glow-neon-sm' : 'text-red-400'}`}>
          {formatCurrency(netWorth.netWorth)}
        </p>
        {history.length >= 2 && (
          <div className="flex items-center justify-center gap-1 mt-1">
            {growth >= 0 ? (
              <ArrowUpRight size={14} className="text-neon" />
            ) : (
              <ArrowDownRight size={14} className="text-red-400" />
            )}
            <span className={`text-xs font-semibold ${growth >= 0 ? 'text-neon' : 'text-red-400'}`}>
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% vs last month
            </span>
          </div>
        )}
      </GlassCard>

      {/* Asset / Liability Summary */}
      <div className="flex gap-3 mb-4">
        <GlassCard className="flex-1">
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Assets</p>
          <p className="text-lg font-extrabold text-neon tabular-nums">{formatCurrency(netWorth.totalAssets)}</p>
        </GlassCard>
        <GlassCard className="flex-1">
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Liabilities</p>
          <p className="text-lg font-extrabold text-red-400 tabular-nums">{formatCurrency(netWorth.totalLiabilities)}</p>
        </GlassCard>
      </div>

      {/* Net Worth Trend */}
      {history.length > 0 && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-neon" />
            <h2 className="text-sm font-semibold">Net Worth Trend</h2>
          </div>
          <div className="h-44 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#39ff14" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#39ff14" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Area type="monotone" dataKey="netWorth" stroke="#39ff14" strokeWidth={2} fill="url(#nwGrad)" name="Net Worth" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Asset Breakdown Chart */}
      {breakdownData.length > 0 && (
        <GlassCard brand className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon size={14} className="text-neon" />
            <h2 className="text-sm font-semibold">Asset Breakdown</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={34} outerRadius={56} paddingAngle={3} dataKey="value">
                    {breakdownData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-1.5">
              {breakdownData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-400 truncate">{item.name}</span>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ml-2 shrink-0 ${item.rawValue >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Accounts */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Your Accounts</h2>
        {accounts.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={Wallet}
              title="No accounts yet"
              description="Add your bank accounts, cash, and trading accounts to track your full net worth"
              action={
                <button onClick={openAdd} className="btn-primary text-xs !px-4 !py-2">Add Account</button>
              }
            />
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => {
              const Icon = ACCOUNT_ICONS[acc.type] || Wallet
              return (
                <GlassCard key={acc.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-neon" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{acc.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-matte-200 text-gray-500 font-medium">
                          {ACCOUNT_LABELS[acc.type] || acc.type}
                        </span>
                      </div>
                      <p className="text-lg font-extrabold tabular-nums mt-0.5">{formatCurrency(acc.balance)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(acc)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-neon hover:bg-neon/10 transition-all"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Account Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditAccount(null); resetForm() }}
        title={editAccount ? 'Edit Account' : 'Add Account'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Savings Account, Trading Wallet"
              className="input-field"
              maxLength={50}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Account Type</label>
            <div className="flex gap-2">
              {Object.entries(ACCOUNT_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    form.type === type
                      ? 'bg-neon text-black'
                      : 'bg-matte-100 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Current Balance</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.balance}
              onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value.replace(/[^0-9.]/g, '') }))}
              placeholder="0"
              className="input-field text-lg font-bold tabular-nums"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.name.trim()} className="flex-1 btn-primary text-sm">
              {editAccount ? 'Update' : 'Add Account'}
            </button>
            <button
              onClick={() => { setShowAddModal(false); setEditAccount(null); resetForm() }}
              className="flex-1 btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
