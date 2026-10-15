import type { OrderStatus } from './orders.types.js'

/**
 * Order lifecycle. Documented in docs/features/orders/README.md#order-lifecycle.
 *
 *   pending ──► processing ──► shipped ──► delivered
 *      │             │
 *      └─────────────┴──► cancelled
 *
 * delivered and cancelled are terminal. Cancelling returns the items to stock.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to)
}
