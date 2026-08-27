export function getBudgetPace(budgets = {}, transactions = []) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`

  const spentByCategory = {}
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.date || !tx.date.startsWith(prefix)) continue
    const cat = tx.category || 'other_expense'
    spentByCategory[cat] = (spentByCategory[cat] || 0) + (tx.amount || 0)
  }

  const pace = []
  for (const [category, budget] of Object.entries(budgets)) {
    const limit = budget?.limit
    if (!limit || limit <= 0) continue
    const spent = Math.round(spentByCategory[category] || 0)
    const expected = Math.round((limit * dayOfMonth) / daysInMonth)
    const pctSpent = limit > 0 ? Math.round((spent / limit) * 100) : 0
    const pacePct = expected > 0 ? Math.round((spent / expected) * 100) : 0

    let status = 'on_track'
    if (spent === 0) status = 'unused'
    else if (spent >= limit) status = 'breached'
    else if (pacePct >= 120) status = 'ahead'
    else if (pacePct <= 80) status = 'behind'

    pace.push({ category, limit, spent, expected, pctSpent, pacePct, status })
  }

  pace.sort((a, b) => b.pacePct - a.pacePct)

  return {
    pace,
    summary: {
      breached: pace.filter((p) => p.status === 'breached').length,
      ahead: pace.filter((p) => p.status === 'ahead').length,
      onTrack: pace.filter((p) => p.status === 'on_track').length,
      behind: pace.filter((p) => p.status === 'behind').length,
      total: pace.length,
    },
  }
}