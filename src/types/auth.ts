export interface AuthUser {
  id: string
  email: string
  displayName: string | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
}
