import { safeStorage } from './safeStorage'

const PRIVACY_KEY = 'shyblack_privacy'

const FAIL_THRESHOLD_COOLDOWN = 5
const FAIL_THRESHOLD_LOCKOUT = 10
const COOLDOWN_MS = 30_000

let locked = false
let lastActiveTime = Date.now()
let suppressLock = false
let suppressLockTimer = null

function getData() {
  const raw = safeStorage.getRaw(PRIVACY_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.pinHash && (typeof parsed.pinHash !== 'string' || parsed.pinHash.length !== 64)) {
        // pinHash is present but malformed — could be storage corruption or tampering.
        // Do NOT clear the data: clearing would allow a bypass by writing a bad hash.
        // Instead force requiresReset so the lock screen demands a full data reset.
        return { ...parsed, requiresReset: true }
      }
      return parsed
    }
    // No recognisable object structure and no pinHash — safe to treat as unset.
    saveData({})
    return {}
  } catch {
    // Unparseable JSON with no detectable pinHash — safe to treat as unset.
    saveData({})
    return {}
  }
}

function saveData(data) {
  safeStorage.set(PRIVACY_KEY, data)
}

function generateSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function computeHash(pin, salt = '') {
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + pin))
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isPinSet() {
  const data = getData()
  // A corrupted pinHash (requiresReset forced by getData) counts as PIN being set —
  // the lock screen will require a data reset instead of accepting a PIN.
  if (data.requiresReset && data.pinHash) return true
  return !!(data.pinHash && typeof data.pinHash === 'string' && data.pinHash.length === 64)
}

export async function setPin(pin) {
  const salt = generateSalt()
  const hash = await computeHash(pin, salt)
  const data = getData()
  saveData({ ...data, pinHash: hash, pinSalt: salt, failCount: 0, cooldownUntil: null, requiresReset: false })
}

export async function verifyPin(pin) {
  const data = getData()
  if (!data.pinHash) return false

  if (data.requiresReset) return false

  if (data.cooldownUntil && Date.now() < data.cooldownUntil) return false

  let ok
  if (data.pinSalt) {
    ok = (await computeHash(pin, data.pinSalt)) === data.pinHash
  } else {
    ok = (await computeHash(pin, '')) === data.pinHash
    if (ok) {
      const salt = generateSalt()
      const newHash = await computeHash(pin, salt)
      saveData({ ...getData(), pinHash: newHash, pinSalt: salt, failCount: 0, cooldownUntil: null })
      return true
    }
  }

  if (ok) {
    saveData({ ...getData(), failCount: 0, cooldownUntil: null })
  } else {
    const current = getData()
    const failCount = (current.failCount || 0) + 1
    const updates = { failCount }
    if (failCount >= FAIL_THRESHOLD_LOCKOUT) {
      updates.requiresReset = true
    } else if (failCount >= FAIL_THRESHOLD_COOLDOWN) {
      updates.cooldownUntil = Date.now() + COOLDOWN_MS
    }
    saveData({ ...current, ...updates })
  }

  return ok
}

export function getFailState() {
  const data = getData()
  const now = Date.now()
  const cooldownUntil = data.cooldownUntil || null
  const cooldownRemaining = cooldownUntil && now < cooldownUntil ? Math.ceil((cooldownUntil - now) / 1000) : 0
  return {
    failCount: data.failCount || 0,
    cooldownRemaining,
    requiresReset: data.requiresReset || false,
  }
}

export function clearPin() {
  const data = getData()
  const { pinHash, pinSalt, failCount, cooldownUntil, requiresReset, ...rest } = data
  saveData(rest)
  locked = false
}

export function getTimeout() {
  return getData().timeout ?? 0
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

export function suppressLockForTransition(timeoutMs = 5000) {
  suppressLock = true
  if (suppressLockTimer) clearTimeout(suppressLockTimer)
  suppressLockTimer = setTimeout(() => {
    suppressLock = false
    suppressLockTimer = null
  }, timeoutMs)
}

export function shouldLockOnResume() {
  if (!isPinSet()) {
    console.log('[DIAG:Bug#1] shouldLockOnResume: false (no PIN set)')
    return false
  }
  if (suppressLock) {
    console.log('[DIAG:Bug#1] shouldLockOnResume: false (suppressLock active)')
    return false
  }
  const timeout = getTimeout()
  const elapsed = Date.now() - lastActiveTime
  console.log(`[DIAG:Bug#1] shouldLockOnResume: timeout=${timeout}s, elapsed=${elapsed}ms, lastActiveTime=${new Date(lastActiveTime).toISOString()}`)
  if (timeout === 0) {
    locked = true
    console.log('[DIAG:Bug#1] shouldLockOnResume: true (timeout=0, always lock)')
    return true
  }
  if (elapsed >= timeout * 1000) {
    locked = true
    console.log(`[DIAG:Bug#1] shouldLockOnResume: true (elapsed ${elapsed}ms >= ${timeout * 1000}ms)`)
    return true
  }
  console.log(`[DIAG:Bug#1] shouldLockOnResume: false (elapsed ${elapsed}ms < ${timeout * 1000}ms - not past timeout yet)`)
  return false
}
