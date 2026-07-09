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

export function transactionsToCsv(transactions, filters = {}) {
  const { type, category, dateFrom, dateTo } = filters
  let filtered = [...transactions]
  if (type) filtered = filtered.filter((t) => t.type === type)
  if (category) filtered = filtered.filter((t) => t.category === category)
  if (dateFrom) filtered = filtered.filter((t) => t.date >= dateFrom)
  if (dateTo) filtered = filtered.filter((t) => t.date <= dateTo)

  const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person', 'Payment Method', 'Tags']
  const rows = filtered.map((t) => {
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

// ── Filter-based Export Helpers ─────────────────────

export function exportByMonth(transactions, year, month) {
  return transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === month && d.getFullYear() === year
  })
}

export function exportByYear(transactions, year) {
  return transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year
  })
}

export function exportByCategory(transactions, categoryId) {
  return transactions.filter((t) => t.category === categoryId)
}

export function exportByCustomRange(transactions, dateFrom, dateTo) {
  return transactions.filter((t) => t.date >= dateFrom && t.date <= dateTo)
}

// ── Export Summary ──────────────────────────────────

export function generateExportSummary(transactions) {
  if (!transactions || transactions.length === 0) {
    return { totalIncome: 0, totalExpense: 0, balance: 0, count: 0, avgTransaction: 0, topCategory: null, savingsRate: 0 }
  }
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const count = transactions.length
  const avgTransaction = count > 0 ? transactions.reduce((s, t) => s + t.amount, 0) / count : 0
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0

  const catMap = {}
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    if (!catMap[t.category]) catMap[t.category] = 0
    catMap[t.category] += t.amount
  })
  let topCategory = null
  let topAmt = 0
  Object.entries(catMap).forEach(([cat, amt]) => {
    if (amt > topAmt) { topAmt = amt; topCategory = cat }
  })
  const topCatLabel = topCategory ? (ALL_CATEGORIES.find((c) => c.id === topCategory)?.label || topCategory) : null

  return { totalIncome, totalExpense, balance, count, avgTransaction, topCategory: topCatLabel, savingsRate }
}

// ── HTML Report with SVG Charts ─────────────────────

