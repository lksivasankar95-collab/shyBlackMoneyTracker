import { describe, it, expect } from 'vitest'

const mod = await import('../utils/pdfOcr')

describe('pdf OCR decision logic', () => {
  it('flags empty or tiny extracted text for OCR', () => {
    expect(mod.shouldOcrPdf('')).toBe(true)
    expect(mod.shouldOcrPdf('   ')).toBe(true)
    expect(mod.shouldOcrPdf('small snippet')).toBe(true)
  })

  it('accepts real statement text with currency amounts', () => {
    const text = [
      '01/04/2024 UPI/ZOMATO PAYMENTS 250.00 45,250.00',
      '02/04/2024 NEFT INWARD SALARY CR 45,000.00 90,250.00',
      '03/04/2024 ATM CASH WITHDRAWAL 2,000.00 88,250.00',
    ].join('\n')
    expect(mod.shouldOcrPdf(text)).toBe(false)
  })

  it('flags long text without any decimal amounts (scanned page debris)', () => {
    const longNoise = 'Lorem ipsum dolor sit amet '.repeat(20)
    expect(mod.shouldOcrPdf(longNoise)).toBe(true)
  })

  it('exposes the OCR pipeline functions', () => {
    expect(typeof mod.ocrPdfPages).toBe('function')
    expect(typeof mod.extractPdfWithOcrFallback).toBe('function')
  })
})
