/**
 * Voice expense entry.
 * Parses natural-language commands like:
 *   "coffee 150"
 *   "spent 200 on petrol yesterday"
 *   "earned 5000 salary"
 *   "₹300 lunch at starbucks"
 * Falls back gracefully when the Web Speech API is unavailable.
 */

const INCOME_KEYWORDS = ['income', 'earned', 'received', 'credit', 'credited', 'got', 'refund', 'cashback', 'bonus', 'profit']
const EXPENSE_KEYWORDS = ['spent', 'paid', 'expense', 'debit', 'debited', 'buy', 'bought', 'purchase', 'cost', 'wasted', 'out', 'cash']

export function parseVoiceCommand(text) {
  const input = String(text || '').trim()
  if (!input) return null

  let type = null
  const lower = input.toLowerCase()
  if (INCOME_KEYWORDS.some((k) => new RegExp(`\\b${k}`, 'i').test(lower))) type = 'income'
  else if (EXPENSE_KEYWORDS.some((k) => new RegExp(`\\b${k}`, 'i').test(lower))) type = 'expense'

  const amountMatch = input.match(/(?:₹|rs\.?|inr)?\s?(\d[\d,]*(?:\.\d{1,2})?)/i)
  if (!amountMatch) return null
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
  if (!amount || amount <= 0) return null

  let date = new Date().toISOString().split('T')[0]
  if (/\byesterday\b/i.test(lower)) {
    date = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  }
  const timeMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10)
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
    if (timeMatch[3] === 'pm' && hour < 12) hour += 12
    if (timeMatch[3] === 'am' && hour === 12) hour = 0
    if (hour >= 0 && hour <= 23) date = todayWithTime(hour, minutes)
  }

  const cleaned = lower
    .replace(/(?:₹|rs\.?|inr)\s?\d[\d,]*(?:\.\d{1,2})?/gi, ' ')
    .replace(/\d[\d,]*(?:\.\d{1,2})?/g, ' ')
    .replace(/\b(?:spent|paid|expense|debit|debited|buy|bought|purchase|cost|wasted|cash|out|in)\b/gi, ' ')
    .replace(/\b(?:income|earned|received|credit|credited|got|refund|cashback|bonus|profit)\b/gi, ' ')
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, ' ')
    .replace(/\b(?:at|on|for|of|yesterday|today|tomorrow)\b/gi, ' ')
    .replace(/\b(?:rupees|rs)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;]+$/g, '')

  const note = cleaned.slice(0, 60)

  return {
    type: type || 'expense',
    amount: Math.round(amount * 100) / 100,
    note: note || (type === 'income' ? 'Voice entry' : 'Voice entry'),
    date,
    source: 'voice_entry',
  }
}

function todayWithTime(hour, minutes) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes)
  return d.toISOString().split('T')[0]
}

/**
 * Browser speech-to-text (en-IN). Resolves with the transcript.
 * Throws { unsupported: true } when the Web Speech API is missing.
 */
export function recognizeVoiceSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    return Promise.reject({ unsupported: true })
  }
  return new Promise((resolve, reject) => {
    const rec = new SpeechRecognition()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || ''
      rec.stop()
      resolve(transcript)
    }
    rec.onerror = (event) => {
      rec.stop()
      reject(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? { permission: true }
        : { error: event.error || 'unknown' })
    }
    rec.onend = () => {
      setTimeout(() => reject({ timeout: true }), 50)
    }
    try {
      rec.start()
    } catch (err) {
      reject(err)
    }
  })
}