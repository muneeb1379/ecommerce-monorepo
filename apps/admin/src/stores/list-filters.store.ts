import { create } from 'zustand'
import type { OrderListParams, ProductListParams } from '@/types/api'

/**
 * Filter/search state for list views. Kept in Zustand (not component
 * state) so filters survive navigating to a detail page and back —
 * and kept in-memory only (no persist middleware) so a fresh browser
 * session doesn't reopen a stale filtered view.
 */

interface ProductFiltersState extends Omit<ProductListParams, 'page' | 'pageSize'> {
  page: number
  pageSize: number
  setFilters: (filters: Partial<ProductFiltersState>) => void
  reset: () => void
}

const productDefaults: Omit<ProductFiltersState, 'setFilters' | 'reset'> = {
  page: 1,
  pageSize: 20,
  search: '',
  status: 'all',
  categoryId: 'all',
  sort: 'updated-desc',
}

export const useProductFiltersStore = create<ProductFiltersState>((set) => ({
  ...productDefaults,
  setFilters: (filters) =>
    set((state) => ({
      ...state,
      ...filters,
      // any filter change other than page resets pagination
      page: filters.page ?? 1,
    })),
  reset: () => set(productDefaults),
}))

interface OrderFiltersState extends Omit<OrderListParams, 'page' | 'pageSize' | 'customerId'> {
  page: number
  pageSize: number
  setFilters: (filters: Partial<OrderFiltersState>) => void
  reset: () => void
}

const orderDefaults: Omit<OrderFiltersState, 'setFilters' | 'reset'> = {
  page: 1,
  pageSize: 20,
  search: '',
  status: 'all',
  paymentStatus: 'all',
  dateFrom: undefined,
  dateTo: undefined,
  sort: 'created-desc',
}

export const useOrderFiltersStore = create<OrderFiltersState>((set) => ({
  ...orderDefaults,
  setFilters: (filters) =>
    set((state) => ({
      ...state,
      ...filters,
      page: filters.page ?? 1,
    })),
  reset: () => set(orderDefaults),
}))
