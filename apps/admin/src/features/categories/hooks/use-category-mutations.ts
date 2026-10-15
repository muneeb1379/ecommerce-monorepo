import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createCategory, deleteCategory, updateCategory } from '@/lib/api/categories'
import { queryKeys } from '@/lib/query-client'
import type { CategoryInput } from '@/types/api'

/** Category names/counts appear in product lists, so those caches go stale too. */
function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
  }
}

export function useCreateCategory() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: () => {
      invalidate()
      notifications.show({ color: 'green', message: 'Category created.' })
    },
  })
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (input: Partial<CategoryInput>) => updateCategory(id, input),
    onSuccess: (category) => {
      queryClient.setQueryData(queryKeys.categories.detail(id), category)
      invalidate()
      notifications.show({ color: 'green', message: 'Category updated.' })
    },
  })
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidate()
      notifications.show({ color: 'green', message: 'Category deleted.' })
    },
  })
}
