import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthCtx } from '../context/AuthContext'
import { StoreProvider } from '../context/StoreContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthCtx()

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function AuthedStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthCtx()
  // Safe: RequireAuth already gated on status === 'authenticated', which
  // only ever sets a non-null user.
  return <StoreProvider userId={user!.id}>{children}</StoreProvider>
}
