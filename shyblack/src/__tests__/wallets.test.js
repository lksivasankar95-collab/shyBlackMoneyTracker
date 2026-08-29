import { beforeEach, describe, expect, it } from 'vitest'

const store = {}
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = value },
  removeItem: (key) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((key) => delete store[key]) },
}

const { safeStorage, STORAGE_KEYS } = await import('../utils/safeStorage.js')
const wallets = await import('../utils/wallets.js')

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key])
  safeStorage.invalidateCache()
})

describe('wallet profiles', () => {
  it('migrates existing data into a Personal wallet', () => {
    safeStorage.set(STORAGE_KEYS.TRANSACTIONS, [{ id: 'tx-1', type: 'expense', amount: 100 }])

    const active = wallets.ensureWalletStorage()
    expect(active.name).toBe('Personal')
    expect(wallets.getWallets()).toHaveLength(1)
    expect(wallets.getActiveWallet().id).toBe(active.id)
  })

  it('isolates data when switching between wallets', () => {
    wallets.ensureWalletStorage()
    safeStorage.set(STORAGE_KEYS.TRANSACTIONS, [{ id: 'personal-tx', type: 'income', amount: 1000 }])
    const business = wallets.createWallet('Business')

    expect(safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])).toEqual([])
    safeStorage.set(STORAGE_KEYS.TRANSACTIONS, [{ id: 'business-tx', type: 'expense', amount: 250 }])

    const personal = wallets.getWallets().find((wallet) => wallet.name === 'Personal')
    expect(wallets.switchWallet(personal.id).success).toBe(true)
    expect(safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])[0].id).toBe('personal-tx')
    expect(wallets.switchWallet(business.id).success).toBe(true)
    expect(safeStorage.get(STORAGE_KEYS.TRANSACTIONS, [])[0].id).toBe('business-tx')
  })

  it('includes every wallet dataset in the wallet backup', () => {
    wallets.ensureWalletStorage()
    const second = wallets.createWallet('Travel')
    const backup = wallets.collectWalletBackup()

    expect(backup.wallets.map((wallet) => wallet.name)).toEqual(['Personal', 'Travel'])
    expect(backup.data[second.id]).toEqual({})
  })
})
