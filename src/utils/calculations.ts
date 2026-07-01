import type { Investment, Expense } from '../types'

export function investmentCurrentValue(inv: Investment): number {
  return inv.currentPrice * inv.quantity
}

export function investmentCost(inv: Investment): number {
  return inv.purchasePrice * inv.quantity
}

export function investmentPnL(inv: Investment): number {
  return investmentCurrentValue(inv) - investmentCost(inv)
}

export function investmentPnLPercent(inv: Investment): number {
  const cost = investmentCost(inv)
  if (cost === 0) return 0
  return (investmentPnL(inv) / cost) * 100
}

export function totalPortfolioValue(investments: Investment[]): number {
  return investments.reduce((sum, inv) => sum + investmentCurrentValue(inv), 0)
}

export function totalPortfolioCost(investments: Investment[]): number {
  return investments.reduce((sum, inv) => sum + investmentCost(inv), 0)
}

export function totalPortfolioPnL(investments: Investment[]): number {
  return totalPortfolioValue(investments) - totalPortfolioCost(investments)
}

export function monthlyExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => {
    if (exp.frequency === 'monthly') return sum + exp.amount
    if (exp.frequency === 'yearly') return sum + exp.amount / 12
    return sum
  }, 0)
}

export function yearlyExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => {
    if (exp.frequency === 'monthly') return sum + exp.amount * 12
    if (exp.frequency === 'yearly') return sum + exp.amount
    if (exp.frequency === 'one_time') return sum + exp.amount
    return sum
  }, 0)
}

export function expensesByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, exp) => {
    const monthly =
      exp.frequency === 'monthly'
        ? exp.amount
        : exp.frequency === 'yearly'
        ? exp.amount / 12
        : exp.amount
    acc[exp.category] = (acc[exp.category] ?? 0) + monthly
    return acc
  }, {})
}

export function portfolioAllocation(investments: Investment[]): Record<string, number> {
  const total = totalPortfolioValue(investments)
  if (total === 0) return {}
  return investments.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.type] = (acc[inv.type] ?? 0) + investmentCurrentValue(inv)
    return acc
  }, {})
}
