export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'Briefcase' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop' },
  { id: 'investment', label: 'Investment', icon: 'PieChart' },
  { id: 'trading_withdrawal', label: 'Trading Withdrawal', icon: 'TrendingUp' },
  { id: 'other_income', label: 'Other', icon: 'HelpCircle' },
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
  { id: 'other_expense', label: 'Other', icon: 'HelpCircle' },
]

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
}

export const ASSET_TYPES = [
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'bank_account', label: 'Bank Account', icon: 'Building2' },
  { id: 'fixed_deposit', label: 'Fixed Deposit', icon: 'Landmark' },
  { id: 'gold', label: 'Gold', icon: 'CircleDot' },
  { id: 'silver', label: 'Silver', icon: 'CircleDot' },
  { id: 'stocks', label: 'Stocks', icon: 'TrendingUp' },
  { id: 'mutual_funds', label: 'Mutual Funds', icon: 'PieChart' },
  { id: 'crypto', label: 'Crypto', icon: 'Bitcoin' },
  { id: 'real_estate', label: 'Real Estate', icon: 'Building2' },
  { id: 'other', label: 'Other', icon: 'HelpCircle' },
]

export const CRYPTO_COINS = [
  { id: 'BTC', label: 'Bitcoin (BTC)' },
  { id: 'ETH', label: 'Ethereum (ETH)' },
  { id: 'BNB', label: 'BNB' },
  { id: 'SOL', label: 'Solana (SOL)' },
  { id: 'XRP', label: 'XRP' },
  { id: 'ADA', label: 'Cardano (ADA)' },
  { id: 'DOGE', label: 'Dogecoin (DOGE)' },
  { id: 'custom', label: 'Custom Coin' },
]

export const PRIVACY_POLICY_URL = 'https://sites.google.com/view/expense-tracker---shyblack/home'

export const PAYMENT_METHODS = [
  { id: 'gpay', label: 'GPay', icon: 'Smartphone' },
  { id: 'phonepe', label: 'PhonePe', icon: 'Smartphone' },
  { id: 'paytm', label: 'Paytm', icon: 'Smartphone' },
  { id: 'upi', label: 'UPI', icon: 'QrCode' },
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'Building2' },
  { id: 'card', label: 'Card', icon: 'CreditCard' },
]
