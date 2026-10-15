export const CUSTOMER_SORTS = ['created-desc', 'name-asc', 'spent-desc', 'orders-desc'] as const
export type CustomerSort = (typeof CUSTOMER_SORTS)[number]

export interface CustomerListRecord {
  id: string
  fullName: string
  email: string
  phone: string | null
  ordersCount: number
  totalSpent: number
  lastOrderAt: Date | null
  createdAt: Date
}

export interface AddressRecord {
  id: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

export interface CustomerRecord extends CustomerListRecord {
  addresses: AddressRecord[]
  updatedAt: Date
}
