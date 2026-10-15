import { Anchor, Group, Paper, SimpleGrid, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconClockHour4,
  IconCircleCheck,
  IconCurrencyDollar,
  IconShoppingBag,
  IconShoppingCart,
  IconTruckDelivery,
  IconUsers,
} from '@tabler/icons-react'
import { PageHeader } from '@/components/page-header'
import { ErrorState } from '@/components/feedback/error-state'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { useDashboardMetrics } from '@/features/dashboard/hooks/use-dashboard-metrics'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { RecentOrdersTable } from '@/features/dashboard/components/recent-orders-table'

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardMetrics()
  const currency = data?.currency
  const changePct = data?.revenue.changePct ?? null

  return (
    <>
      <PageHeader title="Dashboard" description="Store performance at a glance" />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="md">
            <StatCard
              label="Total revenue"
              value={data ? formatCurrency(data.revenue.total, currency) : '—'}
              hint="Paid, non-cancelled orders"
              icon={<IconCurrencyDollar size={20} />}
              color="teal"
              loading={isLoading}
            />
            <StatCard
              label="Last 30 days"
              value={data ? formatCurrency(data.revenue.last30Days, currency) : '—'}
              trend={
                changePct === null ? undefined : `${formatPercent(changePct)} vs previous 30 days`
              }
              trendPositive={changePct !== null ? changePct >= 0 : undefined}
              hint={
                data && changePct === null
                  ? 'No previous period to compare'
                  : data
                    ? `Previous: ${formatCurrency(data.revenue.previous30Days, currency)}`
                    : undefined
              }
              icon={<IconCurrencyDollar size={20} />}
              color="teal"
              loading={isLoading}
            />
            <StatCard
              label="Total orders"
              value={data ? formatNumber(data.orders.total) : '—'}
              icon={<IconShoppingCart size={20} />}
              color="blue"
              loading={isLoading}
            />
            <StatCard
              label="Customers"
              value={data ? formatNumber(data.customers.total) : '—'}
              icon={<IconUsers size={20} />}
              color="cyan"
              loading={isLoading}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="lg">
            <StatCard
              label="Pending orders"
              value={data ? formatNumber(data.orders.pending) : '—'}
              hint={data ? `${formatNumber(data.orders.processing)} processing` : undefined}
              icon={<IconClockHour4 size={20} />}
              color="yellow"
              loading={isLoading}
            />
            <StatCard
              label="Shipped"
              value={data ? formatNumber(data.orders.shipped) : '—'}
              icon={<IconTruckDelivery size={20} />}
              color="indigo"
              loading={isLoading}
            />
            <StatCard
              label="Completed orders"
              value={data ? formatNumber(data.orders.completed) : '—'}
              hint={data ? `${formatNumber(data.orders.cancelled)} cancelled` : undefined}
              icon={<IconCircleCheck size={20} />}
              color="green"
              loading={isLoading}
            />
            <StatCard
              label="Products"
              value={data ? formatNumber(data.products.total) : '—'}
              hint={data ? `${formatNumber(data.products.published)} published` : undefined}
              icon={<IconShoppingBag size={20} />}
              color="grape"
              loading={isLoading}
            />
          </SimpleGrid>

          {data && data.products.lowStock > 0 && (
            <Paper withBorder radius="md" p="md" mb="lg" bg="var(--mantine-color-yellow-light)">
              <Group gap="sm">
                <IconAlertTriangle size={18} color="var(--mantine-color-yellow-8)" />
                <Text size="sm">
                  {formatNumber(data.products.lowStock)} product
                  {data.products.lowStock === 1 ? ' is' : 's are'} running low on stock.{' '}
                  <Anchor component={Link} to="/products" size="sm">
                    Review products
                  </Anchor>
                </Text>
              </Group>
            </Paper>
          )}

          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" mb="xs">
              <div>
                <Title order={4} size="h5">
                  Recent orders
                </Title>
                <Text c="dimmed" size="sm">
                  The most recent orders placed in your store.
                </Text>
              </div>
              <Anchor component={Link} to="/orders" size="sm">
                View all orders
              </Anchor>
            </Group>
            <RecentOrdersTable orders={data?.recentOrders ?? []} loading={isLoading} />
          </Paper>
        </>
      )}
    </>
  )
}
