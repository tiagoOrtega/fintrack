import { useState, useCallback, useRef, useEffect } from 'react'
import type { AppStore } from '../types'
import type { GoogleSheetsConfig } from '../types/googleSheets'
import { GS_CONFIG_KEY, DEFAULT_GS_CONFIG } from '../types/googleSheets'
import {
  startGoogleAuth,
  handleGoogleCallback,
  refreshGoogleToken,
  googleClientConfigured,
} from '../services/googleSheets/auth'
import { createSpreadsheet } from '../services/googleSheets/api'
import { pushToSheets } from '../services/googleSheets/sync'

function loadConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(GS_CONFIG_KEY)
    if (raw) return { ...DEFAULT_GS_CONFIG, ...(JSON.parse(raw) as GoogleSheetsConfig) }
  } catch { /* ignore */ }
  return { ...DEFAULT_GS_CONFIG }
}

function saveConfig(config: GoogleSheetsConfig): void {
  localStorage.setItem(GS_CONFIG_KEY, JSON.stringify(config))
}

export function useGoogleSheets() {
  const [config, setConfig] = useState<GoogleSheetsConfig>(loadConfig)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastError,    setLastError]    = useState<string | null>(null)

  // Always-current config reference so async callbacks don't close over stale state
  const configRef     = useRef(config)
  const syncLock      = useRef(false)
  const pendingStore  = useRef<AppStore | null>(null)

  const update = useCallback((next: GoogleSheetsConfig) => {
    configRef.current = next
    setConfig(next)
    saveConfig(next)
  }, [])

  // Keep configRef in sync on every render (covers external updates)
  useEffect(() => { configRef.current = config }, [config])

  // ── Token management ────────────────────────────────────────────────────

  const ensureValidToken = useCallback(async (): Promise<string> => {
    const cfg = configRef.current
    // Refresh 60 s before expiry to avoid in-flight failures
    if (Date.now() < cfg.tokenExpiry - 60_000) return cfg.accessToken

    const { accessToken, tokenExpiry } = await refreshGoogleToken(cfg.refreshToken)
    update({ ...configRef.current, accessToken, tokenExpiry })
    return accessToken
  }, [update])

  // ── Connection flow ─────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!googleClientConfigured()) {
      setLastError('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file and restart the dev server.')
      return
    }
    await startGoogleAuth()   // redirects the page
  }, [])

  const finishConnect = useCallback(async (code: string, state: string): Promise<boolean> => {
    setIsConnecting(true)
    setLastError(null)
    try {
      const tokens     = await handleGoogleCallback(code, state)
      const { id, url } = await createSpreadsheet(tokens.accessToken)
      update({
        ...DEFAULT_GS_CONFIG,
        connected:     true,
        ...tokens,
        spreadsheetId:  id,
        spreadsheetUrl: url,
        autoSync:       true,
      })
      return true
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setIsConnecting(false)
    }
  }, [update])

  const disconnect = useCallback(() => {
    update({ ...DEFAULT_GS_CONFIG })
    setLastError(null)
  }, [update])

  // ── Sync ────────────────────────────────────────────────────────────────

  const syncNow = useCallback(async (store: AppStore): Promise<void> => {
    const cfg = configRef.current
    if (!cfg.connected || !cfg.spreadsheetId) return

    if (syncLock.current) {
      pendingStore.current = store    // queue; the current sync will flush it
      return
    }

    syncLock.current = true
    setIsSyncing(true)
    setLastError(null)

    // Process the initial store and any that queued up during the await
    let current: AppStore | null = store
    while (current) {
      const toSync = current
      current = null
      try {
        const accessToken = await ensureValidToken()
        await pushToSheets(accessToken, configRef.current.spreadsheetId, toSync)
        update({ ...configRef.current, lastSyncAt: new Date().toISOString() })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setLastError(msg)
        if (msg === 'TOKEN_EXPIRED') {
          update({ ...configRef.current, connected: false })
        }
        break
      }
      current = pendingStore.current
      pendingStore.current = null
    }

    syncLock.current = false
    setIsSyncing(false)
  }, [ensureValidToken, update])

  return {
    config,
    isSyncing,
    isConnecting,
    lastError,
    isConnected:  config.connected,
    connect,
    finishConnect,
    disconnect,
    syncNow,
  }
}
