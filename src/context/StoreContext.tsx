import { createContext, useContext, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../hooks/useStore'
import { useGoogleSheets } from '../hooks/useGoogleSheets'

type StoreContextType = ReturnType<typeof useStore> & {
  googleSheets: ReturnType<typeof useGoogleSheets>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const gs    = useGoogleSheets()

  // Track latest store in a ref so the debounced callback always sees fresh data
  const latestStore    = useRef(store)
  const syncTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isFirstRender  = useRef(true)

  useEffect(() => { latestStore.current = store })

  const { isConnected, config, syncNow } = gs

  // Auto-sync to Google Sheets 1.5 s after any data change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!isConnected || !config.autoSync) return

    clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      void syncNow(latestStore.current)
    }, 1500)

    return () => clearTimeout(syncTimerRef.current)
  }, [
    store.investments,
    store.expenses,
    store.settings,
    store.connectedBanks,
    isConnected,
    config.autoSync,
    syncNow,
  ])

  return (
    <StoreContext.Provider value={{ ...store, googleSheets: gs }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStoreCtx(): StoreContextType {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStoreCtx must be used inside StoreProvider')
  return ctx
}
