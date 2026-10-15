import type { FastifyReply } from 'fastify'
import { ok, paginated, setNoStore, setPublicCache } from '../../utils/http.js'
import type { CategoryListQuery, CreateCategoryBody, UpdateCategoryBody } from './categories.schemas.js'
import type { CategoriesService } from './categories.service.js'
import type { CategoryRecord } from './categories.types.js'

const toAdminCategory = (category: CategoryRecord) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
  productCount: category.productCount,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
})

export function createCategoriesController(service: CategoriesService, options: { storeCacheMaxAge: number }) {
  return {
    async storeList(reply: FastifyReply) {
      setPublicCache(reply, options.storeCacheMaxAge)
      return ok(await service.listPublic())
    },

    async adminList(query: CategoryListQuery, reply: FastifyReply) {
      setNoStore(reply)
      const page = { page: query.page, pageSize: query.pageSize }
      const result = await service.list({ search: query.search }, page)
      return paginated({ items: result.items.map(toAdminCategory), total: result.total }, page)
    },

    async adminGet(id: string, reply: FastifyReply) {
      setNoStore(reply)
      return ok(toAdminCategory(await service.getById(id)))
    },

    async create(body: CreateCategoryBody, reply: FastifyReply) {
      const category = await service.create(body)
      reply.code(201)
      return ok(toAdminCategory(category))
    },

    async update(id: string, body: UpdateCategoryBody) {
      return ok(toAdminCategory(await service.update(id, body)))
    },

    async remove(id: string, reply: FastifyReply) {
      await service.delete(id)
      return reply.code(204).send()
    },
  }
}

export type CategoriesController = ReturnType<typeof createCategoriesController>
