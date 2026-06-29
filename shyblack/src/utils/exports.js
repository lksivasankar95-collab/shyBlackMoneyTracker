import { formatCurrency } from './helpers'
import { ALL_CATEGORIES, PAYMENT_METHODS } from './constants'
import { getMonthlyData } from './analytics'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── CSV ──────────────────────────────────────────────

function toCsvValue(val) {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function arrayToCsv(headers, rows) {
  return [headers.join(','), ...rows.map((r) => r.map(toCsvValue).join(','))].join('\n')
}

export function transactionsToCsv(transactions) {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person', 'Payment Method', 'Tags']
  const rows = transactions.map((t) => {
    const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
    const method = t.paymentMethod ? PAYMENT_METHODS.find((m) => m.id === t.paymentMethod) : null
    return [
      t.date, t.type, cat?.label || t.category,
      t.type === 'income' ? t.amount : -t.amount,
      t.note || '', t.person?.name || '',
      method?.label || t.paymentMethod || '',
      (t.tags || []).join('; '),
    ]
  })
  return arrayToCsv(headers, rows)
}

export function debtsToCsv(debts) {
  const headers = ['Person', 'Type', 'Amount', 'Remaining', 'Status', 'Due Date', 'Note']
  const rows = debts.map((d) => [d.personName, d.type, d.amount, d.remainingAmount, d.status, d.dueDate || '', d.note || ''])
  return arrayToCsv(headers, rows)
}

export function goalsToCsv(goals) {
  const headers = ['Name', 'Target', 'Saved', 'Remaining', 'Category', 'Target Date', 'Status']
  const rows = goals.map((g) => [g.name, g.target, g.saved || 0, Math.max(0, g.target - (g.saved || 0)), g.category || '', g.targetDate || '', g.status || 'active'])
  return arrayToCsv(headers, rows)
}

export function budgetsToCsv(budgets) {
  const headers = ['Category', 'Budget Limit', 'Spent', 'Remaining']
  const rows = Object.entries(budgets || {}).filter(([, b]) => b.limit > 0).map(([cat, b]) => {
    const label = ALL_CATEGORIES.find((c) => c.id === cat)?.label || cat
    return [label, b.limit, b.spent || 0, Math.max(0, b.limit - (b.spent || 0))]
  })
  return arrayToCsv(headers, rows)
}

export function emisToCsv(emis) {
  const headers = ['Name', 'Monthly Amount', 'Total Amount', 'Total Months', 'Remaining Months', 'Total Paid', 'Lender', 'Status', 'Start Date']
  const rows = emis.map((e) => [e.name, e.amount, e.totalAmount, e.totalMonths, e.remainingMonths, e.totalPaid, e.lender || '', e.status, e.startDate])
  return arrayToCsv(headers, rows)
}

export function transfersToCsv(transfers, accounts) {
  const headers = ['Date', 'From Account', 'To Account', 'Amount', 'Note']
  const rows = transfers.map((t) => {
    const from = accounts?.find((a) => a.id === t.fromAccountId)?.name || 'Deleted'
    const to = accounts?.find((a) => a.id === t.toAccountId)?.name || 'Deleted'
    return [t.date, from, to, t.amount, t.note || '']
  })
  return arrayToCsv(headers, rows)
}

// ── XLSX via SheetJS-compatible manual XML Spreadsheet ──
// Pure offline, no dependencies, generates .xlsx-compatible XML

function xlsxCell(type, value) {
  return `<Cell><Data ss:Type="${type}">${String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`
}

function xlsxRow(cells) {
  return `<Row>${cells.map((c) => xlsxCell('String', c)).join('')}</Row>`
}

function xlsxNumberRow(cells) {
  return `<Row>${cells.map((c) => xlsxCell(typeof c === 'number' ? 'Number' : 'String', c)).join('')}</Row>`
}

function buildXlsxSheet(name, headers, rows, numberCols) {
  const headerRow = xlsxRow(headers)
  const dataRows = rows.map((r) => {
    if (numberCols) {
      return xlsxNumberRow(r.map((v, i) => numberCols.includes(i) ? Number(v) : v))
    }
    return xlsxRow(r)
  })
  return `
  <Worksheet ss:Name="${name.replace(/[&<>]/g, '')}">
    <Table>${headerRow}${dataRows.join('')}</Table>
  </Worksheet>`
}

export function exportAllToXlsx(data) {
  const sheets = []

  if (data.transactions?.length > 0) {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person', 'Payment Method', 'Tags']
    const rows = data.transactions.map((t) => {
      const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
      const method = t.paymentMethod ? PAYMENT_METHODS.find((m) => m.id === t.paymentMethod) : null
      return [t.date, t.type, cat?.label || t.category, t.type === 'income' ? t.amount : -t.amount, t.note || '', t.person?.name || '', method?.label || t.paymentMethod || '', (t.tags || []).join('; ')]
    })
    sheets.push(buildXlsxSheet('Transactions', headers, rows, [3]))
  }

  if (data.debts?.length > 0) {
    const headers = ['Person', 'Type', 'Amount', 'Remaining', 'Status', 'Due Date', 'Note']
    const rows = data.debts.map((d) => [d.personName, d.type, d.amount, d.remainingAmount, d.status, d.dueDate || '', d.note || ''])
    sheets.push(buildXlsxSheet('Debts', headers, rows, [2, 3]))
  }

  if (data.goals?.length > 0) {
    const headers = ['Name', 'Target', 'Saved', 'Remaining', 'Category', 'Target Date', 'Status']
    const rows = data.goals.map((g) => [g.name, g.target, g.saved || 0, Math.max(0, g.target - (g.saved || 0)), g.category || '', g.targetDate || '', g.status || 'active'])
    sheets.push(buildXlsxSheet('Goals', headers, rows, [1, 2, 3]))
  }

  if (data.emis?.length > 0) {
    const headers = ['Name', 'Monthly', 'Total', 'Months', 'Remaining', 'Paid', 'Lender', 'Status', 'Start']
    const rows = data.emis.map((e) => [e.name, e.amount, e.totalAmount, e.totalMonths, e.remainingMonths, e.totalPaid, e.lender || '', e.status, e.startDate])
    sheets.push(buildXlsxSheet('EMIs', headers, rows, [1, 2, 3, 4, 5]))
  }

  if (data.transfers?.length > 0) {
    const headers = ['Date', 'From', 'To', 'Amount', 'Note']
    const rows = data.transfers.map((t) => {
      const from = data.accounts?.find((a) => a.id === t.fromAccountId)?.name || 'Deleted'
      const to = data.accounts?.find((a) => a.id === t.toAccountId)?.name || 'Deleted'
      return [t.date, from, to, t.amount, t.note || '']
    })
    sheets.push(buildXlsxSheet('Transfers', headers, rows, [3]))
  }

  if (sheets.length === 0) return null

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Font ss:Color="#000000"/></Style>
  </Styles>
  ${sheets.join('')}
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  return blob
}

export function downloadCsv(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename || `finora_export_${new Date().toISOString().split('T')[0]}.csv`)
}

