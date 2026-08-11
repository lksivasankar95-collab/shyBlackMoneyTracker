import { describe, it, expect } from 'vitest'
import { parseVoiceCommand } from '../utils/voiceEntry'

describe('voice entry', () => {
  it('parses simple expense commands', () => {
    const result = parseVoiceCommand('coffee 150')
    expect(result).toMatchObject({ type: 'expense', amount: 150, note: 'coffee' })
  })

  it('parses expense with spent keyword and note', () => {
    const result = parseVoiceCommand('spent 200 on petrol')
    expect(result).toMatchObject({ type: 'expense', amount: 200, note: 'petrol' })
  })

  it('parses income commands', () => {
    const result = parseVoiceCommand('earned 5000 salary')
    expect(result).toMatchObject({ type: 'income', amount: 5000, note: 'salary' })
    expect(parseVoiceCommand('income 1000').type).toBe('income')
  })

  it('parses rupee symbol amounts', () => {
    const result = parseVoiceCommand('₹300 lunch at starbucks')
    expect(result).toMatchObject({ type: 'expense', amount: 300, note: 'lunch starbucks' })
  })

  it('parses decimal and thousands-format amounts', () => {
    expect(parseVoiceCommand('paid 149.50 for electricity').amount).toBe(149.5)
    expect(parseVoiceCommand('received 1,00,000 as salary').amount).toBe(100000)
  })

  it('maps yesterday to the previous day', () => {
    const result = parseVoiceCommand('spent 80 on chai yesterday')
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    expect(result.date).toBe(yesterday)
  })

  it('keeps today as default date', () => {
    const result = parseVoiceCommand('groceries 700')
    expect(result.date).toBe(new Date().toISOString().split('T')[0])
  })

  it('rejects text without an amount', () => {
    expect(parseVoiceCommand('just some text')).toBeNull()
    expect(parseVoiceCommand('')).toBeNull()
  })

  it('falls back to expense when direction is ambiguous', () => {
    expect(parseVoiceCommand('dinner 500').type).toBe('expense')
  })
})