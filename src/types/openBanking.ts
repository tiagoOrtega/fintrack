/**
 * Open Finance Brasil API types
 * Spec: https://openfinancebrasil.atlassian.net/wiki/spaces/OF/overview
 * Security: FAPI 1.0 Advanced + OAuth 2.0 PKCE
 */

// ── Participant directory ────────────────────────────────────────────────────

export interface OFBParticipant {
  OrganisationId: string
  Status: 'Active' | 'Inactive' | 'Withdrawn'
  OrganisationName: string
  LegalEntityName: string
  AuthorisationServers: OFBAuthServer[]
}

export interface OFBAuthServer {
  AuthorisationServerId: string
  CustomerFriendlyName: string
  CustomerFriendlyDescription: string
  CustomerFriendlyLogoUri: string
  OpenIDDiscoveryDocument: string // URL to .well-known/openid-configuration
  ApiResources: OFBApiResource[]
}

export interface OFBApiResource {
  ApiResourceId: string
  ApiFamilyType: OFBApiFamilyType
  ApiVersion: number
  ApiDiscoveryEndpoints: Array<{ ApiEndpoint: string }>
}

export type OFBApiFamilyType =
  | 'consents'
  | 'accounts'
  | 'credit-cards-accounts'
  | 'variable-income'
  | 'bank-fixed-incomes'
  | 'treasure-titles'
  | 'funds'
  | 'resources'

// Resolved bank ready for the UI
export interface OFBBank {
  id: string                   // OrganisationId
  ispb: string                 // 8-digit ISPB (Brazilian banking system code)
  name: string
  legalName: string
  logoUrl: string
  authServerUrl: string        // base URL of the authorization server
  discoveryUrl: string         // OpenID Connect discovery document
  apiBaseUrl: string           // base URL for resource APIs
  sandboxMode: boolean
}

// OpenID Connect discovery document
export interface OIDCDiscovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  scopes_supported: string[]
  response_types_supported: string[]
  grant_types_supported: string[]
  code_challenge_methods_supported: string[]
  pushed_authorization_request_endpoint?: string  // PAR (FAPI requirement)
}

// ── Consent API v2 ───────────────────────────────────────────────────────────

export type OFBPermission =
  | 'ACCOUNTS_READ'
  | 'ACCOUNTS_BALANCES_READ'
  | 'ACCOUNTS_TRANSACTIONS_READ'
  | 'ACCOUNTS_OVERDRAFT_LIMITS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_BILLS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_BILLS_TRANSACTIONS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_LIMITS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_TRANSACTIONS_READ'
  | 'RESOURCES_READ'
  | 'VARIABLE_INCOMES_READ'
  | 'VARIABLE_INCOMES_TRANSACTIONS_READ'
  | 'BANK_FIXED_INCOMES_READ'
  | 'BANK_FIXED_INCOMES_TRANSACTIONS_READ'
  | 'TREASURE_TITLES_READ'
  | 'TREASURE_TITLES_TRANSACTIONS_READ'
  | 'FUNDS_READ'
  | 'FUNDS_TRANSACTIONS_READ'

export type OFBConsentStatus =
  | 'AWAITING_AUTHORISATION'
  | 'AUTHORISED'
  | 'REJECTED'
  | 'CONSUMED'
  | 'EXPIRED'

export interface OFBConsentRequest {
  data: {
    permissions: OFBPermission[]
    expirationDateTime: string   // ISO 8601 — max 12 months from now
    loggedUser?: {
      document: {
        identification: string   // CPF
        rel: 'CPF'
      }
    }
    businessEntity?: {
      document: {
        identification: string   // CNPJ
        rel: 'CNPJ'
      }
    }
  }
}

export interface OFBConsentResponse {
  data: {
    consentId: string
    creationDateTime: string
    expirationDateTime: string
    statusUpdateDateTime: string
    status: OFBConsentStatus
    permissions: OFBPermission[]
    links: { self: string }
    meta: OFBMeta
  }
}

// ── Token response ───────────────────────────────────────────────────────────

export interface OFBTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number        // seconds
  refresh_token?: string
  scope: string
  id_token?: string
}

// ── Shared structures ────────────────────────────────────────────────────────

export interface OFBAmount {
  amount: string    // decimal string, e.g. "1234.56"
  currency: string  // ISO 4217, e.g. "BRL"
}

export interface OFBMeta {
  totalRecords: number
  totalPages: number
  requestDateTime: string
}

export interface OFBLinks {
  self: string
  first?: string
  prev?: string
  next?: string
  last?: string
}

// ── Accounts API v2 ──────────────────────────────────────────────────────────

export type OFBAccountType =
  | 'CONTA_DEPOSITO_A_VISTA'   // Checking
  | 'CONTA_POUPANCA'            // Savings
  | 'CONTA_PAGAMENTO_PRE_PAGA' // Prepaid

