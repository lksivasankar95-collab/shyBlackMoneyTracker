const STORAGE_PREFIX = 'shyblack_'

export const ADAPTER_TYPES = {
  LOCALSTORAGE: 'localStorage',
  INDEXEDDB: 'indexedDB',
}

class LocalStorageAdapter {
  constructor() {
    this._prefix = STORAGE_PREFIX
    this._initialized = false
  }

  async init() {
    this._initialized = true
    return true
  }

  _prefixKey(key) {
    return key.startsWith(this._prefix) ? key : `${this._prefix}${key}`
  }

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._prefixKey(key))
      if (raw === null || raw === undefined || raw === '') return fallback
      const parsed = JSON.parse(raw)
      return parsed !== undefined ? parsed : fallback
    } catch {
      return fallback
    }
  }

  getRaw(key) {
    try {
      return localStorage.getItem(this._prefixKey(key))
    } catch {
      return null
    }
  }

  set(key, value) {
    const serialized = JSON.stringify(value)
    try {
      localStorage.setItem(this._prefixKey(key), serialized)
      return true
    } catch (error) {
      if (this._isQuotaError(error)) {
        return this._handleQuotaError(key, serialized)
      }
      return false
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this._prefixKey(key))
      return true
    } catch {
      return false
    }
  }

  clear() {
    try {
      const keys = this._getAllPrefixedKeys()
      keys.forEach((k) => {
        try { localStorage.removeItem(k) } catch {}
      })
      return true
    } catch {
      return false
    }
  }

  isAvailable() {
    try {
      const testKey = `${this._prefix}_test`
      localStorage.setItem(testKey, '1')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  getStorageInfo() {
    try {
      let total = 0
      const keys = this._getAllPrefixedKeys()
      for (const key of keys) {
        const val = localStorage.getItem(key)
        total += (key.length + (val ? val.length : 0)) * 2
      }
      return { usedBytes: total, usedKB: Math.round(total / 1024), keyCount: keys.length }
    } catch {
      return { usedBytes: 0, usedKB: 0, keyCount: 0 }
    }
  }

  _getAllPrefixedKeys() {
    const result = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this._prefix)) {
        result.push(key)
      }
    }
    return result
  }

  _isQuotaError(error) {
    return (
      error instanceof DOMException &&
      (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    )
  }

  _handleQuotaError(skipKey, serialized) {
    // Only purge fully-rebuildable cache data. Never purge user-created data
    // (tags, templates) or critical backup data.
    const purgeOrder = [
      `${this._prefix}search_idx`,
      `${this._prefix}budget_notif`,
      `${this._prefix}snapshot_chain`,
    ]
    const targetKey = this._prefixKey(skipKey)
    for (const purgeKey of purgeOrder) {
      if (purgeKey === targetKey) continue
      try { localStorage.removeItem(purgeKey) } catch {}
      try {
        localStorage.setItem(targetKey, serialized)
        return true
      } catch {}
    }
    return false
  }
}

class IndexedDBAdapter {
  constructor() {
    this._dbName = 'shyblack_finance'
    this._storeName = 'data'
    this._version = 1
    this._db = null
  }

  async init() {
    return new Promise((resolve) => {
      if (!this._isIndexedDBAvailable()) {
        resolve(false)
        return
      }
      const request = indexedDB.open(this._dbName, this._version)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this._storeName)) {
          db.createObjectStore(this._storeName, { keyPath: 'key' })
        }
      }
      request.onsuccess = (event) => {
        this._db = event.target.result
        resolve(true)
      }
      request.onerror = () => resolve(false)
    })
  }

  _isIndexedDBAvailable() {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null
    } catch {
      return false
    }
  }

  async _ensureOpen() {
    if (this._db) return true
    return this.init()
  }

  async _operate(mode, callback) {
    const ready = await this._ensureOpen()
    if (!ready || !this._db) return null
    return new Promise((resolve) => {
      try {
        const tx = this._db.transaction(this._storeName, mode)
        const store = tx.objectStore(this._storeName)
        callback(store, resolve)
      } catch {
        resolve(null)
      }
    })
  }

  async get(key, fallback = null) {
    const result = await this._operate('readonly', (store, resolve) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result ? request.result.value : fallback)
      request.onerror = () => resolve(fallback)
    })
    return result !== null && result !== undefined ? result : fallback
  }

  async getRaw(key) {
    const result = await this._operate('readonly', (store, resolve) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result ? JSON.stringify(request.result.value) : null)
      request.onerror = () => resolve(null)
    })
    return result
  }

  async set(key, value) {
    const result = await this._operate('readwrite', (store, resolve) => {
      const request = store.put({ key, value })
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
    return result === true
  }

  async remove(key) {
    const result = await this._operate('readwrite', (store, resolve) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
    return result === true
  }

  async clear() {
    const result = await this._operate('readwrite', (store, resolve) => {
      const request = store.clear()
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
    return result === true
  }

  async isAvailable() {
    return this._isIndexedDBAvailable()
  }

  async getStorageInfo() {
    return { usedBytes: 0, usedKB: 0, keyCount: 0, note: 'IndexedDB info not implemented yet' }
  }
}

let _activeAdapter = null
let _adapterType = ADAPTER_TYPES.LOCALSTORAGE

export function getStorageAdapter() {
  if (!_activeAdapter) {
    _activeAdapter = new LocalStorageAdapter()
  }
  return _activeAdapter
}

export async function setStorageAdapter(type) {
  if (type === _adapterType) return
  if (type === ADAPTER_TYPES.LOCALSTORAGE) {
    _activeAdapter = new LocalStorageAdapter()
    _adapterType = type
    return
  }
  if (type === ADAPTER_TYPES.INDEXEDDB) {
    const adapter = new IndexedDBAdapter()
    const ok = await adapter.init()
    if (ok) {
      _activeAdapter = adapter
      _adapterType = type
    }
  }
}

export function getActiveAdapterType() {
  return _adapterType
}

export async function migrateAdapterData(fromAdapter, toAdapter) {
  const migrationKey = `${STORAGE_PREFIX}_adapter_migrated`
  const alreadyMigrated = await toAdapter.get(migrationKey)
  if (alreadyMigrated) return { migrated: false, reason: 'already-migrated' }

  const storeKeys = [
    'transactions', 'savings', 'budgets', 'recurring', 'tags',
    'settings', 'debts', 'schema', 'onboarding', 'reminder',
    'budget_notif', 'streak', 'snapshot', 'goals', 'templates',
    'review',
  ]

  let migrated = 0
  let failed = 0
  for (const key of storeKeys) {
    try {
      const value = await fromAdapter.get(key)
      if (value !== null && value !== undefined) {
        const ok = await toAdapter.set(key, value)
        if (ok) migrated++
        else failed++
      }
    } catch {
      failed++
    }
  }

  if (failed === 0 && migrated > 0) {
    await toAdapter.set(migrationKey, { migrated: true, at: Date.now() })
  }

  return { migrated, failed, total: storeKeys.length }
}
