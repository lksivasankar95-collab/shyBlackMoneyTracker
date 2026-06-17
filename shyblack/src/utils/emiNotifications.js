import { getNextEmiDueDate, getEmiDueDate, EMI_STATUS } from './emi'

const EMI_CHANNEL_ID = 'shyblack-emi-reminders'
const EMI_NOTIF_BASE = 500
const EMI_NOTIF_SLOTS = 5
const EMI_HASH_MOD = 350

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

function hashEmiId(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getNotificationIds(emiId) {
  const base = EMI_NOTIF_BASE + (hashEmiId(emiId) % EMI_HASH_MOD) * EMI_NOTIF_SLOTS
  return Array.from({ length: EMI_NOTIF_SLOTS }, (_, i) => base + i)
}

export async function ensureEmiNotificationChannel() {
  const plugin = await getPlugin()
  if (!plugin) return false
  try {
    await plugin.createChannel({
      id: EMI_CHANNEL_ID,
      name: 'EMI Reminders',
      description: 'Reminders for scheduled EMI payments',
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

export async function scheduleEmiNotifications(emi, referenceDate) {
  if (!emi || emi.status !== EMI_STATUS.ACTIVE || emi.remainingMonths <= 0) return false

  const plugin = await getPlugin()
  if (!plugin) return false

  try {
    const perm = await plugin.checkPermissions()
    if (perm.display !== 'granted') return false
  } catch {
    return false
  }

  await ensureEmiNotificationChannel()

  const dueDate = getNextEmiDueDate(emi.dueDay, referenceDate)
  const ids = getNotificationIds(emi.id)
  const times = emi.reminderTimes && emi.reminderTimes.length > 0
    ? emi.reminderTimes.slice(0, EMI_NOTIF_SLOTS)
    : ['07:00', '08:00', '09:00']

  const notifications = []

  for (let i = 0; i < times.length; i++) {
    const [hours, minutes] = times[i].split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) continue

    const fireDate = new Date(dueDate)
    fireDate.setHours(hours, minutes, 0, 0)

    if (fireDate <= new Date()) continue

    notifications.push({
      id: ids[i],
      title: 'EMI Due Today',
      body: `${emi.name}\n₹${emi.amount.toLocaleString()}`,
      schedule: { at: fireDate, allowWhileIdle: true },
      sound: null,
      smallIcon: 'ic_stat_shyblack',
      iconColor: '#39ff14',
      channelId: EMI_CHANNEL_ID,
      extra: { source: 'emi', emiId: emi.id, reminderSlot: i },
    })
  }

  if (notifications.length === 0) return false

  try {
    await plugin.schedule({ notifications })
    return notifications.length
  } catch {
    return false
  }
}

export async function cancelEmiNotifications(emiId) {
  const plugin = await getPlugin()
  if (!plugin) return false

  try {
    const ids = getNotificationIds(emiId)
    await plugin.cancel({ notifications: ids.map((id) => ({ id })) })
    return true
  } catch {
    return false
  }
}

export async function rescheduleAllEmiNotifications(emis) {
  const plugin = await getPlugin()
  if (!plugin) return { cancelled: 0, scheduled: 0 }

  const allIds = emis.flatMap((emi) => getNotificationIds(emi.id))
  if (allIds.length > 0) {
    try {
      await plugin.cancel({ notifications: allIds.map((id) => ({ id })) })
    } catch {}
  }

  const active = emis.filter((e) => e.status === EMI_STATUS.ACTIVE && e.remainingMonths > 0)
  let scheduled = 0
  for (const emi of active) {
    const ok = await scheduleEmiNotifications(emi)
    if (ok) scheduled++
  }
  return { cancelled: allIds.length, scheduled }
}

export async function cancelAllEmiNotifications(emis) {
  const plugin = await getPlugin()
  if (!plugin) return false

  const allIds = emis.flatMap((emi) => getNotificationIds(emi.id))
  if (allIds.length === 0) return true

  try {
    await plugin.cancel({ notifications: allIds.map((id) => ({ id })) })
    return true
  } catch {
    return false
  }
}
