/**
 * Open Finance Brasil — OAuth 2.0 Authorization Code + PKCE flow
 *
 * Standard: FAPI 1.0 Advanced (Financial-grade API)
 * Ref: https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/82084984/Perfil+de+Segurança
 *
 * Flow:
 *  1. createPKCE()           — generate verifier + challenge
 *  2. buildAuthUrl()         — construct the authorization redirect URL
 *  3. [browser redirects]    — user authenticates at the bank
 *  4. handleCallback()       — parse code + state from the return URL
 *  5. exchangeCode()         — swap code for tokens (via local proxy)
 *
 * Production note:
 *  Full FAPI compliance requires Pushed Authorization Requests (PAR) and
 *  JWT-secured authorization requests (JAR) with a registered private key.
 *  These require a backend. The proxy server (server/proxy.js) is the
 *  extension point for those features.
 */

import type { OFBBank, OFBPermission, OFBTokenResponse } from '../../types/openBanking'
import { createPKCE, consumePKCE } from './pkce'

/** The URL where the bank redirects the user after authorization */
export const REDIRECT_URI = `${window.location.origin}/banks/callback`

/** Client ID registered with the bank.
 *  In production this comes from Dynamic Client Registration (DCR).
 *  Set via environment variable or the Settings page in the app.
 */
const CLIENT_ID =
  import.meta.env.VITE_OFB_CLIENT_ID ?? 'fintrack-client'

/** Local proxy that forwards token + API calls (handles CORS and optional mTLS) */
export const PROXY_BASE = import.meta.env.VITE_PROXY_URL ?? 'http://localhost:3001'

// ── OpenID Connect discovery ─────────────────────────────────────────────────

export interface OIDCEndpoints {
  authorization_endpoint: string
  token_endpoint: string
  pushed_authorization_request_endpoint?: string
}

/** Fetch the OIDC discovery document and cache it per session */
const discoveryCache = new Map<string, OIDCEndpoints>()

