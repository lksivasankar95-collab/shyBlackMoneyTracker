const THEME_KEY = 'shyblack_theme'

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
}

export function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === THEMES.LIGHT || saved === THEMES.DARK) return saved
  } catch { /* silent */ }
  return THEMES.DARK
}

export function applyTheme(theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === THEMES.LIGHT ? '#f5f5f7' : '#0a0a0a')
  }
}

export function setTheme(theme) {
  const next = theme === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch { /* silent */ }
  applyTheme(next)
  return next
}

export function initTheme() {
  const theme = getTheme()
  applyTheme(theme)
  return theme
}

export function isLightTheme() {
  return getTheme() === THEMES.LIGHT
}