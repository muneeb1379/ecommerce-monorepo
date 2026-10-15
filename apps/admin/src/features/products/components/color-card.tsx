import { useState } from 'react'
import { ActionIcon, Button, ColorInput, Group, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { ColorImageManager } from '@/features/products/components/color-image-manager'
import {
  useAddImage,
  useDeleteColor,
  useDeleteImage,
  useReorderImages,
  useUpdateColor,
  useUpdateImage,
} from '@/features/products/hooks/use-color-mutations'
import { colorFormSchema } from '@/schemas/product.schema'
import type { ProductColor, ProductImage } from '@/types/api'

interface ColorCardProps {
  productId: string
  color: ProductColor
  readOnly: boolean
}

/**
 * One color with its images. Every change is saved straight away through the
 * color/image endpoints; there is no "save all" step.
 */
export function ColorCard({ productId, color, readOnly }: ColorCardProps) {
  const [name, setName] = useState(color.name)
  const [hexValue, setHexValue] = useState(color.hexValue)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null)

  const updateColor = useUpdateColor(productId)
  const deleteColor = useDeleteColor(productId)
  const addImage = useAddImage(productId)
  const updateImage = useUpdateImage(productId)
  const deleteImage = useDeleteImage(productId)
  const reorderImages = useReorderImages(productId)

  const parsed = colorFormSchema.safeParse({ name, hexValue })
  const dirty =
    name.trim() !== color.name || hexValue.toLowerCase() !== color.hexValue.toLowerCase()
  const fieldErrors = parsed.success ? {} : parsed.error.flatten().fieldErrors

  const saveColor = () => {
    if (!parsed.success) return
    updateColor.mutate({
      colorId: color.id,
      input: { name: parsed.data.name, hexValue: parsed.data.hexValue },
    })
  }

  return (
    <Stack
      gap="sm"
      p="md"
      style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}
    >
      <Group align="flex-end" gap="sm">
        <TextInput
          label="Color name"
          placeholder="e.g. Black"
          flex={1}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={dirty ? fieldErrors.name?.[0] : undefined}
          disabled={readOnly}
        />
        <ColorInput
          label="Swatch"
          format="hex"
          w={160}
          value={hexValue}
          onChange={setHexValue}
          error={dirty ? fieldErrors.hexValue?.[0] : undefined}
          disabled={readOnly}
        />
        {!readOnly && (
          <>
            <Button
              onClick={saveColor}
              disabled={!dirty || !parsed.success}
              loading={updateColor.isPending}
            >
              Save
            </Button>
            <Tooltip label="Delete color and its images">
              <ActionIcon
                color="red"
                variant="subtle"
                size="lg"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete color"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </Group>

      <div>
        <Text size="sm" fw={500} mb={6}>
          Images
        </Text>
        <ColorImageManager
          images={color.images}
          readOnly={readOnly}
          onRegister={(result) =>
            addImage.mutateAsync({
              colorId: color.id,
              input: { imageUrl: result.url, imageKitFileId: result.fileId },
            })
          }
          onDelete={setImageToDelete}
          onSetPrimary={(image) =>
            updateImage.mutate({
              colorId: color.id,
              imageId: image.id,
              input: { isPrimary: true },
            })
          }
          onSaveAlt={(image, alt) =>
            updateImage.mutate({ colorId: color.id, imageId: image.id, input: { alt } })
          }
          onReorder={(from, to) => {
            const reordered = [...color.images]
            const [moved] = reordered.splice(from, 1)
            reordered.splice(to, 0, moved)
            const changes = reordered
              .map((image, index) => ({ imageId: image.id, sortOrder: index, current: image.sortOrder }))
              .filter((change) => change.current !== change.sortOrder)
              .map(({ imageId, sortOrder }) => ({ imageId, sortOrder }))
            if (changes.length > 0) reorderImages.mutate({ colorId: color.id, changes })
          }}
        />
      </div>

      <ConfirmDialog
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteColor.mutate(color.id, { onSettled: () => setConfirmDelete(false) })
        }
        title="Delete color"
        message={`Delete "${color.name}" and all of its images? A published product must keep at least one color.`}
        confirmLabel="Delete"
        danger
        loading={deleteColor.isPending}
      />
      <ConfirmDialog
        opened={imageToDelete !== null}
        onClose={() => setImageToDelete(null)}
        onConfirm={() => {
          if (imageToDelete) {
            deleteImage.mutate(
              { colorId: color.id, imageId: imageToDelete.id },
              { onSettled: () => setImageToDelete(null) },
            )
          }
        }}
        title="Remove image"
        message="Remove this image? The file is also deleted from ImageKit."
        confirmLabel="Remove"
        danger
        loading={deleteImage.isPending}
      />
    </Stack>
  )
}