export function downloadXlsx(blob, filename) {
  downloadBlob(blob, filename || `finora_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── Keep existing API compatible ─────────────────────

export function exportToCSV(transactions) {
  return transactionsToCsv(transactions)
}

export function downloadCSV(csv, filename) {
  downloadCsv(csv, filename)
}

export function generateMonthlyStatement(transactions, year, month) {
  const monthly = getMonthlyData(transactions, 1)[0]
  if (!monthly) return null

  const expenses = transactions.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year
  })

  const topExpense = expenses.length > 0
    ? expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0])
    : null
  const topExpenseCat = topExpense ? ALL_CATEGORIES.find((c) => c.id === topExpense.category) : null

  const categorySummary = {}
  expenses.forEach((t) => {
    const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
    const label = cat?.label || t.category
    if (!categorySummary[label]) categorySummary[label] = 0
    categorySummary[label] += t.amount
  })

  return {
    period: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]} ${year}`,
    income: monthly.income,
    expenses: monthly.expense,
    balance: monthly.balance,
    transactionCount: transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    }).length,
    topExpense: topExpenseCat ? { category: topExpenseCat.label, amount: topExpense.amount } : null,
    categorySummary: Object.entries(categorySummary)
      .map(([cat, amount]) => ({ category: cat, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}

export function generateStatementHTML(statement) {
  if (!statement) return ''

  const catRows = statement.categorySummary
    .map((c) => `<tr><td>${c.category}</td><td style="text-align:right">${formatCurrency(c.amount)}</td></tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Monthly Statement - ${statement.period}</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #0A0A0F; color: #fff; padding: 20px; }
  .card { background: #13131A; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); }
  h1 { color: #39ff14; font-size: 20px; margin: 0 0 4px; }
  .period { color: #666; font-size: 13px; margin-bottom: 20px; }
  .stat { font-size: 24px; font-weight: 800; margin: 4px 0; }
  .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .total { font-weight: 700; color: #39ff14; }
  .footer { text-align: center; color: #444; font-size: 11px; margin-top: 20px; }
</style>
</head>
<body>
  <div class="card">
    <h1>FINORA</h1>
    <div class="period">Finance Statement — ${statement.period}</div>
    <div class="label">Total Income</div>
    <div class="stat" style="color:#39ff14">${formatCurrency(statement.income)}</div>
    <div class="label" style="margin-top:12px">Total Expenses</div>
    <div class="stat" style="color:#ef4444">${formatCurrency(statement.expenses)}</div>
    <div class="label" style="margin-top:12px">Net Balance</div>
    <div class="stat">${formatCurrency(statement.balance)}</div>
    <div class="label" style="margin-top:12px">Transactions</div>
    <div class="stat" style="font-size:18px">${statement.transactionCount}</div>
  </div>
  ${statement.topExpense ? `
  <div class="card">
    <div class="label">Top Expense</div>
    <div class="stat" style="font-size:18px;color:#ef4444">${statement.topExpense.category}</div>
    <div style="color:#ef4444;font-size:14px">${formatCurrency(statement.topExpense.amount)}</div>
  </div>` : ''}
  ${catRows ? `
  <div class="card">
    <div class="label">Category Breakdown</div>
    <table>${catRows}</table>
  </div>` : ''}
  <div class="footer">Generated by FINORA — ${new Date().toLocaleDateString('en-IN')}</div>
</body></html>`
}

export function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, filename || `finora_statement_${new Date().toISOString().split('T')[0]}.html`)
}
