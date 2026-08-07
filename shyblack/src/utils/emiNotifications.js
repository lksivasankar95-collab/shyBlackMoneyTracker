import { getNextEmiDueDate, getEmiDueDate, EMI_STATUS } from './emi'
import { sendNotification, cancelNotifications, checkNotificationPermission, NOTIF_TYPES } from './notifications'

const EMI_NOTIF_BASE = 600000
const EMI_NOTIF_SLOTS = 5
const EMI_HASH_MOD = 350

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

export async function scheduleEmiNotifications(emi, referenceDate) {
  if (!emi || emi.status !== EMI_STATUS.ACTIVE || emi.remainingMonths <= 0) return false

  const perm = await checkNotificationPermission()
  if (!perm.granted) return false

  const dueDate = getEmiDueDate(emi) || getNextEmiDueDate(emi.dueDay, referenceDate)
  if (!dueDate) return false

  const ids = getNotificationIds(emi.id)
  const times = emi.reminderTimes && emi.reminderTimes.length > 0
    ? emi.reminderTimes.slice(0, EMI_NOTIF_SLOTS)
    : ['07:00', '08:00', '09:00']

  const schedules = []
  for (let i = 0; i < times.length; i++) {
    const [hours, minutes] = times[i].split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) continue

    const fireDate = new Date(dueDate)
    fireDate.setHours(hours, minutes, 0, 0)
    if (fireDate <= new Date()) continue

    schedules.push({
      id: ids[i],
      schedule: { at: fireDate, allowWhileIdle: true },
      emiId: emi.id,
      reminderSlot: i,
    })
  }

  if (schedules.length === 0) return false

  let sent = 0
  for (const s of schedules) {
    const ok = await sendNotification(NOTIF_TYPES.EMI_REMINDER, {
      id: s.id,
      bodyParams: { name: emi.name, amount: emi.amount.toLocaleString() },
      schedule: s.schedule,
      emiId: s.emiId,
    })
    if (ok) sent++
  }
  return sent
}

export async function cancelEmiNotifications(emiId) {
  const ids = getNotificationIds(emiId)
  return cancelNotifications(ids)
}

export async function rescheduleAllEmiNotifications(emis) {
  const allIds = emis.flatMap((emi) => getNotificationIds(emi.id))
  if (allIds.length > 0) {
    await cancelNotifications(allIds)
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
  const allIds = emis.flatMap((emi) => getNotificationIds(emi.id))
  if (allIds.length === 0) return true
  return cancelNotifications(allIds)
}
