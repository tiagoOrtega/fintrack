const COLORS: Record<string, string> = {
  stock: 'bg-blue-100 text-blue-700',
  crypto: 'bg-purple-100 text-purple-700',
  etf: 'bg-cyan-100 text-cyan-700',
  real_estate: 'bg-orange-100 text-orange-700',
  fixed_income: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-600',
  housing: 'bg-blue-100 text-blue-700',
  food: 'bg-green-100 text-green-700',
  transport: 'bg-yellow-100 text-yellow-700',
  health: 'bg-red-100 text-red-700',
  education: 'bg-indigo-100 text-indigo-700',
  entertainment: 'bg-pink-100 text-pink-700',
  clothing: 'bg-orange-100 text-orange-700',
  utilities: 'bg-teal-100 text-teal-700',
  insurance: 'bg-slate-100 text-slate-700',
  subscriptions: 'bg-violet-100 text-violet-700',
  monthly: 'bg-blue-100 text-blue-700',
  yearly: 'bg-amber-100 text-amber-700',
  one_time: 'bg-gray-100 text-gray-600',
}

const LABELS: Record<string, string> = {
  stock: 'Stock',
  crypto: 'Crypto',
  etf: 'ETF',
  real_estate: 'Real Estate',
  fixed_income: 'Fixed Income',
  other: 'Other',
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  health: 'Health',
  education: 'Education',
  entertainment: 'Entertainment',
  clothing: 'Clothing',
  utilities: 'Utilities',
  insurance: 'Insurance',
  subscriptions: 'Subscriptions',
  monthly: 'Monthly',
  yearly: 'Yearly',
  one_time: 'One-time',
}

export default function Badge({ value }: { value: string }) {
  const cls = COLORS[value] ?? 'bg-gray-100 text-gray-600'
  const label = LABELS[value] ?? value
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
