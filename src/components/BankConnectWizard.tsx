import { useState, useEffect } from 'react'
import { Search, ChevronRight, ShieldCheck, Loader2, ExternalLink } from 'lucide-react'
import type { OFBBank, OFBPermission } from '../types/openBanking'
import { KNOWN_BANKS, SCOPE_GROUPS, PERMISSION_LABELS, fetchBanksFromDirectory } from '../services/openBanking/banks'
import { startAuthorization, createConsent } from '../services/openBanking/oauth'

interface Props {
  onClose: () => void
}

type Step = 'select_bank' | 'select_scopes' | 'authorising'

export default function BankConnectWizard({ onClose }: Props) {
  const [step, setStep]           = useState<Step>('select_bank')
  const [banks, setBanks]         = useState<OFBBank[]>(KNOWN_BANKS)
  const [query, setQuery]         = useState('')
  const [selectedBank, setSelectedBank]   = useState<OFBBank | null>(null)
  const [enabledGroups, setEnabledGroups] = useState<Set<string>>(
    new Set(SCOPE_GROUPS.map((g) => g.key))
  )
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Try to load the live OFB directory
  useEffect(() => {
    fetchBanksFromDirectory(false).then(setBanks).catch(() => {})
  }, [])

  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()) ||
    b.legalName.toLowerCase().includes(query.toLowerCase())
  )

  function toggleGroup(key: string) {
    setEnabledGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function selectedPermissions(): OFBPermission[] {
    return SCOPE_GROUPS
      .filter((g) => enabledGroups.has(g.key))
      .flatMap((g) => [...g.permissions] as OFBPermission[])
  }

  async function handleAuthorise() {
    if (!selectedBank) return
    setLoading(true)
    setError(null)

    const permissions = selectedPermissions()
    if (permissions.length === 0) {
      setError('Select at least one data scope.')
      setLoading(false)
      return
    }

    setStep('authorising')

    try {
      // Attempt consent creation (requires proxy + client-credentials token).
      // If the proxy is not running in sandbox mode, this may fail gracefully
      // and we fall back to a direct authorization redirect without a consentId.
      let consentId: string | undefined
      try {
        consentId = await createConsent(selectedBank, permissions)
      } catch (consentErr) {
        console.warn('Consent creation failed (expected in sandbox):', consentErr)
      }

      // Redirect to bank — this navigates away from the page
      await startAuthorization(selectedBank, permissions, consentId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('select_scopes')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === 'select_bank'   && 'Connect a bank'}
              {step === 'select_scopes' && `Connect ${selectedBank?.name}`}
              {step === 'authorising'   && 'Redirecting to bank…'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Open Finance Brasil · OAuth 2.0 + PKCE</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── Step 1: select bank ───────────────────────────────────── */}
        {step === 'select_bank' && (
          <div className="flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search banks…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No banks found.</p>
              )}
              {filtered.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => { setSelectedBank(bank); setStep('select_scopes') }}
                  className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  {bank.logoUrl ? (
                    <img
                      src={bank.logoUrl}
                      alt={bank.name}
                      className="w-8 h-8 rounded object-contain shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {bank.name[0]}
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900">{bank.name}</div>
                    <div className="text-xs text-gray-400 truncate">{bank.legalName}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: select scopes ─────────────────────────────────── */}
        {step === 'select_scopes' && selectedBank && (
          <div className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <p className="text-sm text-gray-500">
                Choose which data you want to share from{' '}
                <strong className="text-gray-800">{selectedBank.name}</strong>.
                You can revoke access at any time from your bank's app.
              </p>

              {SCOPE_GROUPS.map((group) => {
                const enabled = enabledGroups.has(group.key)
                return (
                  <div
                    key={group.key}
                    className={`border rounded-xl overflow-hidden transition-colors ${
                      enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between px-4 py-3"
                    >
                      <span className={`text-sm font-medium ${enabled ? 'text-blue-800' : 'text-gray-700'}`}>
                        {group.label}
                      </span>
                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>
                    {enabled && (
                      <div className="px-4 pb-3 space-y-1">
                        {group.permissions.map((p) => (
                          <div key={p} className="flex items-center gap-2 text-xs text-blue-700">
                            <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                            {PERMISSION_LABELS[p] ?? p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Trust notice */}
              <div className="flex gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  You will be redirected to <strong>{selectedBank.name}</strong> to authenticate and
                  grant consent. FinTrack never stores your banking credentials.
                  Data is read-only under the Open Finance Brasil framework.{' '}
                  <a
                    href="https://openfinancebrasil.org.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setStep('select_bank')}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAuthorise}
                disabled={loading || enabledGroups.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Authorise at bank
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: redirecting ───────────────────────────────────── */}
        {step === 'authorising' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-600 text-center">
              Opening <strong>{selectedBank?.name}</strong> for authorisation…
            </p>
            <p className="text-xs text-gray-400 text-center">
              You will be redirected back to FinTrack after completing the process.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
