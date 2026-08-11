import { describe, it, expect, vi } from 'vitest'

vi.mock('../utils/safeStorage', () => ({
  safeStorage: { get: () => null, getRaw: () => null, set: () => true, remove: () => true, clear: () => {} },
  STORAGE_KEYS: {},
}))

const mod = await import('../utils/statementImport')

describe('statement import', () => {
  it('parses individual UPI SMS texts', () => {
    const sms = [
      '₹250.00 debited from SBI a/c XX1234 via UPI. UPI: 9012345678@ybl. Ref: 412038493020. Note: Zomato.',
      'Rs.45,000.00 credited to HDFC Bank A/c XX5678 via UPI from SALARY. UTR: 531234567890.',
    ].join('\n')
    const result = mod.parseUpiSms(sms)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ type: 'expense', amount: 250, note: 'Zomato' })
    expect(result[0].bank).toContain('SBI')
    expect(result[1].type).toBe('income')
    expect(result[1].amount).toBe(45000)
  })

  it('ignores non-UPI SMS', () => {
    expect(mod.parseUpiSms('Your OTP for login is 482913. Do not share.')).toEqual([])
  })

  it('parses dates embedded in SMS only when present', () => {
    const withDate = mod.parseSingleUpiMessage('20/12/2025 paid ₹99.00 via UPI to Netflix. Note: subscription.')
    expect(withDate.date).toBe('2025-12-20')
    const noDate = mod.parseSingleUpiMessage('₹50 spent via UPI at Chai Point.')
    expect(noDate.date).toBeNull()
  })

  it('parses Android SMS backup XML with date attributes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<smses>
  <sms protocol="0" date="1766188800000" type="1" body="Rs.120.00 debited from ICICI Bank A/c XX9090 via UPI. Ref: 9911. Note: Swiggy."/>
  <sms protocol="0" date="1766275200000" type="1" body="OTP sent: 4481"/>
  <sms protocol="0" date="1766361600000" type="1" body="Received Rs.5,000.00 credited to Kotak A/c via UPI."/>
</smses>`
    const result = mod.parseSmsBackupXml(xml, { fallbackDate: '2025-12-31' })
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2025-12-20')
    expect(result[0].amount).toBe(120)
    expect(result[1].date).toBe('2025-12-22')
    expect(result[1].type).toBe('income')
  })

  it('parses bank statement text with withdrawal/deposit columns', () => {
    const text = [
      'Date | Narration | Withdrawal | Deposit | Balance',
      '01/04/2024 UPI/ZOMATO PAYMENTS 250.00 45,250.00',
      '02/04/2024 NEFT INWARD SALARY CR 45,000.00 90,250.00',
      '03/04/2024 ATM CASH WITHDRAWAL 2,000.00 88,250.00',
    ].join('\n')
    const result = mod.parseBankStatementText(text)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ type: 'expense', amount: 250, date: '2024-04-01' })
    expect(result[0].paymentMethod).toBe('upi')
    expect(result[1].type).toBe('income')
    expect(result[1].amount).toBe(45000)
    expect(result[2].type).toBe('expense')
    expect(result[2].amount).toBe(2000)
  })

  it('dedupes against existing transactions', () => {
    const existing = [{ date: '2024-04-01', amount: 250, type: 'expense', note: 'UPI/ZOMATO PAYMENTS' }]
    const fresh = [
      { type: 'expense', amount: 250, date: '2024-04-01', note: 'UPI/ZOMATO PAYMENTS', source: 'upi_sms' },
      { type: 'income', amount: 900, date: '2024-04-02', note: 'Refund', source: 'upi_sms' },
    ]
    const result = mod.dedupeStatementTransactions(fresh, existing)
    expect(result.result).toHaveLength(1)
    expect(result.duplicates).toBe(1)
  })

  it('normalizes transactions with defaults', () => {
    const norm = mod.normalizeStatementTransaction(
      { type: 'income', amount: 500, note: 'Cashback', source: 'upi_sms' },
      { category: 'other_income' },
    )
    expect(norm.type).toBe('income')
    expect(norm.category).toBe('other_income')
    expect(norm.date).toBeTruthy()
    expect(norm.source).toBe('upi_sms')
  })
})