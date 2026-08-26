import { registerPlugin, Capacitor } from '@capacitor/core'

/* ── Constants ── */

export const DOWNLOAD_FOLDER = 'Expenses Tracker ShyBlack'
export const DOWNLOAD_RELATIVE_PATH = `Download/${DOWNLOAD_FOLDER}`

const DownloadStorage = registerPlugin('DownloadStorage', {
  web: {
    saveToDownloads: async () => { throw new Error('DownloadStorage is only available on Android') },
    openFile: async () => { throw new Error('DownloadStorage is only available on Android') },
  },
})

/* ── Filename helpers ── */

const INVALID_FILENAME_RE = /[\\/:*?"<>|\x00-\x1F\x7F]/g // eslint-disable-line no-control-regex
const MAX_BASE_LENGTH = 180

export function splitExtension(filename) {
  const name = typeof filename === 'string' ? filename : ''
  const dot = name.lastIndexOf('.')
  if (dot > 0 && dot < name.length - 1) {
    return [name.slice(0, dot), name.slice(dot + 1)]
  }
  return [name, '']
}

export function sanitizeFilename(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return 'report'
  let name = raw.replace(INVALID_FILENAME_RE, ' ').replace(/\s+/g, ' ').trim()
  while (name.endsWith('.') || name.endsWith(' ')) {
    name = name.slice(0, -1)
  }
  if (!name) return 'report'
  let [base, ext] = splitExtension(name)
  if (base.length > MAX_BASE_LENGTH) base = base.slice(0, MAX_BASE_LENGTH)
  return ext ? `${base}.${ext}` : base
}

export function uniqueFilename(desired, takenNames) {
  const clean = sanitizeFilename(desired)
  if (!takenNames) return clean
  const [base, ext] = splitExtension(clean)
  let candidate = clean
  let n = 1
  while (takenNames.has(candidate.toLowerCase())) {
    candidate = `${base} (${n})${ext ? `.${ext}` : ''}`
    n++
  }
  return candidate
}

/* ── Platform detection ── */

export function isAndroidNative() {
  try {
    return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function getSaveTargetLabel() {
  return DOWNLOAD_RELATIVE_PATH
}

/* ── Base64 helpers ── */

export async function blobToBase64(blob) {
  if (typeof blob === 'string') return blob
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (!reader.result) {
        reject(new Error('FileReader returned no result'))
        return
      }
      resolve(reader.result.split(',')[1] || reader.result)
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(blob)
  })
}

/* ── Save to public Downloads (MediaStore on Android) ── */

export async function saveToDownloads(data, filename, mimeType) {
  const safeName = sanitizeFilename(filename)
  const base64 = await blobToBase64(data)
  if (!base64) throw new Error('No file data to save')

  const result = await DownloadStorage.saveToDownloads({
    fileName: safeName,
    data: base64,
    mimeType: mimeType || null,
    folder: DOWNLOAD_FOLDER,
  })

  const displayName = result?.displayName || safeName
  const size = Number(result?.size ?? 0)
  if (!result?.uri) throw new Error('Native save did not return a file URI')
  if (!(size > 0)) throw new Error('Written file is empty (0 bytes)')

  return {
    success: true,
    uri: result.uri,
    filename: displayName,
    path: `${DOWNLOAD_RELATIVE_PATH}/${displayName}`,
    size,
  }
}

/* ── Open a saved file via Android content URI ── */

export async function openSavedFile(uri, mimeType) {
  if (!uri || !isAndroidNative()) return { opened: false }
  try {
    await DownloadStorage.openFile({ uri, mimeType: mimeType || null })
    return { opened: true }
  } catch (err) {
    return { opened: false, error: err?.message || 'Unable to open file' }
  }
}

/* ── Double-tap / concurrent-call protection ── */

export function withSingleFlight(fn) {
  let inFlight = false
  return async (...args) => {
    if (inFlight) return { blocked: true }
    inFlight = true
    try {
      return { blocked: false, result: await fn(...args) }
    } finally {
      inFlight = false
    }
  }
}

/* ── Report filename builder ── */

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function buildReportFilename(reportType, { month = new Date().getMonth(), year = new Date().getFullYear(), dateFrom = '', dateTo = '' } = {}, ext = 'pdf') {
  const ym = `${year}-${pad2(month + 1)}`
  let name
  switch (reportType) {
    case 'monthly':
      name = `Monthly_Report_${ym}`
      break
    case 'category':
      name = `Category_Report_${ym}`
      break
    case 'annual':
      name = `Annual_Report_${year}`
      break
    case 'daterange':
      name = `Expense_Report_${dateFrom || 'start'}_to_${dateTo || 'end'}`
      break
    default:
      name = `Expense_Report_${new Date().toISOString().split('T')[0]}`
  }
  return `${name}.${ext}`
}