export interface OFBAccount {
  accountId: string
  brandName: string
  companyCnpj: string
  type: OFBAccountType
  compeCode: string    // 3-digit COMPE code
  ispb: string
  branchCode: string
  number: string
  checkDigit: string
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'TEMPORARILY_UNAVAILABLE' | 'MIGRATED'
}

export interface OFBAccountsResponse {
  data: OFBAccount[]
  links: OFBLinks
  meta: OFBMeta
}

export interface OFBAccountBalance {
  availableAmount: OFBAmount
  blockedAmount: OFBAmount
  automaticallyInvestedAmount: OFBAmount
  updateDateTime: string
}

export interface OFBAccountBalanceResponse {
  data: OFBAccountBalance
  links: OFBLinks
  meta: OFBMeta
}

export type OFBTransactionCreditDebit = 'CREDITO' | 'DEBITO'

export interface OFBTransaction {
  transactionId: string
  completedAuthorisedPaymentType: 'TRANSACAO_EFETIVADA' | 'LANCAMENTO_FUTURO'
  creditDebitType: OFBTransactionCreditDebit
  transactionName: string
  type:
    | 'TED'
    | 'DOC'
    | 'PIX'
    | 'TRANSFERENCIA_MESMA_INSTITUICAO'
    | 'BOLETO'
    | 'CONVENIO_ARRECADACAO'
    | 'PAGAMENTO_CARTAO'
    | 'DEBITO_AUTOMATICO'
    | 'DEPOSITO'
    | 'SAQUE'
    | 'OUTROS'
  amount: OFBAmount
  transactionDate: string      // YYYY-MM-DD
  partieCnpjCpf?: string
  partiePersonType?: 'PESSOA_NATURAL' | 'PESSOA_JURIDICA'
  partieCompeCode?: string
  partieIspb?: string
  partieBranchCode?: string
  partieNumber?: string
  partieCheckDigit?: string
  counterPartyName?: string
  remittanceInformation?: string
}

export interface OFBTransactionsResponse {
  data: OFBTransaction[]
  links: OFBLinks
  meta: OFBMeta
}

// ── Credit Cards API v2 ──────────────────────────────────────────────────────

export type OFBCreditNetwork =
  | 'VISA' | 'MASTERCARD' | 'AMERICAN_EXPRESS' | 'DINERS_CLUB' | 'HIPERCARD'
  | 'BANDEIRA_PROPRIA' | 'ELO' | 'OUTROS'

export interface OFBCreditCardAccount {
  creditCardAccountId: string
  brandName: string
  companyCnpj: string
  name: string                   // Friendly product name
  productType:
    | 'CLASSIC_NACIONAL'
    | 'CLASSIC_INTERNACIONAL'
    | 'GOLD'
    | 'PLATINUM'
    | 'INFINITE'
    | 'CORPORATIVO'
    | 'BASICO_NACIONAL'
    | 'BASICO_INTERNACIONAL'
    | 'NANQUIM'
    | 'GRAFITE'
    | 'BLACK'
    | 'STANDARD_NACIONAL'
    | 'STANDARD_INTERNACIONAL'
    | 'ELETRÔNICO'
    | 'OUTROS'
  creditCardNetwork: OFBCreditNetwork
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'TEMPORARILY_UNAVAILABLE' | 'MIGRATED'
}

export interface OFBCreditCardsResponse {
  data: OFBCreditCardAccount[]
  links: OFBLinks
  meta: OFBMeta
}

export interface OFBCreditCardLimit {
  creditLineLimitType:
    | 'LIMITE_CREDITO_TOTAL'
    | 'LIMITE_CREDITO_MODALIDADE_OPERACAO'
    | 'LIMITE_CREDITO_TOTAL_CONTA_PAGAMENTO_PRE_PAGO'
  consolidationType: 'CONSOLIDADO' | 'INDIVIDUAL'
  identificationNumber: string
  lineName?: string
  lineNameAdditionalInfo?: string
  isLimitFlexible: boolean
  limitAmountCurrency: string
  limitAmount: string
  usedAmountCurrency: string
  usedAmount: string
  availableAmountCurrency: string
  availableAmount: string
}

export interface OFBCreditCardLimitsResponse {
  data: OFBCreditCardLimit[]
  links: OFBLinks
  meta: OFBMeta
}

export interface OFBCreditCardTransaction {
  transactionId: string
  identificationNumber: string
  transactionName: string
  creditDebitType: OFBTransactionCreditDebit
  transactionType:
    | 'PAGAMENTO'
    | 'TARIFA'
    | 'OPERACOES_CREDITO_CONTRATADAS_CARTAO'
    | 'ESTORNO'
    | 'CASHBACK'
    | 'OUTROS'
  transactionalAdditionalInfo?: string
  paymentType?: 'A_VISTA' | 'A_PRAZO'
  feeType?: string
  feeTypeAdditionalInfo?: string
  otherCreditType?: string
  otherCreditAdditionalInfo?: string
  chargeIdentificator?: string
  chargeNumber?: number
  brazilianAmount: OFBAmount
  amount: OFBAmount
  transactionDate: string         // YYYY-MM-DD
  billPostDate: string            // YYYY-MM-DD
  payeeMCC?: number               // Merchant Category Code
}

