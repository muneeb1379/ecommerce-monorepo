import { Link } from 'react-router-dom'
import { Anchor, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge'
import { OrderStatusActions } from '@/features/orders/components/order-status-actions'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { Order } from '@/types/api'

export function OrderSidePanel({ order }: { order: Order }) {
  const { shippingAddress: address } = order

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Title order={5} mb="md">
          Status
        </Title>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Order status
            </Text>
            <OrderStatusBadge status={order.status} />
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Payment status
            </Text>
            <PaymentStatusBadge status={order.paymentStatus} />
          </Group>
          <Divider my={4} />
          <OrderStatusActions order={order} />
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Title order={5} mb="md">
          Customer
        </Title>
        <Stack gap={4}>
          {order.customer.id ? (
            <Anchor component={Link} to={`/customers/${order.customer.id}`} size="sm" fw={500}>
              {order.customer.fullName}
            </Anchor>
          ) : (
            <Text size="sm" fw={500}>
              {order.customer.fullName}
            </Text>
          )}
          <Text size="sm" c="dimmed">
            {order.customer.email}
          </Text>
          {order.customer.phone && (
            <Text size="sm" c="dimmed">
              {order.customer.phone}
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Title order={5} mb="md">
          Shipping address
        </Title>
        <Stack gap={2}>
          <Text size="sm">{address.line1}</Text>
          {address.line2 && <Text size="sm">{address.line2}</Text>}
          <Text size="sm">
            {[address.city, address.state].filter(Boolean).join(', ')} {address.postalCode}
          </Text>
          <Text size="sm">{address.country}</Text>
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Title order={5} mb="md">
          Summary
        </Title>
        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Subtotal
            </Text>
            <Text size="sm">{formatCurrency(order.subtotal, order.currency)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Shipping
            </Text>
            <Text size="sm">{formatCurrency(order.shippingCost, order.currency)}</Text>
          </Group>
          <Divider my={4} />
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              Total
            </Text>
            <Text size="sm" fw={600}>
              {formatCurrency(order.total, order.currency)}
            </Text>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Title order={5} mb="md">
          Timeline
        </Title>
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Placed
            </Text>
            <Text size="sm">{formatDateTime(order.createdAt)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Last updated
            </Text>
            <Text size="sm">{formatDateTime(order.updatedAt)}</Text>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
