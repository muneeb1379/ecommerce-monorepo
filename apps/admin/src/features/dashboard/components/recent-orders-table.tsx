import { Table } from '@mantine/core'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/empty-state'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge'
import { TableSkeleton } from '@/components/table-skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { OrderListItem } from '@/types/api'

interface RecentOrdersTableProps {
  orders: OrderListItem[]
  loading: boolean
}

export function RecentOrdersTable({ orders, loading }: RecentOrdersTableProps) {
  if (!loading && orders.length === 0) {
    return <EmptyState title="No orders yet" description="New orders will show up here." />
  }

  return (
    <Table verticalSpacing="sm" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Order</Table.Th>
          <Table.Th>Customer</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Payment</Table.Th>
          <Table.Th>Total</Table.Th>
          <Table.Th>Date</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {loading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : (
          orders.map((order) => (
            <Table.Tr key={order.id}>
              <Table.Td>
                <Link
                  to={`/orders/${order.id}`}
                  style={{ color: 'var(--mantine-color-blue-6)', fontWeight: 500 }}
                >
                  {order.orderNumber}
                </Link>
              </Table.Td>
              <Table.Td>{order.customerName}</Table.Td>
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
