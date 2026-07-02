import { STORAGE_KEY, getStoreKey } from '../hooks/useStore'
import { GS_CONFIG_KEY, getGsConfigKey } from '../types/googleSheets'

const MIGRATION_FLAG_KEY = 'fintrack_migrated_v2'

/**
 * One-time copy of the pre-login flat localStorage keys into the first
 * authenticated user's namespaced keys, so upgrading to multi-user login
 * doesn't orphan the existing self-hoster's data. Idempotent and
 * non-destructive — legacy keys are left in place as a safety net.
 *
 * Must run before StoreProvider's lazy state initializers read storage for
 * this user, so it's called from useAuth at the moment auth resolves to
 * "authenticated," not from an effect inside StoreProvider (too late).
 */
export function migrateLegacyStorageForUser(userId: string): void {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return

  const legacyData = localStorage.getItem(STORAGE_KEY)
  const legacyGs    = localStorage.getItem(GS_CONFIG_KEY)
  const dataKey = getStoreKey(userId)
  const gsKey   = getGsConfigKey(userId)

  if (legacyData && !localStorage.getItem(dataKey)) localStorage.setItem(dataKey, legacyData)
  if (legacyGs   && !localStorage.getItem(gsKey))   localStorage.setItem(gsKey, legacyGs)

  localStorage.setItem(MIGRATION_FLAG_KEY, '1')
}
