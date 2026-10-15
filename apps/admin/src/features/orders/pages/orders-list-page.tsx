import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { ErrorState } from '@/components/feedback/error-state'
import { useOrderFiltersStore } from '@/stores/list-filters.store'
import { useOrders } from '@/features/orders/hooks/use-orders'
import { OrderFiltersBar } from '@/features/orders/components/order-filters-bar'
import { OrdersTable } from '@/features/orders/components/orders-table'

export function OrdersListPage() {
  const filters = useOrderFiltersStore()
  const { data, isLoading, isError, error, refetch } = useOrders(filters)

  return (
    <>
      <PageHeader title="Orders" description="Track and manage customer orders" />

      <OrderFiltersBar />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <OrdersTable orders={data?.items ?? []} loading={isLoading} />
          {data && (
            <PaginationBar
              pagination={data.pagination}
              onPageChange={(page) => filters.setFilters({ page })}
            />
          )}
        </>
      )}
    </>
  )
}
