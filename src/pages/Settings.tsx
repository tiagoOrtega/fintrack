import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { useStoreCtx } from '../context/StoreContext'
import PageHeader from '../components/PageHeader'
import type { AppSettings } from '../types'
import {
  Save, AlertTriangle, FileSpreadsheet,
  RefreshCw, CheckCircle, XCircle, ExternalLink, Loader2,
} from 'lucide-react'

const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl      = 'block text-xs font-medium text-gray-600 mb-1'

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff    = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1)  return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

// ── Google Sheets card — disconnected ──────────────────────────────────────────

function DisconnectedCard() {
  const { googleSheets: gs } = useStoreCtx()

  if (gs.isConnecting) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Google Sheets Backup
        </h3>
        <div className="flex items-center gap-3 py-3 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          Connecting to Google Sheets…
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-green-600" />
        Google Sheets Backup
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Connect your Google account to save a live copy of all your investments, expenses, and
        settings to a Google Spreadsheet. Changes sync automatically 1.5 s after you make them.
      </p>

      {gs.lastError && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">
          <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {gs.lastError}
        </div>
      )}

      <button
        onClick={() => void gs.connect()}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <GoogleG />
        Sign in with Google
      </button>

      <p className="text-xs text-gray-400 mt-3">
        Requires <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in
        your <code className="bg-gray-100 px-1 rounded">.env</code> file.
        See README → Google Sheets Backup for setup.
      </p>
    </div>
  )
}

// ── Google Sheets card — connected ─────────────────────────────────────────────

function ConnectedCard() {
  const { googleSheets: gs, investments, expenses, settings, connectedBanks } = useStoreCtx()
  const store = { investments, expenses, settings, connectedBanks }

  return (
    <div className="bg-white rounded-xl border border-green-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-green-600" />
        Google Sheets Backup
        <span className="ml-auto flex items-center gap-1 text-xs font-normal text-green-600">
          <CheckCircle className="w-3.5 h-3.5" />
          Connected
        </span>
      </h3>

      <dl className="space-y-2 text-xs mb-4">
        {[
          ['Account',     gs.config.userEmail],
          ['Last synced', relativeTime(gs.config.lastSyncAt)],
          ['Auto-sync',   gs.config.autoSync ? 'On — changes save automatically' : 'Off'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-gray-600">
            <dt className="text-gray-400">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between text-gray-600">
          <dt className="text-gray-400">Spreadsheet</dt>
          <dd>
            <a
              href={gs.config.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              FinTrack Data <ExternalLink className="w-3 h-3" />
            </a>
          </dd>
        </div>
      </dl>

      {gs.lastError && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-3">
          <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {gs.lastError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => void gs.syncNow(store)}
          disabled={gs.isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${gs.isSyncing ? 'animate-spin' : ''}`} />
          {gs.isSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <button
          onClick={gs.disconnect}
          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Settings() {
  const { settings, updateSettings, investments, expenses, googleSheets: gs } = useStoreCtx()
  const [searchParams, setSearchParams] = useSearchParams()

  const { register, handleSubmit } = useForm<AppSettings>({ defaultValues: settings })

  // Handle Google OAuth redirect: /settings?code=XXX&state=YYY
  useEffect(() => {
    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    if (code && state) {
      setSearchParams({}, { replace: true })
      void gs.finishConnect(code, state)
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onSubmit(data: AppSettings) {
    updateSettings({
      ...data,
      monthlyIncomeGoal: Number(data.monthlyIncomeGoal),
      savingsGoal:       Number(data.savingsGoal),
    })
    alert('Settings saved!')
  }

  function clearAllData() {
    if (confirm('Delete ALL data? This cannot be undone.')) {
      localStorage.clear()
      location.reload()
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title="Settings" subtitle="Configure your preferences and goals" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">General</h3>
          <div>
            <label className={lbl}>Base Currency</label>
            <select {...register('baseCurrency')} className={inputCls}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Used to display all monetary values.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Goals</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Monthly Income Goal</label>
              <input
                {...register('monthlyIncomeGoal', { valueAsNumber: true, min: 0 })}
                type="number" step="any" className={inputCls} placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-1">Used to calculate your savings rate on the dashboard.</p>
            </div>
            <div>
              <label className={lbl}>Savings Goal</label>
              <input
                {...register('savingsGoal', { valueAsNumber: true, min: 0 })}
                type="number" step="any" className={inputCls} placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-1">Total savings target.</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </form>

      {/* Google Sheets backup */}
      <div className="mt-8">
        {gs.isConnected ? <ConnectedCard /> : <DisconnectedCard />}
      </div>

      {/* Data summary */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{investments.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Investments</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{expenses.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Expenses</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {gs.isConnected
            ? 'Data is stored locally and automatically synced to your Google Spreadsheet.'
            : "All data is stored in your browser's localStorage. Connect Google Sheets above for remote backup."}
        </p>
      </div>

      {/* Danger zone */}
      <div className="mt-6 bg-red-50 rounded-xl border border-red-200 p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-xs text-red-600 mb-3">
          This will permanently delete all your investments, expenses, and settings.
        </p>
        <button
          type="button"
          onClick={clearAllData}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear All Data
        </button>
      </div>
    </div>
  )
}
