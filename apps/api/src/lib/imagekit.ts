import { createHmac, randomUUID } from 'node:crypto'

/**
 * Minimal ImageKit client. We only need three operations, so we call the
 * REST API directly instead of pulling in the full SDK.
 *
 * The private key stays on the server: it signs upload tokens and
 * authenticates management calls, and it never appears in a response.
 * See docs/architecture/image-management.md.
 */

const API_BASE = 'https://api.imagekit.io/v1'
const REQUEST_TIMEOUT_MS = 10_000
/** ImageKit rejects signatures that expire more than 1 hour ahead. */
const UPLOAD_TOKEN_TTL_SECONDS = 30 * 60

export interface UploadAuth {
  token: string
  expire: number
  signature: string
  publicKey: string
  urlEndpoint: string
  folder: string
}

export interface ImageKitFileDetails {
  fileId: string
  url: string
}

export interface ImageKitClient {
  createUploadAuth(): UploadAuth
  /** Returns null when the file does not exist. */
  getFileDetails(fileId: string): Promise<ImageKitFileDetails | null>
  /** Idempotent: deleting a file that no longer exists succeeds. */
  deleteFile(fileId: string): Promise<void>
  /** True when the URL points at this account's ImageKit endpoint. */
  isOwnUrl(url: string): boolean
  thumbnailUrl(url: string): string
}

export class ImageKitError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ImageKitError'
  }
}

export interface ImageKitOptions {
  publicKey: string
  privateKey: string
  urlEndpoint: string
  uploadFolder: string
}

export function createImageKitClient(options: ImageKitOptions, fetchImpl: typeof fetch = fetch): ImageKitClient {
  const authorization = `Basic ${Buffer.from(`${options.privateKey}:`).toString('base64')}`
  const endpointPrefix = `${options.urlEndpoint}/`

  async function call(method: 'GET' | 'DELETE', path: string): Promise<Response> {
    try {
      return await fetchImpl(`${API_BASE}${path}`, {
        method,
        headers: { Authorization: authorization, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new ImageKitError(`ImageKit request failed: ${(error as Error).message}`)
    }
  }

  return {
    createUploadAuth() {
      const token = randomUUID()
      const expire = Math.floor(Date.now() / 1000) + UPLOAD_TOKEN_TTL_SECONDS
      const signature = createHmac('sha1', options.privateKey).update(`${token}${expire}`).digest('hex')
      return {
        token,
        expire,
        signature,
        publicKey: options.publicKey,
        urlEndpoint: options.urlEndpoint,
        folder: options.uploadFolder,
      }
    },

    async getFileDetails(fileId) {
      const response = await call('GET', `/files/${encodeURIComponent(fileId)}/details`)
      if (response.status === 404) return null
      if (!response.ok) throw new ImageKitError(`ImageKit file lookup failed`, response.status)
      const body = (await response.json()) as { fileId: string; url: string }
      return { fileId: body.fileId, url: body.url }
    },

    async deleteFile(fileId) {
      const response = await call('DELETE', `/files/${encodeURIComponent(fileId)}`)
      if (response.ok || response.status === 404) return
      throw new ImageKitError(`ImageKit delete failed`, response.status)
    },

    isOwnUrl(url) {
      return url.startsWith(endpointPrefix)
    },

    thumbnailUrl(url) {
      return `${url}${url.includes('?') ? '&' : '?'}tr=w-400,h-400,c-at_max`
    },
  }
}
