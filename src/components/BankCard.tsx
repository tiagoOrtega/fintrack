import { RefreshCw, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { ConnectedBank } from '../types/openBanking'
import { formatCurrency, formatDate } from '../utils/format'

interface Props {
  connection: ConnectedBank
  onSync: (id: string) => void
  onDisconnect: (id: string) => void
  syncing: boolean
}

function tokenStatus(expiry: number): 'valid' | 'expiring' | 'expired' {
  const remaining = expiry - Date.now()
  if (remaining <= 0) return 'expired'
  if (remaining < 5 * 60 * 1000) return 'expiring'
  return 'valid'
}

export default function BankCard({ connection, onSync, onDisconnect, syncing }: Props) {
  const status = tokenStatus(connection.tokenExpiry)
  const totalBalance = connection.accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {connection.bankLogo ? (
            <img
              src={connection.bankLogo}
              alt={connection.bankName}
              className="w-8 h-8 rounded object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {connection.bankName[0]}
            </div>
          )}
          <div>
            <div className="font-semibold text-sm text-gray-900">{connection.bankName}</div>
            <div className="text-xs text-gray-400">
              Connected {formatDate(connection.connectedAt)}
            </div>
          </div>
        </div>

        {/* Token status badge */}
        <span
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            status === 'valid'
              ? 'bg-green-50 text-green-700'
              : status === 'expiring'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {status === 'valid' && <CheckCircle className="w-3 h-3" />}
          {status === 'expiring' && <Clock className="w-3 h-3" />}
          {status === 'expired' && <AlertCircle className="w-3 h-3" />}
          {status === 'valid' ? 'Active' : status === 'expiring' ? 'Expiring' : 'Expired'}
        </span>
      </div>

      {/* Accounts */}
      {connection.accounts.length > 0 && (
        <div className="px-5 py-3 space-y-2">
          {connection.accounts.map((acc) => (
            <div key={acc.accountId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    acc.type === 'credit_card' ? 'bg-purple-400' :
                    acc.type === 'savings'     ? 'bg-green-400' : 'bg-blue-400'
                  }`}
                />
                <span className="text-gray-600 text-xs">{acc.label}</span>
              </div>
              <span
                className={`font-medium text-xs tabular-nums ${
                  acc.balance < 0 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {formatCurrency(acc.balance, acc.currency)}
                {acc.limit != null && (
                  <span className="text-gray-400 font-normal">
                    {' '}/ {formatCurrency(acc.limit, acc.currency)}
                  </span>
                )}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
            <span className="text-gray-400">Net balance</span>
            <span
              className={`font-semibold tabular-nums ${
                totalBalance >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}
            >
              {formatCurrency(totalBalance, 'BRL')}
            </span>
          </div>
        </div>
      )}

      {connection.accounts.length === 0 && (
        <div className="px-5 py-4 text-xs text-gray-400">
          No account data yet — sync to load balances.
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {connection.lastSyncAt
            ? `Last sync ${formatDate(connection.lastSyncAt)}`
            : 'Never synced'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSync(connection.id)}
            disabled={syncing || status === 'expired'}
            title={status === 'expired' ? 'Token expired — reconnect the bank' : 'Sync now'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Disconnect ${connection.bankName}? Synced data will be kept.`))
                onDisconnect(connection.id)
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Disconnect"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
