import { formatCurrency } from './helpers'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES } from './constants'
import { getMonthlyData, getCategoryBreakdown } from './analytics'
import { calculateNetWorth } from './networth'
import { DEBT_TYPES, DEBT_STATUS } from './debts'

export function generateMonthlyStatement(transactions, debts, accounts, budgets, year, month) {
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const sorted = [...monthTxs].sort((a, b) => new Date(a.date) - new Date(b.date))

  const income = sorted.filter((t) => t.type === 'income')
  const expense = sorted.filter((t) => t.type === 'expense')
  const totalIncome = income.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0)

  const expenseByCat = {}
  expense.forEach((t) => {
    expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount
  })
  const incomeByCat = {}
  income.forEach((t) => {
    incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount
  })

  const netWorth = calculateNetWorth(transactions, debts, accounts)

  const tradingIncome = income
    .filter((t) => t.category === 'trading_withdrawal')
    .reduce((s, t) => s + t.amount, 0)
  const tradingExpense = expense
    .filter((t) => t.category === 'trading_deposit')
    .reduce((s, t) => s + t.amount, 0)

  const pendingDebtsGiven = debts
    .filter((d) => d.type === DEBT_TYPES.LENT && d.status === DEBT_STATUS.PENDING)
    .reduce((s, d) => s + d.remainingAmount, 0)
  const pendingDebtsTaken = debts
    .filter((d) => d.type === DEBT_TYPES.BORROWED && d.status === DEBT_STATUS.PENDING)
    .reduce((s, d) => s + d.remainingAmount, 0)

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })

  return buildHtml({
    monthName, year, month,
    totalIncome, totalExpense,
    income, expense, sorted,
    expenseByCat, incomeByCat,
    netWorth,
    tradingIncome, tradingExpense,
    pendingDebtsGiven, pendingDebtsTaken,
    debts, budgets,
  })
}

function buildHtml(data) {
  const {
    monthName, totalIncome, totalExpense,
    expenseByCat, incomeByCat,
    netWorth, tradingIncome, tradingExpense,
    pendingDebtsGiven, pendingDebtsTaken,
    debts,
  } = data

  const savings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(0) : '0'

  const catRows = Object.entries(expenseByCat)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => {
      const info = ALL_CATEGORIES.find((c) => c.id === cat)
      return `<tr><td style="padding:4px 8px;color:#888">${info?.label || cat}</td><td style="padding:4px 8px;text-align:right;font-weight:600">${formatCurrency(amount)}</td></tr>`
    }).join('')

  const incomeCatRows = Object.entries(incomeByCat)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => {
      const info = ALL_CATEGORIES.find((c) => c.id === cat)
      return `<tr><td style="padding:4px 8px;color:#888">${info?.label || cat}</td><td style="padding:4px 8px;text-align:right;font-weight:600;color:#39ff14">${formatCurrency(amount)}</td></tr>`
    }).join('')

  const debtRows = debts
    .filter((d) => d.status === DEBT_STATUS.PENDING)
    .map((d) => `
      <tr>
        <td style="padding:4px 8px;color:#888">${d.personName}</td>
        <td style="padding:4px 8px;color:#888">${d.type === DEBT_TYPES.LENT ? 'You lent' : 'You borrowed'}</td>
        <td style="padding:4px 8px;text-align:right;font-weight:600">${formatCurrency(d.remainingAmount)}</td>
      </tr>
    `).join('')

  const barWidth = (pct) => Math.min(pct, 100)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Financial Statement - ${monthName}</title>
