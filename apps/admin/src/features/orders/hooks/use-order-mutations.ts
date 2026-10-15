import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { updateOrderStatus } from '@/lib/api/orders'
import { queryKeys } from '@/lib/query-client'
import type { OrderStatus } from '@/types/api'

export function useUpdateOrderStatus(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ status, note }: { status: OrderStatus; note?: string }) =>
      updateOrderStatus(orderId, status, note),
    onSuccess: (order) => {
      // The response is the full, updated order (including history and allowed transitions).
      queryClient.setQueryData(queryKeys.orders.detail(orderId), order)
      void queryClient.invalidateQueries({ queryKey: ['orders', 'list'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics })
      // Cancelling returns stock, so product stock figures change too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      notifications.show({ color: 'green', message: `Order marked as ${order.status}.` })
    },
  })
}
