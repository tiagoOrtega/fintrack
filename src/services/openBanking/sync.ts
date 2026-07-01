/**
 * Open Finance Brasil — Data sync
 *
 * Fetches all consented data from the bank and maps it into FinTrack's
 * own Investment, Expense, and SyncedAccount models.
 */

import type { OFBBank, OFBPermission, SyncedAccount } from '../../types/openBanking'
import type { Investment, Expense } from '../../types'
import {
  getAccounts,
  getAccountBalance,
  getAccountTransactions,
  getCreditCards,
  getCreditCardLimits,
  getCreditCardTransactions,
  getVariableIncomes,
  getFixedIncomes,
  getTreasureTitles,
} from './api'

function amount(str: string): number {
  return parseFloat(str) || 0
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Account sync ──────────────────────────────────────────────────────────────

async function syncAccounts(
  bank: OFBBank,
  accessToken: string,
  permissions: OFBPermission[]
): Promise<{ accounts: SyncedAccount[]; expenses: Expense[] }> {
  if (!permissions.includes('ACCOUNTS_READ')) {
    return { accounts: [], expenses: [] }
  }

  const accountsRes = await getAccounts(bank, accessToken)
  const accounts: SyncedAccount[] = []
  const expenses: Expense[] = []

  for (const acc of accountsRes.data) {
    let balance = 0

    if (permissions.includes('ACCOUNTS_BALANCES_READ')) {
      try {
        const balRes = await getAccountBalance(bank, acc.accountId, accessToken)
        balance = amount(balRes.data.availableAmount.amount)
      } catch {
        // balance stays 0 if unavailable
      }
    }

    const type: SyncedAccount['type'] =
      acc.type === 'CONTA_POUPANCA' ? 'savings' : 'checking'

    accounts.push({
      accountId: acc.accountId,
      type,
      label: `${acc.type === 'CONTA_POUPANCA' ? 'Poupança' : 'Corrente'} ••••${acc.number.slice(-4)}`,
      balance,
      currency: 'BRL',
    })

    if (permissions.includes('ACCOUNTS_TRANSACTIONS_READ')) {
      try {
        const txRes = await getAccountTransactions(bank, acc.accountId, accessToken)
        for (const tx of txRes.data) {
          if (tx.creditDebitType !== 'DEBITO') continue
          if (tx.completedAuthorisedPaymentType !== 'TRANSACAO_EFETIVADA') continue

          expenses.push({
            id: crypto.randomUUID(),
            description: tx.transactionName || tx.counterPartyName || tx.type,
            amount: amount(tx.amount.amount),
            category: guessCategory(tx.transactionName, tx.type),
            frequency: 'one_time',
            date: tx.transactionDate,
            notes: tx.remittanceInformation ?? undefined,
            currency: tx.amount.currency || 'BRL',
          })
        }
      } catch {
        // transactions optional
      }
    }
  }

  return { accounts, expenses }
}

// ── Credit card sync ──────────────────────────────────────────────────────────

async function syncCreditCards(
  bank: OFBBank,
  accessToken: string,
  permissions: OFBPermission[]
): Promise<{ accounts: SyncedAccount[]; expenses: Expense[] }> {
  if (!permissions.includes('CREDIT_CARDS_ACCOUNTS_READ')) {
    return { accounts: [], expenses: [] }
  }

  const cardsRes = await getCreditCards(bank, accessToken)
  const accounts: SyncedAccount[] = []
  const expenses: Expense[] = []

  for (const card of cardsRes.data) {
    let usedAmount = 0
    let totalLimit = 0

    if (permissions.includes('CREDIT_CARDS_ACCOUNTS_LIMITS_READ')) {
      try {
        const limRes = await getCreditCardLimits(bank, card.creditCardAccountId, accessToken)
        const total = limRes.data.find(
          (l) => l.creditLineLimitType === 'LIMITE_CREDITO_TOTAL'
        )
        if (total) {
          totalLimit = amount(total.limitAmount)
          usedAmount = amount(total.usedAmount)
        }
      } catch {
        // limits optional
      }
    }

    accounts.push({
      accountId: card.creditCardAccountId,
      type: 'credit_card',
      label: `${card.name} (${card.creditCardNetwork}) `,
      balance: -usedAmount,
      currency: 'BRL',
      limit: totalLimit,
    })

    if (permissions.includes('CREDIT_CARDS_ACCOUNTS_TRANSACTIONS_READ')) {
      try {
        const txRes = await getCreditCardTransactions(bank, card.creditCardAccountId, accessToken)
        for (const tx of txRes.data) {
          if (tx.creditDebitType !== 'DEBITO') continue
          if (tx.transactionType === 'PAGAMENTO') continue // skip bill payments

          expenses.push({
            id: crypto.randomUUID(),
            description: tx.transactionName,
            amount: amount(tx.brazilianAmount.amount),
            category: guessCategory(tx.transactionName, tx.transactionType),
            frequency: 'one_time',
            date: tx.transactionDate,
            currency: tx.brazilianAmount.currency || 'BRL',
          })
        }
      } catch {
        // transactions optional
      }
    }
  }

  return { accounts, expenses }
}

// ── Investment sync ───────────────────────────────────────────────────────────

async function syncInvestments(
  bank: OFBBank,
  accessToken: string,
  permissions: OFBPermission[]
): Promise<Investment[]> {
  const investments: Investment[] = []

  // Variable income (stocks, ETFs, BDRs, FIIs)
  if (permissions.includes('VARIABLE_INCOMES_READ')) {
    try {
      const res = await getVariableIncomes(bank, accessToken)
      for (const inv of res.data) {
        investments.push({
          id: crypto.randomUUID(),
          name: inv.ticker ?? inv.isin ?? inv.investmentId,
          ticker: inv.ticker,
          type: 'stock',
          purchasePrice: amount(inv.averagePrice.amount),
          currentPrice: amount(inv.quote.amount),
          quantity: inv.quantity,
          purchaseDate: todayISO(),
          broker: bank.name,
          currency: inv.amount.currency || 'BRL',
        })
      }
    } catch {
      // optional scope
    }
  }

  // Fixed income (CDB, LCI, LCA, etc.)
  if (permissions.includes('BANK_FIXED_INCOMES_READ')) {
    try {
      const res = await getFixedIncomes(bank, accessToken)
      for (const inv of res.data) {
        investments.push({
          id: crypto.randomUUID(),
          name: `${inv.investmentType} ${inv.isinCode ?? ''}`.trim(),
          type: 'fixed_income',
          purchasePrice: amount(inv.issueUnitPrice.amount),
          currentPrice: amount(inv.updatedUnitPrice.amount),
          quantity: inv.quantity,
          purchaseDate: inv.purchaseDate,
          broker: bank.name,
          notes: `Due: ${inv.dueDate} | Indexer: ${inv.remuneration.indexer}`,
          currency: inv.netAmount.currency || 'BRL',
        })
      }
    } catch {
      // optional scope
    }
  }

  // Tesouro Direto
  if (permissions.includes('TREASURE_TITLES_READ')) {
    try {
      const res = await getTreasureTitles(bank, accessToken)
      for (const inv of res.data) {
        investments.push({
          id: crypto.randomUUID(),
          name: inv.investmentType.replace(/_/g, ' '),
          type: 'fixed_income',
          purchasePrice: amount(inv.issueUnitPrice.amount),
          currentPrice: amount(inv.updatedUnitPrice.amount),
          quantity: inv.quantity,
          purchaseDate: inv.purchaseDate,
          broker: 'Tesouro Nacional',
          notes: `Due: ${inv.dueDate}`,
          currency: inv.netAmount.currency || 'BRL',
        })
      }
    } catch {
      // optional scope
    }
  }

  return investments
}

// ── Category guesser ──────────────────────────────────────────────────────────

const CATEGORY_HINTS: Array<[RegExp, Expense['category']]> = [
  [/aluguel|condom|iptu|moradia|habitação/i, 'housing'],
  [/mercado|supermercado|hortifruti|padaria|ifood|rappi|restaurante|lanche|delivery/i, 'food'],
  [/uber|99|taxi|combustivel|gasolina|estacionamento|metrô|onibus|transporte/i, 'transport'],
  [/farmacia|medico|hospital|clinica|laboratorio|plano.de.saude|unimed/i, 'health'],
  [/escola|faculdade|curso|mensalidade|educação/i, 'education'],
  [/netflix|spotify|amazon|prime|disney|youtube|streaming|assinatura|subscription/i, 'subscriptions'],
  [/luz|energia|agua|gas|internet|telefone|cel|tim|claro|vivo|net|oi/i, 'utilities'],
  [/seguro/i, 'insurance'],
  [/roupa|moda|shoe|zara|renner|riachuelo/i, 'clothing'],
  [/cinema|show|teatro|lazer|entretenimento|parque/i, 'entertainment'],
]

function guessCategory(description: string, type: string): Expense['category'] {
  const text = `${description} ${type}`
  for (const [pattern, category] of CATEGORY_HINTS) {
    if (pattern.test(text)) return category
  }
  return 'other'
}

// ── Main sync entry point ─────────────────────────────────────────────────────

export interface SyncResult {
  accounts: SyncedAccount[]
  investments: Investment[]
  expenses: Expense[]
  syncedAt: string
  errors: string[]
}

export async function syncBank(
  bank: OFBBank,
  accessToken: string,
  permissions: OFBPermission[]
): Promise<SyncResult> {
  const errors: string[] = []

  const [accountData, cardData, investments] = await Promise.allSettled([
    syncAccounts(bank, accessToken, permissions),
    syncCreditCards(bank, accessToken, permissions),
    syncInvestments(bank, accessToken, permissions),
  ])

  const accounts: SyncedAccount[] = []
  const expenses: Expense[] = []
  const investmentList: Investment[] = []

  if (accountData.status === 'fulfilled') {
    accounts.push(...accountData.value.accounts)
    expenses.push(...accountData.value.expenses)
  } else {
    errors.push(`Accounts: ${accountData.reason}`)
  }

  if (cardData.status === 'fulfilled') {
    accounts.push(...cardData.value.accounts)
    expenses.push(...cardData.value.expenses)
  } else {
    errors.push(`Credit cards: ${cardData.reason}`)
  }

  if (investments.status === 'fulfilled') {
    investmentList.push(...investments.value)
  } else {
    errors.push(`Investments: ${investments.reason}`)
  }

  return {
    accounts,
    investments: investmentList,
    expenses,
    syncedAt: new Date().toISOString(),
    errors,
  }
}
