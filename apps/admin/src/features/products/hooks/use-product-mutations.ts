import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createProduct, deleteProduct, updateProduct } from '@/lib/api/products'
import { queryKeys } from '@/lib/query-client'
import type { Paginated, ProductInput, ProductListItem, ProductStatus } from '@/types/api'

/** Product writes change list rows, category counts and dashboard totals. */
function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics })
  }
}

export function useCreateProduct() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => {
      invalidate()
      notifications.show({ color: 'green', message: 'Product created. Now add colors and images.' })
    },
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) => updateProduct(id, input),
    onSuccess: (product) => {
      queryClient.setQueryData(queryKeys.products.detail(id), product)
      invalidate()
      notifications.show({ color: 'green', message: 'Product updated.' })
    },
  })
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      invalidate()
      notifications.show({ color: 'green', message: 'Product deleted.' })
    },
  })
}

/** Quick publish / unpublish / archive from the list, applied optimistically. */
export function useSetProductStatus() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      updateProduct(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all })
      const previousLists = queryClient.getQueriesData<Paginated<ProductListItem>>({
        queryKey: ['products', 'list'],
      })

      for (const [key, data] of previousLists) {
        if (!data) continue
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((item) => (item.id === id ? { ...item, status } : item)),
        })
      }

      return { previousLists }
    },
    onError: (_err, _vars, context) => {
      // The global handler shows the API message (e.g. "publishing requires images").
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: invalidate,
  })
}
