import type { FastifyReply, FastifyRequest } from 'fastify'
import { ok, setNoStore } from '../../utils/http.js'
import type { UploadsService } from './uploads.service.js'

export function createUploadsController(service: UploadsService) {
  return {
    async imageKitAuth(_request: FastifyRequest, reply: FastifyReply) {
      // Signatures are single-use credentials; never cache them.
      setNoStore(reply)
      return ok(service.createUploadAuth())
    },
  }
}
