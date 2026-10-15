import { useQuery } from '@tanstack/react-query'
import { fetchDashboardMetrics } from '@/lib/api/dashboard'
import { queryKeys } from '@/lib/query-client'

export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: ({ signal }) => fetchDashboardMetrics(signal),
    staleTime: 60_000,
  })
}
