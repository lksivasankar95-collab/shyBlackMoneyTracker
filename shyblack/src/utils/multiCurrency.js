import { safeStorage, STORAGE_KEYS } from './safeStorage'

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', locale: 'en-US', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', locale: 'de-DE', label: 'Euro' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'British Pound' },
  { code: 'SGD', symbol: 'S$', locale: 'en-SG', label: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', label: 'UAE Dirham' },
]

const DEFAULT_RATES = {
  INR: 1,
  USD: 83.5,
  EUR: 91.2,
  GBP: 106.4,
  SGD: 61.8,
  AED: 22.7,
}

function getOnboardingBase() {
  try {
    const data = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
    const code = data?.currency
    return CURRENCIES.find((c) => c.code === code)?.code || 'INR'
  } catch {
    return 'INR'
  }
}

export function getCurrencySettings() {
  try {
    const saved = safeStorage.get(STORAGE_KEYS.CURRENCY_SETTINGS, null)
    if (saved && typeof saved === 'object' && saved.base) {
      return {
        enabled: saved.enabled !== false,
        base: saved.base,
        rates: { ...DEFAULT_RATES, ...(saved.rates || {}) },
      }
    }
  } catch { /* fall through to defaults */ }
  return { enabled: false, base: getOnboardingBase(), rates: { ...DEFAULT_RATES } }
}

export function saveCurrencySettings(settings) {
  return safeStorage.set(STORAGE_KEYS.CURRENCY_SETTINGS, settings)
}

export function getBaseCurrencyCode() {
  return getCurrencySettings().base
}

export function setCurrencyRate(code, rateValue) {
  const settings = getCurrencySettings()
  const value = parseFloat(rateValue)
  if (!CURRENCIES.find((c) => c.code === code) || isNaN(value) || value <= 0) return false
  settings.rates[code] = value
  settings.rates[settings.base] = 1
  saveCurrencySettings(settings)
  return true
}

export function setBaseCurrency(code) {
  const settings = getCurrencySettings()
  if (!CURRENCIES.find((c) => c.code === code)) return false
  settings.base = code
  settings.rates[code] = 1
  saveCurrencySettings(settings)
  return true
}

export function setMultiCurrencyEnabled(enabled) {
  const settings = getCurrencySettings()
  settings.enabled = !!enabled
  saveCurrencySettings(settings)
  return settings
}

export function convertAmount(amount, fromCode, settings = null) {
  const s = settings || getCurrencySettings()
  const num = parseFloat(amount)
  if (isNaN(num)) return 0
  if (!s.enabled || !fromCode || fromCode === s.base) return num
  const rate = s.rates[fromCode]
  if (!rate || rate <= 0) return 0
  return num * rate
}

export function formatInCurrency(amount, code) {
  const c = CURRENCIES.find((x) => x.code === code)
  const num = parseFloat(amount)
  if (isNaN(num)) return '0'
  if (!c) return `${num} ${code}`
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `${c.symbol}${Math.round(num).toLocaleString()}`
  }
}

export function getCurrencyLabel(code) {
  return CURRENCIES.find((c) => c.code === code)?.label || code
}

/**
 * Applies currency config to a transaction payload.
 * The converted (base) amount is stored in `amount` so all existing
 * aggregations keep working; the original value/currency are kept for display.
 */
export function applyCurrencyToTransaction(tx, amount, currencyCode) {
  const settings = getCurrencySettings()
  const base = settings.base
  if (!settings.enabled || !currencyCode || currencyCode === base) {
    return { ...tx, amount: convertAmount(amount, currencyCode, settings), currency: undefined, originalAmount: undefined }
  }
  const converted = convertAmount(amount, currencyCode, settings)
  return {
    ...tx,
    amount: converted,
    originalAmount: amount,
    currency: currencyCode,
  }
}

export function getOriginalAmount(tx) {
  if (tx && tx.currency && typeof tx.originalAmount === 'number') {
    return { amount: tx.originalAmount, code: tx.currency }
  }
  return null
}