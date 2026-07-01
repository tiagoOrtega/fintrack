import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Landmark, AlertTriangle, Info } from 'lucide-react'
import { useStoreCtx } from '../context/StoreContext'
import PageHeader from '../components/PageHeader'
import BankCard from '../components/BankCard'
import BankConnectWizard from '../components/BankConnectWizard'
import type { ConnectedBank } from '../types/openBanking'
import { KNOWN_BANKS } from '../services/openBanking/banks'
import { handleCallback, exchangeCode } from '../services/openBanking/oauth'
import { syncBank } from '../services/openBanking/sync'

export default function Banks() {
  const { connectedBanks, addConnectedBank, updateConnectedBank, removeConnectedBank,
          addInvestment, addExpense } = useStoreCtx()

  const [showWizard, setShowWizard] = useState(false)
  const [syncingId, setSyncingId]   = useState<string | null>(null)
  const [notice, setNotice]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Handle OAuth callback ──────────────────────────────────────────────────
  useEffect(() => {
    const code  = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      const desc = searchParams.get('error_description') ?? error
      setNotice({ type: 'error', msg: `Authorisation failed: ${desc}` })
      setSearchParams({}, { replace: true })
      return
    }

    if (!code) return

    // Clear the query string immediately so a page refresh doesn't re-process
    setSearchParams({}, { replace: true })

    ;(async () => {
      try {
        const { code: authCode, bankId, codeVerifier } = handleCallback(
          `?code=${code}&state=${searchParams.get('state') ?? ''}`
        )

        const bank = KNOWN_BANKS.find((b) => b.id === bankId)
        if (!bank) throw new Error('Unknown bank in callback')

        const tokenRes = await exchangeCode(bank, authCode, codeVerifier)

        const connection: ConnectedBank = {
          id: crypto.randomUUID(),
          bankId: bank.id,
          bankName: bank.name,
          bankLogo: bank.logoUrl,
          accessToken: tokenRes.access_token,
          refreshToken: tokenRes.refresh_token,
          tokenExpiry: Date.now() + tokenRes.expires_in * 1000,
          permissions: [],     // will be set on first sync
          connectedAt: new Date().toISOString(),
          accounts: [],
        }

        addConnectedBank(connection)
        setNotice({ type: 'success', msg: `${bank.name} connected! Run Sync to import your data.` })

        // Kick off first sync automatically
        await doSync(connection)
      } catch (err) {
        setNotice({
          type: 'error',
          msg: err instanceof Error ? err.message : String(err),
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync ──────────────────────────────────────────────────────────────────
  async function doSync(connection: ConnectedBank) {
    const bank = KNOWN_BANKS.find((b) => b.id === connection.bankId)
    if (!bank) return

    setSyncingId(connection.id)
    try {
      const result = await syncBank(bank, connection.accessToken, connection.permissions.length
        ? connection.permissions
        : ['ACCOUNTS_READ', 'ACCOUNTS_BALANCES_READ', 'ACCOUNTS_TRANSACTIONS_READ',
           'CREDIT_CARDS_ACCOUNTS_READ', 'CREDIT_CARDS_ACCOUNTS_LIMITS_READ',
           'CREDIT_CARDS_ACCOUNTS_TRANSACTIONS_READ',
           'VARIABLE_INCOMES_READ', 'BANK_FIXED_INCOMES_READ',
           'TREASURE_TITLES_READ', 'FUNDS_READ'] as ConnectedBank['permissions'])

      // Push investments and expenses into the main store
      result.investments.forEach((inv) => addInvestment(inv))
      result.expenses.forEach((exp) => addExpense(exp))

      updateConnectedBank(connection.id, {
        accounts: result.accounts,
        lastSyncAt: result.syncedAt,
      })

      const msg = [
        result.investments.length && `${result.investments.length} investments`,
        result.expenses.length && `${result.expenses.length} expenses`,
        result.accounts.length && `${result.accounts.length} accounts`,
      ].filter(Boolean).join(', ')

      setNotice({ type: 'success', msg: `Synced ${bank.name}: ${msg || 'no new data'}.` })

      if (result.errors.length) {
        console.warn('[sync] partial errors:', result.errors)
      }
    } catch (err) {
      setNotice({
        type: 'error',
        msg: `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setSyncingId(null)
    }
  }

  function handleSync(id: string) {
    const conn = connectedBanks.find((b) => b.id === id)
    if (conn) doSync(conn)
  }

  function handleDisconnect(id: string) {
    removeConnectedBank(id)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Connected Banks"
        subtitle="Open Finance Brasil — read-only access via OAuth 2.0"
        action={
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Connect bank
          </button>
        }
      />

      {/* Notice banner */}
      {notice && (
        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-6 ${
            notice.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notice.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="flex-1">{notice.msg}</span>
          <button onClick={() => setNotice(null)} className="text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* How it works callout — shown only when no banks connected */}
      {connectedBanks.length === 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 font-semibold text-blue-900 text-sm mb-3">
            <Info className="w-4 h-4" />
            How it works
          </div>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2"><span className="font-bold shrink-0">1.</span>Select your bank from the list of Open Finance Brasil participants.</li>
            <li className="flex gap-2"><span className="font-bold shrink-0">2.</span>Choose which data to share: accounts, cards, and/or investments.</li>
            <li className="flex gap-2"><span className="font-bold shrink-0">3.</span>Authenticate at your bank's secure page — FinTrack never sees your password.</li>
            <li className="flex gap-2"><span className="font-bold shrink-0">4.</span>Your data imports automatically. You can sync again at any time.</li>
          </ol>
          <p className="mt-3 text-xs text-blue-600">
            Access is read-only. You can revoke it from your bank's app at any time.
            Governed by Resolução BCB n° 32/2020.
          </p>
        </div>
      )}

      {/* Connected banks list */}
      {connectedBanks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {connectedBanks.map((conn) => (
            <BankCard
              key={conn.id}
              connection={conn}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              syncing={syncingId === conn.id}
            />
          ))}
        </div>
      )}

      {connectedBanks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Landmark className="w-12 h-12 text-gray-200" />
          <p className="text-sm">No banks connected yet.</p>
        </div>
      )}

      {/* Proxy status */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
        <strong className="text-gray-700">Local proxy required.</strong> The Open Finance Brasil
        integration requires the FinTrack proxy server to be running on{' '}
        <code className="font-mono bg-gray-100 px-1 rounded">http://localhost:3001</code>.
        Run <code className="font-mono bg-gray-100 px-1 rounded">npm run proxy</code> in a second
        terminal, or use <code className="font-mono bg-gray-100 px-1 rounded">setup.ps1</code>{' '}
        /{' '}
        <code className="font-mono bg-gray-100 px-1 rounded">setup.sh</code> which starts both
        automatically.
      </div>

      {showWizard && <BankConnectWizard onClose={() => setShowWizard(false)} />}
    </div>
  )
}
