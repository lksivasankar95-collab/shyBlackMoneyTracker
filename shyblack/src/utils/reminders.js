import { safeStorage, STORAGE_KEYS } from './safeStorage'

const REMINDER_NOTIFICATION_ID = 1
const REMINDER_HOUR = 19
const REMINDER_MINUTE = 0

const MESSAGES = [
  "You haven't updated today's expenses yet. Tap to log them now.",
  'Pending debt repayments need your attention. Check your borrow & lend list.',
  'Your daily financial snapshot is waiting. Open ShyBlack to review today.',
]

let CapacitorLocalNotifications = null

async function getPlugin() {
  if (CapacitorLocalNotifications) return CapacitorLocalNotifications
  try {
    const mod = await import('@capacitor/local-notifications')
    CapacitorLocalNotifications = mod.LocalNotifications
    return CapacitorLocalNotifications
  } catch {
    return null
  }
}

function hasActivityToday(transactions, debts) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const hasTx = transactions.some((t) => {
    if (!t.date) return false
    return t.date === todayStr
  })

  const hasDebtToday = debts.some((d) => {
    return d.createdAt && new Date(d.createdAt).toISOString().split('T')[0] === todayStr
  })

  const hasRepaymentToday = debts.some((d) => {
    return d.updatedAt && new Date(d.updatedAt).toISOString().split('T')[0] === todayStr
  })

  return hasTx || hasDebtToday || hasRepaymentToday
}

function getContextualMessage(transactions, debts) {
  const hasPendingDebts = debts.some((d) => d.status === 'pending' && d.remainingAmount > 0)
  if (hasPendingDebts) return MESSAGES[2]

  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
}

function getTomorrowAt(hour, minute) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }
  return target
}

export function getReminderPreference() {
  const data = safeStorage.get(STORAGE_KEYS.REMINDER, {})
  return data && data.enabled === true
}

export function setReminderPreference(enabled) {
  safeStorage.set(STORAGE_KEYS.REMINDER, { enabled, updatedAt: Date.now() })
}

export async function requestNotificationPermission() {
  const plugin = await getPlugin()
  if (!plugin) return { granted: false, reason: 'not-available' }

  try {
    const perm = await plugin.requestPermissions()
    return { granted: perm.display === 'granted', reason: perm.display }
  } catch {
    try {
      const perm = await plugin.checkPermissions()
      return { granted: perm.display === 'granted', reason: perm.display }
    } catch {
      return { granted: false, reason: 'error' }
    }
  }
}

export async function checkNotificationPermission() {
  const plugin = await getPlugin()
  if (!plugin) return { granted: false, reason: 'not-available' }

  try {
    const perm = await plugin.checkPermissions()
    return { granted: perm.display === 'granted', reason: perm.display }
  } catch {
    return { granted: false, reason: 'error' }
  }
}

export async function scheduleDailyReminder(message, transactions, debts) {
  const plugin = await getPlugin()
  if (!plugin) return { scheduled: false, reason: 'plugin-not-available' }

  if (!getReminderPreference()) return { scheduled: false, reason: 'disabled' }

  if (hasActivityToday(transactions, debts)) return { scheduled: false, reason: 'activity-exists' }

  try {
    await cancelAllReminders()

    const fireDate = getTomorrowAt(REMINDER_HOUR, REMINDER_MINUTE)
    const contextualMessage = message || getContextualMessage(transactions, debts)

    await plugin.schedule({
      notifications: [
        {
          id: REMINDER_NOTIFICATION_ID,
          title: 'ShyBlack Finance',
          body: contextualMessage,
          schedule: { at: fireDate, allowWhileIdle: true },
          sound: null,
          smallIcon: 'ic_stat_shyblack',
          iconColor: '#39ff14',
          channelId: 'shyblack-daily-reminder',
          actionTypeId: '',
          extra: { source: 'daily-reminder' },
        },
      ],
    })

    return { scheduled: true, fireDate: fireDate.toISOString() }
  } catch (error) {
    return { scheduled: false, reason: error.message || 'schedule-error' }
  }
}

export async function cancelAllReminders() {
  const plugin = await getPlugin()
  if (!plugin) return false

  try {
    const pending = await plugin.getPending()
    if (pending.notifications.length > 0) {
      await plugin.cancel({ notifications: pending.notifications })
    }
    return true
  } catch {
    return false
  }
}

