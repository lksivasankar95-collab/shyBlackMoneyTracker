const LANG_KEY = 'shyblack_language'
const SUPPORTED = ['en', 'ta', 'hi', 'te', 'kn']

let _cachedLang = null
let _cachedDict = null

function readLang() {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v && SUPPORTED.includes(v)) return v
  } catch {}
  return 'en'
}

async function loadDict(lang) {
  try {
    const mod = await import(`../i18n/${lang}.json`)
    return mod.default || mod
  } catch {
    try {
      const mod = await import('../i18n/en.json')
      return mod.default || mod
    } catch {
      return {}
    }
  }
}

function makeT(dict) {
  return function t(key, params) {
    const parts = key.split('.')
    let value = dict
    for (const k of parts) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }
    if (typeof value !== 'string') return key
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, p) => (params[p] !== undefined ? String(params[p]) : `{${p}}`))
    }
    return value
  }
}

export async function getNotifT() {
  const lang = readLang()
  if (lang === _cachedLang && _cachedDict) {
    return makeT(_cachedDict)
  }
  _cachedLang = lang
  _cachedDict = await loadDict(lang)
  return makeT(_cachedDict)
}
