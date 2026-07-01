/**
 * Open Finance Brasil — Bank directory
 *
 * The authoritative source is the OFB Participant Directory API:
 *   Production: https://data.directory.openbankingbrasil.org.br/participants
 *   Sandbox:    https://data.sandbox.directory.openbankingbrasil.org.br/participants
 *
 * fetchBanksFromDirectory() loads from the live directory.
 * KNOWN_BANKS provides a curated fallback list for when the directory is unreachable.
 */

import type { OFBBank, OFBParticipant } from '../../types/openBanking'

const DIRECTORY_URL =
  'https://data.directory.openbankingbrasil.org.br/participants'

const SANDBOX_DIRECTORY_URL =
  'https://data.sandbox.directory.openbankingbrasil.org.br/participants'

/** Major Open Finance Brasil participants with known endpoints */
export const KNOWN_BANKS: OFBBank[] = [
  {
    id: 'b961c4eb-509d-4edf-afea-2d7f7a741f19',
    ispb: '00000000',
    name: 'Banco do Brasil',
    legalName: 'Banco do Brasil S.A.',
    logoUrl:
      'https://logospng.org/download/banco-do-brasil/logo-banco-do-brasil-256.png',
    authServerUrl: 'https://auth.bb.com.br',
    discoveryUrl:
      'https://auth.bb.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://openfinance.bb.com.br',
    sandboxMode: false,
  },
  {
    id: '17c964a7-e91a-4297-8f27-e6e3e5aaec10',
    ispb: '60746948',
    name: 'Bradesco',
    legalName: 'Banco Bradesco S.A.',
    logoUrl:
      'https://logospng.org/download/bradesco/logo-bradesco-256.png',
    authServerUrl: 'https://auth.openbanking.bradesco',
    discoveryUrl:
      'https://auth.openbanking.bradesco/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.openbanking.bradesco',
    sandboxMode: false,
  },
  {
    id: '90400888-2169-4de3-8b1c-c3e1b29ae20b',
    ispb: '60701190',
    name: 'Itaú Unibanco',
    legalName: 'Itaú Unibanco S.A.',
    logoUrl:
      'https://logospng.org/download/itau/logo-itau-256.png',
    authServerUrl: 'https://sts.itau.com.br',
    discoveryUrl:
      'https://sts.itau.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.itau.com.br',
    sandboxMode: false,
  },
  {
    id: '00360305-6b47-4f41-b85c-b3e3e4b2cf01',
    ispb: '00360305',
    name: 'Caixa Econômica Federal',
    legalName: 'Caixa Econômica Federal',
    logoUrl:
      'https://logospng.org/download/caixa-economica-federal/logo-caixa-256.png',
    authServerUrl: 'https://auth.openfinance.caixa.gov.br',
    discoveryUrl:
      'https://auth.openfinance.caixa.gov.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.openfinance.caixa.gov.br',
    sandboxMode: false,
  },
  {
    id: 'c1f6d4ec-89e7-4451-aeef-8a1f5d4b3e7c',
    ispb: '90400888',
    name: 'Santander',
    legalName: 'Banco Santander (Brasil) S.A.',
    logoUrl:
      'https://logospng.org/download/santander/logo-santander-256.png',
    authServerUrl: 'https://auth.santander.com.br',
    discoveryUrl:
      'https://auth.santander.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.santander.com.br',
    sandboxMode: false,
  },
  {
    id: '18236120-e3ac-4d62-b36d-9e1a7c4d5f21',
    ispb: '18236120',
    name: 'Nubank',
    legalName: 'Nu Pagamentos S.A.',
    logoUrl:
      'https://logospng.org/download/nubank/logo-nubank-256.png',
    authServerUrl: 'https://auth.nubank.com.br',
    discoveryUrl:
      'https://auth.nubank.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.nubank.com.br',
    sandboxMode: false,
  },
  {
    id: 'a0a8c72e-b3d4-4f5a-8c1e-29f3b7e4d5c6',
    ispb: '30306294',
    name: 'BTG Pactual',
    legalName: 'Banco BTG Pactual S.A.',
    logoUrl:
      'https://logospng.org/download/btg-pactual/logo-btg-pactual-256.png',
    authServerUrl: 'https://id.btgpactual.com',
    discoveryUrl:
      'https://id.btgpactual.com/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.btgpactual.com',
    sandboxMode: false,
  },
  {
    id: 'b4e1c8a2-f3d5-4e7b-9c0a-1d2e3f4a5b6c',
    ispb: '00416968',
    name: 'Banco Inter',
    legalName: 'Banco Inter S.A.',
    logoUrl:
      'https://logospng.org/download/banco-inter/logo-banco-inter-256.png',
    authServerUrl: 'https://auth.openfinance.bancointer.com.br',
    discoveryUrl:
      'https://auth.openfinance.bancointer.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://cdh.inter.co',
    sandboxMode: false,
  },
  {
    id: 'c5f2d9b3-g4e6-5f8c-0d1b-2e3f4g5h6i7j',
    ispb: '31872495',
    name: 'C6 Bank',
    legalName: 'Banco C6 S.A.',
    logoUrl:
      'https://logospng.org/download/c6-bank/logo-c6-bank-256.png',
    authServerUrl: 'https://auth.c6bank.com.br',
    discoveryUrl:
      'https://auth.c6bank.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.c6bank.com.br',
    sandboxMode: false,
  },
  {
    id: 'd6g3e0c4-h5f7-6g9d-1e2c-3f4g5h6i7j8k',
    ispb: '02332886',
    name: 'XP Investimentos',
    legalName: 'XP Investimentos CCTVM S.A.',
    logoUrl:
      'https://logospng.org/download/xp-investimentos/logo-xp-investimentos-256.png',
    authServerUrl: 'https://auth.xpi.com.br',
    discoveryUrl:
      'https://auth.xpi.com.br/.well-known/openid-configuration',
    apiBaseUrl: 'https://api.xpi.com.br',
    sandboxMode: false,
  },
]

