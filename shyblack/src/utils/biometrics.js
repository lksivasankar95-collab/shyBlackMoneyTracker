import { safeStorage } from './safeStorage'

const BIOMETRIC_KEY = 'finora_biometric'

let biometricAvailable = false
let biometricType = null

function getData() {
  return safeStorage.get(BIOMETRIC_KEY, { enabled: false })
}

function saveData(data) {
  safeStorage.set(BIOMETRIC_KEY, data)
}

export async function checkBiometricAvailability() {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const result = await BiometricAuth.checkBiometry()
    biometricAvailable = result.isAvailable
    biometricType = result.biometryType ?? null
    return { available: biometricAvailable, type: biometricType }
  } catch {
    biometricAvailable = false
    biometricType = null
    return { available: false, type: null }
  }
}

export function isBiometricEnabled() {
  const data = getData()
  return data.enabled === true
}

export function setBiometricEnabled(enabled) {
  saveData({ ...getData(), enabled, updatedAt: Date.now() })
}

export async function authenticateWithBiometric(reason) {
  let timeoutId
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('biometric-timeout')), 30000)
    })
    const auth = BiometricAuth.authenticate({
      reason: reason || 'Unlock Expense Tracker',
      androidTitle: 'Unlock Expense Tracker',
      androidSubtitle: 'Use biometric to unlock',
      cancelTitle: 'Use PIN instead',
      allowDeviceCredential: true,
    }).catch(() => false)
    const ok = await Promise.race([auth, timeout])
    clearTimeout(timeoutId)
    return ok === true
  } catch {
    clearTimeout(timeoutId)
    return false
  }
}

export async function tryBiometricUnlock() {
  if (!isBiometricEnabled()) return { unlocked: false, reason: 'not-enabled' }

  const available = await checkBiometricAvailability()
  if (!available.available) {
    // Transient unavailability (device restart, sensor busy) — do NOT permanently disable
    return { unlocked: false, reason: 'not-available' }
  }

  const verified = await authenticateWithBiometric('Unlock Expense Tracker')
  return { unlocked: verified, reason: verified ? 'verified' : 'failed' }
}

export function getBiometricTypeLabel() {
  const type = biometricType
  if (type === 'fingerprintAuthentication' || type === 3 || type === 'touchId' || type === 1) return 'Fingerprint'
  if (type === 'faceAuthentication' || type === 4 || type === 'faceId' || type === 2) return 'Face Unlock'
  if (type === 'irisAuthentication' || type === 5) return 'Iris'
  return 'Biometric'
}
