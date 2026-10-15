import { apiClient } from '@/lib/api/client'
import type { AdminProfile } from '@/types/api'

/**
 * Fetches the authenticated admin's profile/permissions from the API
 * server. This is the authorization source of truth — a valid
 * Supabase session alone does not imply admin access.
 */
export function fetchAdminProfile(signal?: AbortSignal) {
  return apiClient.get<AdminProfile>('/auth/me', undefined, signal)
}