export interface OFBCreditCardTransactionsResponse {
  data: OFBCreditCardTransaction[]
  links: OFBLinks
  meta: OFBMeta
}

// ── Variable Income Investments v1 ───────────────────────────────────────────

export interface OFBVariableIncomeInvestment {
  investmentId: string
  brokerNoteId?: string
  isin?: string                  // ISIN code
  ticker?: string                // Exchange ticker (e.g. PETR4)
  quantity: number
  averagePrice: OFBAmount
  amount: OFBAmount              // Total position value
  blockedBalance: OFBAmount
  quote: OFBAmount               // Current market price
  quoteGranularity: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL' | 'INTRADAY'
  quoteDate?: string
}

export interface OFBVariableIncomesResponse {
  data: OFBVariableIncomeInvestment[]
  links: OFBLinks
  meta: OFBMeta
}

// ── Bank Fixed Income Investments v1 ─────────────────────────────────────────

export type OFBFixedIncomeType =
  | 'CDB' | 'RDB' | 'LCI' | 'LCA' | 'LIG' | 'CRI' | 'CRA'
  | 'DEBENTURE_SIMPLES' | 'DEBENTURE_CONVERSIVEL' | 'LETRA_FINANCEIRA' | 'OUTROS'

export interface OFBFixedIncomeInvestment {
  investmentId: string
  issuerInstitutionCnpjNumber: string
  isinCode?: string
  investmentType: OFBFixedIncomeType
  remuneration: {
    rateType: 'NOMINAL' | 'EFETIVA' | 'FLUTUANTE'
    ratePeriodicity: 'MENSAL' | 'ANUAL' | 'DIARIO' | 'SEMESTRAL'
    calculation: '252' | '360' | '365'
    indexer: 'CDI' | 'DI' | 'TR' | 'IPCA' | 'IGP_M' | 'IGP_DI' | 'INPC' | 'BCP' | 'TLC' | 'SELIC' | 'PRE_FIXADO' | 'OUTROS'
    indexerAdditionalInfo?: string
    rate?: OFBAmount
  }
  issueUnitPrice: OFBAmount
  issueDate: string              // YYYY-MM-DD
  dueDate: string                // YYYY-MM-DD
  purchaseDate: string           // YYYY-MM-DD
  updatedUnitPrice: OFBAmount    // Current value per unit
  quantity: number
  netAmount: OFBAmount           // Total current value (before taxes)
  incomeTaxAmount: OFBAmount
  financialTransactionTaxAmount: OFBAmount
  blockedBalance: OFBAmount
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'TEMPORARILY_UNAVAILABLE'
}

export interface OFBFixedIncomesResponse {
  data: OFBFixedIncomeInvestment[]
  links: OFBLinks
  meta: OFBMeta
}

// ── Treasure Titles (Tesouro Direto) v1 ─────────────────────────────────────

export type OFBTreasureTitleType =
  | 'TESOURO_PREFIXADO'
  | 'TESOURO_PREFIXADO_COM_JUROS_SEMESTRAIS'
  | 'TESOURO_SELIC'
  | 'TESOURO_IPCA'
  | 'TESOURO_IPCA_COM_JUROS_SEMESTRAIS'

export interface OFBTreasureTitle {
  investmentId: string
  isinCode?: string
  investmentType: OFBTreasureTitleType
  remuneration: {
    indexer: 'SELIC' | 'IPCA' | 'PRE_FIXADO'
    rate?: OFBAmount
  }
  issueUnitPrice: OFBAmount
  issueDate: string
  dueDate: string
  purchaseDate: string
  updatedUnitPrice: OFBAmount
  quantity: number
  netAmount: OFBAmount
  grossAmount: OFBAmount
  incomeTaxAmount: OFBAmount
  financialTransactionTaxAmount: OFBAmount
  blockedBalance: OFBAmount
}

export interface OFBTreasureTitlesResponse {
  data: OFBTreasureTitle[]
  links: OFBLinks
  meta: OFBMeta
}

// ── Connected bank (stored in FinTrack) ──────────────────────────────────────

export interface ConnectedBank {
  id: string                    // UUID generated by FinTrack
  bankId: string                // OFBBank.id (OrganisationId)
  bankName: string
  bankLogo: string
  accessToken: string
  refreshToken?: string
  tokenExpiry: number           // Unix timestamp ms
  consentId?: string
  permissions: OFBPermission[]
  connectedAt: string           // ISO date
  lastSyncAt?: string
  accounts: SyncedAccount[]
}

export interface SyncedAccount {
  accountId: string
  type: 'checking' | 'savings' | 'credit_card'
  label: string                 // e.g. "Conta Corrente ••••8392"
  balance: number
  currency: string
  limit?: number                // credit cards only
}
