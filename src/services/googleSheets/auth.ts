/**
 * Google OAuth 2.0 + PKCE for browser-based apps.
 *
 * Uses "Desktop app" credential type — no client_secret required.
 * Set VITE_GOOGLE_CLIENT_ID in your .env file.
 *
 * Used both by the Settings page (reconnect Sheets backup, redirect to
 * /settings) and the Login page ("Continue with Google", redirect to
 * /login) — both paths must be registered as Authorized redirect URIs.
 *
 * Required Google Cloud setup:
 *   1. Create / open a project at https://console.cloud.google.com
 *   2. APIs & Services → Enable "Google Sheets API"
 *   3. Credentials → Create OAuth 2.0 client → Desktop app
 *   4. Copy the Client ID to VITE_GOOGLE_CLIENT_ID in .env
 *   5. Add http://localhost:5173 to "Authorized JavaScript origins"
 *      and http://localhost:5173/settings + http://localhost:5173/login
 *      to "Authorized redirect URIs"
 */

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ?? ''
const AUTH_URL   = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL  = 'https://oauth2.googleapis.com/token'
const SCOPES     = 'https://www.googleapis.com/auth/spreadsheets openid email'

function redirectUri(path: string): string {
  return `${window.location.origin}${path}`
}

async function generateVerifier(): Promise<string> {
  const buf = new Uint8Array(48)
  crypto.getRandomValues(buf)
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function deriveChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function googleClientConfigured(): boolean {
  return Boolean(CLIENT_ID)
}

export async function startGoogleAuth(redirectPath: string = '/settings'): Promise<void> {
  const verifier  = await generateVerifier()
  const challenge = await deriveChallenge(verifier)
  const state     = crypto.randomUUID()

  sessionStorage.setItem('gs_verifier', verifier)
  sessionStorage.setItem('gs_state', state)

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          redirectUri(redirectPath),
    response_type:         'code',
    scope:                 SCOPES,
    state,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
  })

  window.location.href = `${AUTH_URL}?${params}`
}

export interface GoogleTokens {
  accessToken:  string
  refreshToken: string
  tokenExpiry:  number
  userEmail:    string
  idToken:      string
}

export async function handleGoogleCallback(
  code: string,
  state: string,
  redirectPath: string = '/settings'
): Promise<GoogleTokens> {
  const storedState = sessionStorage.getItem('gs_state')
  const verifier    = sessionStorage.getItem('gs_verifier')

  sessionStorage.removeItem('gs_state')
  sessionStorage.removeItem('gs_verifier')

  if (state !== storedState) throw new Error('OAuth state mismatch — please try connecting again.')
  if (!verifier)             throw new Error('PKCE verifier missing — please try connecting again.')

  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri:  redirectUri(redirectPath),
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error(String(body.error_description ?? body.error ?? `Token exchange failed (${res.status})`))
  }

  const data = await res.json() as Record<string, unknown>
  const idToken = String(data.id_token ?? '')

  // Extract email from the id_token JWT payload for display purposes only.
  // Not a security check — the server independently verifies the id_token's
  // signature/audience before trusting it for login identity.
  let userEmail = ''
  if (idToken) {
    try {
      const payload = idToken.split('.')[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
      if (typeof decoded.email === 'string') userEmail = decoded.email
    } catch { /* ignore */ }
  }

  return {
    accessToken:  String(data.access_token ?? ''),
    refreshToken: String(data.refresh_token ?? ''),
    tokenExpiry:  Date.now() + (Number(data.expires_in) || 3600) * 1000,
    userEmail,
    idToken,
  }
}

export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; tokenExpiry: number }> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!res.ok) throw new Error('Token refresh failed — please reconnect your Google account.')

  const data = await res.json() as Record<string, unknown>
  return {
    accessToken: String(data.access_token ?? ''),
    tokenExpiry: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  }
}
