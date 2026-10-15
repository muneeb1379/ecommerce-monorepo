import { z } from 'zod'
import { dataEnvelope } from '../../schemas/common.js'

export const imageKitAuthResponse = dataEnvelope(
  z.object({
    token: z.string(),
    expire: z.number().int().describe('Unix timestamp (seconds) when the signature expires'),
    signature: z.string(),
    publicKey: z.string(),
    urlEndpoint: z.string(),
    folder: z.string().describe('Folder the frontend should upload into'),
  }),
)