export async function refreshReminderSchedule(transactions, debts) {
  const enabled = getReminderPreference()
  if (!enabled) {
    await cancelAllReminders()
    return { active: false, reason: 'disabled' }
  }

  const result = await scheduleDailyReminder(null, transactions, debts)
  return result
}

export function shouldShowReminderToday(transactions, debts) {
  if (!getReminderPreference()) return false
  return !hasActivityToday(transactions, debts)
}

function getMonthlyRecapSentKey() {
  const now = new Date()
  return `recap_${now.getFullYear()}_${now.getMonth()}`
}

function wasMonthlyRecapSent() {
  const data = safeStorage.get(STORAGE_KEYS.REMINDER, {})
  return !!data[getMonthlyRecapSentKey()]
}

function markMonthlyRecapSent() {
  const data = safeStorage.get(STORAGE_KEYS.REMINDER, {})
  data[getMonthlyRecapSentKey()] = true
  safeStorage.set(STORAGE_KEYS.REMINDER, data)
}

function formatAmount(n) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

export async function checkAndScheduleMonthlyRecap(transactions) {
  const now = new Date()
  if (now.getDate() !== 1) return { skipped: true, reason: 'not-first-of-month' }
  if (wasMonthlyRecapSent()) return { skipped: true, reason: 'already-sent' }

  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastYear
  })

  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  if (income === 0 && expense === 0) return { skipped: true, reason: 'no-data' }

  const lp = await getPlugin()
  if (!lp) return { skipped: true, reason: 'no-plugin' }

  try {
    const perm = await lp.checkPermissions()
    if (perm.display !== 'granted') return { skipped: true, reason: 'no-permission' }

    const saved = income - expense
    const parts = [`Spent ₹${formatAmount(expense)}`]
    if (income > 0) parts.unshift(`Earned ₹${formatAmount(income)}`)
    if (saved > 0) parts.push(`Saved ₹${formatAmount(saved)}`)

    await lp.schedule({
      notifications: [{
        id: 50,
        title: 'Monthly Summary',
        body: parts.join(' · '),
        schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
        smallIcon: 'ic_stat_shyblack',
        iconColor: '#39ff14',
        channelId: 'shyblack-daily-reminder',
      }],
    })

    markMonthlyRecapSent()
    return { sent: true }
  } catch (err) {
    return { skipped: true, reason: err?.message }
  }
}

export function shouldShowReviewBanner(transactions) {
  const now = new Date()
  if (now.getDate() < 3) return true
  if (wasMonthlyRecapSent()) return false
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastYear
  })
  return monthTx.length >= 3
}

export async function checkDebtReminders(debts) {
  if (!debts || debts.length === 0) return

  const lp = await getPlugin()
  if (!lp) return

  try {
    const perm = await lp.checkPermissions()
    if (perm.display !== 'granted') return
  } catch {
    return
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const reminders = []

  debts.forEach((d) => {
    if (d.status === 'paid' || !d.dueDate || d.remainingAmount <= 0) return
    const due = d.dueDate.split('T')[0]
    const name = d.personName || 'someone'
    const amt = `₹${d.remainingAmount.toLocaleString()}`

    if (due === tomorrowStr) {
      reminders.push({
        id: 300 + reminders.length,
        title: 'Payment Due Tomorrow',
        body: d.type === 'lent'
          ? `${amt} due from ${name} tomorrow`
          : `${amt} owed to ${name} due tomorrow`,
      })
    } else if (due < todayStr) {
      reminders.push({
        id: 350 + reminders.length,
        title: 'Overdue Payment',
        body: d.type === 'lent'
          ? `${amt} from ${name} is overdue`
          : `${amt} owed to ${name} is overdue`,
      })
    }
  })

  if (reminders.length === 0) return

  try {
    const lp2 = await getPlugin()
    if (!lp2) return
    await lp2.schedule({
      notifications: reminders.map((r) => ({
        ...r,
        schedule: { at: new Date(Date.now() + 3000 + reminders.indexOf(r) * 1000), allowWhileIdle: true },
        smallIcon: 'ic_stat_shyblack',
        iconColor: '#f59e0b',
        channelId: 'shyblack-daily-reminder',
      })),
    })
  } catch {}
}
