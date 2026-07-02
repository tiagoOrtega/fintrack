import type { AuthResponse, AuthUser } from '../../types/auth'

const PROXY_BASE = (import.meta.env.VITE_PROXY_URL as string) ?? 'http://localhost:3001'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export function register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) })
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const { user } = await request<{ user: AuthUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return user
}
