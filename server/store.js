/**
 * FinTrack — user account store
 *
 * JSON-file-backed persistence for login accounts (server/data/users.json).
 * No database dependency — writes are serialized through an in-memory
 * promise-chain mutex and committed atomically (write to a temp file, then
 * rename) since concurrent read-modify-write races would otherwise be
 * possible even in a single Node process.
 */

'use strict'

const fs   = require('fs')
const path = require('path')

const DATA_DIR  = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'users.json')

let queue = Promise.resolve()

function withLock(fn) {
  const run = queue.then(fn, fn)
  queue = run.then(() => undefined, () => undefined)
  return run
}

function readUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
}

function writeUsers(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmpFile, JSON.stringify(users, null, 2))
  fs.renameSync(tmpFile, DATA_FILE)
}

function findByEmail(email) {
  return withLock(() => {
    const users = readUsers()
    return users.find((u) => u.email === email) ?? null
  })
}

function findById(id) {
  return withLock(() => {
    const users = readUsers()
    return users.find((u) => u.id === id) ?? null
  })
}

function findByGoogleSub(googleSub) {
  return withLock(() => {
    const users = readUsers()
    return users.find((u) => u.googleSub === googleSub) ?? null
  })
}

function createUser(partial) {
  return withLock(() => {
    const users = readUsers()
    const now = new Date().toISOString()
    const user = {
      id: crypto.randomUUID(),
      email: partial.email,
      passwordHash: partial.passwordHash ?? null,
      googleSub: partial.googleSub ?? null,
      displayName: partial.displayName ?? null,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    }
    users.push(user)
    writeUsers(users)
    return user
  })
}

function updateUser(id, patch) {
  return withLock(() => {
    const users = readUsers()
    const idx = users.findIndex((u) => u.id === id)
    if (idx === -1) return null
    users[idx] = { ...users[idx], ...patch, id: users[idx].id, updatedAt: new Date().toISOString() }
    writeUsers(users)
    return users[idx]
  })
}

module.exports = { findByEmail, findById, findByGoogleSub, createUser, updateUser }
