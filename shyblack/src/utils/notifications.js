import { LocalNotifications } from '@capacitor/local-notifications'
import i18n from 'i18next'

const CHANNEL_ID = 'finora_finance'
const GROUP_KEY = 'finance_notifications'
const SMALL_ICON = 'ic_stat_finora'

export const NOTIF_TYPES = {
  EXPENSE_ADDED: 'expense_added',
  INCOME_ADDED: 'income_added',
  REMINDER: 'reminder',
  BACKUP_COMPLETE: 'backup_complete',
  RESTORE_COMPLETE: 'restore_complete',
  EXPORT_FINISHED: 'export_finished',
  BUDGET_ALERT: 'budget_alert',
  GOAL_ACHIEVED: 'goal_achieved',
  DEBT_REMINDER: 'debt_reminder',
  EMI_REMINDER: 'emi_reminder',
  TRADING_REMINDER: 'trading_reminder',
  DAILY_REMINDER: 'daily_reminder',
  MONTHLY_SUMMARY: 'monthly_summary',
  WEEKLY_SUMMARY: 'weekly_summary',
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
}

const NOTIF_COLORS = {
  [NOTIF_TYPES.EXPENSE_ADDED]: '#EF4444',
  [NOTIF_TYPES.INCOME_ADDED]: '#00E676',
  [NOTIF_TYPES.REMINDER]: '#39FF14',
  [NOTIF_TYPES.BACKUP_COMPLETE]: '#39FF14',
  [NOTIF_TYPES.RESTORE_COMPLETE]: '#39FF14',
  [NOTIF_TYPES.EXPORT_FINISHED]: '#39FF14',
  [NOTIF_TYPES.BUDGET_ALERT]: '#F59E0B',
  [NOTIF_TYPES.GOAL_ACHIEVED]: '#00E676',
  [NOTIF_TYPES.DEBT_REMINDER]: '#F97316',
  [NOTIF_TYPES.EMI_REMINDER]: '#39FF14',
  [NOTIF_TYPES.TRADING_REMINDER]: '#3B82F6',
  [NOTIF_TYPES.DAILY_REMINDER]: '#39FF14',
  [NOTIF_TYPES.MONTHLY_SUMMARY]: '#39FF14',
  [NOTIF_TYPES.WEEKLY_SUMMARY]: '#39FF14',
  [NOTIF_TYPES.ERROR]: '#DC2626',
  [NOTIF_TYPES.WARNING]: '#F59E0B',
  [NOTIF_TYPES.SUCCESS]: '#00E676',
}

const NOTIF_DEEP_LINKS = {
  [NOTIF_TYPES.EXPENSE_ADDED]: 'history',
  [NOTIF_TYPES.INCOME_ADDED]: 'history',
  [NOTIF_TYPES.REMINDER]: 'dashboard',
  [NOTIF_TYPES.BACKUP_COMPLETE]: 'settings',
  [NOTIF_TYPES.RESTORE_COMPLETE]: 'settings',
  [NOTIF_TYPES.EXPORT_FINISHED]: 'reports',
  [NOTIF_TYPES.BUDGET_ALERT]: 'budgets',
  [NOTIF_TYPES.GOAL_ACHIEVED]: 'goals',
  [NOTIF_TYPES.DEBT_REMINDER]: 'debts',
  [NOTIF_TYPES.EMI_REMINDER]: 'emi-center',
  [NOTIF_TYPES.TRADING_REMINDER]: 'dashboard',
  [NOTIF_TYPES.DAILY_REMINDER]: 'dashboard',
  [NOTIF_TYPES.MONTHLY_SUMMARY]: 'dashboard',
  [NOTIF_TYPES.WEEKLY_SUMMARY]: 'dashboard',
  [NOTIF_TYPES.ERROR]: 'settings',
  [NOTIF_TYPES.WARNING]: 'dashboard',
  [NOTIF_TYPES.SUCCESS]: 'dashboard',
}

const NOTIF_GROUP_SUMMARY = {
  [NOTIF_TYPES.EXPENSE_ADDED]: false,
  [NOTIF_TYPES.INCOME_ADDED]: false,
  [NOTIF_TYPES.REMINDER]: false,
  [NOTIF_TYPES.BACKUP_COMPLETE]: false,
  [NOTIF_TYPES.RESTORE_COMPLETE]: false,
  [NOTIF_TYPES.EXPORT_FINISHED]: false,
  [NOTIF_TYPES.BUDGET_ALERT]: false,
  [NOTIF_TYPES.GOAL_ACHIEVED]: false,
  [NOTIF_TYPES.DEBT_REMINDER]: false,
  [NOTIF_TYPES.EMI_REMINDER]: false,
  [NOTIF_TYPES.TRADING_REMINDER]: false,
  [NOTIF_TYPES.DAILY_REMINDER]: false,
  [NOTIF_TYPES.MONTHLY_SUMMARY]: true,
  [NOTIF_TYPES.WEEKLY_SUMMARY]: false,
  [NOTIF_TYPES.ERROR]: false,
  [NOTIF_TYPES.WARNING]: false,
  [NOTIF_TYPES.SUCCESS]: false,
}

function getPlugin() {
  return LocalNotifications
}

export async function initializeNotificationChannel() {
  const plugin = getPlugin()
  if (!plugin) return false
  try {
    await plugin.createChannel({
      id: CHANNEL_ID,
      name: i18n.t('notifications.channel_name'),
      description: i18n.t('notifications.channel_description'),
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#39FF14',
    })
    return true
  } catch {
    return false
  }
}

