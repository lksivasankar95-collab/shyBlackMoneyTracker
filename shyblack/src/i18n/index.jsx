import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import ta from './ta.json'
import hi from './hi.json'
import te from './te.json'
import kn from './kn.json'

const LANG_KEY = 'finora_language'
const DEFAULT_LANG = 'en'
const FALLBACK_LANG = 'en'
const SUPPORTED_LANGS = ['en', 'ta', 'hi', 'te', 'kn']

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
  te: { translation: te },
  kn: { translation: kn },
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

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: FALLBACK_LANG,
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
})

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, params) => key || '',
  translations: {},
  isLoaded: true,
  supportedLanguages: SUPPORTED_LANGS,
})

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getSavedLanguage)
  const [isLoaded, setIsLoaded] = useState(true)

  useEffect(() => {
    i18n.changeLanguage(lang)
  }, [lang])

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return
    setLangState(newLang)
    saveLanguage(newLang)
    i18n.changeLanguage(newLang)
  }, [])

  const t = useCallback((key, params) => {
    if (!key) return ''
    return i18n.t(key, params)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations: {}, isLoaded, supportedLanguages: SUPPORTED_LANGS }}>
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
