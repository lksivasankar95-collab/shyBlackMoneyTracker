const SIP_STORAGE_KEY = 'sip_calculations'
const MAX_SAVED = 20

export function calculateSIP(monthlyInvestment, annualReturnRate, totalMonths) {
  const i = annualReturnRate / 12 / 100
  const n = totalMonths
  let maturityValue
  if (i === 0) {
    maturityValue = monthlyInvestment * n
  } else {
    maturityValue = monthlyInvestment * (((Math.pow(1 + i, n) - 1) / i) * (1 + i))
  }
  const totalInvested = monthlyInvestment * n
  const estimatedReturns = maturityValue - totalInvested
  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    estimatedReturns: Math.round(estimatedReturns * 100) / 100,
    maturityValue: Math.round(maturityValue * 100) / 100,
  }
}

export function getYearwiseBreakdown(monthlyInvestment, annualReturnRate, totalMonths) {
  const i = annualReturnRate / 12 / 100
  const totalYears = Math.ceil(totalMonths / 12)
  const rows = []
  for (let y = 1; y <= totalYears; y++) {
    const n = Math.min(y * 12, totalMonths)
    let estimatedValue
    if (i === 0) {
      estimatedValue = monthlyInvestment * n
    } else {
      estimatedValue = monthlyInvestment * (((Math.pow(1 + i, n) - 1) / i) * (1 + i))
    }
    const totalInvested = monthlyInvestment * n
    rows.push({
      year: y,
      totalInvested: Math.round(totalInvested),
      estimatedValue: Math.round(estimatedValue),
      profit: Math.round(estimatedValue - totalInvested),
    })
  }
  return rows
}

export function getSavedSIPs() {
  try {
    return JSON.parse(localStorage.getItem(SIP_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveSIPCalculation(data) {
  const existing = getSavedSIPs()
  const entry = { ...data, id: Date.now().toString(), savedAt: new Date().toISOString() }
  const updated = [entry, ...existing].slice(0, MAX_SAVED)
  localStorage.setItem(SIP_STORAGE_KEY, JSON.stringify(updated))
  return entry
}

export function deleteSIPCalculation(id) {
  const existing = getSavedSIPs()
  localStorage.setItem(SIP_STORAGE_KEY, JSON.stringify(existing.filter((s) => s.id !== id)))
}
