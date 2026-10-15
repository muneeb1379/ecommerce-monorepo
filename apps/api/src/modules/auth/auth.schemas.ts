import { z } from 'zod'
import { dataEnvelope } from '../../schemas/common.js'

export const adminProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(['owner', 'admin', 'staff']),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
})

export const meResponse = dataEnvelope(adminProfileSchema)
