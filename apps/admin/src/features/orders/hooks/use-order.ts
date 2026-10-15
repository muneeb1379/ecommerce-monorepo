import { useQuery } from '@tanstack/react-query'
import { fetchOrder } from '@/lib/api/orders'
import { queryKeys } from '@/lib/query-client'

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: ({ signal }) => fetchOrder(id as string, signal),
    enabled: Boolean(id),
  })
}
