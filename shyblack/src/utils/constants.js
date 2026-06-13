export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'Briefcase' },
  { id: 'trading_profit', label: 'Trading Profit', icon: 'TrendingUp' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop' },
  { id: 'investment', label: 'Investment', icon: 'PieChart' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
  { id: 'fuel', label: 'Fuel', icon: 'Fuel' },
  { id: 'bills', label: 'Bills', icon: 'FileText' },
  { id: 'subscription', label: 'Subscription', icon: 'Repeat' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'trading_loss', label: 'Trading Loss', icon: 'TrendingDown' },
  { id: 'family', label: 'Family', icon: 'Users' },
]

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
}

export const TRANSACTION_PURPOSE = {
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT_TRANSFER: 'investment_transfer',
  TRADING_PROFIT: 'trading_profit',
  TRADING_LOSS: 'trading_loss',
}

export const TRADING_PLATFORMS = [
  { id: 'binance', label: 'Binance' },
  { id: 'delta', label: 'Delta' },
  { id: 'bybit', label: 'Bybit' },
  { id: 'manual', label: 'Manual' },
]

export const PURPOSE_LABELS = {
  income: 'Income',
  expense: 'Expense',
  investment_transfer: 'Investment Transfer',
  trading_profit: 'Trading Profit',
  trading_loss: 'Trading Loss',
}

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
