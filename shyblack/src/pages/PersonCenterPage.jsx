import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft, Users, DollarSign, FileText, TrendingUp, TrendingDown,
  Calendar, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Search, Phone,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { getDocumentsForEntity } from '../utils/documents'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

export default function PersonCenterPage({ onNavigate }) {
  const { transactions, debts } = useFinance()
  const [searchQuery, setSearchQuery] = useState('')

  const people = useMemo(() => {
    const map = new Map()
    transactions.forEach((tx) => {
      const name = tx.person?.name
      if (name) {
        const key = name.toLowerCase()
        if (!map.has(key)) {
          map.set(key, { name, txCount: 0, totalReceived: 0, totalSent: 0, recentDate: '' })
        }
        const p = map.get(key)
        p.txCount++
        if (tx.type === 'income') p.totalReceived += tx.amount
        else p.totalSent += tx.amount
        if (tx.date > p.recentDate) p.recentDate = tx.date
      }
    })
    debts.forEach((d) => {
      const key = d.personName?.toLowerCase()
      if (key) {
        if (!map.has(key)) {
          map.set(key, { name: d.personName, txCount: 0, totalReceived: 0, totalSent: 0, recentDate: '' })
        }
        const p = map.get(key)
        if (!p.debtTotal) p.debtTotal = 0
        if (!p.debtBalance) p.debtBalance = 0
        p.debtBalance = (p.debtBalance || 0) + (d.currentBalance ?? d.remainingAmount ?? 0)
        p.debtTotal = (p.debtTotal || 0) + (d.originalAmount || d.amount || 0)
        if (d.personPhone && !p.phone) {
          p.phone = d.personPhone
        }
      }
    })
    return Array.from(map.values()).sort((a, b) => (b.txCount || 0) - (a.txCount || 0))
  }, [transactions, debts])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return people
    const q = searchQuery.toLowerCase()
    return people.filter((p) => p.name.toLowerCase().includes(q))
  }, [people, searchQuery])

  const [selectedPerson, setSelectedPerson] = useState(null)

  const personDetail = useMemo(() => {
    if (!selectedPerson) return null
    const personTx = transactions.filter(
      (t) => t.person?.name?.toLowerCase() === selectedPerson.name.toLowerCase()
    ).sort((a, b) => b.date.localeCompare(a.date))
    const personDebts = debts.filter(
      (d) => d.personName?.toLowerCase() === selectedPerson.name.toLowerCase()
    )
    return { transactions: personTx, debts: personDebts }
  }, [selectedPerson, transactions, debts])

  if (selectedPerson) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSelectedPerson(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">{selectedPerson.name}</h1>
            {selectedPerson.phone && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} />
                {selectedPerson.phone}
              </p>
            )}
          </div>
        </div>

        {personDetail && (
          <div className="space-y-3">
            {/* Debt Summary */}
            {personDetail.debts.length > 0 && (
              <GlassCard>
                <h3 className="text-xs font-semibold text-gray-400 mb-2">Borrow/Lend</h3>
                {personDetail.debts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-glass-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${d.type === 'lent' ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'}`}>
                        {d.type === 'lent' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                      </div>
                      <span className="text-xs">{d.type === 'lent' ? 'You lent' : 'You borrowed'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{formatCurrency(d.currentBalance ?? d.remainingAmount ?? 0)}</p>
                      <p className="text-[10px] text-gray-600">of {formatCurrency(d.originalAmount || d.amount || 0)}</p>
                    </div>
                  </div>
                ))}
              </GlassCard>
            )}

            {/* Transactions */}
            <GlassCard>
              <h3 className="text-xs font-semibold text-gray-400 mb-2">Transactions ({personDetail.transactions.length})</h3>
              {personDetail.transactions.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No transactions with this person</p>
              ) : (
                <div className="space-y-1.5">
                  {personDetail.transactions.slice(0, 20).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-neon/10 text-neon' : 'bg-red-500/10 text-red-400'}`}>
                          {tx.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        </div>
                        <div>
                          <p className="text-xs">{tx.note || 'Transaction'}</p>
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
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05]">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-white">People</h1>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No people found" description="People appear from transactions and borrow/lend records" />
      ) : (
        <div className="space-y-2">
          {filtered.map((person) => (
            <button
              key={person.name}
              onClick={() => setSelectedPerson(person)}
              className="w-full glass p-3.5 rounded-xl text-left hover:border-neon/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon/20 to-blue-500/20 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-neon" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-neon transition-colors">{person.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {person.txCount > 0 && (
                      <span className="text-[10px] text-gray-500">{person.txCount} transaction{person.txCount !== 1 ? 's' : ''}</span>
                    )}
                    {person.debtTotal > 0 && (
                      <span className="text-[10px] text-gray-500">Ledger: {formatCurrency(person.debtBalance || 0)}</span>
                    )}
                    {person.phone && (
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Phone size={9} /> {person.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                {person.totalReceived > 0 && (
                  <span className="text-[10px] text-neon flex items-center gap-1">
                    <TrendingUp size={10} /> Received {formatCurrency(person.totalReceived)}
                  </span>
                )}
                {person.totalSent > 0 && (
                  <span className="text-[10px] text-red-400 flex items-center gap-1">
                    <TrendingDown size={10} /> Sent {formatCurrency(person.totalSent)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
