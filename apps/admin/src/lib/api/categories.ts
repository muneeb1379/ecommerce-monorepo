import { apiClient } from '@/lib/api/client'
import type { Category, CategoryInput, CategoryListParams, Paginated } from '@/types/api'

export function fetchCategories(params: CategoryListParams, signal?: AbortSignal) {
  return apiClient.get<Paginated<Category>>(
    '/admin/categories',
    { page: params.page, pageSize: params.pageSize, search: params.search },
    signal,
  )
}

export function fetchCategory(id: string, signal?: AbortSignal) {
  return apiClient.get<Category>(`/admin/categories/${id}`, undefined, signal)
}

export function createCategory(input: CategoryInput) {
  return apiClient.post<Category>('/admin/categories', input)
}

export function updateCategory(id: string, input: Partial<CategoryInput>) {
  return apiClient.patch<Category>(`/admin/categories/${id}`, input)
}

export function deleteCategory(id: string) {
  return apiClient.delete<void>(`/admin/categories/${id}`)
}
