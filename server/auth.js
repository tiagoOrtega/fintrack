/**
 * FinTrack — login routes
 *
 * Mounted at /auth in proxy.js. Handles self-hosted email/password accounts
 * and "Continue with Google" login, backed by the JSON file store in store.js.
 *
 * Accounts are keyed by lowercased email. A password account and a Google
 * account sharing the same email are auto-linked into a single account —
 * deliberate tradeoff for a small, trusted self-hosted deployment (see
 * README for the account-takeover caveat this implies).
 */

'use strict'

const express      = require('express')
const bcrypt       = require('bcryptjs')
const jwt          = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')
const store         = require('./store')

const router = express.Router()

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID ?? ''
const JWT_EXPIRES_IN   = process.env.JWT_EXPIRES_IN ?? '30d'

let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  JWT_SECRET = require('crypto').randomBytes(48).toString('hex')
  console.warn(
    '[auth] JWT_SECRET not set — using an ephemeral secret; all sessions will be invalidated on restart. ' +
    'Set JWT_SECRET in .env for production.'
  )
}

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

function toPublicUser(user) {
  return { id: user.id, email: user.email, displayName: user.displayName }
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, tv: user.tokenVersion }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  store.findById(payload.sub).then((user) => {
    if (!user || user.tokenVersion !== payload.tv) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.user = user
    next()
  }).catch(next)
}

// ── POST /auth/register ───────────────────────────────────────────────────
// body: { email, password, displayName? }

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body ?? {}
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.toLowerCase()
    const existing = await store.findByEmail(normalizedEmail)

    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    let user

    if (existing) {
      // Google-only account — link a password onto it
      user = await store.updateUser(existing.id, {
        passwordHash,
        displayName: existing.displayName ?? displayName ?? null,
      })
    } else {
      user = await store.createUser({
        email: normalizedEmail,
        passwordHash,
        displayName: displayName ?? null,
      })
    }

    res.json({ token: issueToken(user), user: toPublicUser(user) })
  } catch (err) {
    console.error('[auth] register error:', err.message)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// ── POST /auth/login ───────────────────────────────────────────────────────
// body: { email, password }

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const user = await store.findByEmail(email.toLowerCase())
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' })

    res.json({ token: issueToken(user), user: toPublicUser(user) })
  } catch (err) {
    console.error('[auth] login error:', err.message)
    res.status(500).json({ error: 'Login failed' })
  }
})

// ── POST /auth/google ──────────────────────────────────────────────────────
// body: { idToken }

router.post('/google', async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ error: 'Google login is not configured on this server' })
    }

    const { idToken } = req.body ?? {}
    if (typeof idToken !== 'string' || !idToken) {
      return res.status(400).json({ error: 'idToken required' })
    }

    let payload
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
      payload = ticket.getPayload()
    } catch (err) {
      return res.status(401).json({ error: `Invalid Google token: ${err.message}` })
    }

    if (!payload?.email_verified) {
      return res.status(401).json({ error: 'Google email not verified' })
    }

    const normalizedEmail = String(payload.email).toLowerCase()
    let user = await store.findByGoogleSub(payload.sub)

    if (!user) {
      const existing = await store.findByEmail(normalizedEmail)
      if (existing) {
        user = await store.updateUser(existing.id, { googleSub: payload.sub })
      } else {
        user = await store.createUser({
          email: normalizedEmail,
          googleSub: payload.sub,
          displayName: payload.name ?? null,
        })
      }
    }

    res.json({ token: issueToken(user), user: toPublicUser(user) })
  } catch (err) {
    console.error('[auth] google login error:', err.message)
    res.status(500).json({ error: 'Google login failed' })
  }
})

// ── GET /auth/me ────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) })
})

module.exports = router
