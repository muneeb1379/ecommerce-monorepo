import { useQuery } from '@tanstack/react-query'
import { fetchProduct } from '@/lib/api/products'
import { queryKeys } from '@/lib/query-client'

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: ({ signal }) => fetchProduct(id as string, signal),
    enabled: Boolean(id),
  })
}
