import { useQuery } from '@tanstack/react-query'
import { fetchOrders } from '@/lib/api/orders'
import { queryKeys } from '@/lib/query-client'
import type { OrderListParams } from '@/types/api'

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: ({ signal }) => fetchOrders(params, signal),
    placeholderData: (previousData) => previousData,
  })
}
