import { safeStorage } from './safeStorage'

const PRIVACY_KEY = 'shyblack_privacy'
const DEBUG = true
const debug = (msg, data) => {
  if (DEBUG) console.log(`[Privacy] ${msg}`, data !== undefined ? data : '')
}

let locked = false
let lastActiveTime = Date.now()

function getData() {
  const raw = safeStorage.getRaw(PRIVACY_KEY)
  if (raw === null || raw === undefined || raw === '') return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.pinHash && (typeof parsed.pinHash !== 'string' || parsed.pinHash.length !== 64)) {
        debug('corrupted pinHash detected, resetting privacy state', parsed.pinHash)
        saveData({})
        return {}
      }
      return parsed
    }
    debug('invalid privacy data structure, resetting')
    saveData({})
    return {}
  } catch {
    debug('failed to parse privacy data, resetting')
    saveData({})
    return {}
  }
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
  const hasPin = !!(data.pinHash && typeof data.pinHash === 'string' && data.pinHash.length === 64)
  debug('isPinSet', hasPin)
  return hasPin
}

export async function setPin(pin) {
  debug('setPin called')
  const hash = await hashPin(pin)
  saveData({ ...getData(), pinHash: hash })
  debug('pin set successfully')
}

export async function verifyPin(pin) {
  const data = getData()
  if (!data.pinHash) {
    debug('verifyPin: no pinHash set')
    return false
  }
  const hash = await hashPin(pin)
  const ok = hash === data.pinHash
  debug('verifyPin result', ok)
  return ok
}

export function clearPin() {
  debug('clearPin called')
  const data = getData()
  delete data.pinHash
  delete data.timeout
  saveData(data)
  locked = false
  debug('pin cleared')
}

export function getTimeout() {
  const data = getData()
  const t = data.timeout ?? 0
  debug('getTimeout', t)
  return t
}

export function setTimeoutPref(seconds) {
  debug('setTimeoutPref', seconds)
  saveData({ ...getData(), timeout: seconds })
}

export function initLockState() {
  const pinSet = isPinSet()
  debug('initLockState: pinSet=', pinSet)
  locked = pinSet
  debug('initLockState: locked=', locked)
}

export function isLocked() {
  const pinSet = isPinSet()
  if (!pinSet) {
    debug('isLocked: no pin, returning false')
    return false
  }
  debug('isLocked', locked)
  return locked
}

export function unlockSession() {
  debug('unlockSession called')
  locked = false
  lastActiveTime = Date.now()
  debug('unlockSession: locked set to false')
}

export function onAppBackground() {
  debug('onAppBackground called')
  lastActiveTime = Date.now()
}

export function shouldLockOnResume() {
  if (!isPinSet()) {
    debug('shouldLockOnResume: no pin set, no lock')
    return false
  }
  const timeout = getTimeout()
  debug('shouldLockOnResume: timeout=', timeout)
  if (timeout === 0) {
    debug('shouldLockOnResume: immediate lock')
    locked = true
    return true
  }
  const elapsed = Date.now() - lastActiveTime
  debug('shouldLockOnResume: elapsed=', elapsed, 'threshold=', timeout * 1000)
  if (elapsed >= timeout * 1000) {
    debug('shouldLockOnResume: timeout exceeded, locking')
    locked = true
    return true
  }
  debug('shouldLockOnResume: within timeout, no lock')
  return false
}
