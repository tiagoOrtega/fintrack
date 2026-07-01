import { format, parseISO, isValid } from 'date-fns'

export function formatCurrency(amount: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '-'
}

export function formatShortDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, 'MMM/yy') : '-'
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
