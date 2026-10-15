import { useCallback, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { ApiError } from '@/lib/api/client'
import { uploadImageToImageKit, type ImageKitUploadResult } from '@/lib/api/imagekit'

export interface PendingUpload {
  id: string
  file: File
  previewUrl: string
  progress: number
  /** `saving` = uploaded to ImageKit, registering it with the API server. */
  status: 'uploading' | 'saving' | 'error'
  error?: string
}

/**
 * Drives the direct-to-ImageKit upload flow with per-file progress.
 *
 * `onUploaded` runs once ImageKit has the file (typically registering it with
 * the API). The tile stays visible in a "saving" state until the returned
 * promise settles, so there is no gap between upload and the refreshed list.
 */
export function useImageUpload(
  onUploaded: (upload: PendingUpload, result: ImageKitUploadResult) => Promise<unknown> | void,
) {
  const [uploads, setUploads] = useState<PendingUpload[]>([])

  const patch = useCallback((id: string, changes: Partial<PendingUpload>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)))
  }, [])

  const remove = useCallback((id: string) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((u) => u.id !== id)
    })
  }, [])

  const uploadFiles = useCallback(
    (files: File[]) => {
      const newUploads: PendingUpload[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading',
      }))

      setUploads((prev) => [...prev, ...newUploads])

      for (const upload of newUploads) {
        void (async () => {
          try {
            const result = await uploadImageToImageKit({
              file: upload.file,
              onProgress: (percent) => patch(upload.id, { progress: percent }),
            })
            patch(upload.id, { status: 'saving', progress: 100 })
            await onUploaded(upload, result)
            remove(upload.id)
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Upload failed'
            patch(upload.id, { status: 'error', error: message })
            // Failures from the API server are already reported by the global mutation handler.
            if (!(error instanceof ApiError)) {
              notifications.show({ color: 'red', message: `${upload.file.name}: ${message}` })
            }
          }
        })()
      }
    },
    [onUploaded, patch, remove],
  )

  return { uploads, uploadFiles, dismissUpload: remove }
}
