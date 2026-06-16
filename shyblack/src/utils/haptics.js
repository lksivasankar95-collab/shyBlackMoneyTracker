// Capacitor haptics via plugin bridge — no package install required.
// Silently no-ops on web and unsupported devices.

function getHapticsPlugin() {
  if (typeof window === 'undefined') return null
  if (!window.Capacitor?.isNativePlatform?.()) return null
  return window.Capacitor?.Plugins?.Haptics ?? null
}

export async function hapticLight() {
  try {
    const H = getHapticsPlugin()
    if (H) await H.impact({ style: 'LIGHT' })
  } catch {}
}

export async function hapticMedium() {
  try {
    const H = getHapticsPlugin()
    if (H) await H.impact({ style: 'MEDIUM' })
  } catch {}
}

export async function hapticSuccess() {
  try {
    const H = getHapticsPlugin()
    if (H) await H.notification({ type: 'SUCCESS' })
  } catch {}
}
