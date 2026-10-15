export interface CategoryRecord {
  id: string
  name: string
  slug: string
  description: string
  sortOrder: number
  isActive: boolean
  productCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PublicCategoryRecord {
  id: string
  name: string
  slug: string
  description: string
}

export interface CreateCategoryInput {
  name: string
  slug: string
  description: string
  sortOrder: number
  isActive: boolean
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>
