export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'Briefcase' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop' },
  { id: 'investment', label: 'Investment', icon: 'PieChart' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
  { id: 'fuel', label: 'Fuel', icon: 'Fuel' },
  { id: 'bills', label: 'Bills', icon: 'FileText' },
  { id: 'subscription', label: 'Subscription', icon: 'Repeat' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'family', label: 'Family', icon: 'Users' },
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
