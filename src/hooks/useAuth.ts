import { useState, useCallback, useEffect } from 'react'
import type { AuthUser, AuthResponse } from '../types/auth'
import { register, login, loginWithGoogle, fetchMe } from '../services/auth/api'
import { migrateLegacyStorageForUser } from '../utils/migrateLegacyStorage'

const TOKEN_KEY = 'fintrack_auth_token'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth() {
  const [token, setToken]   = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser]     = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError]   = useState<string | null>(null)

  // Rehydrate the session from a stored token once on mount
  useEffect(() => {
    if (!token) {
      setStatus('unauthenticated')
      return
    }
    fetchMe(token)
      .then((u) => {
        migrateLegacyStorageForUser(u.id)
        setUser(u)
        setStatus('authenticated')
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setStatus('unauthenticated')
      })
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback((res: AuthResponse) => {
    migrateLegacyStorageForUser(res.user.id)
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    setStatus('authenticated')
    setError(null)
  }, [])

  const registerWithPassword = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setError(null)
      try {
        persist(await register(email, password, displayName))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        throw err
      }
    },
    [persist]
  )

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      setError(null)
      try {
        persist(await login(email, password))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        throw err
      }
    },
    [persist]
  )

  const loginWithGoogleIdToken = useCallback(
    async (idToken: string): Promise<AuthResponse> => {
      setError(null)
      try {
        const res = await loginWithGoogle(idToken)
        persist(res)
        return res
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        throw err
      }
    },
    [persist]
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  return {
    status,
    user,
    token,
    error,
    registerWithPassword,
    loginWithPassword,
    loginWithGoogleIdToken,
    logout,
  }
}