export async function fetchDiscovery(bank: OFBBank): Promise<OIDCEndpoints> {
  if (discoveryCache.has(bank.id)) return discoveryCache.get(bank.id)!

  // Fetch via proxy to avoid CORS issues with bank auth servers
  const res = await fetch(`${PROXY_BASE}/discovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: bank.discoveryUrl }),
  })

  if (!res.ok) throw new Error(`Discovery failed for ${bank.name}: ${res.status}`)

  const doc = await res.json()
  const endpoints: OIDCEndpoints = {
    authorization_endpoint: doc.authorization_endpoint,
    token_endpoint: doc.token_endpoint,
    pushed_authorization_request_endpoint:
      doc.pushed_authorization_request_endpoint,
  }

  discoveryCache.set(bank.id, endpoints)
  return endpoints
}

// ── Authorization URL ────────────────────────────────────────────────────────

/** Map FinTrack permission groups to OAuth scopes */
function permissionsToScopes(permissions: OFBPermission[]): string {
  const scopeSet = new Set(['openid', 'resources'])

  if (permissions.some((p) => p.startsWith('ACCOUNTS_')))
    scopeSet.add('accounts')

  if (permissions.some((p) => p.startsWith('CREDIT_CARDS_')))
    scopeSet.add('credit-cards-accounts')

  if (permissions.some((p) => p.startsWith('VARIABLE_INCOMES_')))
    scopeSet.add('variable-income')

  if (permissions.some((p) => p.startsWith('BANK_FIXED_INCOMES_')))
    scopeSet.add('bank-fixed-incomes')

  if (permissions.some((p) => p.startsWith('TREASURE_TITLES_')))
    scopeSet.add('treasure-titles')

  if (permissions.some((p) => p.startsWith('FUNDS_')))
    scopeSet.add('funds')

  return [...scopeSet].join(' ')
}

export interface AuthUrlResult {
  url: string
  pkce: Awaited<ReturnType<typeof createPKCE>>
  consentId?: string
}

/**
 * Build the authorization URL and redirect the browser to the bank.
 *
 * @param bank        The bank to connect to
 * @param permissions The data permissions the user granted
 * @param consentId   Optional consent ID returned by the consent API
 */
export async function startAuthorization(
  bank: OFBBank,
  permissions: OFBPermission[],
  consentId?: string
): Promise<void> {
  const pkce = await createPKCE(bank.id)
  const endpoints = await fetchDiscovery(bank)
  const scope = permissionsToScopes(permissions)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope,
    state: pkce.state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
    // FAPI: nonce required when openid scope is present
    nonce: pkce.state,
  })

  // Attach consent_id when provided (Open Finance Brasil consent-based flow)
  if (consentId) {
    params.set('consent_id', consentId)
    // OFB requires the scope to include the consent prefix:
    params.set('scope', `${scope} consent:${consentId}`)
  }

  window.location.href = `${endpoints.authorization_endpoint}?${params.toString()}`
}

// ── OAuth callback ────────────────────────────────────────────────────────────

export interface CallbackResult {
  code: string
  bankId: string
  codeVerifier: string
}

/**
 * Parse the callback URL after the bank redirects back.
 * Validates the `state` parameter to prevent CSRF.
 *
 * @throws if state is invalid, or required params are missing
 */
export function handleCallback(search: string): CallbackResult {
  const params = new URLSearchParams(search)

  const error = params.get('error')
  if (error) {
    const desc = params.get('error_description') ?? error
    throw new Error(`Authorization failed: ${desc}`)
  }

  const code  = params.get('code')
  const state = params.get('state')

  if (!code)  throw new Error('No authorization code in callback')
  if (!state) throw new Error('No state in callback')

  const stored = consumePKCE()
  if (!stored)         throw new Error('PKCE session expired — please reconnect')
  if (stored.state !== state) throw new Error('State mismatch — possible CSRF attempt')

  return { code, bankId: stored.bankId, codeVerifier: stored.codeVerifier }
}

// ── Token exchange ────────────────────────────────────────────────────────────

/**
 * Exchange the authorization code for access + refresh tokens.
 * Routed through the local proxy so the bank's token endpoint
 * can enforce mTLS without the browser needing a client certificate.
 */
export async function exchangeCode(
  bank: OFBBank,
  code: string,
  codeVerifier: string
): Promise<OFBTokenResponse> {
  const endpoints = await fetchDiscovery(bank)

  const res = await fetch(`${PROXY_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenEndpoint: endpoints.token_endpoint,
      code,
      codeVerifier,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<OFBTokenResponse>
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  bank: OFBBank,
  refreshToken: string
): Promise<OFBTokenResponse> {
  const endpoints = await fetchDiscovery(bank)

  const res = await fetch(`${PROXY_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenEndpoint: endpoints.token_endpoint,
      grantType: 'refresh_token',
      refreshToken,
      clientId: CLIENT_ID,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token refresh failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<OFBTokenResponse>
}

// ── Consent creation ─────────────────────────────────────────────────────────

/**
 * Create a consent at the bank via the proxy.
 *
 * In production, consent creation requires a client-credentials access token
 * with `scope=consents` — the proxy handles that automatically.
 *
 * Returns the consentId to include in the authorization URL.
 */
export async function createConsent(
  bank: OFBBank,
  permissions: OFBPermission[]
): Promise<string> {
  // Consent expires in 60 minutes (user has this long to authorize)
  const expirationDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const res = await fetch(`${PROXY_BASE}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bankId: bank.id,
      consentEndpoint: `${bank.apiBaseUrl}/open-banking/consents/v2/consents`,
      tokenEndpoint: (await fetchDiscovery(bank)).token_endpoint,
      clientId: CLIENT_ID,
      payload: {
        data: {
          permissions,
          expirationDateTime,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Consent creation failed (${res.status}): ${body}`)
  }

  const json = await res.json()
  return json.data.consentId as string
}
