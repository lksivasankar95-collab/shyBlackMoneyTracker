export { buildIndexes, getMonthlySummaryFromIndex, getCategoryBreakdownFromIndex, getDailyExpenseFromIndex, getPeopleFromIndex } from './indexer'

export function buildFullSearchIndex(allData) {
  const results = {
    transactions: [],
    budgets: [],
    emis: [],
    goals: [],
    wealthAssets: [],
    receipts: [],
    recurring: [],
    debts: [],
  }

  for (const tx of allData.transactions || []) {
    const tokens = [
      tx.note, tx.category, tx.id,
      tx.person?.name, tx.paymentMethod, tx.source,
      tx.account,
      ...(tx.tags || []),
    ].filter(Boolean).map((s) => s.toLowerCase())
    results.transactions.push({ id: tx.id, tokens, date: tx.date, amount: tx.amount, type: tx.type })
  }

  for (const budget of allData.budgetsV2 || []) {
    const tokens = [budget.category, budget.period, budget.id].filter(Boolean).map((s) => s.toLowerCase())
    results.budgets.push({ id: budget.id, tokens, category: budget.category, limit: budget.limit, spent: budget.spent })
  }

  for (const emi of allData.emis || []) {
    const tokens = [emi.name, emi.loanName, emi.lender, emi.lenderName, emi.loanType, emi.id].filter(Boolean).map((s) => s.toLowerCase())
    results.emis.push({ id: emi.id, tokens, name: emi.name || emi.loanName, amount: emi.emiAmount || emi.amount, remaining: emi.remainingAmount })
  }

  for (const goal of allData.goals || []) {
    const tokens = [goal.name, goal.id].filter(Boolean).map((s) => s.toLowerCase())
    results.goals.push({ id: goal.id, tokens, name: goal.name, target: goal.target, saved: goal.saved })
  }

  for (const asset of allData.wealthAssets || []) {
    const tokens = [asset.assetName, asset.assetType, asset.id].filter(Boolean).map((s) => s.toLowerCase())
    results.wealthAssets.push({ id: asset.id, tokens, name: asset.assetName, type: asset.assetType, value: asset.currentValue })
  }

  for (const receipt of allData.receipts || []) {
    const tokens = [receipt.merchant, receipt.category, receipt.id, receipt.notes].filter(Boolean).map((s) => s.toLowerCase())
    results.receipts.push({ id: receipt.id, tokens, merchant: receipt.merchant, amount: receipt.amount, date: receipt.date })
  }

  for (const rec of allData.recurring || []) {
    const tokens = [rec.note, rec.category, rec.id, rec.frequency].filter(Boolean).map((s) => s.toLowerCase())
    results.recurring.push({ id: rec.id, tokens, note: rec.note, amount: rec.amount, frequency: rec.frequency, type: rec.type })
  }

  for (const debt of allData.debts || []) {
    const tokens = [debt.personName, debt.id, debt.notes, debt.type].filter(Boolean).map((s) => s.toLowerCase())
    results.debts.push({ id: debt.id, tokens, person: debt.personName, amount: debt.originalAmount || debt.amount, remaining: debt.currentBalance ?? debt.remainingAmount })
  }

  return results
}

export function searchFullIndex(searchIndex, query) {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase().trim()
  const results = []

  for (const [entity, items] of Object.entries(searchIndex)) {
    for (const item of items) {
      const match = item.tokens.some((token) => token.includes(q))
      if (match) {
        results.push({ entity, ...item })
      }
    }
  }

  results.sort((a, b) => {
    const aExact = a.tokens?.some((t) => t === q) ? 1 : 0
    const bExact = b.tokens?.some((t) => t === q) ? 1 : 0
    if (aExact !== bExact) return bExact - aExact
    return 0
  })

  return results
}

export function getEntityCounts(searchIndex) {
  const counts = {}
  for (const [entity, items] of Object.entries(searchIndex)) {
    counts[entity] = items.length
  }
  return counts
}
