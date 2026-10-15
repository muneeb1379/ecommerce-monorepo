import { apiClient } from '@/lib/api/client'
import type { Customer, CustomerListItem, CustomerListParams, Paginated } from '@/types/api'

export function fetchCustomers(params: CustomerListParams, signal?: AbortSignal) {
  return apiClient.get<Paginated<CustomerListItem>>(
    '/admin/customers',
    {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sort: params.sort,
    },
    signal,
  )
}

export function fetchCustomer(id: string, signal?: AbortSignal) {
  return apiClient.get<Customer>(`/admin/customers/${id}`, undefined, signal)
}
