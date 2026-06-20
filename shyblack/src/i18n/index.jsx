import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const LANG_KEY = 'shyblack_language'
const DEFAULT_LANG = 'en'
const FALLBACK_LANG = 'en'
const SUPPORTED_LANGS = ['en', 'ta', 'hi', 'te', 'kn']

const translations = {}

const langModules = {
  en: () => import('./en.json'),
  ta: () => import('./ta.json'),
  hi: () => import('./hi.json'),
  te: () => import('./te.json'),
  kn: () => import('./kn.json'),
}

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved
  } catch {}
  return DEFAULT_LANG
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {}
}

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, params) => key || '',
  translations: {},
  isLoaded: false,
  supportedLanguages: SUPPORTED_LANGS,
})

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getSavedLanguage)
  const [dict, setDict] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const loadLanguage = useCallback(async (langCode) => {
    try {
      const loader = langModules[langCode]
      if (!loader) {
        const fallback = await langModules[FALLBACK_LANG]()
        setDict(fallback)
        setIsLoaded(true)
        return
      }
      const mod = await loader()
      setDict(mod.default || mod)
      setIsLoaded(true)
    } catch {
      try {
        const fallback = await langModules[FALLBACK_LANG]()
        setDict(fallback)
      } catch {
        setDict({})
      }
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadLanguage(lang)
  }, [lang, loadLanguage])

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return
    setLangState(newLang)
    saveLanguage(newLang)
  }, [])

  const t = useCallback((key, params) => {
    if (!dict) return key || ''

    const keys = key.split('.')
    let value = dict

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }

    if (typeof value !== 'string') return key

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, p) => {
        return params[p] !== undefined ? String(params[p]) : `{${p}}`
      })
    }

    return value
  }, [dict])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations: dict, isLoaded, supportedLanguages: SUPPORTED_LANGS }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  return { t: ctx.t, lang: ctx.lang, setLang: ctx.setLang, isLoaded: ctx.isLoaded, supportedLanguages: ctx.supportedLanguages }
}

export function useCurrentLanguage() {
  const ctx = useContext(LanguageContext)
  return { lang: ctx.lang, setLang: ctx.setLang, supportedLanguages: ctx.supportedLanguages }
}

export { LanguageContext, SUPPORTED_LANGS, DEFAULT_LANG }
