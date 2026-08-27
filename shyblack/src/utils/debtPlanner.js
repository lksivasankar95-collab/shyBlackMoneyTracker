import { EMI_STATUS } from './emi'

function isOpenEmi(emi) {
  if (!emi) return false
  return emi.status === EMI_STATUS.ACTIVE || emi.status === 'active' || emi.status === undefined
}

export function getDebtPayoffPlan({ debts = [], emis = [] }) {
  const structured = (emis || [])
    .filter(isOpenEmi)
    .map((emi) => {
      const remaining = emi.remainingAmount ?? emi.principalAmount ?? 0
      const monthsLeft = emi.remainingMonths ?? 0
      const monthly = emi.emiAmount ?? 0
      const totalPayments = monthly * monthsLeft
      const interestRemaining = Math.max(0, totalPayments - remaining)
      return {
        id: emi.id,
        kind: 'emi',
        name: emi.loanName || emi.name || 'Loan',
        remaining,
        rate: emi.interestRate ?? 0,
        monthsLeft,
        monthlyMin: monthly,
        totalPayments: Math.round(totalPayments),
        interestRemaining: Math.round(interestRemaining),
        projectedPayoffDate: monthsLeft > 0 ? emi.nextDueDate : null,
      }
    })
    .sort((a, b) => b.rate - a.rate)

  const borrowed = (debts || []).filter((d) => d.type === 'borrowed' && d.status !== 'settled' && d.status !== 'paid' && d.status !== 'closed')
    .map((d) => ({
      id: d.id,
      kind: 'debt',
      name: d.personName || 'Debt',
      remaining: d.remainingAmount ?? d.currentBalance ?? d.amount ?? 0,
      rate: 0,
      monthsLeft: null,
      monthlyMin: 0,
      dueDate: d.dueDate || null,
    }))

  const avalanche = [...structured].sort((a, b) => b.rate - a.rate || a.remaining - b.remaining)
  const snowball = [...structured].sort((a, b) => a.remaining - b.remaining || b.rate - a.rate)

  return {
    structured,
    borrowed,
    avalanche,
    snowball,
    totalStructuredRemaining: Math.round(structured.reduce((s, i) => s + i.remaining, 0)),
    totalBorrowedOutstanding: Math.round(borrowed.reduce((s, i) => s + i.remaining, 0)),
    totalInterestRemaining: Math.round(structured.reduce((s, i) => s + i.interestRemaining, 0)),
    maxMonthsToPayoff: structured.reduce((s, i) => Math.max(s, i.monthsLeft || 0), 0),
  }
}