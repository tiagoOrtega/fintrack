export interface GoogleSheetsConfig {
  connected: boolean
  accessToken: string
  refreshToken: string
  tokenExpiry: number      // ms timestamp
  userEmail: string
  spreadsheetId: string
  spreadsheetUrl: string
  lastSyncAt: string | null
  autoSync: boolean
}

export const GS_CONFIG_KEY = 'fintrack_gs_config'

export function getGsConfigKey(userId: string): string {
  return `${GS_CONFIG_KEY}_${userId}`
}

export const DEFAULT_GS_CONFIG: GoogleSheetsConfig = {
  connected: false,
  accessToken: '',
  refreshToken: '',
  tokenExpiry: 0,
  userEmail: '',
  spreadsheetId: '',
  spreadsheetUrl: '',
  lastSyncAt: null,
  autoSync: true,
}
