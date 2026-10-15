import { useState } from 'react'
import {
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { ApiError } from '@/lib/api/client'
import { currencySymbol } from '@/lib/format'
import { productFormSchema, slugify, type ProductFormValues } from '@/schemas/product.schema'
import { useCurrency } from '@/features/dashboard/hooks/use-currency'
import { useCategoryOptions } from '@/features/categories/hooks/use-categories'
import type { Product } from '@/types/api'

interface ProductFormProps {
  product?: Product
  onSubmit: (values: ProductFormValues) => Promise<unknown>
  submitting: boolean
  submitLabel: string
  /** Staff can view a product but not change it. */
  readOnly?: boolean
}

function toFormValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    compareAtPrice: product?.compareAtPrice ?? null,
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? null,
    status: product?.status ?? 'draft',
    stock: product?.stock ?? 0,
  }
}

export function ProductForm({
  product,
  onSubmit,
  submitting,
  submitLabel,
  readOnly = false,
}: ProductFormProps) {
  const currency = useCurrency()
  const { data: categories } = useCategoryOptions()
  const [slugTouched, setSlugTouched] = useState(Boolean(product))

  const form = useForm<ProductFormValues>({
    initialValues: toFormValues(product),
    validate: zod4Resolver(productFormSchema),
  })

  const categoryOptions = (categories ?? []).map((category) => ({
    value: category.id,
    label: category.isActive ? category.name : `${category.name} (hidden)`,
  }))
  // Keep the product's own category selectable even if it is beyond the first page of options.
  if (product?.category && !categoryOptions.some((o) => o.value === product.category?.id)) {
    categoryOptions.push({ value: product.category.id, label: product.category.name })
  }

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      await onSubmit(values)
      form.resetDirty(values)
    } catch (error) {
      if (!(error instanceof ApiError)) return
      form.setErrors(error.fieldErrors)
      // 409s name the clashing field in the message ("... slug already exists").
      if (error.isConflict) {
        const field = /sku/i.test(error.message) ? 'sku' : 'slug'
        form.setFieldError(field, error.message)
      }
    }
  }

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
      <Paper withBorder radius="md" p="lg">
        {/* A disabled fieldset disables every control inside it. */}
        <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="Product name"
                placeholder="Classic T Shirt"
                required
                value={form.values.name}
                onChange={(e) => {
                  const name = e.currentTarget.value
                  form.setFieldValue('name', name)
                  if (!slugTouched) form.setFieldValue('slug', slugify(name))
                }}
                error={form.errors.name}
              />
              <TextInput
                label="Slug"
                description="Used in the storefront URL"
                required
                {...form.getInputProps('slug')}
                onChange={(e) => {
                  setSlugTouched(true)
                  form.setFieldValue('slug', e.currentTarget.value)
                }}
              />
            </Group>

            <Textarea
              label="Description"
              placeholder="Describe the product…"
              minRows={4}
              autosize
              {...form.getInputProps('description')}
            />

            <Group grow align="flex-start">
              <TextInput label="SKU" required {...form.getInputProps('sku')} />
              <Select
                label="Category"
                placeholder="No category"
                data={categoryOptions}
                searchable
                clearable
                {...form.getInputProps('categoryId')}
              />
              <Select
                label="Status"
                description="Publishing needs a color with an image"
                data={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'archived', label: 'Archived' },
                ]}
                allowDeselect={false}
                {...form.getInputProps('status')}
              />
            </Group>

            <Group grow align="flex-start">
              <NumberInput
                label="Price"
                required
                min={0}
                decimalScale={2}
                fixedDecimalScale
                prefix={currencySymbol(currency)}
                {...form.getInputProps('price')}
              />
              <NumberInput
                label="Compare-at price"
                description="Optional: shown as a strikethrough price"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                prefix={currencySymbol(currency)}
                value={form.values.compareAtPrice ?? ''}
                onChange={(value) =>
                  form.setFieldValue('compareAtPrice', value === '' ? null : Number(value))
                }
                error={form.errors.compareAtPrice}
              />
              <NumberInput
                label="Stock"
                required
                min={0}
                allowDecimal={false}
                {...form.getInputProps('stock')}
              />
            </Group>
          </Stack>
        </fieldset>

        {!readOnly && (
          <Group justify="flex-end" mt="lg">
            <Button type="submit" loading={submitting}>
              {submitLabel}
            </Button>
          </Group>
        )}
      </Paper>
    </form>
  )
}
