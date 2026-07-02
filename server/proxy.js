/**
 * FinTrack — Open Finance Brasil proxy server
 *
 * Sits between the React app and the bank APIs to handle:
 *   1. CORS — banks restrict direct browser access
 *   2. mTLS — production OFB requires a client certificate (BRCAC/BRSEAL)
 *   3. Token exchange — forwards authorization codes to bank token endpoints
 *   4. Consent creation — uses client-credentials flow before user auth
 *
 * Port: 3001 (configurable via PORT env var)
 *
 * mTLS setup (production):
 *   Set OFB_CERT_PATH and OFB_KEY_PATH to your certificate files.
 *   Certificates are issued by the Open Finance Brasil directory CA.
 *   Register at: https://web.directory.openbankingbrasil.org.br
 *
 * Sandbox (no mTLS):
 *   Start without cert paths — the proxy runs without a client certificate.
 *   Most sandbox environments do not enforce mTLS.
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express  = require('express')
const cors     = require('cors')
const https    = require('https')
const http     = require('http')
const fs       = require('fs')
const { URL }  = require('url')

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// Allow the React dev server and production origin
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/auth', require('./auth'))

// ── mTLS agent ───────────────────────────────────────────────────────────────

let mTLSAgent = null

const certPath = process.env.OFB_CERT_PATH
const keyPath  = process.env.OFB_KEY_PATH
const caPath   = process.env.OFB_CA_PATH  // Optional: OFB root CA bundle

if (certPath && keyPath) {
  try {
    const agentOptions = {
      cert: fs.readFileSync(certPath),
      key:  fs.readFileSync(keyPath),
      rejectUnauthorized: true,
    }
    if (caPath) agentOptions.ca = fs.readFileSync(caPath)

    mTLSAgent = new https.Agent(agentOptions)
    console.log(`[proxy] mTLS enabled — cert: ${certPath}`)
  } catch (err) {
    console.error(`[proxy] Failed to load mTLS certificates: ${err.message}`)
    process.exit(1)
  }
} else {
  console.log('[proxy] mTLS disabled — sandbox mode (no OFB_CERT_PATH / OFB_KEY_PATH set)')
}

// ── Fetch helper (node-fetch compatible, uses built-in fetch in Node 18+) ─────

async function bankFetch(url, options = {}) {
  const parsed  = new URL(url)
  const isHttps = parsed.protocol === 'https:'

  const fetchOptions = { ...options }
  if (isHttps && mTLSAgent) {
    fetchOptions.dispatcher = undefined  // for undici (Node 18 built-in fetch)
    // For node-fetch v2 / got / axios compatibility:
    fetchOptions.agent = mTLSAgent
  }

  // Node 18+ has global fetch; fall back to node-fetch if missing
  const fetchFn = globalThis.fetch ?? require('node-fetch')
  return fetchFn(url, fetchOptions)
}

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mTLS: mTLSAgent !== null, port: PORT })
})

// ── OpenID Connect discovery proxy ───────────────────────────────────────────
// POST /discovery
// body: { url: string }

app.post('/discovery', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  try {
    const upstream = await bankFetch(url, {
      headers: { Accept: 'application/json' },
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[proxy] discovery error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ── Authorization code → token exchange ───────────────────────────────────────
// POST /auth/token
// body: { tokenEndpoint, code, codeVerifier, clientId, redirectUri }
//    or { tokenEndpoint, grantType: 'refresh_token', refreshToken, clientId }

app.post('/auth/token', async (req, res) => {
  const { tokenEndpoint, code, codeVerifier, clientId, redirectUri,
          grantType, refreshToken } = req.body

  if (!tokenEndpoint) return res.status(400).json({ error: 'tokenEndpoint required' })

  const params = new URLSearchParams()

  if (grantType === 'refresh_token') {
    params.set('grant_type', 'refresh_token')
    params.set('refresh_token', refreshToken)
    params.set('client_id', clientId)
  } else {
    params.set('grant_type', 'authorization_code')
    params.set('code', code)
    params.set('code_verifier', codeVerifier)
    params.set('client_id', clientId)
    params.set('redirect_uri', redirectUri)
  }

  try {
    const upstream = await bankFetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[proxy] token exchange error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ── Consent creation ──────────────────────────────────────────────────────────
// POST /consent
// body: { consentEndpoint, tokenEndpoint, clientId, bankId, payload }
//
// Obtains a client-credentials token (scope=consents) then POSTs the consent.

app.post('/consent', async (req, res) => {
  const { consentEndpoint, tokenEndpoint, clientId, payload } = req.body
  if (!consentEndpoint || !tokenEndpoint) {
    return res.status(400).json({ error: 'consentEndpoint and tokenEndpoint required' })
  }

  try {
    // Step 1: Get client-credentials token for consent creation
    const ccParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      scope: 'consents',
    })

    const tokenRes = await bankFetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: ccParams.toString(),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      return res.status(tokenRes.status).json({ error: `Token failed: ${body}` })
    }

    const { access_token } = await tokenRes.json()

    // Step 2: Create consent
    const consentRes = await bankFetch(consentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'x-fapi-interaction-id': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    })

    const data = await consentRes.json()
    res.status(consentRes.status).json(data)
  } catch (err) {
    console.error('[proxy] consent error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ── Generic resource proxy ────────────────────────────────────────────────────
// POST /resource
// body: { url, method?, accessToken, body? }

app.post('/resource', async (req, res) => {
  const { url, method = 'GET', accessToken, body: requestBody } = req.body
  if (!url)         return res.status(400).json({ error: 'url required' })
  if (!accessToken) return res.status(400).json({ error: 'accessToken required' })

  try {
    const fetchOptions = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        // FAPI requires a unique interaction ID per request
        'x-fapi-interaction-id': crypto.randomUUID(),
        'x-fapi-date': new Date().toUTCString(),
      },
    }

    if (requestBody && method !== 'GET') {
      fetchOptions.body = JSON.stringify(requestBody)
      fetchOptions.headers['Content-Type'] = 'application/json'
    }

    const upstream = await bankFetch(url, fetchOptions)

    // Forward response headers relevant to pagination
    const pageHeaders = ['x-total-count', 'x-page', 'x-per-page']
    pageHeaders.forEach((h) => {
      const v = upstream.headers.get(h)
      if (v) res.setHeader(h, v)
    })

    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[proxy] resource error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('[proxy] unhandled error:', err)
  res.status(500).json({ error: 'Internal proxy error' })
})

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  FinTrack proxy — http://localhost:${PORT}`)
  console.log(`  mTLS:    ${mTLSAgent ? 'enabled' : 'disabled (sandbox mode)'}`)
  console.log(`  CORS:    ${ALLOWED_ORIGINS.join(', ')}`)
  console.log(`  Health:  http://localhost:${PORT}/health\n`)
})
