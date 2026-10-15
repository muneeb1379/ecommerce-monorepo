import { AppError, upstreamError } from '../../lib/errors.js'
import { ImageKitError } from '../../lib/imagekit.js'
import type { ImageKitClient, UploadAuth } from '../../lib/imagekit.js'

export interface ImageToValidate {
  imageUrl: string
  imageKitFileId: string
}

const VALIDATION_CONCURRENCY = 5

const stripQuery = (url: string) => url.split('?')[0]!

export class UploadsService {
  constructor(
    private readonly imagekit: ImageKitClient,
    private readonly options: { verifyUploads: boolean },
  ) {}

  /** Signed, short-lived credentials for a direct browser → ImageKit upload. */
  createUploadAuth(): UploadAuth {
    return this.imagekit.createUploadAuth()
  }

  /**
   * Validates the image metadata the admin frontend sends after uploading to
   * ImageKit, before anything is stored:
   *   - the URL must be on this account's ImageKit URL endpoint
   *   - when IMAGEKIT_VERIFY_UPLOADS is on, the file must exist in ImageKit and
   *     its URL must match, so a client cannot pair an arbitrary URL with
   *     someone else's file ID.
   * Returns the images with the canonical URL reported by ImageKit.
   */
  async validateImages<T extends ImageToValidate>(images: T[]): Promise<T[]> {
    for (const image of images) {
      if (!this.imagekit.isOwnUrl(image.imageUrl)) {
        throw new AppError(422, 'INVALID_IMAGE', 'Image URL must be served from the configured ImageKit endpoint', {
          imageUrl: image.imageUrl,
        })
      }
    }

    const fileIds = images.map((image) => image.imageKitFileId)
    if (new Set(fileIds).size !== fileIds.length) {
      throw new AppError(422, 'INVALID_IMAGE', 'The same ImageKit file is used more than once')
    }

    if (!this.options.verifyUploads) return images

    const verified: T[] = []
    for (let i = 0; i < images.length; i += VALIDATION_CONCURRENCY) {
      const batch = images.slice(i, i + VALIDATION_CONCURRENCY)
      verified.push(...(await Promise.all(batch.map((image) => this.verifyOne(image)))))
    }
    return verified
  }

  private async verifyOne<T extends ImageToValidate>(image: T): Promise<T> {
    let details
    try {
      details = await this.imagekit.getFileDetails(image.imageKitFileId)
    } catch (error) {
      if (error instanceof ImageKitError) throw upstreamError('Could not verify the image with ImageKit')
      throw error
    }
    if (!details) {
      throw new AppError(422, 'INVALID_IMAGE', 'ImageKit file not found', { imageKitFileId: image.imageKitFileId })
    }
    if (stripQuery(details.url) !== stripQuery(image.imageUrl)) {
      throw new AppError(422, 'INVALID_IMAGE', 'Image URL does not match the ImageKit file', {
        imageKitFileId: image.imageKitFileId,
      })
    }
    return { ...image, imageUrl: details.url }
  }
}
