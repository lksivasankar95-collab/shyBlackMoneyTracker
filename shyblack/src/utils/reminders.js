import { safeStorage, STORAGE_KEYS } from './safeStorage'
import { sendNotification, cancelNotifications, checkNotificationPermission, requestNotificationPermission, getPendingNotifications, NOTIF_TYPES } from './notifications'

const REMINDER_NOTIFICATION_ID = 1
const REMINDER_HOUR = 19
const REMINDER_MINUTE = 0

async function getContextualMessage() {
  const i18nMod = await import('i18next')
  const t = i18nMod.default.t.bind(i18nMod.default)
  const msgs = [
    t('notifications.daily_reminder.body_1'),
    t('notifications.daily_reminder.body_2'),
    t('notifications.daily_reminder.body_3'),
  ]
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export function getReminderPreference() {
  const data = safeStorage.get(STORAGE_KEYS.REMINDER, {})
  return data && data.enabled === true
}

export function setReminderPreference(enabled) {
  safeStorage.set(STORAGE_KEYS.REMINDER, { enabled, updatedAt: Date.now() })
}

export async function scheduleDailyReminder(message) {
  if (!getReminderPreference()) return { scheduled: false, reason: 'disabled' }

  const perm = await checkNotificationPermission()
  if (!perm.granted) {
    const req = await requestNotificationPermission()
    if (!req.granted) return { scheduled: false, reason: 'permission-denied' }
  }

  try {
    await cancelAllReminders()
    const body = message || await getContextualMessage()

    const id = await sendNotification(NOTIF_TYPES.DAILY_REMINDER, {
      id: REMINDER_NOTIFICATION_ID,
      body,
      schedule: { on: { hour: REMINDER_HOUR, minute: REMINDER_MINUTE }, allowWhileIdle: true },
    })

    return { scheduled: !!id }
  } catch (error) {
    return { scheduled: false, reason: error.message || 'schedule-error' }
  }
}

const REMINDER_IDS = new Set([REMINDER_NOTIFICATION_ID, 50, 51])

export async function cancelAllReminders() {
  try {
    const pending = await getPendingNotifications()
    const toCancel = pending.filter((n) => REMINDER_IDS.has(n.id))
    if (toCancel.length > 0) {
      await cancelNotifications(toCancel.map((n) => n.id))
    }
    return true
  } catch {
    return false
  }
}

export async function refreshReminderSchedule() {
  const enabled = getReminderPreference()
  if (!enabled) {
    await cancelAllReminders()
    return { active: false, reason: 'disabled' }
  }
  const result = await scheduleDailyReminder()
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

  const perm = await checkNotificationPermission()
  if (!perm.granted) return { skipped: true, reason: 'no-permission' }

  const saved = income - expense
  const parts = [`Spent ₹${formatAmount(expense)}`]
  if (income > 0) parts.unshift(`Earned ₹${formatAmount(income)}`)
  if (saved > 0) parts.push(`Saved ₹${formatAmount(saved)}`)

  const id = await sendNotification(NOTIF_TYPES.MONTHLY_SUMMARY, {
    id: 50,
    body: parts.join(' · '),
    schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
  })

  if (id) {
    markMonthlyRecapSent()
    return { sent: true }
  }
  return { skipped: true, reason: 'send-failed' }
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

  const perm = await checkNotificationPermission()
  if (!perm.granted) return

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const notifications = []

  debts.forEach((d, index) => {
    const balance = d.remainingAmount ?? d.currentBalance ?? 0
    if (d.status === 'paid' || d.status === 'settled' || !d.dueDate || balance <= 0) return
    const due = d.dueDate.split('T')[0]
    const name = d.personName || 'someone'
    const amt = `₹${balance.toLocaleString()}`

    if (due === tomorrowStr) {
      notifications.push({
        type: NOTIF_TYPES.DEBT_REMINDER,
        id: 500000 + index,
        body: d.type === 'lent'
          ? `${amt} due from ${name} tomorrow`
          : `${amt} owed to ${name} due tomorrow`,
        debtId: d.id,
        iconColor: '#F97316',
      })
    } else if (due < todayStr) {
      notifications.push({
        type: NOTIF_TYPES.DEBT_REMINDER,
        id: 500100 + index,
        body: d.type === 'lent'
          ? `${amt} from ${name} is overdue`
          : `${amt} owed to ${name} is overdue`,
        debtId: d.id,
        iconColor: '#DC2626',
      })
    }
  })

  if (notifications.length === 0) return

  for (const n of notifications) {
    await sendNotification(n.type, {
      id: n.id,
      body: n.body,
      iconColor: n.iconColor,
      debtId: n.debtId,
      schedule: { at: new Date(Date.now() + 3000 + notifications.indexOf(n) * 1000), allowWhileIdle: true },
    })
  }
}
