import { z } from 'zod'
import { dataEnvelope, listEnvelope, paginationQuery, searchQuery, slugSchema } from '../../schemas/common.js'

export const categoryListQuery = z.object({ ...paginationQuery, search: searchQuery })

const categoryFields = {
  name: z.string().trim().min(1).max(100),
  slug: slugSchema.max(100),
  description: z.string().max(2000),
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
}

export const createCategoryBody = z.object({
  ...categoryFields,
  description: categoryFields.description.default(''),
  sortOrder: categoryFields.sortOrder.default(0),
  isActive: categoryFields.isActive.default(true),
})

export const updateCategoryBody = z
  .object({
    name: categoryFields.name.optional(),
    slug: categoryFields.slug.optional(),
    description: categoryFields.description.optional(),
    sortOrder: categoryFields.sortOrder.optional(),
    isActive: categoryFields.isActive.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  })

export const adminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  productCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const storeCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
})

export const adminCategoryResponse = dataEnvelope(adminCategorySchema)
export const adminCategoryListResponse = listEnvelope(adminCategorySchema)
export const storeCategoryListResponse = dataEnvelope(z.array(storeCategorySchema))

export type CategoryListQuery = z.infer<typeof categoryListQuery>
export type CreateCategoryBody = z.infer<typeof createCategoryBody>
export type UpdateCategoryBody = z.infer<typeof updateCategoryBody>
