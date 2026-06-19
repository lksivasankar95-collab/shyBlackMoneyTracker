import { useState, useMemo } from 'react'
import {
  ChevronLeft, Wallet, TrendingUp, TrendingDown, ArrowLeftRight, Landmark,
  Target, Search, Plus, X, Edit3, Trash2, DollarSign,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate, generateId } from '../utils/helpers'
import { getAccounts, saveAccounts } from '../utils/networth'
import { getEmis } from '../utils/emi'
import { getGoals } from '../utils/goals'
import { getTransfers } from '../utils/transfers'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'
import RelatedItemsPanel from '../components/RelatedItemsPanel'

export default function AccountCenterPage({ onNavigate }) {
  const { transactions, updateAccounts } = useFinance()
  const [searchQuery, setSearchQuery] = useState('')

  const accounts = useMemo(() => getAccounts(), [])
  const emis = useMemo(() => getEmis(), [])
  const goals = useMemo(() => getGoals(), [])

  const [selectedAccount, setSelectedAccount] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', type: 'bank', balance: '' })

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts
    const q = searchQuery.toLowerCase()
    return accounts.filter((a) => a.name?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q))
  }, [accounts, searchQuery])

  const accountDetail = useMemo(() => {
    if (!selectedAccount) return null
    const acctTx = transactions.filter(
      (t) => t.source === selectedAccount.name || t.account === selectedAccount.name
    ).sort((a, b) => b.date.localeCompare(a.date))

    const acctTransfers = getTransfers().filter(
      (t) => t.fromName === selectedAccount.name || t.toName === selectedAccount.name
    )

    const linkedEmis = emis.filter((e) => {
      const lender = (e.lender || '').toLowerCase()
      const name = (selectedAccount.name || '').toLowerCase()
      return lender.includes(name) || name.includes(lender)
    })

    return { transactions: acctTx, transfers: acctTransfers, emis: linkedEmis }
  }, [selectedAccount, transactions, emis])

  const handleAddAccount = () => {
    if (!formData.name.trim()) return
    const accts = getAccounts()
    const newAcct = {
      id: generateId(),
      name: formData.name.trim(),
      type: formData.type,
      balance: Number(formData.balance) || 0,
      createdAt: Date.now(),
    }
    accts.push(newAcct)
    saveAccounts(accts)
    updateAccounts(accts)
    setShowAddForm(false)
    setFormData({ name: '', type: 'bank', balance: '' })
  }

  if (selectedAccount) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSelectedAccount(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{selectedAccount.name}</h1>
            <p className="text-xs text-gray-500">{selectedAccount.type}</p>
          </div>
          <p className="text-lg font-bold text-neon">{formatCurrency(selectedAccount.balance || 0)}</p>
        </div>

        <div className="space-y-3">
          {/* Linked EMIs */}
          {accountDetail.emis.length > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                <Landmark size={12} className="text-purple-400" />
                Linked EMIs
              </h3>
              {accountDetail.emis.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-glass-border last:border-0">
                  <div>
                    <p className="text-xs font-medium">{e.name}</p>
                    <p className="text-[10px] text-gray-600">{e.lender}</p>
                  </div>
                  <p className="text-xs font-semibold">{formatCurrency(e.amount)}/mo</p>
                </div>
              ))}
            </GlassCard>
          )}

          {/* Transfers */}
          {accountDetail.transfers.length > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                <ArrowLeftRight size={12} className="text-cyan-400" />
                Recent Transfers
              </h3>
              {accountDetail.transfers.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-glass-border last:border-0">
                  <div>
                    <p className="text-xs">{t.fromName} → {t.toName}</p>
                    <p className="text-[10px] text-gray-600">{formatDate(t.date)}</p>
                  </div>
                  <p className="text-xs font-semibold text-cyan-400">{formatCurrency(t.amount)}</p>
                </div>
              ))}
            </GlassCard>
          )}

          {/* Transactions */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Transactions ({accountDetail.transactions.length})</h3>
            {accountDetail.transactions.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No transactions for this account</p>
            ) : (
              <div className="space-y-1.5">
                {accountDetail.transactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'}`}>
                        {tx.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      </div>
                      <div>
                        <p className="text-xs">{tx.note || tx.category}</p>
                        <p className="text-[10px] text-gray-600">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-semibold ${tx.type === 'income' ? 'text-neon' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Related Items */}
          <GlassCard>
            <RelatedItemsPanel entityType="account" entityId={selectedAccount.id} onNavigate={onNavigate} />
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-white">Accounts</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="p-2.5 rounded-xl bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
        />
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <GlassCard className="mb-4 border-neon/20 !p-3">
          <div className="space-y-2.5">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Account name"
              className="w-full px-3 py-2 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="investment">Investment</option>
              <option value="wallet">Wallet</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
              placeholder="Current balance"
              className="w-full px-3 py-2 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowAddForm(false); setFormData({ name: '', type: 'bank', balance: '' }) }}
                className="flex-1 py-2 rounded-xl text-xs text-gray-500 hover:text-white bg-white/[0.03] transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleAddAccount} disabled={!formData.name.trim()}
                className="flex-1 py-2 rounded-xl text-xs text-neon bg-neon/10 border border-neon/20 hover:bg-neon/20 disabled:opacity-40 transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {filteredAccounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts" description={searchQuery ? 'No matching accounts' : 'Add your first account to track balances'} />
      ) : (
        <div className="space-y-2">
          {filteredAccounts.map((acct) => (
            <button
              key={acct.id}
              onClick={() => setSelectedAccount(acct)}
              className="w-full glass p-3.5 rounded-xl text-left hover:border-neon/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                  <Wallet size={18} className="text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-neon transition-colors">{acct.name}</p>
                  <p className="text-[10px] text-gray-600 capitalize">{acct.type}</p>
                </div>
                <p className="text-lg font-bold text-neon tabular-nums">{formatCurrency(acct.balance || 0)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
