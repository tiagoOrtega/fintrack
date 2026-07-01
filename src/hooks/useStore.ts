import { useState, useCallback } from 'react'
import type { AppStore, Investment, Expense, AppSettings } from '../types'
import type { ConnectedBank } from '../types/openBanking'

const STORAGE_KEY = 'fintrack_data'

const DEFAULT_SETTINGS: AppSettings = {
  baseCurrency: 'BRL',
  monthlyIncomeGoal: 0,
  savingsGoal: 0,
}

function loadStore(): AppStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppStore
      // Backfill connectedBanks for existing stores that predate this field
      return { ...parsed, connectedBanks: parsed.connectedBanks ?? [] }
    }
  } catch {
    // ignore parse errors
  }
  return { investments: [], expenses: [], settings: DEFAULT_SETTINGS, connectedBanks: [] }
}

function saveStore(store: AppStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function useStore() {
  const [store, setStore] = useState<AppStore>(loadStore)

  const update = useCallback((next: AppStore) => {
    setStore(next)
    saveStore(next)
  }, [])

  // ── Investments ────────────────────────────────────────────────────────────
  const addInvestment = useCallback(
    (data: Omit<Investment, 'id'>) => {
      update({ ...store, investments: [...store.investments, { ...data, id: crypto.randomUUID() }] })
    },
    [store, update]
  )

  const updateInvestment = useCallback(
    (id: string, data: Partial<Omit<Investment, 'id'>>) => {
      update({
        ...store,
        investments: store.investments.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)),
      })
    },
    [store, update]
  )

  const deleteInvestment = useCallback(
    (id: string) => {
      update({ ...store, investments: store.investments.filter((inv) => inv.id !== id) })
    },
    [store, update]
  )

  // ── Expenses ───────────────────────────────────────────────────────────────
  const addExpense = useCallback(
    (data: Omit<Expense, 'id'>) => {
      update({ ...store, expenses: [...store.expenses, { ...data, id: crypto.randomUUID() }] })
    },
    [store, update]
  )

  const updateExpense = useCallback(
    (id: string, data: Partial<Omit<Expense, 'id'>>) => {
      update({
        ...store,
        expenses: store.expenses.map((exp) => (exp.id === id ? { ...exp, ...data } : exp)),
      })
    },
    [store, update]
  )

  const deleteExpense = useCallback(
    (id: string) => {
      update({ ...store, expenses: store.expenses.filter((exp) => exp.id !== id) })
    },
    [store, update]
  )

  // ── Settings ───────────────────────────────────────────────────────────────
  const updateSettings = useCallback(
    (data: Partial<AppSettings>) => {
      update({ ...store, settings: { ...store.settings, ...data } })
    },
    [store, update]
  )

  // ── Connected banks ────────────────────────────────────────────────────────
  const addConnectedBank = useCallback(
    (bank: ConnectedBank) => {
      update({ ...store, connectedBanks: [...store.connectedBanks, bank] })
    },
    [store, update]
  )

  const updateConnectedBank = useCallback(
    (id: string, data: Partial<ConnectedBank>) => {
      update({
        ...store,
        connectedBanks: store.connectedBanks.map((b) =>
          b.id === id ? { ...b, ...data } : b
        ),
      })
    },
    [store, update]
  )

  const removeConnectedBank = useCallback(
    (id: string) => {
      update({ ...store, connectedBanks: store.connectedBanks.filter((b) => b.id !== id) })
    },
    [store, update]
  )

  return {
    investments: store.investments,
    expenses: store.expenses,
    settings: store.settings,
    connectedBanks: store.connectedBanks,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addExpense,
    updateExpense,
    deleteExpense,
    updateSettings,
    addConnectedBank,
    updateConnectedBank,
    removeConnectedBank,
  }
}
