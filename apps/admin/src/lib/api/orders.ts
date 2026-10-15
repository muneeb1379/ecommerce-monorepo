import { apiClient } from '@/lib/api/client'
import type {
  Order,
  OrderLineItem,
  OrderListItem,
  OrderListParams,
  OrderStatus,
  Paginated,
} from '@/types/api'

export function fetchOrders(params: OrderListParams, signal?: AbortSignal) {
  return apiClient.get<Paginated<OrderListItem>>(
    '/admin/orders',
    {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: params.status === 'all' ? undefined : params.status,
      paymentStatus: params.paymentStatus === 'all' ? undefined : params.paymentStatus,
      customerId: params.customerId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      sort: params.sort,
    },
    signal,
  )
}

export function fetchOrder(id: string, signal?: AbortSignal) {
  return apiClient.get<Order>(`/admin/orders/${id}`, undefined, signal)
}

export function fetchOrderItems(id: string, signal?: AbortSignal) {
  return apiClient.get<OrderLineItem[]>(`/admin/orders/${id}/items`, undefined, signal)
}

export function updateOrderStatus(id: string, status: OrderStatus, note?: string) {
  return apiClient.patch<Order>(`/admin/orders/${id}/status`, {
    status,
    ...(note ? { note } : {}),
  })
}
