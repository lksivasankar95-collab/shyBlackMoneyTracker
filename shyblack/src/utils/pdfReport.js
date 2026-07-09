import jsPDFLib from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'
const jsPDF = jsPDFLib.jsPDF || jsPDFLib.default || jsPDFLib
applyPlugin(jsPDF)
import { formatCurrency } from './helpers'
import { ALL_CATEGORIES } from './constants'

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE PDF REPORT — Expense Tracker - ShyBlack
// Bank-statement quality · White background · Grayscale · A4
// ═══════════════════════════════════════════════════════════════════

// ── Page Dimensions ─────────────────────────────────────────────
const PW = 210
const PH = 297
const M_COVER = 20
const M = 15
const CW = PW - 2 * M
const FONT = 'helvetica'
const FONT_BOLD = 'helvetica'
const FONT_NORMAL = 'helvetica'

// ── Enterprise Grayscale Palette ─────────────────────────────────
const BLACK       = [0, 0, 0]
const WHITE       = [255, 255, 255]
const DARK_GRAY   = [51, 51, 51]
const MED_GRAY    = [128, 128, 128]
const LIGHT_GRAY  = [191, 191, 191]
const BG_LIGHT    = [245, 245, 245]
const BORDER_LT   = [216, 216, 216]

// ── Chart Grayscale ──────────────────────────────────────────────
const CHART_GRAYS = [
  [80, 80, 80], [120, 120, 120], [160, 160, 160],
  [40, 40, 40],  [180, 180, 180], [100, 100, 100],
  [60, 60, 60],  [140, 140, 140], [200, 200, 200],
  [30, 30, 30],  [170, 170, 170], [90, 90, 90],
]

// ── Helpers ──────────────────────────────────────────────────────
function getCatLabel(id) {
  const c = ALL_CATEGORIES.find((x) => x.id === id)
  return c ? c.label : id
}

function fmt(n) {
  return formatCurrency(n)
}

function getMonthName(m) {
  return ['Jan','Feb','Mar','Apr','May','Jun',
          'Jul','Aug','Sep','Oct','Nov','Dec'][m] || ''
}

function getFullMonth(m) {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][m] || ''
}

function getMonthDateRange(month, year) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function groupBy(items, key) {
  const map = new Map()
  items.forEach((item) => {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(item)
  })
  return Array.from(map)
}

function getPageRemaining(doc) {
  return PH - M - (doc.lastAutoTable?.finalY || M + 10)
}

function needsNewPage(doc, needed, minRemaining) {
  const remain = getPageRemaining(doc)
  return remain < (needed || minRemaining || 25)
}

function checkPageBreak(doc, needed) {
  if (needsNewPage(doc, needed)) {
    finalizePages(doc)
    doc.addPage()
    doc.setFillColor(...WHITE)
    doc.rect(0, 0, PW, PH, 'F')
    return true
  }
  return false
}

function drawSectionTitle(doc, y, title) {
  doc.setFont(FONT_BOLD, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BLACK)
  doc.text(title, M, y)

  doc.setDrawColor(...BORDER_LT)
  doc.setLineWidth(0.3)
  doc.line(M, y + 1.5, PW - M, y + 1.5)

  return y + 6
}

// ═══════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════

