import { apiClient } from '@/lib/api/client'
import type {
  ColorInput,
  ImageUpdateInput,
  NewImageInput,
  Paginated,
  Product,
  ProductColor,
  ProductImage,
  ProductInput,
  ProductListItem,
  ProductListParams,
} from '@/types/api'

// Reads live under /api/products (admin, all statuses); writes under /api/admin/products.

export function fetchProducts(params: ProductListParams, signal?: AbortSignal) {
  return apiClient.get<Paginated<ProductListItem>>(
    '/products',
    {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: params.status === 'all' ? undefined : params.status,
      categoryId: params.categoryId === 'all' ? undefined : params.categoryId,
      sort: params.sort,
    },
    signal,
  )
}

export function fetchProduct(id: string, signal?: AbortSignal) {
  return apiClient.get<Product>(`/products/${id}`, undefined, signal)
}

export function createProduct(input: ProductInput) {
  return apiClient.post<Product>('/admin/products', input)
}

/** Partial update of the product's own fields. Colors are managed through the color endpoints. */
export function updateProduct(id: string, input: Partial<ProductInput>) {
  return apiClient.patch<Product>(`/admin/products/${id}`, input)
}

export function deleteProduct(id: string) {
  return apiClient.delete<void>(`/admin/products/${id}`)
}

// --- colors -------------------------------------------------------------------

export function createColor(productId: string, input: ColorInput) {
  return apiClient.post<ProductColor>(`/admin/products/${productId}/colors`, input)
}

export function updateColor(productId: string, colorId: string, input: Partial<ColorInput>) {
  return apiClient.patch<ProductColor>(`/admin/products/${productId}/colors/${colorId}`, input)
}

export function deleteColor(productId: string, colorId: string) {
  return apiClient.delete<void>(`/admin/products/${productId}/colors/${colorId}`)
}

// --- images -------------------------------------------------------------------

export function addColorImage(productId: string, colorId: string, input: NewImageInput) {
  return apiClient.post<ProductImage>(
    `/admin/products/${productId}/colors/${colorId}/images`,
    input,
  )
}

export function updateColorImage(
  productId: string,
  colorId: string,
  imageId: string,
  input: ImageUpdateInput,
) {
  return apiClient.patch<ProductImage>(
    `/admin/products/${productId}/colors/${colorId}/images/${imageId}`,
    input,
  )
}

export function deleteColorImage(productId: string, colorId: string, imageId: string) {
  return apiClient.delete<void>(`/admin/products/${productId}/colors/${colorId}/images/${imageId}`)
}
