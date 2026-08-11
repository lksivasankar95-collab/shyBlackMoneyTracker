import { describe, it, expect } from 'vitest'

const mod = await import('../utils/reviewEngine')

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function isoDaysAhead(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

describe('smart alerts center', () => {
  it('alerts on overdue and upcoming bills', () => {
    const bills = [
      { name: 'Electricity', amount: 1500, dueDate: isoDaysAgo(2), paidDates: [], active: true },
      { name: 'Internet', amount: 999, dueDate: isoDaysAhead(3), paidDates: [], active: true },
      { name: 'Paid Bill', amount: 500, dueDate: isoDaysAgo(1), paidDates: [isoDaysAgo(1)], active: true },
      { name: 'Far Bill', amount: 500, dueDate: isoDaysAhead(40), paidDates: [], active: true },
    ]
    const alerts = mod.getSmartAlerts([], [], [], [], [], [], { bills })
    const billAlerts = alerts.filter((a) => a.type === 'bill')
    expect(billAlerts).toHaveLength(2)
    expect(billAlerts[0].severity).toBe('alert')
    expect(billAlerts[1].severity).toBe('warning')
  })

  it('alerts on overdue and due-soon debts', () => {
    const debts = [
      { id: '1', personName: 'Rahul', status: 'active', currentBalance: 5000, dueDate: isoDaysAgo(4) },
      { id: '2', personName: 'Priya', status: 'active', currentBalance: 2000, dueDate: isoDaysAhead(5) },
      { id: '3', personName: 'Settled', status: 'settled', currentBalance: 0, dueDate: isoDaysAgo(1) },
    ]
    const alerts = mod.getSmartAlerts([], [], [], debts, [], [], {})
    const debtAlerts = alerts.filter((a) => a.type === 'debt')
    expect(debtAlerts).toHaveLength(2)
    expect(debtAlerts.some((a) => a.severity === 'alert' && a.message.includes('Rahul'))).toBe(true)
    expect(debtAlerts.some((a) => a.severity === 'warning' && a.message.includes('Priya'))).toBe(true)
  })

  it('alerts on recurring items due today', () => {
    const recurring = [
      { note: 'Netflix', amount: 199, frequency: 'monthly', nextDate: isoDaysAgo(0), active: true, paused: false },
      { note: 'Future', amount: 100, frequency: 'monthly', nextDate: isoDaysAhead(10), active: true, paused: false },
      { note: 'Paused', amount: 100, frequency: 'monthly', nextDate: isoDaysAgo(0), active: true, paused: true },
    ]
    const alerts = mod.getSmartAlerts([], [], [], [], [], recurring, {})
    const recAlerts = alerts.filter((a) => a.type === 'recurring')
    expect(recAlerts).toHaveLength(1)
    expect(recAlerts[0].message).toContain('Netflix')
  })

  it('alerts on duplicate transactions and unhealthy backup', () => {
    const alerts = mod.getSmartAlerts([{ date: '2025-01-01', amount: 10, type: 'expense' }], [], [], [], [], [], {
      duplicateCount: 3,
      backupHealth: { status: 'degraded', message: 'Last backup 40 days ago' },
    })
    expect(alerts.some((a) => a.type === 'duplicate' && a.message.includes('3'))).toBe(true)
    expect(alerts.some((a) => a.type === 'backup' && a.severity === 'warning')).toBe(true)
  })

  it('does not warn on healthy backup', () => {
    const alerts = mod.getSmartAlerts([], [], [], [], [], [], {
      backupHealth: { status: 'healthy', message: 'All good' },
    })
    expect(alerts.some((a) => a.type === 'backup')).toBe(false)
  })

  it('keeps existing EMI and goal alerts working', () => {
    const emis = [{ id: 'e1', loanName: 'Car', status: 'active', remainingAmount: 100000, nextDate: isoDaysAhead(3) }]
    const goals = [{ name: 'Trip', target: 100000, saved: 10000, targetDate: isoDaysAhead(20) }]
    const alerts = mod.getSmartAlerts([], [], emis, [], goals, [], {})
    expect(alerts.some((a) => a.type === 'emi')).toBe(true)
    expect(alerts.some((a) => a.type === 'goal')).toBe(true)
  })
})
