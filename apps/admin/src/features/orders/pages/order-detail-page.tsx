import { Link, useParams } from 'react-router-dom'
import { Anchor, Center, Grid, Loader, Stack } from '@mantine/core'
import { PageHeader } from '@/components/page-header'
import { ErrorState } from '@/components/feedback/error-state'
import { useOrder } from '@/features/orders/hooks/use-order'
import { OrderHistory } from '@/features/orders/components/order-history'
import { OrderLineItems } from '@/features/orders/components/order-line-items'
import { OrderSidePanel } from '@/features/orders/components/order-side-panel'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, error, refetch } = useOrder(id)

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  if (isError || !order) {
    return <ErrorState error={error} onRetry={() => void refetch()} title="Could not load order" />
  }

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Placed by ${order.customer.fullName}`}
        actions={
          <Anchor component={Link} to="/orders" size="sm">
            ← All orders
          </Anchor>
        }
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <OrderLineItems items={order.items} currency={order.currency} />
            <OrderHistory history={order.history} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <OrderSidePanel order={order} />
        </Grid.Col>
      </Grid>
    </>
  )
}
