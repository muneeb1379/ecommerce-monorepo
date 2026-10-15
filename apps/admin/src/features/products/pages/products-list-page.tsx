import { Button } from '@mantine/core'
import { Link } from 'react-router-dom'
import { IconPlus } from '@tabler/icons-react'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { ErrorState } from '@/components/feedback/error-state'
import { useCanWriteCatalog } from '@/features/auth/hooks/use-can-write'
import { useProductFiltersStore } from '@/stores/list-filters.store'
import { useProducts } from '@/features/products/hooks/use-products'
import { ProductFiltersBar } from '@/features/products/components/product-filters-bar'
import { ProductsTable } from '@/features/products/components/products-table'

export function ProductsListPage() {
  const filters = useProductFiltersStore()
  const canWrite = useCanWriteCatalog()
  const { data, isLoading, isError, error, refetch } = useProducts(filters)

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalog, colors and images"
        actions={
          canWrite && (
            <Button component={Link} to="/products/new" leftSection={<IconPlus size={16} />}>
              New product
            </Button>
          )
        }
      />

      <ProductFiltersBar />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <ProductsTable products={data?.items ?? []} loading={isLoading} />
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
