import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Anchor,
  Badge,
  Center,
  Grid,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { ErrorState } from '@/components/feedback/error-state'
import { useCurrency } from '@/features/dashboard/hooks/use-currency'
import { useCustomer } from '@/features/customers/hooks/use-customers'
import { OrdersTable } from '@/features/orders/components/orders-table'
import { useOrders } from '@/features/orders/hooks/use-orders'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text size="xs" c="dimmed" fw={500} tt="uppercase">
        {label}
      </Text>
      <Text size="lg" fw={700} mt={2}>
        {value}
      </Text>
    </Paper>
  )
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const currency = useCurrency()
  const [page, setPage] = useState(1)

  const customerQuery = useCustomer(id)
  const ordersQuery = useOrders({ customerId: id, page, pageSize: 10, sort: 'created-desc' })

  if (customerQuery.isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  const customer = customerQuery.data
  if (customerQuery.isError || !customer) {
    return (
      <ErrorState
        error={customerQuery.error}
        onRetry={() => void customerQuery.refetch()}
        title="Could not load customer"
      />
    )
  }

  return (
    <>
      <PageHeader
        title={customer.fullName}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <Anchor component={Link} to="/customers" size="sm">
            ← All customers
          </Anchor>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
        <Metric label="Orders" value={String(customer.ordersCount)} />
        <Metric label="Total spent" value={formatCurrency(customer.totalSpent, currency)} />
        <Metric
          label="Last order"
          value={customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : '—'}
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder radius="md" p="lg">
            <Title order={5} mb="md">
              Orders
            </Title>
            {ordersQuery.isError ? (
              <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
            ) : (
              <>
                <OrdersTable
                  orders={ordersQuery.data?.items ?? []}
                  loading={ordersQuery.isLoading}
                  hideCustomer
                />
                {ordersQuery.data && (
                  <PaginationBar pagination={ordersQuery.data.pagination} onPageChange={setPage} />
                )}
              </>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Paper withBorder radius="md" p="lg">
              <Title order={5} mb="md">
                Contact
              </Title>
              <Stack gap={4}>
                <Text size="sm">{customer.email}</Text>
                <Text size="sm" c={customer.phone ? undefined : 'dimmed'}>
                  {customer.phone ?? 'No phone number'}
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="lg">
              <Title order={5} mb="md">
                Addresses
              </Title>
              {customer.addresses.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No saved addresses.
                </Text>
              ) : (
                <Stack gap="md">
                  {customer.addresses.map((address) => (
                    <Stack key={address.id} gap={2}>
                      {address.isDefault && (
                        <Group>
                          <Badge size="xs" variant="light">
                            Default
                          </Badge>
                        </Group>
                      )}
                      <Text size="sm">{address.line1}</Text>
                      {address.line2 && <Text size="sm">{address.line2}</Text>}
                      <Text size="sm">
                        {[address.city, address.state].filter(Boolean).join(', ')}{' '}
                        {address.postalCode}
                      </Text>
                      <Text size="sm">{address.country}</Text>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  )
}
