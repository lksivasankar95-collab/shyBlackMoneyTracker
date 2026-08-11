import { ALL_CATEGORIES } from './constants'

/**
 * CSV transaction import engine.
 * Parses bank/statement CSV files, auto-detects columns, infers transaction
 * type from debit/credit columns or type keywords, normalizes dates,
 * matches categories and dedupes against existing transactions.
 */

const TYPE_KEYWORDS = {
  income: ['income', 'credit', 'deposit', 'received', 'refund', 'credited', 'in'],
  expense: ['expense', 'debit', 'withdrawal', 'payment', 'paid', 'purchase', 'spend', 'out'],
}

const HEADER_ALIASES = {
  date: ['date', 'trans_date', 'transaction date', 'tran date', 'posted date', 'value date', 'datetime', 'tran_date', 'txn date'],
  type: ['type', 'transaction type', 'txn type', 'method type'],
  category: ['category', 'merchant category', 'category type'],
  amount: ['amount', 'total amount', 'transaction amount', 'txn amount'],
  debit: ['debit', 'debit amount', 'withdrawal amount', 'cash out', 'payment amount', 'dr'],
  credit: ['credit', 'credit amount', 'deposit amount', 'cash in', 'cr'],
  note: ['note', 'description', 'particulars', 'details', 'memo', 'narration', 'remarks', 'transaction description', 'txn description'],
  person: ['person', 'payer', 'payee', 'counterparty', 'party', 'name', 'beneficiary'],
  paymentMethod: ['payment method', 'payment mode', 'method', 'channel', 'mode'],
  tags: ['tags', 'tag', 'labels'],
  currency: ['currency', 'ccy', 'cur', 'currency code'],
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const src = String(text || '').replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some((c) => c.trim() !== '')) rows.push(row)

  if (rows.length < 2) return { headers: [], rows: [] }
  return { headers: rows[0].map((h) => String(h).trim()), rows: rows.slice(1) }
}

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[_\-.·]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function buildColumnMap(headers) {
  const map = {}
  const normalized = headers.map(normalizeHeader)
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.some((a) => normalizeHeader(a) === normalized[i])) {
        map[field] = i
        break
      }
    }
  }
  return map
}

export function matchCategory(label) {
  const key = String(label || '').toLowerCase().trim()
  if (!key) return null
  const direct = ALL_CATEGORIES.find((c) => c.id === key || c.label.toLowerCase() === key)
  if (direct) return direct.id
  const contains = ALL_CATEGORIES.find((c) => key.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(key))
  return contains ? contains.id : null
}

export function normalizeDate(value) {
  const v = String(value || '').trim()
  if (!v) return null
  const iso = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const dmy = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (dmy) {
    let [, a, b, c] = dmy
    let d, m, y
    if (Number(c) < 100) c = '20' + c
    if (Number(a) > 12) { d = a; m = b; y = c }
    else if (Number(b) > 12) { d = b; m = a; y = c }
    else { d = a; m = b; y = c }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const parsed = new Date(v)
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
  }
  return null
}

function parseAmount(value) {
  const cleaned = String(value || '').replace(/[₹,$€£\s]/g, '')
  if (!cleaned) return null
  const m = cleaned.match(/[+-]?\d[\d,]*(\.\d+)?/)
  if (!m) return null
  return parseFloat(m[0].replace(/,/g, ''))
}

function inferType(value) {
  const key = String(value || '').toLowerCase().trim()
  if (!key) return null
  if (TYPE_KEYWORDS.income.some((w) => key.includes(w))) return 'income'
  if (TYPE_KEYWORDS.expense.some((w) => key.includes(w))) return 'expense'
  return null
}

function buildTransaction(row, map) {
  const get = (field) => (map[field] !== undefined ? String(row[map[field]] ?? '').trim() : '')

  const date = normalizeDate(get('date'))
  if (!date) return null

  const currency = get('currency') ? get('currency').toUpperCase().slice(0, 3) : undefined
  let type = inferType(get('type'))
  let amount = null

  if (type) {
    amount = parseAmount(get('amount'))
  }

  if (amount === null) {
    const debit = parseAmount(get('debit'))
    const credit = parseAmount(get('credit'))
    if (debit !== null && debit > 0) {
      type = type || 'expense'
      amount = debit
    } else if (credit !== null && credit > 0) {
      type = type || 'income'
      amount = credit
    } else {
      return null
    }
  }

  if (amount === null || isNaN(amount)) return null
  if (amount < 0) {
    if (!type) type = 'expense'
    amount = Math.abs(amount)
  }
  type = type || 'expense'

  const note = get('note')
  const categoryLabel = get('category')
  let category = matchCategory(categoryLabel)
  if (!category) category = type === 'expense' ? 'other_expense' : 'other_income'

  const person = get('person')
  const paymentMethod = get('paymentMethod')
    ? get('paymentMethod').toLowerCase().replace(/\s+/g, '_')
    : undefined

  return {
    type,
    amount,
    category,
    note,
    date,
    person: person ? { name: person } : undefined,
    paymentMethod: paymentMethod || undefined,
    currency,
    source: 'csv_import',
    _row: row,
  }
}

export function convertCsvToTransactions(text, existingTransactions = []) {
  const { headers, rows } = parseCsv(text)
  if (!headers.length) return { candidates: [], skipped: 0, invalid: 0, errors: [], headers: [] }

  const map = buildColumnMap(headers)
  const errors = []
  const candidates = []
  let invalid = 0

  for (const row of rows) {
    const tx = buildTransaction(row, map)
    if (!tx) {
      invalid++
      continue
    }
    if (map.amount === undefined && map.debit === undefined && map.credit === undefined) {
      continue
    }
    candidates.push(tx)
  }

  if (map.date === undefined || (map.amount === undefined && map.debit === undefined && map.credit === undefined)) {
    errors.push('Could not auto-detect required columns (date + amount). Try renaming the columns to "date" and "amount".')
  }

  const deduped = dedupeCandidates(candidates, existingTransactions || [])
  return { candidates: deduped.result, skipped: deduped.skipped + invalid, invalid, errors, headers }
}

export function dedupeCandidates(candidates, existing) {
  const seen = new Set()
  for (const tx of existing) {
    if (tx && tx.date && tx.amount && tx.type) {
      seen.add(`${tx.date}|${Math.round(tx.amount * 100)}|${tx.type}|${String(tx.note || '').trim().toLowerCase().slice(0, 40)}`)
    }
  }
  const result = []
  let skipped = 0
  for (const tx of candidates) {
    const hash = `${tx.date}|${Math.round(tx.amount * 100)}|${tx.type}|${String(tx.note || '').trim().toLowerCase().slice(0, 40)}`
    if (seen.has(hash)) {
      skipped++
      continue
    }
    seen.add(hash)
    result.push(tx)
  }
  return { result, skipped }
}

export function finalizeParsedTransaction(raw, options = {}) {
  const { currency, allowMultiCurrency } = options
  const tx = { ...raw }
  if (raw.currency && raw.currency !== currency && allowMultiCurrency) {
    tx.currency = raw.currency
  } else {
    tx.currency = undefined
  }
  delete tx._row
  return tx
}