import { Link } from 'react-router-dom'
import { Anchor, Table, Text } from '@mantine/core'
import { IconShoppingCart } from '@tabler/icons-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge'
import { TableSkeleton } from '@/components/table-skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { OrderListItem } from '@/types/api'

interface OrdersTableProps {
  orders: OrderListItem[]
  loading: boolean
  /** Hide the customer column when the list is already scoped to one customer. */
  hideCustomer?: boolean
}

export function OrdersTable({ orders, loading, hideCustomer = false }: OrdersTableProps) {
  if (!loading && orders.length === 0) {
    return (
      <EmptyState
        icon={<IconShoppingCart size={24} />}
        title="No orders found"
        description="Try adjusting your filters."
      />
    )
  }

  const columns = hideCustomer ? 6 : 7

  return (
    <Table verticalSpacing="sm" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Order</Table.Th>
          {!hideCustomer && <Table.Th>Customer</Table.Th>}
          <Table.Th>Items</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Payment</Table.Th>
          <Table.Th>Total</Table.Th>
          <Table.Th>Date</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {loading ? (
          <TableSkeleton columns={columns} rows={8} />
        ) : (
          orders.map((order) => (
            <Table.Tr key={order.id}>
              <Table.Td>
                <Text
                  component={Link}
                  to={`/orders/${order.id}`}
                  size="sm"
                  fw={500}
                  c="blue"
                  style={{ textDecoration: 'none' }}
                >
                  {order.orderNumber}
                </Text>
              </Table.Td>
              {!hideCustomer && (
                <Table.Td>
                  <div>
                    {order.customerId ? (
                      <Anchor component={Link} to={`/customers/${order.customerId}`} size="sm" c="inherit">
                        {order.customerName}
                      </Anchor>
                    ) : (
                      <Text size="sm">{order.customerName}</Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {order.customerEmail}
                    </Text>
                  </div>
                </Table.Td>
              )}
              <Table.Td>{order.itemCount}</Table.Td>
              <Table.Td>
                <OrderStatusBadge status={order.status} />
              </Table.Td>
              <Table.Td>
                <PaymentStatusBadge status={order.paymentStatus} />
              </Table.Td>
              <Table.Td>{formatCurrency(order.total, order.currency)}</Table.Td>
              <Table.Td>{formatDateTime(order.createdAt)}</Table.Td>
            </Table.Tr>
          ))
        )}
      </Table.Tbody>
    </Table>
  )
}
