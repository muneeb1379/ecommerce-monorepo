import { useState } from 'react'
import { Button, Group, NumberInput, Paper, Stack, Switch, Textarea, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { ApiError } from '@/lib/api/client'
import { categoryFormSchema, type CategoryFormValues } from '@/schemas/category.schema'
import { slugify } from '@/schemas/product.schema'
import type { Category } from '@/types/api'

interface CategoryFormProps {
  category?: Category
  onSubmit: (values: CategoryFormValues) => Promise<unknown>
  submitting: boolean
  submitLabel: string
  /** Staff can view a category but not change it. */
  readOnly?: boolean
}

function toFormValues(category?: Category): CategoryFormValues {
  return {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    sortOrder: category?.sortOrder ?? 0,
    isActive: category?.isActive ?? true,
  }
}

export function CategoryForm({
  category,
  onSubmit,
  submitting,
  submitLabel,
  readOnly = false,
}: CategoryFormProps) {
  const [slugTouched, setSlugTouched] = useState(Boolean(category))

  const form = useForm<CategoryFormValues>({
    initialValues: toFormValues(category),
    validate: zod4Resolver(categoryFormSchema),
  })

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      await onSubmit(values)
      form.resetDirty(values)
    } catch (error) {
      // Show server-side validation / conflict messages (e.g. duplicate slug) on the fields.
      if (error instanceof ApiError) {
        form.setErrors(error.fieldErrors)
        if (error.isConflict) form.setFieldError('slug', error.message)
      }
    }
  }

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
      <Paper withBorder radius="md" p="lg" maw={720}>
        {/* A disabled fieldset disables every control inside it. */}
        <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="Name"
                placeholder="T-Shirts"
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
              placeholder="Everyday tees"
              minRows={3}
              autosize
              {...form.getInputProps('description')}
            />

            <Group grow align="flex-start">
              <NumberInput
                label="Sort order"
                description="Lower numbers appear first in the storefront"
                min={0}
                max={10000}
                allowDecimal={false}
                {...form.getInputProps('sortOrder')}
              />
              <Switch
                label="Active"
                description="Inactive categories are hidden from the storefront"
                mt={28}
                {...form.getInputProps('isActive', { type: 'checkbox' })}
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
