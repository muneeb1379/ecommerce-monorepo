import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses, commonErrorResponses, errorEnvelope, noContent } from '../../schemas/common.js'
import type { ProductsController } from './products.controller.js'
import {
  adminColorResponse,
  adminImageResponse,
  adminProductListQuery,
  adminProductListResponse,
  adminProductResponse,
  colorParams,
  createProductBody,
  imageParams,
  newColorBody,
  newImageBody,
  productIdParams,
  slugParams,
  storeProductListQuery,
  storeProductListResponse,
  storeProductResponse,
  updateColorBody,
  updateImageBody,
  updateProductBody,
} from './products.schemas.js'

const security = [{ bearerAuth: [] }]
const adminErrors = { ...commonErrorResponses, ...authErrorResponses, 404: errorEnvelope }
const writeErrors = { ...adminErrors, 409: errorEnvelope, 502: errorEnvelope }

/**
 * Mounted at /api/products. Product reads for the admin dashboard, including
 * drafts and archived products, so any admin role is required.
 */
export function productsReadRoutes(controller: ProductsController): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Products (admin)']

    app.get(
      '/',
      {
        onRequest: app.guards.requireAdmin(),
        schema: {
          tags,
          summary: 'List products (all statuses)',
          security,
          querystring: adminProductListQuery,
          response: { 200: adminProductListResponse, ...adminErrors },
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
          summary: 'Get a product with all colors and images',
          security,
          params: productIdParams,
          response: { 200: adminProductResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.adminGet(request.params.id, reply),
    )
  }
}

/** Mounted at /api/admin/products. Catalog writes need the `admin` role. */
export function productsAdminRoutes(controller: ProductsController): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Products (admin)']
    const onRequest = app.guards.requireAdmin('admin')

    app.post(
      '/',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Create a product, optionally with colors and images',
          security,
          body: createProductBody,
          response: { 201: adminProductResponse, ...writeErrors },
        },
      },
      (request, reply) => controller.create(request.body, reply),
    )

    app.patch(
      '/:id',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Update a product (partial). `colors`, when sent, replaces the full color/image set.',
          security,
          params: productIdParams,
          body: updateProductBody,
          response: { 200: adminProductResponse, ...writeErrors },
        },
      },
      (request) => controller.update(request.params.id, request.body),
    )

    app.delete(
      '/:id',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Delete a product, its colors and images (ImageKit assets are cleaned up)',
          security,
          params: productIdParams,
          response: { 204: noContent, ...adminErrors },
        },
      },
      (request, reply) => controller.remove(request.params.id, reply),
    )

    app.post(
      '/:id/colors',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Add a color (optionally with images)',
          security,
          params: productIdParams,
          body: newColorBody,
          response: { 201: adminColorResponse, ...writeErrors },
        },
      },
      (request, reply) => controller.addColor(request.params.id, request.body, reply),
    )

    app.patch(
      '/:id/colors/:colorId',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Update a color',
          security,
          params: colorParams,
          body: updateColorBody,
          response: { 200: adminColorResponse, ...writeErrors },
        },
      },
      (request) => controller.updateColor(request.params.id, request.params.colorId, request.body),
    )

    app.delete(
      '/:id/colors/:colorId',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Delete a color and its images',
          security,
          params: colorParams,
          response: { 204: noContent, ...adminErrors },
        },
      },
      (request, reply) => controller.removeColor(request.params.id, request.params.colorId, reply),
    )

    app.post(
      '/:id/colors/:colorId/images',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Attach an uploaded ImageKit image to a color',
          security,
          params: colorParams,
          body: newImageBody,
          response: { 201: adminImageResponse, ...writeErrors },
        },
      },
      (request, reply) => controller.addImage(request.params.id, request.params.colorId, request.body, reply),
    )

    app.patch(
      '/:id/colors/:colorId/images/:imageId',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Update image alt text, sort order or primary flag',
          security,
          params: imageParams,
          body: updateImageBody,
          response: { 200: adminImageResponse, ...adminErrors },
        },
      },
      (request) =>
        controller.updateImage(request.params.id, request.params.colorId, request.params.imageId, request.body),
    )

    app.delete(
      '/:id/colors/:colorId/images/:imageId',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Delete an image (idempotent) and its ImageKit asset',
          security,
          params: imageParams,
          response: { 204: noContent, ...adminErrors },
        },
      },
      (request, reply) =>
        controller.removeImage(request.params.id, request.params.colorId, request.params.imageId, reply),
    )
  }
}

/** Mounted at /api/store/products. Public; published products only. */
export function productsStoreRoutes(controller: ProductsController): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Storefront']

    app.get(
      '/',
      {
        schema: {
          tags,
          summary: 'List published products',
          querystring: storeProductListQuery,
          response: { 200: storeProductListResponse, ...commonErrorResponses },
        },
      },
      (request, reply) => controller.storeList(request.query, reply),
    )

    app.get(
      '/:slug',
      {
        schema: {
          tags,
          summary: 'Get a published product with every color and its images in one response',
          params: slugParams,
          response: { 200: storeProductResponse, 404: errorEnvelope, ...commonErrorResponses },
        },
      },
      (request, reply) => controller.storeGetBySlug(request.params.slug, reply),
    )
  }
}
