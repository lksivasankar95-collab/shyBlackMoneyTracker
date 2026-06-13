import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const APP_SCHEMA_VERSION = 1
export const SCHEMA_VERSION_KEY = STORAGE_KEYS.SCHEMA

const SCHEMA_MIGRATIONS = {
}

export function getSchemaVersion() {
  const stored = safeStorage.get(SCHEMA_VERSION_KEY, { version: 0 })
  return stored && typeof stored.version === 'number' ? stored.version : 0
}

export function setSchemaVersion(version) {
  return safeStorage.set(SCHEMA_VERSION_KEY, { version, updatedAt: Date.now() })
}

export function runMigrations() {
  const currentVersion = getSchemaVersion()
  if (currentVersion >= APP_SCHEMA_VERSION) return { migrated: false, from: currentVersion, to: APP_SCHEMA_VERSION }

  const migrationKeys = Object.keys(SCHEMA_MIGRATIONS)
    .map(Number)
    .filter((v) => v > currentVersion && v <= APP_SCHEMA_VERSION)
    .sort((a, b) => a - b)

  let lastVersion = currentVersion
  for (const version of migrationKeys) {
    try {
      SCHEMA_MIGRATIONS[version]()
      lastVersion = version
    } catch (error) {
      return { migrated: false, from: currentVersion, to: lastVersion, error: error.message }
    }
  }

  setSchemaVersion(APP_SCHEMA_VERSION)
  return { migrated: migrationKeys.length > 0, from: currentVersion, to: APP_SCHEMA_VERSION }
}

export function isMigrationNeeded() {
  return getSchemaVersion() < APP_SCHEMA_VERSION
}

export function resetSchemaVersion() {
  safeStorage.remove(SCHEMA_VERSION_KEY)
}