<style>
  @page { margin: 12mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Inter', 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 0; font-size: 11px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #39ff14; }
  .header h1 { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
  .header p { color: #666; font-size: 11px; margin-top: 4px; }
  .summary { display: flex; gap: 12px; margin-bottom: 20px; }
  .summary-card { flex: 1; padding: 12px; border-radius: 8px; background: #f5f5f5; }
  .summary-card h3 { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: 800; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; font-weight: 700; color: #111; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; border-bottom: 1px solid #eee; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
  .total-row td { font-weight: 700; border-top: 2px solid #333; padding-top: 6px; }
  .bar-chart { margin-top: 4px; }
  .bar { height: 16px; border-radius: 4px; margin-bottom: 4px; display: flex; align-items: center; padding: 0 8px; font-size: 9px; font-weight: 600; color: #fff; }
  .green { color: #39ff14; }
  .red { color: #ef4444; }
  .footer { text-align: center; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 9px; }
  .net-worth { font-size: 24px; font-weight: 800; text-align: center; padding: 16px; background: linear-gradient(135deg, #f0fff0, #fff); border-radius: 8px; margin-bottom: 16px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>

<div class="header">
  <h1>FINORA - Smart Finance</h1>
  <p>Monthly Financial Statement — ${monthName}</p>
  <p style="font-size:9px;color:#999">Generated on ${new Date().toLocaleDateString()}</p>
</div>

<div class="net-worth">
  <div style="font-size:10px;color:#666;font-weight:400;text-transform:uppercase;letter-spacing:1px">Net Worth</div>
  <div style="margin-top:4px">${formatCurrency(netWorth.netWorth)}</div>
</div>

<div class="summary">
  <div class="summary-card">
    <h3>Total Income</h3>
    <div class="value green">${formatCurrency(totalIncome)}</div>
  </div>
  <div class="summary-card">
    <h3>Total Expenses</h3>
    <div class="value red">${formatCurrency(totalExpense)}</div>
  </div>
  <div class="summary-card" style="background:${savings >= 0 ? '#f0fff0' : '#fff0f0'}">
    <h3>Savings</h3>
    <div class="value" style="color:${savings >= 0 ? '#39ff14' : '#ef4444'}">${formatCurrency(savings)}</div>
    <div style="font-size:9px;color:#999">${savingsRate}% savings rate</div>
  </div>
</div>

<div class="section">
  <h2>Income Breakdown</h2>
  <table>
    <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${incomeCatRows || '<tr><td colspan="2" style="color:#999;text-align:center">No income this month</td></tr>'}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Expense Breakdown</h2>
  <div class="bar-chart">
    ${Object.entries(expenseByCat).sort(([,a],[,b]) => b - a).map(([cat, amount]) => {
      const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      const info = ALL_CATEGORIES.find((c) => c.id === cat)
      const hue = Math.min(amount / (totalExpense || 1) * 60, 60)
      return `<div class="bar" style="width:${barWidth(pct + 10)}%;background:hsl(${120 - hue}, 70%, ${45 - hue/3}%)"><span>${info?.label || cat}: ${formatCurrency(amount)} (${pct.toFixed(0)}%)</span></div>`
    }).join('')}
  </div>
  <table>
    <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${catRows}
      <tr class="total-row"><td>Total</td><td style="text-align:right">${formatCurrency(totalExpense)}</td></tr>
    </tbody>
  </table>
</div>

${tradingIncome > 0 || tradingExpense > 0 ? `
<div class="section">
  <h2>Trading Summary</h2>
  <table>
    <tr><td>Deposits</td><td style="text-align:right;color:#ef4444;font-weight:600">${formatCurrency(tradingExpense)}</td></tr>
    <tr><td>Withdrawals</td><td style="text-align:right;color:#39ff14;font-weight:600">${formatCurrency(tradingIncome)}</td></tr>
    <tr class="total-row"><td>Net</td><td style="text-align:right;font-weight:700">${formatCurrency(tradingIncome - tradingExpense)}</td></tr>
  </table>
</div>
` : ''}

<div class="section">
  <h2>Net Worth Summary</h2>
  <table>
    <tr><td>Cash & Bank Balance</td><td style="text-align:right;font-weight:600">${formatCurrency(netWorth.cash + netWorth.bankAccounts)}</td></tr>
    <tr><td>Trading Capital</td><td style="text-align:right;font-weight:600">${formatCurrency(netWorth.tradingCapital)}</td></tr>
    <tr><td>Debts Owed to You</td><td style="text-align:right;font-weight:600;color:#a855f7">${formatCurrency(netWorth.debtsGiven)}</td></tr>
    <tr><td style="color:#ef4444">Your Debts</td><td style="text-align:right;font-weight:600;color:#ef4444">${formatCurrency(netWorth.debtsTaken)}</td></tr>
    <tr class="total-row"><td>Net Worth</td><td style="text-align:right">${formatCurrency(netWorth.netWorth)}</td></tr>
  </table>
</div>

${pendingDebtsGiven > 0 || pendingDebtsTaken > 0 ? `
<div class="section">
  <h2>Pending Debts</h2>
  <table>
    <thead><tr><th>Person</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${debtRows || '<tr><td colspan="3" style="color:#999;text-align:center">No pending debts</td></tr>'}
    </tbody>
  </table>
</div>
` : ''}

<div class="footer">
  <p>FINORA — Smart Finance. Better Life.</p>
  <p>This statement was generated offline. Data is stored locally on your device.</p>
</div>

</body>
</html>`
}

export function printStatement(html) {
  try {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999'
    iframe.srcdoc = html
    document.body.appendChild(iframe)
    iframe.onload = () => {
      try { iframe.contentWindow.print() } catch (_) {}
    }
    return true
  } catch {
    try {
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => { try { win.print() } catch (_) {} }, 500)
        return true
      }
    } catch (_) {}
    return false
  }
}

export function downloadStatement(html, filename) {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'statement.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
