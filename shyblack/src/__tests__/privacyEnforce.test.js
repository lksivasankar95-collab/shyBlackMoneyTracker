import { describe, it, expect, beforeEach } from 'vitest'

const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}
global.crypto = {
  getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = 1; return arr },
  subtle: {
    importKey: async () => ({}),
    deriveBits: async () => new Uint8Array(32),
    digest: async () => new Uint8Array(32).buffer,
  },
}
global.document = { hidden: false }

const privacy = await import('../utils/privacy.js')

beforeEach(() => {
  global.document.hidden = false
  Object.keys(store).forEach((k) => delete store[k])
})

describe('privacy enforcement', () => {
  it('shouldBlurOnBackground true when either privacyMode or pin is set', () => {
    expect(privacy.shouldBlurOnBackground({})).toBe(false)
    expect(privacy.shouldBlurOnBackground({ privacyMode: true })).toBe(true)
    expect(privacy.shouldBlurOnBackground({ pinSet: true })).toBe(true)
    expect(privacy.shouldBlurOnBackground({ privacyMode: true, pinSet: true })).toBe(true)
    expect(privacy.shouldBlurOnBackground({ privacyMode: false, pinSet: false })).toBe(false)
  })

  it('isBackgrounded mirrors document.hidden', () => {
    expect(privacy.isBackgrounded()).toBe(false)
    global.document.hidden = true
    expect(privacy.isBackgrounded()).toBe(true)
    global.document.hidden = false
    expect(privacy.isBackgrounded()).toBe(false)
  })

  it('defaults to safe (blur) behaviour on invalid input', () => {
    expect(privacy.shouldBlurOnBackground(null)).toBe(false)
    expect(privacy.shouldBlurOnBackground(undefined)).toBe(false)
    expect(privacy.shouldBlurOnBackground({})).toBe(false)
  })
})