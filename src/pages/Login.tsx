import { useState, useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Wallet, XCircle, Loader2 } from 'lucide-react'
import { useAuthCtx } from '../context/AuthContext'
import { startGoogleAuth, handleGoogleCallback, googleClientConfigured } from '../services/googleSheets/auth'
import { connectOrRefreshFromTokens } from '../hooks/useGoogleSheets'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl      = 'block text-xs font-medium text-gray-600 mb-1'

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

export default function Login() {
  const { status, loginWithPassword, registerWithPassword, loginWithGoogleIdToken } = useAuthCtx()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [mode, setMode]               = useState<'login' | 'register'>('login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)
  const [handlingGoogle, setHandlingGoogle] = useState(false)

  // Handle Google OAuth redirect: /login?code=XXX&state=YYY
  useEffect(() => {
    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code || !state) return

    setSearchParams({}, { replace: true })
    setHandlingGoogle(true)
    setFormError(null)
    ;(async () => {
      try {
        const tokens = await handleGoogleCallback(code, state, '/login')
        const { user } = await loginWithGoogleIdToken(tokens.idToken)
        await connectOrRefreshFromTokens(user.id, tokens)
        navigate('/', { replace: true })
      } catch (err) {
        setFormError(err instanceof Error ? err.message : String(err))
        setHandlingGoogle(false)
      }
    })()
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function onGoogleClick() {
    if (!googleClientConfigured()) {
      setFormError('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file and restart the dev server.')
      return
    }
    await startGoogleAuth('/login')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await registerWithPassword(email, password, displayName || undefined)
      } else {
        await loginWithPassword(email, password)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (handlingGoogle) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          Signing in with Google…
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Wallet className="w-7 h-7 text-blue-600" />
          <span className="font-bold text-xl tracking-tight text-gray-900">FinTrack</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex mb-6 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Create account
            </button>
          </div>

          {formError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">
              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className={lbl}>Name (optional)</label>
                <input
                  className={inputCls}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className={lbl}>Email</label>
              <input
                type="email"
                required
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={lbl}>Password</label>
              <input
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <button
            onClick={() => void onGoogleClick()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <GoogleG />
            Continue with Google
          </button>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Continuing with Google also connects Google Sheets backup.
          </p>
        </div>
      </div>
    </div>
  )
}
