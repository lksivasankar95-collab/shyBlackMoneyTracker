import { safeStorage, STORAGE_KEYS } from './safeStorage'

const DEFAULT_SETTINGS = {
  pinEnabled: false,
  pinCode: '',
  biometricEnabled: false,
  privacyMode: false,
  hideBalance: false,
}

export function getSecuritySettings() {
  return { ...DEFAULT_SETTINGS, ...safeStorage.get(STORAGE_KEYS.SETTINGS, {}) }
}

export function saveSecuritySettings(settings) {
  safeStorage.set(STORAGE_KEYS.SETTINGS, settings)
}

export function togglePrivacyMode() {
  const settings = getSecuritySettings()
  settings.privacyMode = !settings.privacyMode
  saveSecuritySettings(settings)
  return settings.privacyMode
}

export function toggleHideBalance() {
  const settings = getSecuritySettings()
  settings.hideBalance = !settings.hideBalance
  saveSecuritySettings(settings)
  return settings.hideBalance
}
