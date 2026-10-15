import { useQuery } from '@tanstack/react-query'
import { fetchDashboardMetrics } from '@/lib/api/dashboard'
import { queryKeys } from '@/lib/query-client'

/**
 * The store currency, configured on the API server (`CURRENCY`). Product and
 * customer endpoints return bare numbers, so the dashboard response is the one
 * place that reports it. It shares the dashboard's query, so it costs at most
 * one extra request per session.
 */
export function useCurrency(): string {
  const { data } = useQuery({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: ({ signal }) => fetchDashboardMetrics(signal),
    staleTime: 60_000,
    select: (metrics) => metrics.currency,
  })
  return data ?? 'USD'
}
