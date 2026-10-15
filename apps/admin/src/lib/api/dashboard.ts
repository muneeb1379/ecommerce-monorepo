import { apiClient } from '@/lib/api/client'
import type { DashboardMetrics } from '@/types/api'

/**
 * All metrics are pre-aggregated by the API server. The frontend never
 * computes revenue/order counts itself — it only renders what comes back.
 */
export function fetchDashboardMetrics(signal?: AbortSignal) {
  return apiClient.get<DashboardMetrics>('/admin/dashboard', undefined, signal)
}
