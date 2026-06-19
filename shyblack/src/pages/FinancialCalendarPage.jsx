import { useMemo, useState } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  ArrowRight, Clock, DollarSign, Target, Repeat2, TrendingUp,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { formatCurrency, formatDate } from '../utils/helpers'
import { DEBT_TYPES, DEBT_STATUS } from '../utils/debts'
import { EMI_STATUS } from '../utils/emi'
import { getGoalProjection } from '../utils/goals'
import { getAccounts } from '../utils/networth'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function FinancialCalendarPage({ onNavigate }) {
  const { transactions, debts, goals, emis, recurring, budgets } = useFinance()
  const [viewDate, setViewDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const accounts = useMemo(() => getAccounts(), [])

  const events = useMemo(() => {
    const result = []

    // Debt due dates
    debts
      .filter((d) => d.status === DEBT_STATUS.PENDING && d.dueDate)
      .forEach((d) => {
        result.push({
          date: d.dueDate,
          type: 'debt',
          title: `${d.type === DEBT_TYPES.LENT ? 'Collect from' : 'Pay'} ${d.personName}`,
          amount: d.remainingAmount,
          icon: 'debt',
          priority: new Date(d.dueDate) < new Date() ? 'overdue' : 'upcoming',
          link: 'debts',
        })
      })

    // Goal target dates
    goals
      .filter((g) => g.targetDate)
      .forEach((g) => {
        const p = getGoalProjection(g)
        if (p && !p.isAchieved) {
          result.push({
            date: g.targetDate,
            type: 'goal',
            title: `Goal: ${g.name}`,
            amount: g.target - g.saved,
            icon: 'goal',
            priority: new Date(g.targetDate) < new Date() ? 'overdue' : 'upcoming',
            link: 'goals',
          })
        }
      })

    // EMI due dates
    emis
      .filter((e) => e.status === EMI_STATUS.ACTIVE && e.remainingMonths > 0)
      .forEach((e) => {
        const nextDue = new Date()
        const paidMonths = (e.totalPaidCount || 0)
        nextDue.setMonth(nextDue.getMonth() + paidMonths)
        const dateStr = nextDue.toISOString().split('T')[0]
        result.push({
          date: dateStr,
          type: 'emi',
          title: `EMI: ${e.name}`,
          amount: e.amount,
          icon: 'emi',
          priority: 'upcoming',
          link: 'emi-center',
        })
      })

    // Recurring reminders
    recurring
      .filter((r) => r.active !== false && r.nextDate)
      .forEach((r) => {
        result.push({
          date: r.nextDate,
          type: 'recurring',
          title: `${r.type === 'income' ? 'Income' : 'Bill'}: ${r.category}`,
          amount: r.amount,
          icon: 'recurring',
          priority: new Date(r.nextDate) < new Date() ? 'overdue' : 'upcoming',
        })
      })

    return result
  }, [debts, goals, emis, recurring])

  const monthEvents = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [events, year, month])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((e) => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10)
  }, [events])

  const overdueItems = useMemo(() => {
    const now = new Date()
    return events
      .filter((e) => new Date(e.date) < now && e.priority === 'overdue')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [events])

  const thisWeekEvents = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return events.filter((e) => {
      const d = new Date(e.date)
      return d >= startOfWeek && d <= endOfWeek
    }).sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [events])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const goPrev = () => setViewDate(new Date(year, month - 1, 1))
  const goNext = () => setViewDate(new Date(year, month + 1, 1))

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthEvents.filter((e) => e.date === dateStr)
  }

  const eventColors = {
    debt: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    goal: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
    emi: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
    recurring: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  }

  const eventIcons = {
    debt: AlertCircle,
    goal: Target,
    emi: DollarSign,
    recurring: Repeat2,
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Calendar size={18} className="text-neon" />
        </div>
        <h1 className="text-xl font-bold">Financial Calendar</h1>
      </div>

      {/* Month Navigation */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-sm font-bold">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goNext}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-[10px] text-center font-medium text-gray-600 py-1">
              {d[0]}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dayEvents = getEventsForDay(day)
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year
            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all duration-150 relative ${
                  isToday
                    ? 'bg-neon/15 border border-neon/30 text-neon font-bold'
                    : dayEvents.length > 0
                      ? 'bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer'
                      : 'text-gray-600'
                }`}
              >
                <span>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, j) => {
                      const colors = eventColors[e.type] || eventColors.debt
                      return <div key={j} className={`w-1 h-1 rounded-full ${colors.dot}`} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Tab Switcher */}
      <div className="flex bg-matte-100 rounded-lg p-0.5 mb-4">
        {['upcoming', 'week', 'overdue'].map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              viewMode === v ? 'bg-neon text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            {v === 'upcoming' ? 'Upcoming' : v === 'week' ? 'This Week' : 'Overdue'}
          </button>
        ))}
      </div>

      {/* This Month Summary */}
      <GlassCard brand className="mb-4">
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">This Month</p>
          <p className="text-lg font-extrabold text-gradient-brand mt-1">
            {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Debt
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Goal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400" /> EMI
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Recurring
            </span>
          </div>
        </div>
      </GlassCard>

      {viewMode === 'upcoming' && (
        <>
          {upcomingEvents.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={Calendar}
                title="No upcoming events"
                description="Add debts, goals, or EMIs to see them here"
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 mb-2">Next 10 Events</h2>
              {upcomingEvents.map((e, i) => {
                const colors = eventColors[e.type] || eventColors.debt
                const Icon = eventIcons[e.type] || AlertCircle
                return (
                  <button
                    key={i}
                    onClick={() => e.link && onNavigate(e.link)}
                    className="w-full text-left"
                  >
                    <GlassCard className="hover:border-neon/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                          <Icon size={15} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{e.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500">
                              {formatDate(e.date)}
                            </span>
                            {e.amount > 0 && (
                              <span className="text-[10px] font-semibold tabular-nums">
                                {formatCurrency(e.amount)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-gray-600 shrink-0" />
                      </div>
                    </GlassCard>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {viewMode === 'week' && (
        <>
          {thisWeekEvents.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={Calendar}
                title="Nothing this week"
                description="No financial events scheduled for this week"
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 mb-2">
                This Week ({thisWeekEvents.length} event{thisWeekEvents.length !== 1 ? 's' : ''})
              </h2>
              {thisWeekEvents.map((e, i) => {
                const colors = eventColors[e.type] || eventColors.debt
                const Icon = eventIcons[e.type] || AlertCircle
                return (
                  <GlassCard key={i}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                        <Icon size={15} className={colors.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500">
                            {formatDate(e.date)}
                          </span>
                          {e.amount > 0 && (
                            <span className="text-[10px] font-semibold tabular-nums">
                              {formatCurrency(e.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </>
      )}

      {viewMode === 'overdue' && (
        <>
          {overdueItems.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={CheckCircle2}
                title="Nothing overdue"
                description="All your financial obligations are on track"
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {overdueItems.length} Overdue
              </h2>
              {overdueItems.map((e, i) => {
                const colors = eventColors[e.type] || eventColors.debt
                const Icon = eventIcons[e.type] || AlertCircle
                return (
                  <button
                    key={i}
                    onClick={() => e.link && onNavigate(e.link)}
                    className="w-full text-left"
                  >
                    <GlassCard className="border-red-500/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                          <Icon size={15} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{e.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-red-400">
                              Due {formatDate(e.date)}
                            </span>
                            {e.amount > 0 && (
                              <span className="text-[10px] font-semibold tabular-nums text-red-400">
                                {formatCurrency(e.amount)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-gray-600 shrink-0" />
                      </div>
                    </GlassCard>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
