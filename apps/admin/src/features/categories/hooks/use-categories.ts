import { useQuery } from '@tanstack/react-query'
import { fetchCategories, fetchCategory } from '@/lib/api/categories'
import { queryKeys } from '@/lib/query-client'
import type { CategoryListParams } from '@/types/api'

export function useCategories(params: CategoryListParams) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: ({ signal }) => fetchCategories(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id ?? ''),
    queryFn: ({ signal }) => fetchCategory(id as string, signal),
    enabled: Boolean(id),
  })
}

/** The API caps page size at 100, which is plenty for a category picker. */
const OPTIONS_PARAMS: CategoryListParams = { page: 1, pageSize: 100 }

/** All categories, for the product form and the product filter dropdowns. */
export function useCategoryOptions() {
  return useQuery({
    queryKey: queryKeys.categories.list(OPTIONS_PARAMS),
    queryFn: ({ signal }) => fetchCategories(OPTIONS_PARAMS, signal),
    staleTime: 5 * 60_000,
    select: (data) => data.items,
  })
}
