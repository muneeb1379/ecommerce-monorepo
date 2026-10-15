import { useQuery } from '@tanstack/react-query'
import { fetchCustomer, fetchCustomers } from '@/lib/api/customers'
import { queryKeys } from '@/lib/query-client'
import type { CustomerListParams } from '@/types/api'

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: ({ signal }) => fetchCustomers(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: ({ signal }) => fetchCustomer(id as string, signal),
    enabled: Boolean(id),
  })
}
