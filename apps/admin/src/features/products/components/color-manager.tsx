import { useState } from 'react'
import { Button, ColorInput, Group, Paper, Stack, Text, TextInput } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { ColorCard } from '@/features/products/components/color-card'
import { useAddColor } from '@/features/products/hooks/use-color-mutations'
import { colorFormSchema } from '@/schemas/product.schema'
import type { Product } from '@/types/api'

interface ColorManagerProps {
  product: Product
  readOnly: boolean
}

export function ColorManager({ product, readOnly }: ColorManagerProps) {
  const addColor = useAddColor(product.id)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [hexValue, setHexValue] = useState('#000000')

  const parsed = colorFormSchema.safeParse({ name, hexValue })
  const nameError = name !== '' && !parsed.success ? parsed.error.flatten().fieldErrors.name?.[0] : undefined

  const submit = () => {
    if (!parsed.success) return
    addColor.mutate(parsed.data, {
      onSuccess: () => {
        setAdding(false)
        setName('')
        setHexValue('#000000')
      },
    })
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Each color has its own images. Changes here are saved immediately. The first image of a
        color becomes its primary image, and a published product needs at least one color with an
        image.
      </Text>

      {product.colors.length === 0 && !adding && (
        <Text size="sm" c="dimmed">
          No colors yet.
        </Text>
      )}

      {product.colors.map((color) => (
        <ColorCard key={color.id} productId={product.id} color={color} readOnly={readOnly} />
      ))}

      {!readOnly &&
        (adding ? (
          <Paper withBorder radius="md" p="md">
            <Group align="flex-end" gap="sm">
              <TextInput
                label="New color name"
                placeholder="e.g. Black"
                flex={1}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                error={nameError}
                data-autofocus
              />
              <ColorInput label="Swatch" format="hex" w={160} value={hexValue} onChange={setHexValue} />
              <Button onClick={submit} disabled={!parsed.success} loading={addColor.isPending}>
                Add color
              </Button>
              <Button variant="default" onClick={() => setAdding(false)} disabled={addColor.isPending}>
                Cancel
              </Button>
            </Group>
          </Paper>
        ) : (
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => setAdding(true)}
            w="fit-content"
          >
            Add color
          </Button>
        ))}
    </Stack>
  )
}
