import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses, commonErrorResponses, errorEnvelope, idParams, noContent } from '../../schemas/common.js'
import type { CategoriesController } from './categories.controller.js'
import {
  adminCategoryListResponse,
  adminCategoryResponse,
  categoryListQuery,
  createCategoryBody,
  storeCategoryListResponse,
  updateCategoryBody,
} from './categories.schemas.js'

const security = [{ bearerAuth: [] }]
const adminErrors = { ...commonErrorResponses, ...authErrorResponses, 404: errorEnvelope }

/** Mounted at /api/admin/categories */
export function categoriesAdminRoutes(controller: CategoriesController): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Categories (admin)']

    app.get(
      '/',
      {
        onRequest: app.guards.requireAdmin(),
        schema: {
          tags,
          summary: 'List categories (including inactive)',
          security,
          querystring: categoryListQuery,
          response: { 200: adminCategoryListResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.adminList(request.query, reply),
    )

    app.get(
      '/:id',
      {
        onRequest: app.guards.requireAdmin(),
        schema: {
          tags,
          summary: 'Get a category',
          security,
          params: idParams,
          response: { 200: adminCategoryResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.adminGet(request.params.id, reply),
    )

    app.post(
      '/',
      {
        onRequest: app.guards.requireAdmin('admin'),
        schema: {
          tags,
          summary: 'Create a category',
          security,
          body: createCategoryBody,
          response: { 201: adminCategoryResponse, ...adminErrors, 409: errorEnvelope },
        },
      },
      (request, reply) => controller.create(request.body, reply),
    )

    app.patch(
      '/:id',
      {
        onRequest: app.guards.requireAdmin('admin'),
        schema: {
          tags,
          summary: 'Update a category',
          security,
          params: idParams,
          body: updateCategoryBody,
          response: { 200: adminCategoryResponse, ...adminErrors, 409: errorEnvelope },
        },
      },
      (request) => controller.update(request.params.id, request.body),
    )

    app.delete(
      '/:id',
      {
        onRequest: app.guards.requireAdmin('admin'),
        schema: {
          tags,
          summary: 'Delete a category (409 if products still use it)',
          security,
          params: idParams,
          response: { 204: noContent, ...adminErrors, 409: errorEnvelope },
        },
      },
      (request, reply) => controller.remove(request.params.id, reply),
    )
  }
}

/** Mounted at /api/store/categories */
export function categoriesStoreRoutes(controller: CategoriesController): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/',
      {
        schema: {
          tags: ['Storefront'],
          summary: 'List active categories',
          response: { 200: storeCategoryListResponse, 500: errorEnvelope },
        },
      },
      (_request, reply) => controller.storeList(reply),
    )
  }
}
