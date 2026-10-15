import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '@/lib/api/products'
import { queryKeys } from '@/lib/query-client'
import type { ProductListParams } from '@/types/api'

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: ({ signal }) => fetchProducts(params, signal),
    placeholderData: (previousData) => previousData,
  })
}
