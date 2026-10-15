import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import {
  addColorImage,
  createColor,
  deleteColor,
  deleteColorImage,
  updateColor,
  updateColorImage,
} from '@/lib/api/products'
import { queryKeys } from '@/lib/query-client'
import type { ColorInput, ImageUpdateInput, NewImageInput } from '@/types/api'

/**
 * Colors and images are saved one change at a time. After each write the
 * product is refetched, so the UI always shows what the server holds
 * (primary image, sort order, ...) rather than a guess.
 */
function useRefreshProduct(productId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) }),
      // Lists show the primary image and color count.
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] }),
    ])
}

export function useAddColor(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: (input: ColorInput) => createColor(productId, input),
    onSuccess: async () => {
      await refresh()
      notifications.show({ color: 'green', message: 'Color added.' })
    },
  })
}

export function useUpdateColor(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: ({ colorId, input }: { colorId: string; input: Partial<ColorInput> }) =>
      updateColor(productId, colorId, input),
    onSuccess: async () => {
      await refresh()
      notifications.show({ color: 'green', message: 'Color saved.' })
    },
  })
}

export function useDeleteColor(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: (colorId: string) => deleteColor(productId, colorId),
    onSuccess: async () => {
      await refresh()
      notifications.show({ color: 'green', message: 'Color deleted.' })
    },
  })
}

export function useAddImage(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: ({ colorId, input }: { colorId: string; input: NewImageInput }) =>
      addColorImage(productId, colorId, input),
    onSuccess: () => refresh(),
  })
}

export function useUpdateImage(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: ({
      colorId,
      imageId,
      input,
    }: {
      colorId: string
      imageId: string
      input: ImageUpdateInput
    }) => updateColorImage(productId, colorId, imageId, input),
    onSuccess: () => refresh(),
  })
}

export function useDeleteImage(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: ({ colorId, imageId }: { colorId: string; imageId: string }) =>
      deleteColorImage(productId, colorId, imageId),
    onSuccess: async () => {
      await refresh()
      notifications.show({ color: 'green', message: 'Image removed.' })
    },
  })
}

/**
 * Persists a new image order: every image whose position changed gets its
 * `sortOrder` set to its new index.
 */
export function useReorderImages(productId: string) {
  const refresh = useRefreshProduct(productId)
  return useMutation({
    mutationFn: async ({
      colorId,
      changes,
    }: {
      colorId: string
      changes: Array<{ imageId: string; sortOrder: number }>
    }) => {
      await Promise.all(
        changes.map(({ imageId, sortOrder }) =>
          updateColorImage(productId, colorId, imageId, { sortOrder }),
        ),
      )
    },
    onSettled: () => refresh(),
  })
}
