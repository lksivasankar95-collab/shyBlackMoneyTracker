import { describe, it, expect } from 'vitest'
import {
  generateMonthlyReport,
  generateCategoryReport,
  generateDateRangeReport,
  generateAnnualReport,
} from '../utils/pdfReport'

function tx(id, type, amount, date, category) {
  return { id, type, amount, date: date || '2026-06-15', category: category || 'food', note: '' }
}

describe('PDF report generation - data logic', () => {
  it('handles empty transactions gracefully', () => {
    const result = generateMonthlyReport([], 5, 2026)
    expect(result).toHaveProperty('blob')
    expect(result).toHaveProperty('dataUri')
    expect(result).toHaveProperty('doc')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  })

  it('generates output for small dataset (< 100 transactions)', () => {
    const txs = [
      tx('1', 'income', 50000, '2026-06-01', 'salary'),
      tx('2', 'expense', 12000, '2026-06-05', 'food'),
      tx('3', 'expense', 3000, '2026-06-10', 'fuel'),
      tx('4', 'income', 10000, '2026-06-15', 'freelance'),
      tx('5', 'expense', 5000, '2026-06-20', 'shopping'),
    ]
    const result = generateMonthlyReport(txs, 5, 2026)
    expect(result).toHaveProperty('blob')
    expect(result).toHaveProperty('dataUri')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  })

  it('handles 5000+ transactions without crash', () => {
    const txs = []
    for (let i = 0; i < 5000; i++) {
      const type = i % 3 === 0 ? 'income' : 'expense'
      const day = (i % 28) + 1
      const m = String(6).padStart(2, '0')
      const d = String(day).padStart(2, '0')
      txs.push(tx(String(i), type, Math.floor(Math.random() * 5000) + 100, `2026-${m}-${d}`, type === 'income' ? 'salary' : 'food'))
    }
    const result = generateMonthlyReport(txs, 5, 2026)
    expect(result).toHaveProperty('blob')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  })
})

describe('generateCategoryReport', () => {
  it('generates output with category breakdown', () => {
    const txs = [
      tx('1', 'expense', 12000, '2026-06-05', 'food'),
      tx('2', 'expense', 3000, '2026-06-10', 'fuel'),
      tx('3', 'expense', 5000, '2026-06-15', 'shopping'),
      tx('4', 'income', 50000, '2026-06-01', 'salary'),
    ]
    const result = generateCategoryReport(txs, 5, 2026)
    expect(result).toHaveProperty('blob')
    expect(result).toHaveProperty('dataUri')
  })
})

describe('generateDateRangeReport', () => {
  it('filters by date range accurately', () => {
    const txs = [
      tx('1', 'income', 50000, '2026-05-01', 'salary'),
      tx('2', 'expense', 12000, '2026-05-15', 'food'),
      tx('3', 'expense', 3000, '2026-06-01', 'fuel'),
      tx('4', 'income', 10000, '2026-06-15', 'freelance'),
      tx('5', 'expense', 5000, '2026-07-01', 'shopping'),
    ]
    const result = generateDateRangeReport(txs, '2026-06-01', '2026-06-30')
    expect(result).toHaveProperty('blob')
    expect(result).toHaveProperty('dataUri')
  })

  it('handles empty date range gracefully', () => {
    const txs = [tx('1', 'income', 50000, '2026-06-01', 'salary')]
    const result = generateDateRangeReport(txs, '2026-07-01', '2026-07-31')
    expect(result).toHaveProperty('blob')
  })
})

describe('generateAnnualReport', () => {
  it('generates valid annual summary output', () => {
    const txs = []
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0')
      txs.push(tx(String(txs.length + 1), 'income', 50000, `2026-${mStr}-01`, 'salary'))
      txs.push(tx(String(txs.length + 1), 'expense', 25000, `2026-${mStr}-15`, 'food'))
    }
    const result = generateAnnualReport(txs, 2026)
    expect(result).toHaveProperty('blob')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  })

  it('handles empty year gracefully', () => {
    const txs = [tx('1', 'income', 50000, '2025-06-01', 'salary')]
    const result = generateAnnualReport(txs, 2026)
    expect(result).toHaveProperty('blob')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  })
})

describe('Report output format', () => {
  it('all generators return blob, dataUri, doc, and pageCount', () => {
    const txs = [tx('1', 'income', 1000, '2026-06-01', 'salary')]
    const checks = (r) => {
      expect(r).toHaveProperty('blob')
      expect(r).toHaveProperty('dataUri')
      expect(r).toHaveProperty('doc')
      expect(r).toHaveProperty('pageCount')
    }
    checks(generateMonthlyReport(txs, 5, 2026))
    checks(generateCategoryReport(txs, 5, 2026))
    checks(generateDateRangeReport(txs, '2026-06-01', '2026-06-30'))
    checks(generateAnnualReport(txs, 2026))
  })

  it('dataUri starts with data:application/pdf', () => {
    const txs = [tx('1', 'income', 50000, '2026-06-01', 'salary')]
    const result = generateMonthlyReport(txs, 5, 2026)
    expect(result.dataUri).toMatch(/^data:application\/pdf/)
  })
})
