import type { AppStore, Investment, Expense } from '../../types'
import { batchUpdateValues } from './api'

const INV_HEADERS = ['id', 'name', 'ticker', 'type', 'purchasePrice', 'currentPrice', 'quantity', 'purchaseDate', 'broker', 'notes', 'currency']
const EXP_HEADERS = ['id', 'description', 'amount', 'category', 'frequency', 'date', 'notes', 'currency']

function invRow(i: Investment): string[] {
  return [
    i.id, i.name, i.ticker ?? '', i.type,
    String(i.purchasePrice), String(i.currentPrice), String(i.quantity),
    i.purchaseDate, i.broker ?? '', i.notes ?? '', i.currency ?? '',
  ]
}

function expRow(e: Expense): string[] {
  return [
    e.id, e.description, String(e.amount), e.category,
    e.frequency, e.date, e.notes ?? '', e.currency ?? '',
  ]
}

export async function pushToSheets(
  accessToken:   string,
  spreadsheetId: string,
  store:         AppStore
): Promise<void> {
  const invRows = [INV_HEADERS, ...store.investments.map(invRow)]
  const expRows = [EXP_HEADERS, ...store.expenses.map(expRow)]
  const settingsRows = [
    ['key', 'value'],
    ['baseCurrency',       store.settings.baseCurrency],
    ['monthlyIncomeGoal',  String(store.settings.monthlyIncomeGoal)],
    ['savingsGoal',        String(store.settings.savingsGoal)],
    ['connectedBanks',     String(store.connectedBanks.length)],
    ['lastUpdated',        new Date().toISOString()],
  ]

  await batchUpdateValues(accessToken, spreadsheetId, [
    { range: 'Investments!A1', values: invRows     },
    { range: 'Expenses!A1',    values: expRows     },
    { range: 'Settings!A1',    values: settingsRows },
  ])
}