function addFooter(doc, pageNum, totalPages) {
  const y = PH - 10
  doc.setDrawColor(...BORDER_LT)
  doc.setLineWidth(0.2)
  doc.line(M, y - 3, PW - M, y - 3)

  doc.setFont(FONT, 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...MED_GRAY)

  const now = new Date()
  const ts = `${now.getDate()} ${getFullMonth(now.getMonth())} ${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  doc.text('Expense Tracker - ShyBlack  \u00B7  Confidential  \u00B7  Generated Automatically', M, y)
  doc.text(ts, PW / 2, y, { align: 'center' })
  doc.text(`Page ${pageNum} of ${totalPages}`, PW - M, y, { align: 'right' })
}

function finalizePages(doc, startFrom) {
  const totalPages = doc.internal.getNumberOfPages()
  const start = startFrom || 1
  for (let i = start; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages)
  }
}

// ═══════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════

function drawCoverPage(doc, title, periodLabel, userName) {
  const cx = PW / 2

  doc.setFillColor(...WHITE)
  doc.rect(0, 0, PW, PH, 'F')

  doc.setFillColor(...DARK_GRAY)
  doc.rect(M_COVER, M_COVER + 20, PW - 2 * M_COVER, 1.5, 'F')

  doc.setFont(FONT_BOLD, 'bold')
  doc.setFontSize(32)
  doc.setTextColor(...BLACK)
  doc.text('Expense Tracker - ShyBlack', cx, 72, { align: 'center' })

  doc.setFont(FONT_NORMAL, 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...MED_GRAY)
  doc.text('Personal Finance Manager', cx, 88, { align: 'center' })

  doc.setDrawColor(...LIGHT_GRAY)
  doc.setLineWidth(0.3)
  doc.line(cx - 15, 100, cx + 15, 100)

  doc.setFont(FONT_BOLD, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...BLACK)
  doc.text(title || 'Financial Report', cx, 128, { align: 'center' })

  doc.setFont(FONT_NORMAL, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...DARK_GRAY)
  doc.text(periodLabel || '', cx, 146, { align: 'center' })

  const d = new Date()
  const dateStr = `${d.getDate()} ${getFullMonth(d.getMonth())} ${d.getFullYear()}`
  doc.setFontSize(9)
  doc.setTextColor(...MED_GRAY)
  doc.text(`Generated: ${dateStr}`, cx, 164, { align: 'center' })

  if (userName) {
    doc.setFontSize(9)
    doc.setTextColor(...DARK_GRAY)
    doc.text(`Prepared for: ${userName}`, cx, 180, { align: 'center' })
  }

  doc.setFont(FONT_NORMAL, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LIGHT_GRAY)
  doc.text('Expense Tracker - ShyBlack v2  \u00B7  Report', cx, PH - M_COVER - 20, { align: 'center' })

  doc.setFontSize(7)
  doc.setTextColor(...LIGHT_GRAY)
  doc.text('This document contains confidential financial information.', cx, PH - M_COVER - 10, { align: 'center' })
  doc.text('If you are not the intended recipient, please delete it immediately.', cx, PH - M_COVER - 4, { align: 'center' })

  doc.setLineWidth(0.3)
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY  —  monochrome info cards
// ═══════════════════════════════════════════════════════════════════

function drawExecutiveSummary(doc, data, startY) {
  let y = drawSectionTitle(doc, startY, 'Executive Summary')

  const cards = [
    { label: 'Total Income',     value: fmt(data.totalIncome) },
    { label: 'Total Expense',    value: fmt(data.totalExpense) },
    { label: 'Net Balance',      value: fmt(data.savings),     negative: data.savings < 0 },
    { label: 'Savings Rate',     value: data.savingsRate != null ? `${data.savingsRate.toFixed(1)}%` : 'N/A' },
    { label: 'Transactions',     value: String(data.totalTxns || 0) },
    { label: 'Avg per Month',    value: data.totalTxns > 0 ? fmt(Math.round((data.totalIncome + data.totalExpense) / Math.max(data.monthlyData.length || 1, 1))) : 'N/A' },
  ]

  const cardW = (CW - 3 * 3) / 3
  const cardH = 22
  const gap = 3

  cards.forEach((card, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (cardW + gap)
    let cy = y + row * (cardH + gap)

    if (cy + cardH > PH - M - 15) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
      cy = y + row * (cardH + gap)
    }

    doc.setFillColor(...BG_LIGHT)
    doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, 'F')

    doc.setFont(FONT, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MED_GRAY)
    doc.text(card.label, x + 4, cy + 7)

    doc.setFont(FONT_BOLD, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...card.negative ? [180, 0, 0] : BLACK)
    doc.text(card.value, x + 4, cy + 18)
  })

  return y + (Math.ceil(cards.length / 3)) * (cardH + gap) + 4
}

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL HEALTH
// ═══════════════════════════════════════════════════════════════════

function drawFinancialHealth(doc, data, startY) {
  let y = drawSectionTitle(doc, startY, 'Financial Health')

  if (data.healthScore == null) return y

  const metrics = [
    { label: 'Health Score',  value: `${data.healthScore.score}/100`, detail: data.healthScore.level },
    { label: 'Savings Rate',  value: data.healthScore.categories?.find(c => c.key === 'savingsRate')?.detail || 'N/A' },
    { label: 'Expense Ratio', value: data.healthScore.categories?.find(c => c.key === 'expenseControl')?.detail || 'N/A' },
    { label: 'Income Trend',  value: data.healthScore.categories?.find(c => c.key === 'incomeStability')?.detail || 'N/A' },
  ]

  const mw = (CW - 3 * 3) / 3

  metrics.forEach((m, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (mw + 3)
    let cy = y + row * 20

    if (cy + 20 > PH - M - 15) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
      cy = y + row * 20
    }

    doc.setFillColor(...BG_LIGHT)
    doc.roundedRect(x, cy, mw, 17, 1.5, 1.5, 'F')

    doc.setFont(FONT, 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MED_GRAY)
    doc.text(m.label, x + 4, cy + 6)

    doc.setFont(FONT_BOLD, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK)
    doc.text(m.value, x + 4, cy + 14)
  })

  return y + (Math.ceil(metrics.length / 3)) * 20 + 4
}

// ═══════════════════════════════════════════════════════════════════
// INCOME ANALYSIS TABLE
// ═══════════════════════════════════════════════════════════════════

function drawIncomeAnalysis(doc, data, startY) {
  let y = drawSectionTitle(doc, startY, 'Income Analysis')

  const txs = data.filtered.filter(t => t.type === 'income')
  if (txs.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No income transactions in this period.', M, y + 4)
    return y + 10
  }

  const grouped = {}
  txs.forEach(t => {
    grouped[t.category] = grouped[t.category] || { count: 0, amount: 0 }
    grouped[t.category].count++
    grouped[t.category].amount += t.amount
  })

  const rows = Object.entries(grouped)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([cat, g]) => [
      getCatLabel(cat),
      String(g.count),
      fmt(g.amount),
      data.totalIncome > 0 ? `${((g.amount / data.totalIncome) * 100).toFixed(1)}%` : '0%',
    ])

  doc.autoTable({
    startY: y + 2,
    head: [['Category', 'Transactions', 'Amount', 'Percentage']],
    body: rows,
    foot: [[
      { content: 'Grand Total', colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: fmt(data.totalIncome), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: '100%', styles: { fontStyle: 'bold', halign: 'right' } },
    ]],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: [216, 216, 216],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: M },
    tableWidth: CW,
    showFoot: 'everyPage',
    tableLineWidth: 0,
  })

  return (doc.lastAutoTable?.finalY || y + 4) + 4
}

// ═══════════════════════════════════════════════════════════════════
// EXPENSE ANALYSIS TABLE
// ═══════════════════════════════════════════════════════════════════

function drawExpenseAnalysis(doc, data, startY) {
  let y = drawSectionTitle(doc, startY, 'Expense Analysis')

  const txs = data.filtered.filter(t => t.type === 'expense')
  if (txs.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No expense transactions in this period.', M, y + 4)
    return y + 10
  }

  const grouped = {}
  txs.forEach(t => {
    grouped[t.category] = grouped[t.category] || { count: 0, amount: 0 }
    grouped[t.category].count++
    grouped[t.category].amount += t.amount
  })

  const rows = Object.entries(grouped)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([cat, g]) => [
      getCatLabel(cat),
      String(g.count),
      fmt(g.amount),
      data.totalExpense > 0 ? `${((g.amount / data.totalExpense) * 100).toFixed(1)}%` : '0%',
    ])

  doc.autoTable({
    startY: y + 2,
    head: [['Category', 'Transactions', 'Amount', 'Percentage']],
    body: rows,
    foot: [[
      { content: 'Grand Total', colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: fmt(data.totalExpense), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: '100%', styles: { fontStyle: 'bold', halign: 'right' } },
    ]],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: [216, 216, 216],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: M },
    tableWidth: CW,
    showFoot: 'everyPage',
    tableLineWidth: 0,
  })

  return (doc.lastAutoTable?.finalY || y + 4) + 4
}

// ═══════════════════════════════════════════════════════════════════
// MONTHLY SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════

function drawMonthlySummary(doc, data, startY) {
  const y = drawSectionTitle(doc, startY, 'Monthly Summary')

  const md = data.monthlyData
  if (!md || md.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No monthly data available.', M, y + 4)
    return y + 10
  }

  let running = 0
  const rows = md.map(m => {
    const savings = m.income - m.expense
    running += savings
    return [
      getMonthName(m.month),
      fmt(m.income),
      fmt(m.expense),
      fmt(savings),
      running >= 0 ? fmt(running) : `(${fmt(Math.abs(running))})`,
    ]
  })

  doc.autoTable({
    startY: y + 2,
    head: [['Month', 'Income', 'Expense', 'Savings', 'Running Balance']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      textColor: [30, 30, 30],
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: [216, 216, 216],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 38 },
      2: { halign: 'right', cellWidth: 38 },
      3: { halign: 'right', cellWidth: 33 },
      4: { halign: 'right', cellWidth: 33 },
    },
    margin: { left: M, right: M },
    tableLineWidth: 0,
  })

  return (doc.lastAutoTable?.finalY || y + 4) + 4
}

// ═══════════════════════════════════════════════════════════════════
// TRADING REPORT
// ═══════════════════════════════════════════════════════════════════

function drawTradingReport(doc, data, startY) {
  const y = drawSectionTitle(doc, startY, 'Trading Report')

  const tradingDeposit = data.filtered
    .filter(t => t.type === 'expense' && t.category === 'trading_deposit')
    .reduce((s, t) => s + t.amount, 0)
  const tradingWithdrawal = data.filtered
    .filter(t => t.type === 'income' && t.category === 'trading_withdrawal')
    .reduce((s, t) => s + t.amount, 0)
  const tradingProfit = tradingWithdrawal - tradingDeposit

  if (tradingDeposit === 0 && tradingWithdrawal === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No trading activity in this period.', M, y + 4)
    return y + 10
  }

  const roi = tradingDeposit > 0 ? ((tradingProfit / tradingDeposit) * 100).toFixed(1) : 'N/A'

  const rows = [
    ['Trading Deposits', fmt(tradingDeposit)],
    ['Trading Withdrawals', fmt(tradingWithdrawal)],
    ['Trading Profit / Loss', fmt(tradingProfit)],
    ['ROI', `${roi}%`],
  ]

  const cardW = (CW - 3) / 2

  rows.forEach((r, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = M + col * (cardW + 3)
    const cy = y + row * 16

    doc.setFillColor(...BG_LIGHT)
    doc.roundedRect(x, cy, cardW, 13, 1.5, 1.5, 'F')

    doc.setFont(FONT, 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MED_GRAY)
    doc.text(r[0], x + 4, cy + 5)

    doc.setFont(FONT_BOLD, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(r[1], x + 4, cy + 11)
  })

  return y + rows.length / 2 * 16 + 4
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET ANALYSIS
// ═══════════════════════════════════════════════════════════════════

function drawBudgetAnalysis(doc, data, startY) {
  const y = drawSectionTitle(doc, startY, 'Budget Analysis')

  if (!data.budgets || data.budgets.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No budgets configured.', M, y + 4)
    return y + 10
  }

  const rows = data.budgets.map(b => {
    const used = b.spent || 0
    const limit = b.limit || 1
    const remaining = Math.max(0, limit - used)
    const pct = (used / limit) * 100
    const status = pct > 100 ? 'Over Budget' : pct > 80 ? 'Warning' : 'On Track'
    return [b.category || b.name || '', fmt(used), fmt(remaining), status]
  })

  doc.autoTable({
    startY: y + 2,
    head: [['Budget', 'Used', 'Remaining', 'Status']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: [216, 216, 216],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 35 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 30 },
    },
    margin: { left: M, right: M },
    tableLineWidth: 0,
  })

  return (doc.lastAutoTable?.finalY || y + 4) + 4
}

// ═══════════════════════════════════════════════════════════════════
// DEBT REPORT
// ═══════════════════════════════════════════════════════════════════

function drawDebtReport(doc, data, startY) {
  const y = drawSectionTitle(doc, startY, 'Debt Report')

  if (!data.debts || data.debts.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No debt entries.', M, y + 4)
    return y + 10
  }

  const borrowed = data.debts
    .filter(d => d.type === 'borrowed' && d.status === 'pending')
    .reduce((s, d) => s + (d.remainingAmount || 0), 0)
  const lent = data.debts
    .filter(d => d.type === 'lent' && d.status === 'pending')
    .reduce((s, d) => s + (d.remainingAmount || 0), 0)
  const collected = data.debts
    .filter(d => d.type === 'lent' && d.status === 'paid')
    .reduce((s, d) => s + (d.amount || 0), 0)
  const repaid = data.debts
    .filter(d => d.type === 'borrowed' && d.status === 'paid')
    .reduce((s, d) => s + (d.amount || 0), 0)

  const items = [
    ['Borrowed', fmt(borrowed)],
    ['Lent', fmt(lent)],
    ['Collected', fmt(collected)],
    ['Re-paid', fmt(repaid)],
    ['Net Outstanding', fmt(lent - borrowed)],
  ]

  const cardW = (CW - 3) / 2
  items.forEach((it, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = M + col * (cardW + 3)
    const cy = y + row * 16

    doc.setFillColor(...BG_LIGHT)
    doc.roundedRect(x, cy, cardW, 13, 1.5, 1.5, 'F')
    doc.setFont(FONT, 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MED_GRAY)
    doc.text(it[0], x + 4, cy + 5)
    doc.setFont(FONT_BOLD, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(it[1], x + 4, cy + 11)
  })

  return y + Math.ceil(items.length / 2) * 16 + 4
}

// ═══════════════════════════════════════════════════════════════════
// ASSETS & NET WORTH
// ═══════════════════════════════════════════════════════════════════

function drawAssetsReport(doc, data, startY) {
  const y = drawSectionTitle(doc, startY, 'Assets & Net Worth')

  if (!data.accounts || data.accounts.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No accounts configured.', M, y + 4)
    return y + 10
  }

  const byType = {}
  data.accounts.forEach(a => {
    const t = a.type || 'other'
    byType[t] = (byType[t] || 0) + (a.balance || 0)
  })

  const typeLabels = {
    cash: 'Cash',
    bank: 'Bank',
    wallet: 'Wallet',
    investment: 'Investment',
    trading: 'Trading',
    other: 'Other',
  }

  const totalAssets = Object.values(byType).reduce((s, v) => s + v, 0)
  const rows = Object.entries(byType).map(([type, balance]) => [
    typeLabels[type] || type,
    fmt(balance),
    totalAssets > 0 ? `${((balance / totalAssets) * 100).toFixed(1)}%` : '0%',
  ])
  rows.push([{ content: 'Net Worth', colSpan: 1, styles: { fontStyle: 'bold' } },
    { content: fmt(totalAssets), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: '100%', styles: { fontStyle: 'bold', halign: 'right' } },
  ])

  doc.autoTable({
    startY: y + 2,
    head: [['Asset Type', 'Balance', 'Allocation']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: [216, 216, 216],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 40 },
      2: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: M, right: M },
    tableLineWidth: 0,
  })

  return (doc.lastAutoTable?.finalY || y + 4) + 4
}

// ═══════════════════════════════════════════════════════════════════
// GRAYSCALE CATEGORY CHART
// ═══════════════════════════════════════════════════════════════════

function drawCategoryChart(doc, data, startY) {
  let y = drawSectionTitle(doc, startY, 'Expense by Category')

  const breakdown = data.expBreakdown || []
  if (breakdown.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No expense data for chart.', M, y + 4)
    return y + 10
  }

  const total = breakdown.reduce((s, c) => s + c.amount, 0) || 1
  const maxAmt = Math.max(...breakdown.map(c => c.amount), 1)
  const sorted = [...breakdown].sort((a, b) => b.amount - a.amount)
  const top = sorted.slice(0, 10)
  const barH = 8
  const gap = 3
  const labelW = 35
  const valW = 42
  const barMaxW = CW - labelW - valW - 6

  if (checkPageBreak(doc, top.length * (barH + gap) + 15)) {
    y = M + 5
  }

  doc.setFont(FONT, 'normal')
  doc.setFontSize(6)
  top.forEach((item, i) => {
    const cy = y + i * (barH + gap)
    const pct = (item.amount / total) * 100
    const bw = Math.max((item.amount / maxAmt) * barMaxW, 2)

    doc.setTextColor(...DARK_GRAY)
    doc.text(getCatLabel(item.category), M, cy + 5.5)

    doc.setFillColor(...CHART_GRAYS[i % CHART_GRAYS.length])
    doc.rect(M + labelW + 3, cy + 0.5, bw, barH - 1, 'F')

    doc.setDrawColor(...BORDER_LT)
    doc.setLineWidth(0.1)
    doc.rect(M + labelW + 3, cy + 0.5, bw, barH - 1, 'S')

    doc.setTextColor(...BLACK)
    doc.text(`${fmt(item.amount)}  (${pct.toFixed(1)}%)`, M + labelW + 5 + bw, cy + 5.5)
  })

  return y + top.length * (barH + gap) + 6
}

// ═══════════════════════════════════════════════════════════════════
// GRAYSCALE TREND CHART
// ═══════════════════════════════════════════════════════════════════

function drawTrendChart(doc, data, startY) {
  let y = drawSectionTitle(doc, startY, 'Income vs Expense Trend')

  const md = data.monthlyData
  if (!md || md.length < 2) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('Need at least 2 months of data for trend chart.', M, y + 4)
    return y + 10
  }

  const chartTop = y + 6
  const chartH = 45
  const chartW = CW
  const chartLeft = M
  const chartBottom = chartTop + chartH
  const count = md.length
  const allVals = md.flatMap(m => [m.income || 0, m.expense || 0])
  const maxVal = Math.max(...allVals, 1) * 1.15
  const barW = Math.min((chartW - (count - 1) * 5) / (count * 2 + 1), 10)
  const groupW = barW * 2 + 4
  const totalGroupW = count * groupW
  const offsetX = chartLeft + (chartW - totalGroupW) / 2

  if (checkPageBreak(doc, chartH + 20)) {
    return drawTrendChart(doc, data, M + 5)
  }

  doc.setFillColor(...BG_LIGHT)
  doc.rect(chartLeft, chartTop, chartW, chartH, 'F')

  doc.setDrawColor(...BORDER_LT)
  doc.setLineWidth(0.2)
  doc.line(chartLeft, chartBottom, chartLeft + chartW, chartBottom)

  md.forEach((m, i) => {
    const gx = offsetX + i * groupW
    const ih = ((m.income || 0) / maxVal) * chartH
    const eh = ((m.expense || 0) / maxVal) * chartH

    doc.setFillColor(...[80, 80, 80])
    doc.rect(gx, chartBottom - ih, barW, Math.max(ih, 0.5), 'F')

    doc.setFillColor(...[160, 160, 160])
    doc.rect(gx + barW + 4, chartBottom - eh, barW, Math.max(eh, 0.5), 'F')

    doc.setFont(FONT, 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...MED_GRAY)
    doc.text(getMonthName(m.month), gx + barW / 2 - 4, chartBottom + 4)
  })

  doc.setFont(FONT, 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...[80, 80, 80])
  doc.text('\u25A0 Income', PW - M - 42, chartTop + 3)
  doc.setTextColor(...[160, 160, 160])
  doc.text('\u25A0 Expense', PW - M - 12, chartTop + 3)

  for (let v = 0; v <= maxVal; v += Math.max(maxVal / 4, 1)) {
    const yPos = chartBottom - (v / maxVal) * chartH
    if (yPos >= chartTop + 2) {
      doc.setFont(FONT, 'normal')
      doc.setFontSize(5)
      doc.setTextColor(...MED_GRAY)
      doc.text(fmt(Math.round(v)), chartLeft - 2, yPos + 1.5, { align: 'right' })
    }
  }

  return chartBottom + 10
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION LEDGER —  full transaction history with pagination
// ═══════════════════════════════════════════════════════════════════

function drawTransactionLedger(doc, data, startY) {
  const y = drawSectionTitle(doc, startY, 'Transaction History')

  const txs = data.filtered || []
  if (txs.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MED_GRAY)
    doc.text('No transactions to display.', M, y + 4)
    return y + 10
  }

  const sorted = [...txs].sort((a, b) => a.date?.localeCompare?.(b.date) || 0)

  let running = 0
  const rows = sorted.map(t => {
    const amt = t.type === 'income' ? t.amount : -t.amount
    running += amt
    return [
      t.date || '',
      t.description || '',
      getCatLabel(t.category),
      t.account || '',
      t.type === 'income' ? 'Credit' : 'Debit',
      t.type === 'income' ? fmt(t.amount) : fmt(t.amount),
      running >= 0 ? fmt(running) : `(${fmt(Math.abs(running))})`,
    ]
  })

  doc.autoTable({
    startY: y + 2,
    head: [['Date', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Balance']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
      lineColor: [216, 216, 216],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 6,
      fontStyle: 'bold',
      cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24 },
      3: { cellWidth: 20 },
      4: { cellWidth: 16, halign: 'center' },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: M },
    tableWidth: CW,
    pageBreak: 'auto',
    tableLineWidth: 0,
  })

  return (doc.lastAutoTable?.finalY || y + 4) + 4
}

// ═══════════════════════════════════════════════════════════════════
// REPORT SUMMARY STATS PAGE
// ═══════════════════════════════════════════════════════════════════

function drawExportSummaryStats(doc, data) {
  doc.addPage()
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, PW, PH, 'F')

  let y = M + 5
  y = drawSectionTitle(doc, y, 'Report Statistics')

  const stats = [
    { label: 'Total Transactions', value: String(data.totalTxns) },
    { label: 'Total Income', value: fmt(data.totalIncome) },
    { label: 'Total Expense', value: fmt(data.totalExpense) },
    { label: 'Net Savings', value: fmt(data.savings) },
    { label: 'Savings Rate', value: data.savingsRate != null ? `${data.savingsRate.toFixed(1)}%` : 'N/A' },
    { label: 'Largest Income', value: fmt(data.largestIncome) },
    { label: 'Largest Expense', value: fmt(data.largestExpense) },
    { label: 'Top Category', value: data.mostUsedCategory },
    { label: 'Expense Categories', value: String(data.expBreakdown.length) },
  ]

  const cardW = (CW - 8) / 2
  stats.forEach((stat, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = M + col * (cardW + 8)
    let cy = y + row * 18

    if (cy + 18 > PH - M - 15) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
      cy = y + row * 18
    }

    doc.setFillColor(...BG_LIGHT)
    doc.roundedRect(x, cy, cardW, 14, 1.5, 1.5, 'F')
    doc.setFont(FONT, 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MED_GRAY)
    doc.text(stat.label, x + 5, cy + 5.5)
    doc.setFont(FONT_BOLD, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK)
    doc.text(stat.value, x + 5, cy + 12)
  })
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS LOGIC  —  buildReport (UNCHANGED from original)
// ═══════════════════════════════════════════════════════════════════

function buildReport(type, transactions, config) {
  let title = ''
  let periodLabel = ''
  let filtered = [...transactions]
  if (type === 'monthly') {
    const { month, year } = config
    title = `Monthly Report \u2014 ${getFullMonth(month)} ${year}`
    const range = getMonthDateRange(month, year)
    periodLabel = `Period: ${range.start} \u2014 ${range.end}`
    filtered = transactions.filter((t) => t.date >= range.start && t.date <= range.end)
  } else if (type === 'category') {
    const { month, year } = config
    title = `Category Report \u2014 ${getFullMonth(month)} ${year}`
    const range = getMonthDateRange(month, year)
    periodLabel = `Period: ${range.start} \u2014 ${range.end}`
    filtered = transactions.filter((t) => t.date >= range.start && t.date <= range.end)
  } else if (type === 'daterange') {
    const { dateFrom, dateTo } = config
    title = `Date Range Report`
    periodLabel = `Period: ${dateFrom} \u2014 ${dateTo}`
    filtered = transactions.filter((t) => t.date >= dateFrom && t.date <= dateTo)
  } else if (type === 'annual') {
    const { year } = config
    title = `Annual Summary \u2014 ${year}`
    periodLabel = `Year: ${year}`
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    filtered = transactions.filter((t) => t.date >= start && t.date <= end)
  } else if (type === 'custom') {
    const { dateFrom, dateTo, categoryId, month, year } = config
    title = config.title || 'Custom Report'
    periodLabel = config.periodLabel || ''
    if (dateFrom && dateTo) {
      filtered = transactions.filter((t) => t.date >= dateFrom && t.date <= dateTo)
    }
    if (categoryId) {
      filtered = filtered.filter((t) => t.category === categoryId)
    }
    if (month != null && year != null) {
      const range = getMonthDateRange(month, year)
      filtered = filtered.filter((t) => t.date >= range.start && t.date <= range.end)
    }
    if (!periodLabel) {
      const parts = []
      if (dateFrom && dateTo) parts.push(`${dateFrom} \u2014 ${dateTo}`)
      if (categoryId) {
        const catLabel = getCatLabel(categoryId)
        parts.push(`Category: ${catLabel}`)
      }
      periodLabel = parts.join(' | ') || 'All Transactions'
    }
  }
  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  const expBreakdown = groupBy(filtered.filter((t) => t.type === 'expense'), 'category')
    .map(([cat, txs]) => ({ category: cat, amount: txs.reduce((s, t) => s + t.amount, 0) }))
  const incItems = filtered.filter((t) => t.type === 'income')
  const expItems = filtered.filter((t) => t.type === 'expense')
  const largestExpense = expItems.length > 0 ? Math.max(...expItems.map((t) => t.amount)) : 0
  const largestIncome = incItems.length > 0 ? Math.max(...incItems.map((t) => t.amount)) : 0
  const catCounts = {}
  filtered.forEach((t) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1 })
  let mostUsedCategory = 'N/A'
  let maxCount = 0
  Object.entries(catCounts).forEach(([cat, cnt]) => {
    if (cnt > maxCount) { maxCount = cnt; mostUsedCategory = getCatLabel(cat) }
  })
  const recent = [...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)
  let monthlyData = []
  if (type === 'annual') {
    for (let m = 0; m < 12; m++) {
      const range = getMonthDateRange(m, config.year)
      const mTxns = transactions.filter((t) => t.date >= range.start && t.date <= range.end)
      monthlyData.push({
        month: m,
        income: mTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: mTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      })
    }
  } else {
    const allMonthData = {}
    filtered.forEach((t) => {
      const m = parseInt(t.date.split('-')[1], 10) - 1
      if (!allMonthData[m]) allMonthData[m] = { month: m, income: 0, expense: 0 }
      if (t.type === 'income') allMonthData[m].income += t.amount
      else allMonthData[m].expense += t.amount
    })
    monthlyData = Object.values(allMonthData).sort((a, b) => a.month - b.month)
  }
  return { title, periodLabel, filtered, totalIncome, totalExpense, savings, savingsRate, expBreakdown, monthlyData, largestExpense, largestIncome, mostUsedCategory, totalTxns: filtered.length, recentTransactions: recent }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PDF GENERATOR  —  orchestrates all sections
// ═══════════════════════════════════════════════════════════════════

function generatePDF(type, data, options) {
  const doc = new jsPDF('p', 'mm', 'a4')
  doc.setFont(FONT)

  const userName = options?.userName || ''
  const includeCharts = options?.includeCharts !== false
  const includeSummary = options?.includeSummary !== false

  // ── Cover Page ──
  drawCoverPage(doc, data.title, data.periodLabel, userName)

  // ── Content Page 2+ ──
  doc.addPage()
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, PW, PH, 'F')

  let y = M + 5

  // Executive Summary
  y = drawExecutiveSummary(doc, data, y)

  // Financial Health
  y = drawFinancialHealth(doc, data, y)

  // Charts (controlled by includeCharts)
  if (includeCharts) {
    if (data.expBreakdown.length > 0) {
      if (needsNewPage(doc, 60)) {
        finalizePages(doc)
        doc.addPage()
        doc.setFillColor(...WHITE)
        doc.rect(0, 0, PW, PH, 'F')
        y = M + 5
      }
      y = drawCategoryChart(doc, data, y)
    }

    if (data.monthlyData.length > 1) {
      if (needsNewPage(doc, 60)) {
        finalizePages(doc)
        doc.addPage()
        doc.setFillColor(...WHITE)
        doc.rect(0, 0, PW, PH, 'F')
        y = M + 5
      }
      y = drawTrendChart(doc, data, y)
    }
  }

  // Income Analysis
  if (needsNewPage(doc, 30)) {
    finalizePages(doc)
    doc.addPage()
    doc.setFillColor(...WHITE)
    doc.rect(0, 0, PW, PH, 'F')
    y = M + 5
  }
  y = drawIncomeAnalysis(doc, data, y)

  // Expense Analysis
  if (needsNewPage(doc, 30)) {
    finalizePages(doc)
    doc.addPage()
    doc.setFillColor(...WHITE)
    doc.rect(0, 0, PW, PH, 'F')
    y = M + 5
  }
  y = drawExpenseAnalysis(doc, data, y)

  // Monthly Summary
  if (data.monthlyData.length > 0) {
    if (needsNewPage(doc, 30)) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
    }
    y = drawMonthlySummary(doc, data, y)
  }

  // Trading Report
  if (needsNewPage(doc, 25)) {
    finalizePages(doc)
    doc.addPage()
    doc.setFillColor(...WHITE)
    doc.rect(0, 0, PW, PH, 'F')
    y = M + 5
  }
  y = drawTradingReport(doc, data, y)

  // Budget Analysis
  if (data.budgets && data.budgets.length > 0) {
    if (needsNewPage(doc, 25)) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
    }
    y = drawBudgetAnalysis(doc, data, y)
  }

  // Debt Report
  if (data.debts && data.debts.length > 0) {
    if (needsNewPage(doc, 25)) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
    }
    y = drawDebtReport(doc, data, y)
  }

  // Assets
  if (data.accounts && data.accounts.length > 0) {
    if (needsNewPage(doc, 25)) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
      y = M + 5
    }
    y = drawAssetsReport(doc, data, y)
  }

  // Transaction History
  if (data.filtered && data.filtered.length > 0) {
    if (needsNewPage(doc, 20)) {
      finalizePages(doc)
      doc.addPage()
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, PW, PH, 'F')
    }
    drawTransactionLedger(doc, data, y)
  }

  // Summary stats page (controlled by includeSummary)
  if (includeSummary) {
    drawExportSummaryStats(doc, data)
  }

  // ── Finalize footers on all pages (skip cover = page 1) ──
  finalizePages(doc, 2)

  let blob
  try { blob = doc.output('blob') } catch { blob = null }
  const dataUri = doc.output('datauristring')
  return { blob, dataUri, doc, pageCount: doc.internal.getNumberOfPages() }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS  —  public API (signatures UNCHANGED)
// ═══════════════════════════════════════════════════════════════════

export function generateMonthlyReport(transactions, monthIndex, year) {
  const data = buildReport('monthly', transactions, { month: monthIndex, year })
  return generatePDF('monthly', data)
}

export function generateCategoryReport(transactions, monthIndex, year) {
  const data = buildReport('category', transactions, { month: monthIndex, year })
  return generatePDF('category', data)
}

export function generateDateRangeReport(transactions, dateFrom, dateTo) {
  const data = buildReport('daterange', transactions, { dateFrom, dateTo })
  return generatePDF('daterange', data)
}

export function generateAnnualReport(transactions, year) {
  const data = buildReport('annual', transactions, { year })
  return generatePDF('annual', data)
}

export function generateCustomReport(transactions, options = {}) {
  const data = buildReport('custom', transactions, {
    month: options.month || null,
    year: options.year || null,
    dateFrom: options.dateFrom || null,
    dateTo: options.dateTo || null,
    categoryId: options.category || null,
    title: options.title || 'Custom Report',
    periodLabel: options.periodLabel || '',
  })

  return generatePDF('custom', data, options)
}
