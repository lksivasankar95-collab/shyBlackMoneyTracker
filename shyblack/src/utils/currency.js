import { safeStorage, STORAGE_KEYS } from './safeStorage'

const CURRENCY_CONFIG = {
  INR: { locale: 'en-IN', code: 'INR', symbol: '₹' },
  USD: { locale: 'en-US', code: 'USD', symbol: '$' },
  EUR: { locale: 'de-DE', code: 'EUR', symbol: '€' },
  GBP: { locale: 'en-GB', code: 'GBP', symbol: '£' },
  SGD: { locale: 'en-SG', code: 'SGD', symbol: 'S$' },
  AED: { locale: 'ar-AE', code: 'AED', symbol: 'AED' },
}

function getActiveCurrencyConfig() {
  try {
    const data = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
    return CURRENCY_CONFIG[data?.currency] || CURRENCY_CONFIG.INR
  } catch {
    return CURRENCY_CONFIG.INR
  }
}

export function formatCurrency(amount) {
  const { locale, code } = getActiveCurrencyConfig()
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${CURRENCY_CONFIG.INR.symbol}${Math.round(amount).toLocaleString()}`
  }
}

export function getCurrencySymbol() {
  return getActiveCurrencyConfig().symbol
}

export function getCurrencyCode() {
  return getActiveCurrencyConfig().code
}

export function getCurrencyLocale() {
  return getActiveCurrencyConfig().locale
}
