import { safeStorage, STORAGE_KEYS } from './safeStorage'

const BIOMETRIC_KEY = 'shyblack_biometric'

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
    const { NativeBiometric } = await import('@aparajita/capacitor-biometric-auth')
    const result = await NativeBiometric.isAvailable()
    biometricAvailable = result.isAvailable
    biometricType = result.biometryType || null
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
  try {
    const { NativeBiometric } = await import('@aparajita/capacitor-biometric-auth')
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('biometric-timeout')), 30000)
    )
    const result = await Promise.race([
      NativeBiometric.verifyIdentity({
        reason: reason || 'Unlock ShyBlack Finance',
        title: 'Unlock ShyBlack',
        subtitle: 'Use biometric to unlock',
        negativeButtonText: 'Use PIN instead',
      }),
      timeout,
    ])
    return result.verified === true
  } catch {
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

  const verified = await authenticateWithBiometric('Unlock ShyBlack Finance')
  return { unlocked: verified, reason: verified ? 'verified' : 'failed' }
}

export function getBiometricTypeLabel() {
  if (biometricType === 'fingerprint') return 'Fingerprint'
  if (biometricType === 'face') return 'Face Unlock'
  if (biometricType === 'iris') return 'Iris'
  return 'Biometric'
}