/** Maps an OFB permission to a human-readable label */
export const PERMISSION_LABELS: Record<string, string> = {
  ACCOUNTS_READ: 'View accounts',
  ACCOUNTS_BALANCES_READ: 'View balances',
  ACCOUNTS_TRANSACTIONS_READ: 'View transactions',
  ACCOUNTS_OVERDRAFT_LIMITS_READ: 'View overdraft limits',
  CREDIT_CARDS_ACCOUNTS_READ: 'View credit cards',
  CREDIT_CARDS_ACCOUNTS_LIMITS_READ: 'View card limits',
  CREDIT_CARDS_ACCOUNTS_TRANSACTIONS_READ: 'View card transactions',
  CREDIT_CARDS_ACCOUNTS_BILLS_READ: 'View card bills',
  CREDIT_CARDS_ACCOUNTS_BILLS_TRANSACTIONS_READ: 'View bill transactions',
  RESOURCES_READ: 'List consented resources',
  VARIABLE_INCOMES_READ: 'View equity investments',
  VARIABLE_INCOMES_TRANSACTIONS_READ: 'View equity transactions',
  BANK_FIXED_INCOMES_READ: 'View fixed-income investments',
  BANK_FIXED_INCOMES_TRANSACTIONS_READ: 'View fixed-income transactions',
  TREASURE_TITLES_READ: 'View Tesouro Direto',
  TREASURE_TITLES_TRANSACTIONS_READ: 'View Tesouro transactions',
  FUNDS_READ: 'View investment funds',
  FUNDS_TRANSACTIONS_READ: 'View fund transactions',
}

/** Grouped scopes shown in the consent wizard */
export const SCOPE_GROUPS = [
  {
    key: 'accounts',
    label: 'Accounts & Balances',
    permissions: [
      'ACCOUNTS_READ',
      'ACCOUNTS_BALANCES_READ',
      'ACCOUNTS_TRANSACTIONS_READ',
      'ACCOUNTS_OVERDRAFT_LIMITS_READ',
      'RESOURCES_READ',
    ] as const,
  },
  {
    key: 'credit_cards',
    label: 'Credit Cards',
    permissions: [
      'CREDIT_CARDS_ACCOUNTS_READ',
      'CREDIT_CARDS_ACCOUNTS_LIMITS_READ',
      'CREDIT_CARDS_ACCOUNTS_TRANSACTIONS_READ',
      'CREDIT_CARDS_ACCOUNTS_BILLS_READ',
      'CREDIT_CARDS_ACCOUNTS_BILLS_TRANSACTIONS_READ',
    ] as const,
  },
  {
    key: 'investments',
    label: 'Investments',
    permissions: [
      'VARIABLE_INCOMES_READ',
      'VARIABLE_INCOMES_TRANSACTIONS_READ',
      'BANK_FIXED_INCOMES_READ',
      'BANK_FIXED_INCOMES_TRANSACTIONS_READ',
      'TREASURE_TITLES_READ',
      'TREASURE_TITLES_TRANSACTIONS_READ',
      'FUNDS_READ',
      'FUNDS_TRANSACTIONS_READ',
    ] as const,
  },
]

/**
 * Fetch the live Open Finance Brasil participant directory.
 * Falls back to KNOWN_BANKS if the network request fails.
 */
export async function fetchBanksFromDirectory(
  sandbox = false
): Promise<OFBBank[]> {
  try {
    const url = sandbox ? SANDBOX_DIRECTORY_URL : DIRECTORY_URL
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Directory is a public CORS-enabled API
    })
    if (!res.ok) throw new Error(`Directory responded ${res.status}`)

    const participants: OFBParticipant[] = await res.json()

    return participants
      .filter((p) => p.Status === 'Active' && p.AuthorisationServers.length > 0)
      .map((p): OFBBank | null => {
        const server = p.AuthorisationServers[0]
        const apiResource = server.ApiResources.find(
          (r) => r.ApiFamilyType === 'accounts'
        )
        const apiEndpoint =
          apiResource?.ApiDiscoveryEndpoints[0]?.ApiEndpoint ?? ''

        const apiBaseUrl = apiEndpoint
          ? new URL(apiEndpoint).origin
          : ''

        if (!server.OpenIDDiscoveryDocument || !apiBaseUrl) return null

        const authBaseUrl = (() => {
          try {
            return new URL(server.OpenIDDiscoveryDocument).origin
          } catch {
            return ''
          }
        })()

        if (!authBaseUrl) return null

        return {
          id: p.OrganisationId,
          ispb: '',
          name: server.CustomerFriendlyName || p.OrganisationName,
          legalName: p.LegalEntityName,
          logoUrl: server.CustomerFriendlyLogoUri || '',
          authServerUrl: authBaseUrl,
          discoveryUrl: server.OpenIDDiscoveryDocument,
          apiBaseUrl,
          sandboxMode: sandbox,
        }
      })
      .filter((b): b is OFBBank => b !== null)
  } catch {
    console.warn('OFB directory unavailable — using built-in bank list')
    return KNOWN_BANKS
  }
}
