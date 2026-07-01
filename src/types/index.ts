export type InvestmentType = 'stock' | 'crypto' | 'etf' | 'real_estate' | 'fixed_income' | 'other'

export interface Investment {
  id: string
  name: string
  ticker?: string
  type: InvestmentType
  purchasePrice: number
  currentPrice: number
  quantity: number
  purchaseDate: string
  broker?: string
  notes?: string
  currency: string
}

export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'clothing'
  | 'utilities'
  | 'insurance'
  | 'subscriptions'
  | 'other'

export type ExpenseFrequency = 'one_time' | 'monthly' | 'yearly'

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  frequency: ExpenseFrequency
  date: string
  notes?: string
  currency: string
}

export interface AppSettings {
  baseCurrency: string
  monthlyIncomeGoal: number
  savingsGoal: number
}

export interface AppStore {
  investments: Investment[]
  expenses: Expense[]
  settings: AppSettings
  connectedBanks: import('./openBanking').ConnectedBank[]
}
