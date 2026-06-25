import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { getNotifT } from './notificationI18n'
import { LocalNotifications } from '@capacitor/local-notifications'

const REMINDER_NOTIFICATION_ID = 1
const REMINDER_HOUR = 19
const REMINDER_MINUTE = 0

function getPlugin() {
  return LocalNotifications
}

async function ensureDailyReminderChannel() {
  const plugin = getPlugin()
  if (!plugin) return false
  try {
    await plugin.createChannel({
      id: 'shyblack-daily-reminder',
      name: 'Daily Reminders',
      description: 'Daily financial reminders and monthly summaries',
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true,
      lightColor: '#39ff14',
    })
    return true
  } catch {
    return false
  }
}

async function getContextualMessage(transactions, debts) {
  const t = await getNotifT()
  const msgs = [
    t('notifications.daily_body_1'),
    t('notifications.daily_body_2'),
    t('notifications.daily_body_3'),
  ]
  const hasPendingDebts = debts.some((d) => d.status === 'pending' && d.remainingAmount > 0)
  if (hasPendingDebts) return msgs[1]
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export function getReminderPreference() {
  const data = safeStorage.get(STORAGE_KEYS.REMINDER, {})
  return data && data.enabled === true
}

export function setReminderPreference(enabled) {
  safeStorage.set(STORAGE_KEYS.REMINDER, { enabled, updatedAt: Date.now() })
}

export async function requestNotificationPermission() {
  const plugin = getPlugin()
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
  const plugin = getPlugin()
  if (!plugin) return { granted: false, reason: 'not-available' }

  try {
    const perm = await plugin.checkPermissions()
    return { granted: perm.display === 'granted', reason: perm.display }
  } catch {
    return { granted: false, reason: 'error' }
  }
}

export async function scheduleDailyReminder(message, transactions, debts) {
  const plugin = getPlugin()
  if (!plugin) return { scheduled: false, reason: 'plugin-not-available' }

  if (!getReminderPreference()) return { scheduled: false, reason: 'disabled' }

  const perm = await checkNotificationPermission()
  if (!perm.granted) {
    const req = await requestNotificationPermission()
    if (!req.granted) return { scheduled: false, reason: 'permission-denied' }
  }

  try {
    await ensureDailyReminderChannel()
    await cancelAllReminders()

    const t = await getNotifT()
    const contextualMessage = message || await getContextualMessage(transactions, debts)

    await plugin.schedule({
      notifications: [
        {
          id: REMINDER_NOTIFICATION_ID,
          title: t('notifications.app_name'),
          body: contextualMessage,
          schedule: { on: { hour: REMINDER_HOUR, minute: REMINDER_MINUTE }, allowWhileIdle: true },
          sound: null,
          iconColor: '#39ff14',
          channelId: 'shyblack-daily-reminder',
          actionTypeId: '',
          extra: { source: 'daily-reminder' },
        },
      ],
    })

    return { scheduled: true }
  } catch (error) {
    return { scheduled: false, reason: error.message || 'schedule-error' }
  }
}

export async function cancelAllReminders() {
  const plugin = getPlugin()
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
  return { active: result.scheduled, scheduled: result.scheduled, reason: result.reason }
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

  const lp = getPlugin()
  if (!lp) return { skipped: true, reason: 'no-plugin' }

  try {
    const perm = await lp.checkPermissions()
    if (perm.display !== 'granted') return { skipped: true, reason: 'no-permission' }

    await ensureDailyReminderChannel()

    const t = await getNotifT()
    const saved = income - expense
    const parts = [`Spent ₹${formatAmount(expense)}`]
    if (income > 0) parts.unshift(`Earned ₹${formatAmount(income)}`)
    if (saved > 0) parts.push(`Saved ₹${formatAmount(saved)}`)

    await lp.schedule({
      notifications: [{
        id: 50,
        title: t('notifications.monthly_summary'),
        body: parts.join(' · '),
        schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
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

  const lp = getPlugin()
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
  const t = await getNotifT()

  debts.forEach((d) => {
    if (d.status === 'paid' || !d.dueDate || d.remainingAmount <= 0) return
    const due = d.dueDate.split('T')[0]
    const name = d.personName || 'someone'
    const amt = `₹${d.remainingAmount.toLocaleString()}`

    if (due === tomorrowStr) {
      reminders.push({
        id: 300 + reminders.length,
        title: t('notifications.payment_due_tomorrow'),
        body: d.type === 'lent'
          ? `${amt} due from ${name} tomorrow`
          : `${amt} owed to ${name} due tomorrow`,
      })
    } else if (due < todayStr) {
      reminders.push({
        id: 350 + reminders.length,
        title: t('notifications.overdue_payment'),
        body: d.type === 'lent'
          ? `${amt} from ${name} is overdue`
          : `${amt} owed to ${name} is overdue`,
      })
    }
  })

  if (reminders.length === 0) return

  try {
    await ensureDailyReminderChannel()
    const lp2 = getPlugin()
    if (!lp2) return
    await lp2.schedule({
      notifications: reminders.map((r) => ({
        ...r,
        schedule: { at: new Date(Date.now() + 3000 + reminders.indexOf(r) * 1000), allowWhileIdle: true },
        iconColor: '#f59e0b',
        channelId: 'shyblack-daily-reminder',
      })),
    })
  } catch {}
}
