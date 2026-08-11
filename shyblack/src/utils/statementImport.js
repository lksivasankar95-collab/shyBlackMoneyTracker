/**
 * Statement import engine (India).
 * Parses:
 *  - Individual UPI SMS texts (PhonePe / GPay / Paytm / bank UPI alerts)
 *  - Android SMS Backup XML files (sms_backup.xml, "UPI-PAY" thread)
 *  - Bank statement PDF text (withdrawal/deposit columns)
 * Produces normalized transactions with dates, notes, amounts and types.
 */

import { dedupeWithFuzzy } from './fuzzyDuplicates'

export function parseUpiSms(text) {
  const messages = String(text || '')
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const result = []
  for (const msg of messages) {
    const parsed = parseSingleUpiMessage(msg)
    if (parsed) result.push(parsed)
  }
  return result
}

export function parseSingleUpiMessage(message) {
  const msg = String(message || '')
  if (!msg.match(/upi|phonepe|gpay|paytm|bhim|@(?:ybl|okaxis|okhdfcbank|oksbi|ibl|apl|paytm|upi|axl|sbi|hdfcbank|icici|yesbank|kotak)/i)) {
    return null
  }
  const amountMatch = msg.match(/(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/i)
  if (!amountMatch) return null
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
  if (!amount || amount <= 0) return null

  let type = null
  if (/(debited|spent|paid|payment|deducted|purchase|sent|outward)/i.test(msg)) type = 'expense'
  else if (/(credited|received|deposited|added|refund|inward|credited into)/i.test(msg)) type = 'income'
  if (!type) type = /from/i.test(msg) ? 'expense' : 'income'

  const bankMatch = msg.match(/(?:from|to|into)\s+([A-Za-z ]+?)\s+(?:a\/c|account|wallet|bank)/i)
  const refMatch = msg.match(/(?:ref(?:erence)?|UTR|RRN|UPI ref)[:\s#]*([A-Z0-9.-]{6,})/i)
  const viaMatch = msg.match(/via\s+UPI/i) || msg.match(/through\s+([A-Za-z]+)/i)

  let note = null
  const noteMatch = msg.match(/(?:note|remark|for)[:\s]+(.+?)(?:\.|$)/i)
  if (noteMatch) note = noteMatch[1].trim().slice(0, 80)
  if (!note) {
    const payee = msg.match(/(?:to|from)\s+([A-Z][A-Za-z .]{2,40})/i)
    if (payee) note = payee[1].trim().slice(0, 80)
  }
  if (!note) note = type === 'expense' ? 'UPI payment' : 'UPI received'

  const dateMatch = msg.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  let date = null
  if (dateMatch) {
    let [, d, m, y] = dateMatch
    if (Number(y) < 100) y = '20' + y
    date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return {
    type,
    amount,
    date,
    note,
    bank: bankMatch ? bankMatch[1].trim() : 'UPI',
    ref: refMatch ? refMatch[1] : null,
    via: viaMatch ? 'UPI' : null,
    source: 'upi_sms',
  }
}

export function parseSmsBackupXml(xmlText, options = {}) {
  const fallbackDate = options.fallbackDate || new Date().toISOString().split('T')[0]
  if (!String(xmlText || '').includes('<sms')) return []
  const transactions = []
  const re = /<sms\s+[^>]*?(?:date="(\d+)"|body="([\s\S]*?)")/g
  let m
  const bodies = []
  while ((m = re.exec(xmlText)) !== null) {
    if (m[1] && m[2]) {
      bodies.push({ dateMs: m[1], body: decodeXmlEntities(m[2]) })
    } else if (m[2]) {
      bodies.push({ dateMs: null, body: decodeXmlEntities(m[2]) })
    }
  }
  // Fallback regex for <sms ... body="..." date="..."> in any attribute order
  if (bodies.length === 0) {
    const re2 = /<sms\s+([^>]+)>/g
    while ((m = re2.exec(xmlText)) !== null) {
      const attrs = m[1]
      const dateMs = attrs.match(/date="(\d+)"/)
      const body = attrs.match(/body="([\s\S]*?)"/)
      if (dateMs && body) {
        bodies.push({ dateMs: dateMs[1], body: decodeXmlEntities(body[1]) })
      }
    }
  }
  for (const { dateMs, body } of bodies) {
    if (!/upi|phonepe|gpay|paytm|bhima?|@(?:\w+\.?(?:ybl|okaxis|oksbi|ibl|apl|paytm|upi|axl))/i.test(body)) continue
    const parsed = parseSingleUpiMessage(body)
    if (!parsed) continue
    const iso = dateMs ? new Date(Number(dateMs)).toISOString().split('T')[0] : null
    transactions.push({ ...parsed, date: (parsed.date || iso || fallbackDate) })
  }
  return transactions
}

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/**
 * Parses bank statement text (often extracted from PDFs).
 * Expects lines like:
 *   01/04/2024  UPI/A2B123456789  ZOMATO  250.00  45,250.00
 *   02/04/2024  NEFT INWARD       SALARY  45,000.00  90,250.00
 * Amounts: [withdrawal] [deposit] [balance] or [balance] [withdrawal] [deposit]
 */
export function parseBankStatementText(text) {
  const lines = String(text || '').split(/\r?\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const transactions = []
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
    if (!dateMatch) continue
    let [, d, m, y] = dateMatch
    if (Number(y) < 100) y = '20' + y
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const amounts = [...line.matchAll(/([\d,]+\.\d{2})/g)].map((x) => parseFloat(x[1].replace(/,/g, '')))
    if (amounts.length < 2) continue

    const directionHints = {
      debit: /(?:debited|debit|withdrawal|withdraw|paid|dr\.?|outward|sent|transfer to|upi\/p2a|atm)/i.test(line),
      credit: /(?:credited|credit|deposit|received|inward|cr\.?|transfer from|added|refund|salary|interest)/i.test(line),
    }

    let type = null
    if (directionHints.debit && !directionHints.credit) type = 'expense'
    else if (directionHints.credit && !directionHints.debit) type = 'income'
    else {
      const [a, b] = amounts
      type = a >= 0 && b > a ? 'expense' : 'income'
    }
    if (!type) type = 'expense'

    const amount = type === 'expense' ? amounts[0] : amounts[amounts.length >= 3 ? 1 : 0]

    const narration = line
      .replace(dateMatch[0], '')
      .replace(/([\d,]+\.\d{2})\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)

    transactions.push({
      type,
      amount,
      date,
      note: narration || (type === 'expense' ? 'Bank debit' : 'Bank credit'),
      source: 'bank_statement',
      paymentMethod: /upi/i.test(line) ? 'upi' : (type === 'expense' ? 'bank_card' : 'bank_transfer'),
    })
  }
  return transactions
}

export function parseStatementFile(source, options = {}) {
  const text = String(options.text || '')
  if (source === 'upi_sms') return parseUpiSms(text)
  if (source === 'sms_backup') return parseSmsBackupXml(text, options)
  if (source === 'bank_pdf') return parseBankStatementText(text, options)
  return []
}

export function dedupeStatementTransactions(list, existingTransactions = []) {
  const seen = new Set()
  for (const tx of existingTransactions) {
    if (tx && tx.date && tx.amount && tx.type && tx.note) {
      seen.add(`${tx.type}|${tx.date}|${tx.amount}|${String(tx.note).toLowerCase().slice(0, 40)}`)
    }
  }
  const result = []
  let duplicates = 0
  for (const tx of list) {
    const key = `${tx.type}|${tx.date}|${tx.amount}|${String(tx.note || '').toLowerCase().slice(0, 40)}`
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    result.push(tx)
  }
  return { result, duplicates }
}

export function normalizeStatementTransaction(tx, options = {}) {
  const dateOverride = options.dateOverride
  return {
    type: tx.type === 'income' ? 'income' : 'expense',
    amount: tx.amount,
    date: dateOverride || tx.date || new Date().toISOString().split('T')[0],
    note: tx.note || '',
    category: options.category,
    paymentMethod: tx.paymentMethod,
    person: tx.person,
    source: tx.source || 'statement_import',
    merchant: options.merchant,
  }
}

/**
 * Extracts text from a PDF file using pdfjs-dist (async, browser-friendly).
 */
export async function extractPdfText(arrayBuffer) {
  const pdfjs = await import('pdfjs-dist')
  const doc = await pdfjs.getDocument({ data: arrayBuffer, isEvalSupported: false, disableFontFace: true }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => (it.str != null ? it.str : '')).join(' ') + '\n'
  }
  return text
}

/**
 * Smart PDF extraction: tries the embedded text layer first, then falls back
 * to full-page OCR for scanned (image-based) statements.
 * Returns { text, ocrUsed }. onProgress receives (progress, label).
 */
export async function extractPdfSmart(arrayBuffer, onProgress) {
  const { extractPdfWithOcrFallback } = await import('./pdfOcr')
  return extractPdfWithOcrFallback(extractPdfText, arrayBuffer, onProgress)
}

/**
 * Exact-hash dedupe (existing behaviour) followed by a fuzzy pass that also
 * catches near-duplicate merchants/notes within a small date + amount window.
 */
export function dedupeStatementTransactionsSmart(list, existingTransactions = [], options = {}) {
  return dedupeWithFuzzy(list, existingTransactions, options)
}