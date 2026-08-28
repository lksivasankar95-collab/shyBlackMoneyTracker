import { createWorker } from 'tesseract.js'
import { isOnline } from './connectivity'

const MERCHANT_MAP = [
  { keywords: ['swiggy', 'zomato', 'ubereats', 'pizza hut', 'domino', 'kfc', 'mcdonald', 'dineout', 'eatclub', 'faasos', 'box8'], category: 'food' },
  { keywords: ['uber', 'ola', 'rapido', 'meru', 'shuttl', 'bus', 'metro', 'indian railway', 'irctc', 'makemy trip', 'goibibo', 'redbus'], category: 'fuel' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tatacliq', 'snapdeal', 'shopclues', 'limeroad'], category: 'shopping' },
  { keywords: ['apollo', 'medplus', 'netmeds', '1mg', 'pharmeasy', 'practo', 'medlife', 'healthkart'], category: 'family' },
  { keywords: ['airtel', 'jio', 'vi', 'bsnl', 'tata power', 'adani', 'torrent power', 'bses', 'mahanagar', 'hathway', 'act fibernet'], category: 'bills' },
  { keywords: ['netflix', 'prime video', 'hotstar', 'spotify', 'youtube', 'amazon prime', 'disney+', 'zee5', 'sonyliv'], category: 'subscription' },
  { keywords: ['bigbasket', 'grofers', 'blinkit', 'zepto', 'instamart', 'dmart', 'reliance fresh', 'more grocery'], category: 'food' },
]

const DATE_PATTERN_SRC = '(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})|(\\d{4}[/-]\\d{1,2}[/-]\\d{1,2})'
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/gi
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
const GST_PATTERN = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/gi

export function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Image compression timed out')), 30000)
    const done = (fn) => (val) => { clearTimeout(timeout); fn(val) }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = (h / w) * maxWidth; w = maxWidth }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(done((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        }), 'image/jpeg', quality)
      }
      img.onerror = done(() => reject(new Error('Image load failed')))
      img.src = e.target.result
    }
    reader.onerror = done(() => reject(new Error('FileReader failed')))
    reader.readAsDataURL(file)
  })
}

async function runOCR(imageBlob, onProgress) {
  const initTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('OCR engine initialization timed out after 30 seconds')), 30000)
  )
  const worker = await Promise.race([
    createWorker('eng', 1, {
      logger: (m) => { if (m.status === 'recognizing text' && onProgress) onProgress(m.progress) },
    }),
    initTimeout,
  ])
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR processing timed out after 60 seconds')), 60000)
    )
    const { data } = await Promise.race([worker.recognize(imageBlob), timeoutPromise])
    return { text: data.text.trim(), words: data.words || [], confidence: Math.round(data.confidence * 100) / 100 }
  } finally {
    try { await worker.terminate() } catch (_) { /* ignore termination errors */ }
  }
}

export function cleanText(text) {
  return text
    .replace(EMAIL_PATTERN, '')
    .replace(PHONE_PATTERN, '')
    .replace(GST_PATTERN, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectMerchant(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const lowerLines = lines.slice(0, Math.min(5, lines.length)).map((l) => l.toLowerCase())

  for (const mapping of MERCHANT_MAP) {
    for (const keyword of mapping.keywords) {
      const idx = lowerLines.findIndex((l) => l.includes(keyword))
      if (idx !== -1) {
        return { merchant: lines[idx], category: mapping.category }
      }
    }
  }

  if (lines.length > 0) {
    const firstLine = lines[0].replace(/[0-9\s]{5,}/g, '').trim()
    if (firstLine && firstLine.length > 2 && firstLine.length < 80) {
      return { merchant: firstLine, category: null }
    }
  }

  return { merchant: null, category: null }
}

export function extractAmount(text) {
  let matches = []
  let match
  const regex = /(?:Rs\.?\s*|₹\s*|INR\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{2})/gi
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1].replace(/,/g, '')
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0 && val < 100000000) {
      matches.push(val)
    }
  }

  matches.sort((a, b) => b - a)
  return matches.length > 0 ? matches[0] : 0
}

export function extractDate(text) {
  const DATE_PATTERN = new RegExp(DATE_PATTERN_SRC, 'g')
  const matches = []
  let match
  while ((match = DATE_PATTERN.exec(text)) !== null) {
    const raw = match[0]
    let d
    if (/^\d{2}[/-]\d{2}[/-]/.test(raw)) {
      const parts = raw.split(/[/-]/)
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    } else {
      d = new Date(raw)
    }
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) {
      matches.push(d)
    }
  }
  if (matches.length > 0) {
    matches.sort((a, b) => b - a)
    return matches[0].toISOString().split('T')[0]
  }
  return new Date().toISOString().split('T')[0]
}

export function detectCategory(merchant, text) {
  const lower = (merchant + ' ' + text).toLowerCase()
  for (const mapping of MERCHANT_MAP) {
    for (const keyword of mapping.keywords) {
      if (lower.includes(keyword)) return mapping.category
    }
  }

  const categoryKeywords = {
    food: ['restaurant', 'hotel', 'cafe', 'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'groceries', 'grocery', 'supermarket', 'bakery', 'pizza', 'burger', 'sandwich'],
    fuel: ['fuel', 'petrol', 'diesel', 'gas', 'petroleum', 'toll', 'parking', 'taxi', 'cab', 'auto', 'transport'],
    bills: ['electricity', 'water bill', 'gas bill', 'internet', 'broadband', 'rent', 'maintenance', 'society'],
    shopping: ['clothing', 'apparel', 'footwear', 'jewellery', 'electronics', 'mobile', 'laptop', 'accessories', 'furniture'],
    subscription: ['subscription', 'renewal', 'membership', 'plan'],
    family: ['medical', 'pharmacy', 'medicine', 'health', 'doctor', 'hospital', 'clinic', 'dentist', 'education', 'school', 'college', 'fees', 'tuition'],
    emi: ['loan', 'emi', 'installment', 'finance'],
    other_expense: [],
  }

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat
    }
  }

  return 'other_expense'
}

export async function scanReceipt(file, onProgress) {
  const TOTAL_TIMEOUT = 90000
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Scan timed out after 90 seconds')), TOTAL_TIMEOUT)
  )

  const scanPromise = (async () => {
    if (!isOnline()) {
      const err = new Error('OCR requires internet to load language files')
      err.code = 'OCR_OFFLINE'
      throw err
    }
    if (onProgress) onProgress(0.05, 'compressing')
    const compressed = await compressImage(file)

    if (onProgress) onProgress(0.15, 'initializing')
    const { text, confidence } = await runOCR(compressed, (p) => {
      if (onProgress) onProgress(0.15 + p * 0.8, 'recognizing')
    })

    if (onProgress) onProgress(0.95, 'parsing')
    const clean = cleanText(text)
    const { merchant, category: merchantCat } = detectMerchant(clean)
    const detectedMerchant = merchant || 'Unknown Merchant'
    const amount = extractAmount(clean)
    const date = extractDate(clean)
    const detectedCategory = merchantCat || detectCategory(detectedMerchant, clean)

    if (onProgress) onProgress(1, 'complete')

    return {
      merchant: detectedMerchant,
      amount,
      category: detectedCategory,
      date,
      rawText: clean,
      confidence,
    }
  })()

  return Promise.race([scanPromise, timeoutPromise])
}

export function extractLines(text) {
  return text.split('\n').filter(Boolean)
}

export const KNOWN_MERCHANTS = MERCHANT_MAP