export function exportWithChartsToHTML(transactions, summary) {
  const s = summary || generateExportSummary(transactions)

  const monthlyData = {}
  transactions.forEach((t) => {
    const d = t.date
    const key = d.substring(0, 7)
    if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0, count: 0 }
    if (t.type === 'income') monthlyData[key].income += t.amount
    else monthlyData[key].expense += t.amount
    monthlyData[key].count++
  })
  const months = Object.keys(monthlyData).sort()
  const maxVal = Math.max(
    ...months.flatMap((m) => [monthlyData[m].income, monthlyData[m].expense]),
    1
  )
  const barMaxH = 160
  const monthBarW = Math.min(50, Math.max(20, 300 / months.length))

  function monthBarsSVG() {
    return months.map((m, i) => {
      const ih = (monthlyData[m].income / maxVal) * barMaxH
      const eh = (monthlyData[m].expense / maxVal) * barMaxH
      const x = i * (monthBarW + 8) + 20
      return `
        <g>
          <rect x="${x}" y="${barMaxH - ih}" width="${monthBarW * 0.4}" height="${ih}" fill="#39ff14" rx="2"/>
          <rect x="${x + monthBarW * 0.45}" y="${barMaxH - eh}" width="${monthBarW * 0.4}" height="${eh}" fill="#ef4444" rx="2"/>
          <text x="${x + monthBarW * 0.2}" y="${barMaxH + 14}" font-size="8" fill="#666" text-anchor="middle">${m.substring(5)}</text>
        </g>`
    }).join('')
  }

  const catBreakdown = {}
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    const label = ALL_CATEGORIES.find((c) => c.id === t.category)?.label || t.category
    if (!catBreakdown[label]) catBreakdown[label] = 0
    catBreakdown[label] += t.amount
  })
  const catEntries = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1])
  const catTotal = catEntries.reduce((sum, [, a]) => sum + a, 0) || 1
  const catColors = ['#ff6b6b', '#ff9f43', '#ffcd56', '#50c878', '#48bbff', '#9c88ff', '#ff6384', '#54c2b8', '#c89664', '#96c896', '#c8b464', '#6496c8']

  function catBarSVG() {
    return catEntries.map(([label, amt], i) => {
      const pct = (amt / catTotal) * 100
      const bw = Math.max((amt / catTotal) * 280, 4)
      const y = i * 22 + 20
      return `
        <g>
          <text x="0" y="${y + 8}" font-size="9" fill="#999">${label}</text>
          <rect x="110" y="${y - 2}" width="${bw}" height="12" fill="${catColors[i % catColors.length]}" rx="2"/>
          <text x="115" y="${y + 7}" font-size="8" fill="#fff">${formatCurrency(amt)} (${pct.toFixed(1)}%)</text>
        </g>`
    }).join('')
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Expense Tracker - Export Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0F; color: #fff; padding: 24px; }
  .container { max-width: 800px; margin: 0 auto; }
  .header { text-align: center; padding: 32px 0 24px; }
  .header h1 { font-size: 28px; background: linear-gradient(135deg, #39ff14, #00c8ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header p { color: #666; font-size: 13px; margin-top: 6px; }
  .card { background: #13131A; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  .card h2 { font-size: 14px; color: #39ff14; margin-bottom: 14px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stat { padding: 14px; background: rgba(255,255,255,0.03); border-radius: 12px; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .stat .value { font-size: 22px; font-weight: 800; margin-top: 4px; }
  .stat .value.green { color: #39ff14; }
  .stat .value.red { color: #ef4444; }
  .stat .value.cyan { color: #00c8ff; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 4px; color: #666; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  td { padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .tx-income { color: #39ff14; }
  .tx-expense { color: #ef4444; }
  .footer { text-align: center; color: #444; font-size: 10px; padding: 20px 0; }
  .legend { display: flex; gap: 16px; justify-content: center; font-size: 11px; margin-top: 8px; }
  .legend-item { display: flex; align-items: center; gap: 4px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Expense Tracker - ShyBlack</h1>
    <p>Financial Export Report &mdash; Generated ${new Date().toLocaleDateString('en-IN')}</p>
  </div>

  <div class="card">
    <h2>Summary</h2>
    <div class="grid-2">
      <div class="stat"><div class="label">Total Income</div><div class="value green">${formatCurrency(s.totalIncome)}</div></div>
      <div class="stat"><div class="label">Total Expense</div><div class="value red">${formatCurrency(s.totalExpense)}</div></div>
      <div class="stat"><div class="label">Net Balance</div><div class="value ${s.balance >= 0 ? 'green' : 'red'}">${formatCurrency(s.balance)}</div></div>
      <div class="stat"><div class="label">Transactions</div><div class="value cyan">${s.count}</div></div>
      <div class="stat"><div class="label">Avg Transaction</div><div class="value cyan">${formatCurrency(s.avgTransaction)}</div></div>
      <div class="stat"><div class="label">Savings Rate</div><div class="value green">${s.savingsRate.toFixed(1)}%</div></div>
    </div>
    ${s.topCategory ? `<div style="margin-top:12px;padding:10px;background:rgba(57,255,20,0.05);border-radius:8px;font-size:12px"><span style="color:#666">Top Expense Category:</span> <span style="color:#39ff14;font-weight:700">${s.topCategory}</span></div>` : ''}
  </div>

  <div class="card">
    <h2>Monthly Income vs Expense</h2>
    <svg width="100%" height="${barMaxH + 40}" viewBox="0 0 ${months.length * (monthBarW + 8) + 40} ${barMaxH + 40}" style="max-width:100%">
      ${monthBarsSVG()}
    </svg>
    <div class="legend">
      <div class="legend-item"><span class="legend-dot" style="background:#39ff14"></span> Income</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> Expense</div>
    </div>
  </div>

  <div class="card">
    <h2>Expense by Category</h2>
    <svg width="100%" height="${Math.max(catEntries.length * 22 + 30, 30)}" viewBox="0 0 400 ${Math.max(catEntries.length * 22 + 30, 30)}" style="max-width:100%">
      ${catBarSVG()}
    </svg>
  </div>

  <div class="card">
    <h2>Transaction List</h2>
    <table>
      <thead><tr><th>Date</th><th>Category</th><th>Note</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${transactions.slice(0, 100).map((t) => {
          const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
          return `<tr>
            <td style="color:#666">${t.date}</td>
            <td>${cat?.label || t.category}</td>
            <td style="color:#666">${t.note ? t.note.substring(0, 30) : ''}</td>
            <td style="text-align:right" class="${t.type === 'income' ? 'tx-income' : 'tx-expense'}">${t.type === 'income' ? '' : '-'}${formatCurrency(t.amount)}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    ${transactions.length > 100 ? `<p style="color:#444;font-size:11px;margin-top:8px">Showing 100 of ${transactions.length} transactions</p>` : ''}
  </div>

  <div class="footer">Generated by Expense Tracker - ShyBlack &mdash; ${new Date().toLocaleString('en-IN')}</div>
</div>
</body>
</html>`

  return html
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

export function exportToExcelWithSummary(data, summary) {
  const sheets = []

  if (summary) {
    const summaryHeaders = ['Metric', 'Value']
    const summaryRows = [
      ['Total Income', formatCurrency(summary.totalIncome)],
      ['Total Expense', formatCurrency(summary.totalExpense)],
      ['Net Balance', formatCurrency(summary.balance)],
      ['Transaction Count', String(summary.count)],
      ['Avg Transaction', formatCurrency(summary.avgTransaction)],
      ['Savings Rate', `${summary.savingsRate.toFixed(1)}%`],
    ]
    if (summary.topCategory) {
      summaryRows.push(['Top Expense Category', summary.topCategory])
    }
    summaryRows.push(['Generated', new Date().toLocaleString('en-IN')])
    sheets.push(buildXlsxSheet('Summary', summaryHeaders, summaryRows))
  }

  if (data.transactions?.length > 0) {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person', 'Payment Method', 'Tags']
    const rows = data.transactions.map((t) => {
      const cat = ALL_CATEGORIES.find((c) => c.id === t.category)
      const method = t.paymentMethod ? PAYMENT_METHODS.find((m) => m.id === t.paymentMethod) : null
      return [t.date, t.type, cat?.label || t.category, t.type === 'income' ? t.amount : -t.amount, t.note || '', t.person?.name || '', method?.label || t.paymentMethod || '', (t.tags || []).join('; ')]
    })
    sheets.push(buildXlsxSheet('Transactions', headers, rows, [3]))
  }

  // Charts sheet with visual representation
  if (summary && data.transactions?.length > 0) {
    const catBreakdown = {}
    data.transactions.filter((t) => t.type === 'expense').forEach((t) => {
      const label = ALL_CATEGORIES.find((c) => c.id === t.category)?.label || t.category
      if (!catBreakdown[label]) catBreakdown[label] = 0
      catBreakdown[label] += t.amount
    })
    const catHeaders = ['Category', 'Expense Amount', '% of Total']
    const totalExp = Object.values(catBreakdown).reduce((s, a) => s + a, 0) || 1
    const catRows = Object.entries(catBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([label, amt]) => [label, formatCurrency(amt), `${((amt / totalExp) * 100).toFixed(1)}%`])
    sheets.push(buildXlsxSheet('Category Breakdown', catHeaders, catRows, []))

    // Monthly trends sheet
    const monthlyData = {}
    data.transactions.forEach((t) => {
      const key = t.date.substring(0, 7)
      if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyData[key].income += t.amount
      else monthlyData[key].expense += t.amount
    })
    const mHeaders = ['Month', 'Income', 'Expense', 'Balance']
    const mRows = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, d]) => [month, d.income, d.expense, d.income - d.expense])
    sheets.push(buildXlsxSheet('Monthly Trends', mHeaders, mRows, [1, 2, 3]))
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

export function exportAllToXlsx(data) {
  return exportToExcelWithSummary(data, null)
}

export function downloadCsv(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename || `etracker_export_${new Date().toISOString().split('T')[0]}.csv`)
}

export function downloadXlsx(blob, filename) {
  downloadBlob(blob, filename || `etracker_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function downloadHtml(html, filename) {
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, filename || `etracker_export_${new Date().toISOString().split('T')[0]}.html`)
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
    <h1>Expense Tracker - ShyBlack</h1>
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
  <div class="footer">Generated by Expense Tracker - ShyBlack — ${new Date().toLocaleDateString('en-IN')}</div>
</body></html>`
}

export function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, filename || `etracker_statement_${new Date().toISOString().split('T')[0]}.html`)
}