export async function sendNotification(type, options = {}) {
  const plugin = getPlugin()
  if (!plugin) return null

  try {
    const perm = await plugin.checkPermissions()
    if (perm.display !== 'granted') return null
  } catch {
    return null
  }

  await initializeNotificationChannel()

  const id = options.id != null ? options.id : generateId(type)
  const title = options.title || i18n.t(`notifications.${type}.title`)
  const body = options.body || i18n.t(`notifications.${type}.body`, options.bodyParams || {})

  const notification = {
    id,
    title,
    body,
    schedule: options.schedule || { at: new Date(Date.now() + 500), allowWhileIdle: true },
    sound: options.sound || 'default',
    smallIcon: SMALL_ICON,
    iconColor: options.iconColor || NOTIF_COLORS[type] || '#39FF14',
    channelId: CHANNEL_ID,
    group: GROUP_KEY,
    groupSummary: options.groupSummary != null ? options.groupSummary : NOTIF_GROUP_SUMMARY[type],
    actionTypeId: options.actionTypeId || 'FINANCE_ACTION',
    autoCancel: true,
    extra: {
      source: type,
      deepLink: options.deepLink || NOTIF_DEEP_LINKS[type] || 'dashboard',
      transactionId: options.transactionId || null,
      emiId: options.emiId || null,
      debtId: options.debtId || null,
      goalId: options.goalId || null,
      url: options.url || null,
    },
  }

  try {
    await plugin.schedule({ notifications: [notification] })
    return id
  } catch {
    return null
  }
}

export async function sendGroupSummary(count) {
  const plugin = getPlugin()
  if (!plugin) return false

  try {
    const perm = await plugin.checkPermissions()
    if (perm.display !== 'granted') return false
  } catch {
    return false
  }

  await initializeNotificationChannel()

  try {
    await plugin.schedule({
      notifications: [{
        id: 9998,
        title: i18n.t('notifications.group_summary.title'),
        body: i18n.t('notifications.group_summary.body', { count }),
        schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
        smallIcon: SMALL_ICON,
        iconColor: '#39FF14',
        channelId: CHANNEL_ID,
        group: GROUP_KEY,
        groupSummary: true,
        autoCancel: true,
        extra: { source: 'group_summary', deepLink: 'dashboard' },
      }],
    })
    return true
  } catch {
    return false
  }
}

export async function cancelNotification(id) {
  const plugin = getPlugin()
  if (!plugin) return false
  try {
    await plugin.cancel({ notifications: [{ id }] })
    return true
  } catch {
    return false
  }
}

export async function cancelNotifications(ids) {
  const plugin = getPlugin()
  if (!plugin) return false
  try {
    await plugin.cancel({ notifications: ids.map((id) => ({ id })) })
    return true
  } catch {
    return false
  }
}

export async function cancelAllNotifications() {
  const plugin = getPlugin()
  if (!plugin) return false
  try {
    await plugin.cancelAll()
    return true
  } catch {
    return false
  }
}

export async function getPendingNotifications() {
  const plugin = getPlugin()
  if (!plugin) return []
  try {
    const result = await plugin.getPending()
    return result.notifications || []
  } catch {
    return []
  }
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

export async function areNotificationsEnabled() {
  const plugin = getPlugin()
  if (!plugin) return false
  try {
    const perm = await plugin.checkPermissions()
    return perm.display === 'granted'
  } catch {
    return false
  }
}

export async function getNotificationDiagnostics() {
  const results = {
    permission: null,
    channel: null,
    pending: null,
    platform: false,
    exactAlarm: false,
  }

  const plugin = getPlugin()
  results.platform = !!plugin
  if (!plugin) return results

  try {
    const perm = await plugin.checkPermissions()
    results.permission = perm
  } catch {
    results.permission = { display: 'error' }
  }

  try {
    const pending = await plugin.getPending()
    results.pending = pending.notifications || []
  } catch {
    results.pending = []
  }

  try {
    results.channel = await plugin.getChannel({ id: CHANNEL_ID }).catch(() => null)
  } catch {
    results.channel = null
  }

  return results
}

export function registerNotificationListeners(handleNotificationTap) {
  const plugin = getPlugin()
  if (!plugin) return () => {}

  try {
    const handler = plugin.addListener('localNotificationActionPerformed', (event) => {
      const { notification } = event
      const extra = notification.extra || {}
      const deepLink = extra.deepLink || 'dashboard'
      if (handleNotificationTap) {
        handleNotificationTap(deepLink, extra)
      }
    })
    return () => {
      handler.then((h) => h.remove()).catch(() => {})
    }
  } catch {
    return () => {}
  }
}

function generateId(type) {
  const base = {
    expense_added: 300,
    income_added: 301,
    reminder: 100,
    backup_complete: 400,
    restore_complete: 401,
    export_finished: 402,
    budget_alert: 200,
    goal_achieved: 700,
    debt_reminder: 500,
    emi_reminder: 600,
    trading_reminder: 800,
    daily_reminder: 1,
    monthly_summary: 50,
    weekly_summary: 51,
    error: 9900,
    warning: 9901,
    success: 9902,
  }
  const now = Date.now() % 1000
  return (base[type] || 9000) * 1000 + now
}
