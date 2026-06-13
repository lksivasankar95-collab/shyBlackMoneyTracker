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
