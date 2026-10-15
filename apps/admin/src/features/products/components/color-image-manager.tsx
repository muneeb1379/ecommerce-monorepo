import { useRef, useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Overlay,
  Popover,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import {
  IconAlt,
  IconPhotoPlus,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useImageUpload } from '@/features/products/hooks/use-image-upload'
import type { ImageKitUploadResult } from '@/lib/api/imagekit'
import type { ProductImage } from '@/types/api'

interface ColorImageManagerProps {
  images: ProductImage[]
  /** Staff can view images but not change them. */
  readOnly: boolean
  /** Register a file that ImageKit already stores (POST …/images). */
  onRegister: (result: ImageKitUploadResult) => Promise<unknown>
  onDelete: (image: ProductImage) => void
  onSetPrimary: (image: ProductImage) => void
  onReorder: (from: number, to: number) => void
  onSaveAlt: (image: ProductImage, alt: string | null) => void
}

const tileStyle = {
  aspectRatio: '1',
  borderRadius: 8,
  overflow: 'hidden',
} as const

function AltTextButton({
  image,
  onSave,
}: {
  image: ProductImage
  onSave: (alt: string | null) => void
}) {
  const [opened, setOpened] = useState(false)
  const [value, setValue] = useState(image.alt ?? '')

  return (
    <Popover
      opened={opened}
      onChange={(next) => {
        setOpened(next)
        if (next) setValue(image.alt ?? '')
      }}
      width={240}
      position="bottom"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Tooltip label="Alt text">
          <ActionIcon
            size="sm"
            variant="filled"
            color={image.alt ? 'blue' : 'gray'}
            onClick={() => setOpened((o) => !o)}
            aria-label="Edit alt text"
          >
            <IconAlt size={13} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <TextInput
            size="xs"
            label="Alt text"
            placeholder="Describe the image"
            maxLength={250}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
          />
          <Button
            size="xs"
            onClick={() => {
              const next = value.trim() === '' ? null : value.trim()
              if (next !== image.alt) onSave(next)
              setOpened(false)
            }}
          >
            Save
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

export function ColorImageManager({
  images,
  readOnly,
  onRegister,
  onDelete,
  onSetPrimary,
  onReorder,
  onSaveAlt,
}: ColorImageManagerProps) {
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const { uploads, uploadFiles, dismissUpload } = useImageUpload((_upload, result) =>
    onRegister(result),
  )

  return (
    <Box>
      <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="sm" mb="sm">
        {images.map((image, index) => (
          <Box
            key={image.id}
            draggable={!readOnly}
            onDragStart={() => {
              dragIndex.current = index
            }}
            onDragEnter={() => setOverIndex(index)}
            onDragEnd={() => {
              if (
                dragIndex.current !== null &&
                overIndex !== null &&
                dragIndex.current !== overIndex
              ) {
                onReorder(dragIndex.current, overIndex)
              }
              dragIndex.current = null
              setOverIndex(null)
            }}
            onDragOver={(e) => e.preventDefault()}
            pos="relative"
            style={{
              ...tileStyle,
              border:
                overIndex === index
                  ? '2px solid var(--mantine-color-blue-5)'
                  : '1px solid var(--mantine-color-gray-3)',
              cursor: readOnly ? 'default' : 'grab',
            }}
          >
            <img
              src={image.thumbUrl || image.imageUrl}
              alt={image.alt ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {!readOnly && (
              <Group gap={4} pos="absolute" top={4} right={4}>
                <Tooltip label={image.isPrimary ? 'Primary image' : 'Make primary'}>
                  <ActionIcon
                    size="sm"
                    variant="filled"
                    color={image.isPrimary ? 'yellow' : 'gray'}
                    onClick={() => onSetPrimary(image)}
                    disabled={image.isPrimary}
                    aria-label="Make primary image"
                  >
                    {image.isPrimary ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                  </ActionIcon>
                </Tooltip>
                <AltTextButton image={image} onSave={(alt) => onSaveAlt(image, alt)} />
                <ActionIcon
                  size="sm"
                  variant="filled"
                  color="red"
                  onClick={() => onDelete(image)}
                  aria-label="Delete image"
                >
                  <IconTrash size={13} />
                </ActionIcon>
              </Group>
            )}
            {readOnly && image.isPrimary && (
              <Box pos="absolute" top={4} right={4}>
                <IconStarFilled size={16} color="var(--mantine-color-yellow-5)" />
              </Box>
            )}
          </Box>
        ))}

        {uploads.map((upload) => (
          <Box
            key={upload.id}
            pos="relative"
            style={{ ...tileStyle, border: '1px solid var(--mantine-color-gray-3)' }}
          >
            <img
              src={upload.previewUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {upload.status === 'uploading' && (
              <Overlay color="#000" backgroundOpacity={0.45} p={4}>
                <Progress value={upload.progress} size="sm" color="blue" />
              </Overlay>
            )}
            {upload.status === 'saving' && (
              <Overlay color="#000" backgroundOpacity={0.45}>
                <Group justify="center" h="100%">
                  <Loader size="sm" color="white" />
                </Group>
              </Overlay>
            )}
            {upload.status === 'error' && (
              <Overlay color="#000" backgroundOpacity={0.6}>
                <Group justify="center" h="100%">
                  <Tooltip label={upload.error ?? 'Upload failed'}>
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="filled"
                      onClick={() => dismissUpload(upload.id)}
                      aria-label="Dismiss failed upload"
                    >
                      <IconX size={13} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Overlay>
            )}
          </Box>
        ))}

        {!readOnly && (
          <Dropzone
            onDrop={(files) => uploadFiles(files)}
            accept={IMAGE_MIME_TYPE}
            maxSize={8 * 1024 ** 2}
            style={{
              ...tileStyle,
              border: '1px dashed var(--mantine-color-gray-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Group
              justify="center"
              gap={4}
              style={{ flexDirection: 'column', pointerEvents: 'none' }}
            >
              <IconPhotoPlus size={20} color="var(--mantine-color-gray-5)" />
              <Text size="xs" c="dimmed">
                Add
              </Text>
            </Group>
          </Dropzone>
        )}
      </SimpleGrid>

      {images.length === 0 && uploads.length === 0 && (
        <Text size="xs" c="dimmed">
          {readOnly
            ? 'No images yet.'
            : 'No images yet. Drag and drop or click the tile above to upload.'}
        </Text>
      )}
    </Box>
  )
}
