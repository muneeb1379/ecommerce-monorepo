import { Badge } from '@mantine/core'
import type { MantineColor } from '@mantine/core'
import type { OrderStatus, PaymentStatus, ProductStatus } from '@/types/api'

const productStatusColors: Record<ProductStatus, MantineColor> = {
  draft: 'gray',
  published: 'green',
  archived: 'orange',
}

const orderStatusColors: Record<OrderStatus, MantineColor> = {
  pending: 'yellow',
  processing: 'blue',
  shipped: 'indigo',
  delivered: 'green',
  cancelled: 'red',
}

const paymentStatusColors: Record<PaymentStatus, MantineColor> = {
  pending: 'yellow',
  paid: 'green',
  refunded: 'orange',
  failed: 'red',
}

function Badged({ color, label }: { color: MantineColor; label: string }) {
  return (
    <Badge color={color} variant="light" radius="sm" tt="capitalize">
      {label}
    </Badge>
  )
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badged color={productStatusColors[status]} label={status} />
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badged color={orderStatusColors[status]} label={status} />
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badged color={paymentStatusColors[status]} label={status} />
}
