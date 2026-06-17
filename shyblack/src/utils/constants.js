export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'Briefcase' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop' },
  { id: 'investment', label: 'Investment', icon: 'PieChart' },
  { id: 'trading_withdrawal', label: 'Trading Withdrawal', icon: 'TrendingUp' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
  { id: 'fuel', label: 'Fuel', icon: 'Fuel' },
  { id: 'bills', label: 'Bills', icon: 'FileText' },
  { id: 'subscription', label: 'Subscription', icon: 'Repeat' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'family', label: 'Family', icon: 'Users' },
  { id: 'trading_deposit', label: 'Trading Deposit', icon: 'TrendingDown' },
  { id: 'emi', label: 'EMI', icon: 'Landmark' },
]

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
}

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const PAYMENT_METHODS = [
  { id: 'gpay', label: 'GPay', icon: 'Smartphone' },
  { id: 'phonepe', label: 'PhonePe', icon: 'Smartphone' },
  { id: 'paytm', label: 'Paytm', icon: 'Smartphone' },
  { id: 'upi', label: 'UPI', icon: 'QrCode' },
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'Building2' },
  { id: 'card', label: 'Card', icon: 'CreditCard' },
]
