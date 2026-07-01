/**
 * Open Finance Brasil — Resource API client
 *
 * All calls are routed through the local proxy (server/proxy.js) which:
 *  - Adds the Authorization header
 *  - Handles CORS (banks restrict direct browser access)
 *  - Optionally attaches an mTLS client certificate in production
 *
 * API versions used:
 *  Accounts         v2  — /open-banking/accounts/v2
 *  Credit Cards     v2  — /open-banking/credit-cards-accounts/v2
 *  Variable Income  v1  — /open-banking/variable-income/v1
 *  Fixed Income     v1  — /open-banking/bank-fixed-incomes/v1
 *  Treasure Titles  v1  — /open-banking/treasure-titles/v1
 *  Funds            v1  — /open-banking/funds/v1
 *
 * Spec: https://openfinancebrasil.atlassian.net/wiki/spaces/OF/overview
 */

import type {
  OFBBank,
  OFBAccountsResponse,
  OFBAccountBalanceResponse,
  OFBTransactionsResponse,
  OFBCreditCardsResponse,
  OFBCreditCardLimitsResponse,
  OFBCreditCardTransactionsResponse,
  OFBVariableIncomesResponse,
  OFBFixedIncomesResponse,
  OFBTreasureTitlesResponse,
} from '../../types/openBanking'
import { PROXY_BASE } from './oauth'

// ── Base fetch helper ─────────────────────────────────────────────────────────

async function proxyGet<T>(
  bank: OFBBank,
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const search = params ? '?' + new URLSearchParams(params).toString() : ''
  const targetUrl = `${bank.apiBaseUrl}${path}${search}`

  const res = await fetch(`${PROXY_BASE}/resource`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: targetUrl,
      method: 'GET',
      accessToken,
    }),
  })

  if (res.status === 401) throw new Error('TOKEN_EXPIRED')
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ── Accounts v2 ───────────────────────────────────────────────────────────────

/** GET /open-banking/accounts/v2/accounts */
export async function getAccounts(
  bank: OFBBank,
  accessToken: string
): Promise<OFBAccountsResponse> {
  return proxyGet<OFBAccountsResponse>(
    bank,
    '/open-banking/accounts/v2/accounts',
    accessToken
  )
}

/** GET /open-banking/accounts/v2/accounts/{accountId}/balances */
export async function getAccountBalance(
  bank: OFBBank,
  accountId: string,
  accessToken: string
): Promise<OFBAccountBalanceResponse> {
  return proxyGet<OFBAccountBalanceResponse>(
    bank,
    `/open-banking/accounts/v2/accounts/${accountId}/balances`,
    accessToken
  )
}

/**
 * GET /open-banking/accounts/v2/accounts/{accountId}/transactions
 * Date range defaults to the last 90 days.
 */
export async function getAccountTransactions(
  bank: OFBBank,
  accountId: string,
  accessToken: string,
  fromDate?: string,
  toDate?: string
): Promise<OFBTransactionsResponse> {
  const today = new Date().toISOString().split('T')[0]
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  return proxyGet<OFBTransactionsResponse>(
    bank,
    `/open-banking/accounts/v2/accounts/${accountId}/transactions`,
    accessToken,
    {
      fromBookingDate: fromDate ?? ninetyDaysAgo,
      toBookingDate: toDate ?? today,
    }
  )
}

// ── Credit Cards v2 ───────────────────────────────────────────────────────────

/** GET /open-banking/credit-cards-accounts/v2/accounts */
export async function getCreditCards(
  bank: OFBBank,
  accessToken: string
): Promise<OFBCreditCardsResponse> {
  return proxyGet<OFBCreditCardsResponse>(
    bank,
    '/open-banking/credit-cards-accounts/v2/accounts',
    accessToken
  )
}

/** GET /open-banking/credit-cards-accounts/v2/accounts/{creditCardAccountId}/limits */
export async function getCreditCardLimits(
  bank: OFBBank,
  creditCardAccountId: string,
  accessToken: string
): Promise<OFBCreditCardLimitsResponse> {
  return proxyGet<OFBCreditCardLimitsResponse>(
    bank,
    `/open-banking/credit-cards-accounts/v2/accounts/${creditCardAccountId}/limits`,
    accessToken
  )
}

/** GET /open-banking/credit-cards-accounts/v2/accounts/{creditCardAccountId}/transactions */
export async function getCreditCardTransactions(
  bank: OFBBank,
  creditCardAccountId: string,
  accessToken: string
): Promise<OFBCreditCardTransactionsResponse> {
  return proxyGet<OFBCreditCardTransactionsResponse>(
    bank,
    `/open-banking/credit-cards-accounts/v2/accounts/${creditCardAccountId}/transactions`,
    accessToken
  )
}

// ── Variable Income Investments v1 ────────────────────────────────────────────

/** GET /open-banking/variable-income/v1/investments */
export async function getVariableIncomes(
  bank: OFBBank,
  accessToken: string
): Promise<OFBVariableIncomesResponse> {
  return proxyGet<OFBVariableIncomesResponse>(
    bank,
    '/open-banking/variable-income/v1/investments',
    accessToken
  )
}

// ── Bank Fixed Income Investments v1 ──────────────────────────────────────────

/** GET /open-banking/bank-fixed-incomes/v1/investments */
export async function getFixedIncomes(
  bank: OFBBank,
  accessToken: string
): Promise<OFBFixedIncomesResponse> {
  return proxyGet<OFBFixedIncomesResponse>(
    bank,
    '/open-banking/bank-fixed-incomes/v1/investments',
    accessToken
  )
}

// ── Treasure Titles (Tesouro Direto) v1 ──────────────────────────────────────

/** GET /open-banking/treasure-titles/v1/investments */
export async function getTreasureTitles(
  bank: OFBBank,
  accessToken: string
): Promise<OFBTreasureTitlesResponse> {
  return proxyGet<OFBTreasureTitlesResponse>(
    bank,
    '/open-banking/treasure-titles/v1/investments',
    accessToken
  )
}

// ── Funds v1 ──────────────────────────────────────────────────────────────────

/** GET /open-banking/funds/v1/investments */
export async function getFunds(
  bank: OFBBank,
  accessToken: string
): Promise<{ data: unknown[]; links: unknown; meta: unknown }> {
  return proxyGet(
    bank,
    '/open-banking/funds/v1/investments',
    accessToken
  )
}
