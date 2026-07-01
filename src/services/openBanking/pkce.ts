/**
 * PKCE — Proof Key for Code Exchange (RFC 7636)
 *
 * Uses the Web Crypto API (crypto.subtle) — available in all modern browsers
 * and in Node.js ≥ 15. No external dependencies.
 *
 * Required by Open Finance Brasil FAPI 1.0 Advanced profile.
 * Reference: https://datatracker.ietf.org/doc/html/rfc7636
 */

const VERIFIER_KEY = 'ofb_pkce_verifier'
const STATE_KEY    = 'ofb_pkce_state'
const BANK_KEY     = 'ofb_pkce_bank'

/** Base64URL-encode a Uint8Array (no padding, URL-safe) */
function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/** Generate a cryptographically random code verifier (43–128 chars per RFC 7636) */
function generateVerifier(): string {
  const bytes = new Uint8Array(48) // 48 bytes → 64-char base64url
  crypto.getRandomValues(bytes)
  return base64URLEncode(bytes)
}

/** Derive the code_challenge from the verifier using S256 method */
async function generateChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(digest))
}

/** Generate a random opaque state value to prevent CSRF */
function generateState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64URLEncode(bytes)
}

export interface PKCEPair {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
  state: string
}

/** Generate a fresh PKCE pair and persist the verifier to sessionStorage */
export async function createPKCE(bankId: string): Promise<PKCEPair> {
  const codeVerifier = generateVerifier()
  const codeChallenge = await generateChallenge(codeVerifier)
  const state = generateState()

  // Store in sessionStorage — cleared when the tab closes
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier)
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(BANK_KEY, bankId)

  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256', state }
}

/** Retrieve and clear the stored PKCE verifier after the OAuth callback */
export function consumePKCE(): {
  codeVerifier: string
  state: string
  bankId: string
} | null {
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY)
  const state        = sessionStorage.getItem(STATE_KEY)
  const bankId       = sessionStorage.getItem(BANK_KEY)

  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(BANK_KEY)

  if (!codeVerifier || !state || !bankId) return null
  return { codeVerifier, state, bankId }
}
