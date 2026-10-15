import { Link, useNavigate, useParams } from 'react-router-dom'
import { Anchor, Center, Loader, Text } from '@mantine/core'
import { PageHeader } from '@/components/page-header'
import { ErrorState } from '@/components/feedback/error-state'
import { useCanWriteCatalog } from '@/features/auth/hooks/use-can-write'
import { CategoryForm } from '@/features/categories/components/category-form'
import { useCategory } from '@/features/categories/hooks/use-categories'
import {
  useCreateCategory,
  useUpdateCategory,
} from '@/features/categories/hooks/use-category-mutations'
import type { CategoryFormValues } from '@/schemas/category.schema'

export function CategoryEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const canWrite = useCanWriteCatalog()

  const categoryQuery = useCategory(isNew ? undefined : id)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory(id ?? '')

  if (!isNew && categoryQuery.isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  if (!isNew && (categoryQuery.isError || !categoryQuery.data)) {
    return (
      <ErrorState
        error={categoryQuery.error}
        onRetry={() => void categoryQuery.refetch()}
        title="Could not load category"
      />
    )
  }

  const category = categoryQuery.data

  if (isNew && !canWrite) {
    return <ErrorState error={new Error('You need the admin role to create categories.')} title="Not allowed" />
  }

  const handleSubmit = async (values: CategoryFormValues) => {
    if (isNew) {
      const created = await createCategory.mutateAsync(values)
      navigate(`/categories/${created.id}`, { replace: true })
    } else {
      await updateCategory.mutateAsync(values)
    }
  }

  return (
    <>
      <PageHeader
        title={isNew ? 'New category' : (category?.name ?? 'Edit category')}
        description={
          isNew
            ? 'Group products for the storefront'
            : `${category?.productCount ?? 0} product${category?.productCount === 1 ? '' : 's'} in this category`
        }
        actions={
          <Anchor component={Link} to="/categories" size="sm">
            ← All categories
          </Anchor>
        }
      />
      {!canWrite && (
        <Text size="sm" c="dimmed" mb="md">
          You have read-only access. The admin role is required to change categories.
        </Text>
      )}
      <CategoryForm
        category={isNew ? undefined : category}
        onSubmit={handleSubmit}
        submitting={isNew ? createCategory.isPending : updateCategory.isPending}
        submitLabel={isNew ? 'Create category' : 'Save changes'}
        readOnly={!canWrite}
      />
    </>
  )
}
