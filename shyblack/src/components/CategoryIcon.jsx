import {
  Briefcase, TrendingUp, Laptop, PieChart,
  UtensilsCrossed, Fuel, FileText, Repeat,
  ShoppingBag, TrendingDown, Users,
  HelpCircle,
} from 'lucide-react'

const iconMap = {
  Briefcase, TrendingUp, Laptop, PieChart,
  UtensilsCrossed, Fuel, FileText, Repeat,
  ShoppingBag, TrendingDown, Users,
  HelpCircle,
}

export default function CategoryIcon({ icon, size = 18, className = '' }) {
  const Icon = iconMap[icon]
  if (!Icon) return null
  return <Icon size={size} className={className} />
}
