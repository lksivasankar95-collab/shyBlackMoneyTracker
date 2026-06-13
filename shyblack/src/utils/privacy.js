import { safeStorage } from './safeStorage'

const PRIVACY_KEY = 'shyblack_privacy'

let locked = false
let lastActiveTime = Date.now()

function getData() {
  return safeStorage.get(PRIVACY_KEY, {})
}

function saveData(data) {
  safeStorage.set(PRIVACY_KEY, data)
}

export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function isPinSet() {
  const data = getData()
  return !!data.pinHash
}

export async function setPin(pin) {
  const hash = await hashPin(pin)
  saveData({ ...getData(), pinHash: hash })
}

export async function verifyPin(pin) {
  const data = getData()
  if (!data.pinHash) return false
  const hash = await hashPin(pin)
  return hash === data.pinHash
}

export function clearPin() {
  const data = getData()
  delete data.pinHash
  delete data.timeout
  saveData(data)
  locked = false
}

export function getTimeout() {
  const data = getData()
  return data.timeout ?? 0
}

export function setTimeoutPref(seconds) {
  saveData({ ...getData(), timeout: seconds })
}

export function initLockState() {
  locked = isPinSet()
}

export function isLocked() {
  if (!isPinSet()) return false
  return locked
}

export function unlockSession() {
  locked = false
  lastActiveTime = Date.now()
}

export function onAppBackground() {
  lastActiveTime = Date.now()
}

export function shouldLockOnResume() {
  if (!isPinSet()) return false
  const timeout = getTimeout()
  if (timeout === 0) {
    locked = true
    return true
  }
  const elapsed = Date.now() - lastActiveTime
  if (elapsed >= timeout * 1000) {
    locked = true
    return true
  }
  return false
}
