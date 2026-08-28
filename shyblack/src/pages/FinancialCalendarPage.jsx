import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  ArrowRight, DollarSign, Target, Repeat2, TrendingUp, TrendingDown,
  Search, X, Filter, CalendarDays,
  Receipt, Wallet, Activity, Sparkles,
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatCurrency, formatDate } from '../utils/helpers'
import { DEBT_TYPES, DEBT_STATUS } from '../utils/debts'
import { EMI_STATUS } from '../utils/emi'
import { getGoalProjection } from '../utils/goals'
import { getBills } from '../utils/bills'
import {
  indexTransactionsByDate, getMonthTransactions, getDailySummaries,
  getDayEventTypes, getMonthHighlights, getMonthlyTrends,
  getDailyHeatmap, getTransactionFrequency, getRunningBalance,
  filterTransactions, getBillsForDate, getActiveFilters, matchesActiveFilters,
  EVENT_TYPES,
} from '../utils/financialCalendar'
import GlassCard from '../components/GlassCard'
import EmptyState from '../components/EmptyState'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const FILTER_DEFS = [
  { key: 'income', labelKey: 'calendar.income', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { key: 'expense', labelKey: 'calendar.expense', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { key: 'trading', labelKey: 'calendar.trading', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { key: 'emi', labelKey: 'calendar.emi', color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
  { key: 'bills', labelKey: 'calendar.bills', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  { key: 'recurring', labelKey: 'calendar.recurring', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { key: 'borrow', labelKey: 'calendar.borrow', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { key: 'lend', labelKey: 'calendar.lend', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
]

export default function FinancialCalendarPage({ onNavigate }) {
  const {
    transactions, debts, goals, emis, recurring,
  } = useFinance()
  const { t } = useTranslation()
  const [viewDate, setViewDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [selectedDay, setSelectedDay] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    income: false, expense: false, trading: false,
    emi: false, bills: false, recurring: false,
    borrow: false, lend: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const searchRef = useRef(null)

  const transactionIndex = useMemo(() => indexTransactionsByDate(transactions), [transactions])

  const monthTransactions = useMemo(
    () => getMonthTransactions(transactionIndex, year, month),
    [transactionIndex, year, month]
  )

  const dailySummaries = useMemo(
    () => getDailySummaries(monthTransactions),
    [monthTransactions]
  )

  const filteredSearchTxs = useMemo(
    () => searchQuery.trim() ? filterTransactions(transactions, searchQuery) : null,
    [transactions, searchQuery]
  )

  const monthSearchFiltered = useMemo(() => {
    if (!filteredSearchTxs) return monthTransactions
    const searchIndex = indexTransactionsByDate(filteredSearchTxs)
    return getMonthTransactions(searchIndex, year, month)
  }, [filteredSearchTxs, monthTransactions, year, month])

  const activeFilterKeys = useMemo(() => getActiveFilters(filters), [filters])

  const bills = useMemo(() => getBills(), [])

  const events = useMemo(() => {
    const result = []

    debts
      .filter((d) => d.status === DEBT_STATUS.PENDING && d.dueDate)
      .forEach((d) => {
        result.push({
          date: d.dueDate,
          type: 'debt',
          debtType: d.type,
          title: d.type === DEBT_TYPES.LENT
            ? t('calendar.collect_event', { name: d.personName })
            : t('calendar.pay_event', { name: d.personName }),
          amount: d.remainingAmount,
          icon: 'debt',
          priority: new Date(d.dueDate) < new Date() ? 'overdue' : 'upcoming',
          link: 'debts',
        })
      })

    goals
      .filter((g) => g.targetDate)
      .forEach((g) => {
        const p = getGoalProjection(g)
        if (p && !p.isAchieved) {
          result.push({
            date: g.targetDate,
            type: 'goal',
            title: t('calendar.goal_event', { name: g.name }),
            amount: g.target - g.saved,
            icon: 'goal',
            priority: new Date(g.targetDate) < new Date() ? 'overdue' : 'upcoming',
            link: 'goals',
          })
        }
      })

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
          title: t('calendar.emi_event', { name: e.name }),
          amount: e.emiAmount || e.amount,
          icon: 'emi',
          priority: 'upcoming',
          link: 'emi-center',
        })
      })

    recurring
      .filter((r) => r.active !== false && r.nextDate)
      .forEach((r) => {
        result.push({
          date: r.nextDate,
          type: 'recurring',
          title: r.type === 'income'
            ? t('calendar.recurring_income_event', { name: r.category })
            : t('calendar.recurring_bill_event', { name: r.category }),
          amount: r.amount,
          icon: 'recurring',
          priority: new Date(r.nextDate) < new Date() ? 'overdue' : 'upcoming',
        })
      })

    bills
      .filter((b) => b.active && b.dueDate)
      .forEach((b) => {
        if (b.paidDates && b.paidDates.includes(b.dueDate)) return
        result.push({
          date: b.dueDate,
          type: 'bill',
          title: t('calendar.bill_event', { name: b.name }),
          amount: b.amount,
          icon: 'bill',
          priority: new Date(b.dueDate) < new Date() ? 'overdue' : 'upcoming',
          link: 'bills',
        })
        if (b.recurring) {
          const due = new Date(b.dueDate)
          for (let m = 1; m <= 12; m++) {
            const nextDue = new Date(due.getFullYear(), due.getMonth() + m, due.getDate())
            if (nextDue > new Date(new Date().getFullYear(), new Date().getMonth() + 6, 0)) break
            const dateStr = nextDue.toISOString().split('T')[0]
            if (b.paidDates && b.paidDates.includes(dateStr)) continue
            result.push({
              date: dateStr,
              type: 'bill',
              title: t('calendar.bill_event', { name: b.name }),
              amount: b.amount,
              icon: 'bill',
              priority: nextDue < new Date() ? 'overdue' : 'upcoming',
              link: 'bills',
            })
          }
        }
      })

    return result
  }, [debts, goals, emis, recurring, bills, t])

  const monthEvents = useMemo(
    () => events.filter((e) => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    }),
    [events, year, month]
  )

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

  const highlights = useMemo(
    () => getMonthHighlights(transactionIndex, year, month),
    [transactionIndex, year, month]
  )

  const trends = useMemo(
    () => getMonthlyTrends(transactions, year, month, 6),
    [transactions, year, month]
  )

  const expenseHeatmap = useMemo(
    () => getDailyHeatmap(transactionIndex, year, month, 'expense'),
    [transactionIndex, year, month]
  )

  const incomeHeatmap = useMemo(
    () => getDailyHeatmap(transactionIndex, year, month, 'income'),
    [transactionIndex, year, month]
  )

  const frequency = useMemo(
    () => getTransactionFrequency(transactions, year, month),
    [transactions, year, month]
  )

  const goPrev = useCallback(() => {
    setViewDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }, [year, month])

  const goNext = useCallback(() => {
    setViewDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }, [year, month])

  const goToday = useCallback(() => {
    setViewDate(new Date())
    setSelectedDay(null)
  }, [])

  const jumpToMonth = useCallback((m) => {
    setViewDate(new Date(year, m, 1))
    setSelectedDay(null)
  }, [year])

  const jumpToYear = useCallback((y) => {
    setViewDate(new Date(y, month, 1))
    setSelectedDay(null)
  }, [month])

  const selectDay = useCallback((day) => {
    if (selectedDay === day) {
      setSelectedDay(null)
    } else {
      setSelectedDay(day)
    }
  }, [selectedDay])

  const toggleFilter = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      income: false, expense: false, trading: false,
      emi: false, bills: false, recurring: false,
      borrow: false, lend: false,
    })
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    searchRef.current?.focus()
  }, [])

  const getEventsForDay = useCallback((day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthEvents.filter((e) => e.date === dateStr)
  }, [monthEvents, year, month])

  const isDayVisible = useCallback((day) => {
    if (activeFilterKeys.length === 0 && !searchQuery.trim()) return true
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (searchQuery.trim()) {
      if (!monthSearchFiltered[dateStr]) return false
    }
    if (activeFilterKeys.length > 0) {
      const dayEvents = getEventsForDay(day)
      const daySummary = dailySummaries[dateStr] || null
      const dayBills = getBillsForDate(bills, dateStr)
      const dayTypes = getDayEventTypes(daySummary, dayEvents, dayBills)
      return matchesActiveFilters(daySummary, dayTypes, activeFilterKeys)
    }
    return true
  }, [activeFilterKeys, searchQuery, monthSearchFiltered, getEventsForDay, dailySummaries, bills, year, month])

  const eventColors = {
    debt: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    goal: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
    emi: { bg: 'bg-pink-500/10', text: 'text-pink-400', dot: 'bg-pink-400' },
    recurring: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', dot: 'bg-indigo-400' },
    bill: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  }

  const eventIcons = {
    debt: AlertCircle,
    goal: Target,
    emi: DollarSign,
    recurring: Repeat2,
    bill: Receipt,
  }

  const selectedDayData = useMemo(() => {
    if (selectedDay === null) return null
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    const dayTxs = monthTransactions[dateStr] || []
    const dayEvents = getEventsForDay(selectedDay)
    const dayBills = getBillsForDate(bills, dateStr)
    const summary = dailySummaries[dateStr] || { income: 0, expense: 0, tradingDeposit: 0, tradingWithdrawal: 0, borrow: 0, lend: 0, total: 0, count: 0 }
    const balance = getRunningBalance(transactions, dateStr)
    const netCashFlow = summary.income + summary.tradingWithdrawal - summary.expense - summary.tradingDeposit
    const outstandingDebt = debts
      .filter((d) => d.status !== 'settled' && d.dueDate === dateStr)
      .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
    return { dateStr, dayTxs, dayEvents, dayBills, summary, balance, netCashFlow, outstandingDebt }
  }, [selectedDay, year, month, monthTransactions, getEventsForDay, dailySummaries, bills, transactions, debts])

  const renderDayIndicators = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const daySummary = dailySummaries[dateStr] || null
    const dayEvents = getEventsForDay(day)
    const dayBills = getBillsForDate(bills, dateStr)
    const types = getDayEventTypes(daySummary, dayEvents, dayBills)
    if (types.length === 0 && !daySummary) return null
    const hasTx = daySummary && daySummary.count > 0
    return (
      <div className="flex flex-col items-center w-full">
        {hasTx && (
          <div className="flex items-center gap-0.5 mb-0.5">
            {daySummary.income > 0 && (
              <div className="flex items-center gap-px">
                <TrendingUp size={6} className="text-emerald-400" />
                <span className="text-[6px] font-medium text-emerald-400/90 tabular-nums leading-none">
                  {daySummary.income >= 1000 ? `${(daySummary.income / 1000).toFixed(0)}k` : formatCurrency(daySummary.income).replace(/[^0-9]/g, '').slice(0, 3)}
                </span>
              </div>
            )}
          </div>
        )}
        {types.length > 0 && (
          <div className="flex items-center gap-[2px]">
            {types.slice(0, 3).map((t) => {
              const cfg = EVENT_TYPES[t.type]
              return <div key={t.type} className={`w-1 h-1 rounded-full ${cfg ? cfg.dot : 'bg-gray-500'}`} />
            })}
            {types.length > 3 && (
              <span className="text-[6px] text-gray-600 font-medium leading-none">+{types.length - 3}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  const isToday = (day) => {
    const d = new Date()
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
  }

  const hasSelection = (day) => selectedDay === day

  const filterCount = useMemo(() => activeFilterKeys.length, [activeFilterKeys])

  const selectedDayDate = selectedDay !== null
    ? new Date(year, month, selectedDay)
    : null

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Calendar size={18} className="text-neon" />
          </div>
          <h1 className="text-xl font-bold">{t('calendar.title')}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-all duration-150 ${
              showFilters || filterCount > 0
                ? 'bg-neon/10 text-neon'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'
            }`}
            aria-label={t('calendar.toggle_filters')}
          >
            <Filter size={15} />
          </button>
          <button
            onClick={goToday}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-neon border border-neon/30 hover:bg-neon/10 transition-all"
          >
            {t('calendar.today')}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('calendar.search_placeholder')}
          className="input-field !pl-9 !py-2 !text-xs"
          aria-label={t('calendar.search_aria')}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <GlassCard className="mb-3 !p-2.5 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
              <Filter size={10} />
              {filterCount > 0 ? t('calendar.filters_active', { count: filterCount }) : t('calendar.filters')}
            </span>
            {filterCount > 0 && (
              <button onClick={clearFilters} className="text-[10px] text-neon/70 hover:text-neon transition-colors">
                {t('calendar.clear_all')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_DEFS.map((fd) => {
              const isActive = filters[fd.key]
              return (
                <button
                  key={fd.key}
                  onClick={() => toggleFilter(fd.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all duration-150 ${
                    isActive
                      ? fd.color
                      : 'border-glass-border text-gray-500 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {t(fd.labelKey)}
                </button>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Month Navigation */}
      <GlassCard className="mb-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label={t('calendar.prev_month')}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => jumpToMonth(month)}
              className="text-sm font-bold hover:text-neon transition-colors px-1"
            >
              {MONTHS[month]} {year}
            </button>
          </div>
          <button
            onClick={goNext}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label={t('calendar.next_month')}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Month/Year Jump */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={month}
            onChange={(e) => jumpToMonth(parseInt(e.target.value))}
            className="flex-1 input-field !py-1.5 !text-xs"
            aria-label={t('calendar.select_month')}
          >
            {MONTHS_FULL.map((name, i) => (
              <option key={name} value={i}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => jumpToYear(parseInt(e.target.value))}
            className="w-24 input-field !py-1.5 !text-xs"
            aria-label={t('calendar.select_year')}
          >
            {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
        <div className="grid grid-cols-7 gap-[2px]">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const visible = isDayVisible(day)
            const tHighlight = isToday(day)
            const sHighlight = hasSelection(day)
            return (
              <button
                key={day}
                onClick={() => selectDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] transition-all duration-150 relative outline-none ${
                  sHighlight
                    ? 'bg-neon/20 border border-neon/40 text-neon font-bold'
                    : tHighlight
                      ? 'bg-neon/10 border border-neon/20 text-neon font-bold'
                      : visible
                        ? 'hover:bg-white/[0.06] text-gray-300'
                        : 'text-gray-700'
                }`}
                aria-label={`${MONTHS_FULL[month]} ${day}`}
              >
                <span className={!visible && !tHighlight ? 'opacity-30' : ''}>{day}</span>
                {visible && renderDayIndicators(day)}
              </button>
            )
          })}
        </div>

        {/* Event type legend */}
        {monthEvents.length > 0 && (
          <div className="flex items-center justify-center gap-2.5 mt-3 pt-3 border-t border-glass-border">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] text-gray-600">{t('calendar.income')}</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[9px] text-gray-600">{t('calendar.expense')}</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] text-gray-600">{t('calendar.trading')}</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span className="text-[9px] text-gray-600">{t('calendar.emi')}</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-[9px] text-gray-600">{t('calendar.bill')}</span>
            </span>
          </div>
        )}
      </GlassCard>

      {/* Selected Day Details */}
      {selectedDayData && (
        <GlassCard className="mb-4 !p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-neon" />
              <h2 className="text-sm font-bold">
                {DAYS[selectedDayDate.getDay()]}, {selectedDay} {MONTHS[month]} {year}
              </h2>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-500 hover:text-white transition-colors p-1"
              aria-label={t('calendar.close_day')}
            >
              <X size={14} />
            </button>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-center">
              <p className="text-[9px] text-emerald-400/70 font-medium uppercase tracking-wider">{t('calendar.income')}</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
                {formatCurrency(selectedDayData.summary.income)}
              </p>
            </div>
            <div className="rounded-xl bg-red-500/10 p-2.5 text-center">
              <p className="text-[9px] text-red-400/70 font-medium uppercase tracking-wider">{t('calendar.expense')}</p>
              <p className="text-sm font-bold text-red-400 tabular-nums mt-0.5">
                {formatCurrency(selectedDayData.summary.expense)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-center">
              <p className="text-[9px] text-amber-400/70 font-medium uppercase tracking-wider">{t('calendar.trading')}</p>
              <p className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
                {formatCurrency(selectedDayData.summary.tradingDeposit + selectedDayData.summary.tradingWithdrawal)}
              </p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-center">
              <p className="text-[9px] text-blue-400/70 font-medium uppercase tracking-wider">{t('calendar.net_cash_flow')}</p>
              <p className={`text-sm font-bold tabular-nums mt-0.5 ${selectedDayData.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {selectedDayData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(selectedDayData.netCashFlow)}
              </p>
            </div>
          </div>

          {/* Savings and Outstanding */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
              <Sparkles size={12} className="text-neon shrink-0" />
              <span className="text-[10px] text-gray-500">{t('calendar.savings')}</span>
              <span className={`text-[11px] font-semibold tabular-nums ml-auto ${(selectedDayData.summary.income - selectedDayData.summary.expense) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(selectedDayData.summary.income - selectedDayData.summary.expense)}
              </span>
            </div>
            {selectedDayData.outstandingDebt > 0 && (
              <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                <AlertCircle size={12} className="text-red-400 shrink-0" />
                <span className="text-[10px] text-gray-500">{t('calendar.outstanding')}</span>
                <span className="text-[11px] font-semibold tabular-nums text-red-400 ml-auto">
                  {formatCurrency(selectedDayData.outstandingDebt)}
                </span>
              </div>
            )}
          </div>

          {/* Running Balance */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-neon/5 border border-neon/10 mb-3">
            <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
              <Wallet size={12} className="text-neon" />
              {t('calendar.running_balance')}
            </span>
            <span className={`text-xs font-bold tabular-nums ${selectedDayData.balance >= 0 ? 'text-neon' : 'text-red-400'}`}>
              {formatCurrency(selectedDayData.balance)}
            </span>
          </div>

          {/* Transaction count */}
          {selectedDayData.summary.count > 0 && (
            <p className="text-[10px] text-gray-600 mb-2">
              {t('calendar.txn_count', { count: selectedDayData.summary.count })}
            </p>
          )}

          {/* Timeline */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {selectedDayData.dayTxs.length === 0 && selectedDayData.dayEvents.length === 0 && selectedDayData.dayBills.length === 0 ? (
              <div className="text-center py-4">
                <Calendar size={20} className="text-gray-700 mx-auto mb-1" />
                <p className="text-[10px] text-gray-600">{t('calendar.no_activity')}</p>
              </div>
            ) : (
              <>
                {selectedDayData.dayTxs.map((tx) => {
                  const isIncome = tx.type === 'income'
                  return (
                    <div key={tx.id} className="flex items-center gap-2.5 py-1.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {isIncome ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">
                          {tx.note || tx.category}
                        </p>
                        {tx.person?.name && (
                          <p className="text-[9px] text-gray-600">{tx.person.name}</p>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                        isIncome ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  )
                })}
                {selectedDayData.dayEvents.map((ev, i) => {
                  const colors = eventColors[ev.type] || eventColors.debt
                  const Icon = eventIcons[ev.type] || AlertCircle
                  return (
                    <div key={`ev-${i}`} className="flex items-center gap-2.5 py-1.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                        <Icon size={11} className={colors.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{ev.title}</p>
                      </div>
                      {ev.amount > 0 && (
                        <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${colors.text}`}>
                          {formatCurrency(ev.amount)}
                        </span>
                      )}
                    </div>
                  )
                })}
                {selectedDayData.dayBills.map((bill) => (
                  <div key={bill.id} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-yellow-500/10">
                      <Receipt size={11} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{t('calendar.bill_event', { name: bill.name })}</p>
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums text-yellow-400 shrink-0">
                      {formatCurrency(bill.amount)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </GlassCard>
      )}

      {/* Financial Highlights */}
      {highlights.totalDays > 0 && !selectedDay && (
        <GlassCard className="mb-4 !p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={12} className="text-amber-400" />
            <h2 className="text-[11px] font-semibold text-gray-300">{t('calendar.highlights')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {highlights.highestExpense.amount > 0 && (
              <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-[9px] text-red-400/70 font-medium uppercase tracking-wider">{t('calendar.highest_expense')}</p>
                <p className="text-xs font-bold text-red-400 tabular-nums mt-0.5">
                  {formatCurrency(highlights.highestExpense.amount)}
                </p>
                <p className="text-[9px] text-gray-600 mt-0.5">
                  {highlights.highestExpense.date?.slice(-2)} {MONTHS[month]}
                </p>
              </div>
            )}
            {highlights.highestIncome.amount > 0 && (
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[9px] text-emerald-400/70 font-medium uppercase tracking-wider">{t('calendar.highest_income')}</p>
                <p className="text-xs font-bold text-emerald-400 tabular-nums mt-0.5">
                  {formatCurrency(highlights.highestIncome.amount)}
                </p>
                <p className="text-[9px] text-gray-600 mt-0.5">
                  {highlights.highestIncome.date?.slice(-2)} {MONTHS[month]}
                </p>
              </div>
            )}
            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-[9px] text-blue-400/70 font-medium uppercase tracking-wider">{t('calendar.no_spend_days')}</p>
              <p className="text-xs font-bold text-blue-400 tabular-nums mt-0.5">{highlights.noSpendDays}</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <p className="text-[9px] text-amber-400/70 font-medium uppercase tracking-wider">{t('calendar.savings_days')}</p>
              <p className="text-xs font-bold text-amber-400 tabular-nums mt-0.5">{highlights.savingsDays}</p>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <p className="text-[9px] text-orange-400/70 font-medium uppercase tracking-wider">{t('calendar.neg_cash_flow')}</p>
              <p className="text-xs font-bold text-orange-400 tabular-nums mt-0.5">{highlights.negativeCashFlowDays}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <p className="text-[9px] text-purple-400/70 font-medium uppercase tracking-wider">{t('calendar.days_with_expense')}</p>
              <p className="text-xs font-bold text-purple-400 tabular-nums mt-0.5">{highlights.daysWithExpense}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Insights */}
      {trends.length > 0 && !selectedDay && (
        <GlassCard className="mb-4 !p-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity size={12} className="text-cyan-400" />
            <h2 className="text-[11px] font-semibold text-gray-300">{t('calendar.insights')}</h2>
          </div>

          {/* Monthly Trend Bars */}
          <div className="mb-3">
            <p className="text-[9px] text-gray-600 font-medium uppercase tracking-wider mb-2">{t('calendar.trend_title')}</p>
            <div className="space-y-1.5">
              {trends.map((t) => {
                const maxVal = Math.max(t.incomePct, t.expensePct, 5)
                return (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-600 w-12 shrink-0 text-right">{t.label}</span>
                    <div className="flex-1 flex flex-col gap-px">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 rounded-full bg-matte-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                            style={{ width: `${(t.incomePct / maxVal) * 100}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-emerald-400/70 tabular-nums w-10 text-right">
                          {formatCurrency(t.income)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 rounded-full bg-matte-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-400 transition-all duration-300"
                            style={{ width: `${(t.expensePct / maxVal) * 100}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-red-400/70 tabular-nums w-10 text-right">
                          {formatCurrency(t.expense)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Expense Heatmap */}
          {expenseHeatmap.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-gray-600 font-medium uppercase tracking-wider mb-2">{t('calendar.expense_heatmap')}</p>
              <div className="grid grid-cols-7 gap-[2px]">
                {expenseHeatmap.map((cell) => (
                    <div
                      key={cell.day}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[7px] font-medium`}
                      style={{
                        backgroundColor: cell.intensity > 0 ? `rgba(248, 113, 113, ${cell.intensity})` : 'rgba(255,255,255,0.03)',
                        color: cell.intensity > 0.5 ? '#fff' : 'rgba(255,255,255,0.3)',
                      }}
                      title={t('calendar.day_title', { day: cell.day, amount: formatCurrency(cell.value) })}
                    >
                      {cell.day}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Income Heatmap */}
          {incomeHeatmap.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-gray-600 font-medium uppercase tracking-wider mb-2">{t('calendar.income_heatmap')}</p>
              <div className="grid grid-cols-7 gap-[2px]">
                {incomeHeatmap.map((cell) => (
                  <div
                    key={cell.day}
                    className={`aspect-square rounded-sm flex items-center justify-center text-[7px] font-medium`}
                    style={{
                      backgroundColor: cell.intensity > 0 ? `rgba(52, 211, 153, ${cell.intensity})` : 'rgba(255,255,255,0.03)',
                      color: cell.intensity > 0.5 ? '#000' : 'rgba(255,255,255,0.3)',
                    }}
                    title={t('calendar.day_title', { day: cell.day, amount: formatCurrency(cell.value) })}
                  >
                    {cell.day}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Frequency */}
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center p-2 rounded-lg bg-white/[0.03]">
              <p className="text-lg font-bold text-white tabular-nums">{frequency.total}</p>
              <p className="text-[9px] text-gray-600">{t('calendar.total_txns')}</p>
            </div>
            <div className="flex-1 text-center p-2 rounded-lg bg-white/[0.03]">
              <p className="text-lg font-bold text-white tabular-nums">{frequency.avgPerDay}</p>
              <p className="text-[9px] text-gray-600">{t('calendar.avg_day')}</p>
            </div>
            <div className="flex-1 text-center p-2 rounded-lg bg-white/[0.03]">
              <p className="text-lg font-bold text-white tabular-nums">{frequency.avgPerWeek}</p>
              <p className="text-[9px] text-gray-600">{t('calendar.avg_week')}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* This Month Summary */}
      <GlassCard brand className="mb-4">
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('calendar.this_month')}</p>
          <p className="text-lg font-extrabold text-gradient-brand mt-1">
            {t('calendar.event_count', { count: monthEvents.length })}
          </p>
          <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" /> {t('calendar.debt')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> {t('calendar.goal')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-400" /> {t('calendar.emi')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> {t('calendar.recurring')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" /> {t('calendar.bill')}
            </span>
          </div>
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
            {v === 'upcoming' ? t('calendar.tab_upcoming') : v === 'week' ? t('calendar.tab_week') : t('calendar.tab_overdue')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {viewMode === 'upcoming' && (
        <>
          {upcomingEvents.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={Calendar}
                title={t('calendar.no_upcoming')}
                description={t('calendar.no_upcoming_desc')}
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 mb-2">{t('calendar.next_events')}</h2>
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
                title={t('calendar.nothing_week')}
                description={t('calendar.nothing_week_desc')}
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 mb-2">
                {t('calendar.week_count', { count: thisWeekEvents.length })}
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
                title={t('calendar.nothing_overdue')}
                description={t('calendar.nothing_overdue_desc')}
              />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {t('calendar.overdue_count', { count: overdueItems.length })}
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
                              {t('calendar.due', { date: formatDate(e.date) })}
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
