import { ALL_CATEGORIES, PAYMENT_METHODS } from './constants'
import { formatCurrency } from './helpers'
import { isOpenDebt } from './debts'

const GROUP_ORDER = ['today', 'yesterday', 'thisWeek', 'older']

const GROUP_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  older: 'Older',
}

const ENTRY_STYLES = {
  income: { icon: 'ArrowUpCircle', bg: 'bg-neon/10', text: 'text-neon', ring: 'ring-neon/20' },
  expense: { icon: 'ArrowDownCircle', bg: 'bg-red-500/10', text: 'text-red-400', ring: 'ring-red-500/20' },
  lent: { icon: 'ArrowUpRight', bg: 'bg-green-500/10', text: 'text-green-400', ring: 'ring-green-500/20' },
  borrowed: { icon: 'ArrowDownLeft', bg: 'bg-orange-500/10', text: 'text-orange-400', ring: 'ring-orange-500/20' },
  debt_paid: { icon: 'CheckCircle2', bg: 'bg-neon/10', text: 'text-neon', ring: 'ring-neon/20' },
  emi_paid: { icon: 'CheckCircle2', bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  document_added: { icon: 'FileText', bg: 'bg-neon/10', text: 'text-neon', ring: 'ring-neon/20' },
  goal_completed: { icon: 'Award', bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/20' },
  payment_added: { icon: 'ArrowDownLeft', bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20' },
}

function getGroupKey(timestamp) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDate = new Date(timestamp)
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const diffDays = Math.round((todayStart - eventDay) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return 'thisWeek'
  return 'older'
}

function getEntryStyle(type, purpose) {
  const key = purpose || type
  return ENTRY_STYLES[key] || ENTRY_STYLES.expense
}

function buildTransactionEntry(tx) {
  const cat = ALL_CATEGORIES.find((c) => c.id === tx.category)
  const purpose = tx.transactionPurpose || (tx.type === 'income' ? 'income' : 'expense')
  const style = getEntryStyle(tx.type, purpose)

  const subtitleParts = []
  if (tx.person?.name) {
    subtitleParts.push(tx.type === 'income' ? `from ${tx.person.name}` : `to ${tx.person.name}`)
  }
  if (tx.paymentMethod) {
    const method = PAYMENT_METHODS.find((m) => m.id === tx.paymentMethod)
    subtitleParts.push(`via ${method?.label || tx.paymentMethod}`)
  }
  if (tx.note) subtitleParts.push(tx.note)
  if (subtitleParts.length === 0) subtitleParts.push(cat?.label || '')

  return {
    id: `tx-${tx.id}`,
    type: 'transaction',
    sourceType: purpose,
    title: cat?.label || 'Unknown',
    subtitle: subtitleParts.join(' · '),
    amount: tx.type === 'income' ? tx.amount : -tx.amount,
    absAmount: tx.amount,
    timestamp: tx.createdAt || new Date(tx.date).getTime(),
    style,
    isOverdue: false,
    isLarge: false,
    data: tx,
  }
}

function buildDebtEntry(debt) {
  const isPaid = !isOpenDebt(debt)
  const styleKey = isPaid ? 'debt_paid' : debt.type
  const style = ENTRY_STYLES[styleKey] || ENTRY_STYLES.borrowed
  const isOverdue = !isPaid && debt.dueDate && new Date(debt.dueDate) < new Date()

  const subtitleParts = []
  if (isPaid) {
    subtitleParts.push('Fully repaid')
  } else {
    subtitleParts.push(`₹${(debt.amount).toLocaleString('en-IN')}`)
    if (debt.remainingAmount < debt.amount && debt.remainingAmount > 0) {
      subtitleParts.push(`${Math.round((1 - debt.remainingAmount / debt.amount) * 100)}% repaid`)
    }
    if (isOverdue) subtitleParts.push('Overdue')
  }

  return {
    id: `debt-${debt.id}`,
    type: 'debt',
    sourceType: debt.type,
    title: debt.personName,
    subtitle: subtitleParts.join(' · '),
    amount: debt.type === 'lent' ? -debt.amount : debt.amount,
    absAmount: debt.amount,
    timestamp: debt.createdAt,
    style,
    isOverdue,
    isLarge: false,
    data: debt,
  }
}

export function buildTimeline(transactions, debts, emis, documents, goals) {
  const entries = []

  transactions.forEach((tx) => {
    if (!tx.createdAt) return
    entries.push(buildTransactionEntry(tx))
  })

  debts.forEach((debt) => {
    if (!debt.createdAt) return
    entries.push(buildDebtEntry(debt))

    if (debt.payments && debt.payments.length > 0) {
      debt.payments.forEach((p, i) => {
        const ts = p.createdAt || p.paidAt || Date.now()
        entries.push({
          id: `payment-${debt.id}-${i}`,
          type: 'payment',
          sourceType: 'payment_added',
          title: `Payment to ${debt.personName}`,
          subtitle: formatCurrency(p.amount) + (p.notes ? ` · ${p.notes}` : ''),
          amount: -p.amount,
          absAmount: p.amount,
          timestamp: ts,
          style: ENTRY_STYLES.payment_added,
          isOverdue: false,
          isLarge: false,
          data: { ...p, ledgerId: debt.id, personName: debt.personName },
        })
      })
    }
  })

  if (emis) {
    emis.forEach((emi) => {
      if (emi.paymentHistory && emi.paymentHistory.length > 0) {
        emi.paymentHistory.forEach((p, i) => {
          const ts = p.paidAt || Date.now()
          entries.push({
            id: `emi-${emi.id}-${i}`,
            type: 'emi_payment',
            sourceType: 'emi_paid',
            title: `${emi.name} EMI Paid`,
            subtitle: formatCurrency(p.amount) + ` · ${p.date || ''}`,
            amount: -p.amount,
            absAmount: p.amount,
            timestamp: ts,
            style: ENTRY_STYLES.emi_paid,
            isOverdue: false,
            isLarge: false,
            data: { ...p, emiId: emi.id, emiName: emi.name },
          })
        })
      }
    })
  }

  if (documents) {
    documents.forEach((doc) => {
      if (!doc.createdAt) return
      entries.push({
        id: `doc-${doc.id}`,
        type: 'document',
        sourceType: 'document_added',
        title: doc.title,
        subtitle: `Document added · ${doc.category || 'other'}`,
        amount: 0,
        absAmount: 0,
        timestamp: doc.createdAt,
        style: ENTRY_STYLES.document_added,
        isOverdue: false,
        isLarge: false,
        data: doc,
      })
    })
  }

  if (goals) {
    goals.forEach((goal) => {
      if (goal.status === 'completed' && goal.updatedAt) {
        entries.push({
          id: `goal-${goal.id}-completed`,
          type: 'goal',
          sourceType: 'goal_completed',
          title: `Goal Completed: ${goal.name}`,
          subtitle: `Target: ${formatCurrency(goal.target)}`,
          amount: 0,
          absAmount: 0,
          timestamp: goal.updatedAt,
          style: ENTRY_STYLES.goal_completed,
          isOverdue: false,
          isLarge: false,
          data: goal,
        })
      }
    })
  }

  entries.sort((a, b) => b.timestamp - a.timestamp)

  const amounts = entries.map((e) => e.absAmount).filter(Boolean)
  const avg = amounts.length > 0 ? amounts.reduce((s, a) => s + a, 0) / amounts.length : 0
  const largeThreshold = avg * 4

  entries.forEach((e) => {
    if (e.absAmount > largeThreshold && e.absAmount > 50000) {
      e.isLarge = true
    }
  })

  const groups = {}
  entries.forEach((e) => {
    const key = getGroupKey(e.timestamp)
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  return { entries, groups, groupOrder: GROUP_ORDER, groupLabels: GROUP_LABELS }
}

export function filterTimeline(entries, filter) {
  if (filter === 'all') return entries
  return entries.filter((e) => {
    switch (filter) {
      case 'debts':
        return e.type === 'debt' || e.type === 'payment'
      case 'expenses':
        return e.sourceType === 'expense'
      case 'income':
        return e.sourceType === 'income'
      case 'emi':
        return e.type === 'emi_payment'
      case 'documents':
        return e.type === 'document'
      case 'goals':
        return e.type === 'goal'
      default:
        return true
    }
  })
}

export function generateMonthlyInsights(transactions) {
  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1
  const prevYear = curMonth === 0 ? curYear - 1 : curYear

  const current = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === curMonth && d.getFullYear() === curYear
  })
  const previous = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  })

  const insights = []

  const curIncome = current.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevIncome = previous.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const curExpense = current
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const prevExpense = previous
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const curSavings = curIncome - curExpense
  const prevSavings = prevIncome - prevExpense

  if (curIncome > 0) {
    const curRate = curIncome > 0 ? curSavings / curIncome : 0
    const prevRate = prevIncome > 0 ? prevSavings / prevIncome : -1

    if (prevRate >= 0 && curRate > prevRate) {
      insights.push({
        type: 'positive',
        text: `Savings improved ${Math.round(Math.abs(curRate - prevRate) * 100)}% this month`,
      })
    } else if (prevRate >= 0 && curRate < prevRate) {
      insights.push({
        type: 'warning',
        text: `Savings declined ${Math.round(Math.abs(prevRate - curRate) * 100)}% this month`,
      })
    }
  }

  if (prevIncome > 0 && curIncome > prevIncome * 1.1) {
    insights.push({
      type: 'positive',
      text: `Income up ${Math.round((curIncome / prevIncome - 1) * 100)}% this month`,
    })
  } else if (prevIncome > 0 && curIncome < prevIncome * 0.9) {
    insights.push({
      type: 'warning',
      text: `Income down ${Math.round((1 - curIncome / prevIncome) * 100)}% this month`,
    })
  }

  if (prevExpense > 0 && curExpense < prevExpense * 0.85) {
    insights.push({
      type: 'positive',
      text: `Spending reduced ${Math.round((1 - curExpense / prevExpense) * 100)}% this month`,
    })
  } else if (prevExpense > 0 && curExpense > prevExpense * 1.15) {
    insights.push({
      type: 'warning',
      text: `Spending increased ${Math.round((curExpense / prevExpense - 1) * 100)}% this month`,
    })
  }

  return insights
}
