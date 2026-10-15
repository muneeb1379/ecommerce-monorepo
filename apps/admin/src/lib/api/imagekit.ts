import { apiClient } from '@/lib/api/client'
import type { ImageKitAuthParams } from '@/types/api'

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'

/**
 * Requests short-lived, signed upload credentials from our API server.
 * The ImageKit private key never touches the browser — only the API
 * server holds it and computes the signature.
 */
export function fetchImageKitAuthParams(signal?: AbortSignal) {
  return apiClient.get<ImageKitAuthParams>('/admin/uploads/imagekit-auth', undefined, signal)
}

export interface ImageKitUploadResult {
  fileId: string
  url: string
  thumbnailUrl: string
  name: string
}

interface UploadImageOptions {
  file: File
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/**
 * Uploads directly to ImageKit from the browser using XHR (not fetch)
 * so we can report upload progress. Auth params come from our API
 * server per-upload and are single-use.
 */
export function uploadImageToImageKit({
  file,
  onProgress,
  signal,
}: UploadImageOptions): Promise<ImageKitUploadResult> {
  return new Promise((resolve, reject) => {
    fetchImageKitAuthParams(signal)
      .then((auth) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileName', file.name)
        formData.append('publicKey', auth.publicKey)
        formData.append('signature', auth.signature)
        formData.append('expire', String(auth.expire))
        formData.append('token', auth.token)
        formData.append('useUniqueFileName', 'true')
        // The upload folder is decided by the server (IMAGEKIT_UPLOAD_FOLDER).
        if (auth.folder) formData.append('folder', auth.folder)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', IMAGEKIT_UPLOAD_URL)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText) as {
                fileId: string
                url: string
                thumbnailUrl: string
                name: string
              }
              resolve(parsed)
            } catch {
              reject(new Error('ImageKit returned an unexpected response.'))
            }
          } else {
            reject(new Error(`ImageKit upload failed (${xhr.status}).`))
          }
        }

        xhr.onerror = () => reject(new Error('Network error while uploading to ImageKit.'))
        xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))

        signal?.addEventListener('abort', () => xhr.abort())

        xhr.send(formData)
      })
      .catch(reject)
  })
}

/*
 * After a successful upload the image is registered with the API server
 * (POST /admin/products/:id/colors/:colorId/images, see lib/api/products.ts),
 * which verifies it against ImageKit before storing the metadata.
 */
