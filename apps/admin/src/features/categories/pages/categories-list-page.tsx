import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionIcon, Badge, Button, Group, Menu, Table, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconDots, IconEdit, IconPlus, IconSearch, IconTags, IconTrash } from '@tabler/icons-react'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { useCanWriteCatalog } from '@/features/auth/hooks/use-can-write'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { useDeleteCategory } from '@/features/categories/hooks/use-category-mutations'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { Category } from '@/types/api'

export function CategoriesListPage() {
  const canWrite = useCanWriteCatalog()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search] = useDebouncedValue(searchInput, 300)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const { data, isLoading, isError, error, refetch } = useCategories({ page, pageSize: 20, search })
  const deleteCategory = useDeleteCategory()

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise products into storefront categories"
        actions={
          canWrite && (
            <Button component={Link} to="/categories/new" leftSection={<IconPlus size={16} />}>
              New category
            </Button>
          )
        }
      />

      <TextInput
        placeholder="Search by name or slug…"
        leftSection={<IconSearch size={16} />}
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.currentTarget.value)
          setPage(1)
        }}
        w={280}
        mb="md"
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !isLoading && data?.items.length === 0 ? (
        <EmptyState
          icon={<IconTags size={24} />}
          title="No categories found"
          description={
            search ? 'Try a different search.' : 'Create your first category to organise products.'
          }
        />
      ) : (
        <>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Slug</Table.Th>
                <Table.Th>Products</Table.Th>
                <Table.Th>Sort order</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} />
              ) : (
                data?.items.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <Text
                        component={Link}
                        to={`/categories/${category.id}`}
                        size="sm"
                        fw={500}
                        c="blue"
                        style={{ textDecoration: 'none' }}
                      >
                        {category.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {category.slug}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatNumber(category.productCount)}</Table.Td>
                    <Table.Td>{category.sortOrder}</Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        radius="sm"
                        color={category.isActive ? 'green' : 'gray'}
                      >
                        {category.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDateTime(category.updatedAt)}</Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <Menu shadow="md" position="bottom-end" width={170}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" aria-label="Category actions">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              component={Link}
                              to={`/categories/${category.id}`}
                              leftSection={<IconEdit size={14} />}
                            >
                              {canWrite ? 'Edit' : 'View'}
                            </Menu.Item>
                            {canWrite && (
                              <>
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => setPendingDelete(category)}
                                >
                                  Delete
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          {data && <PaginationBar pagination={data.pagination} onPageChange={setPage} />}
        </>
      )}

      <ConfirmDialog
        opened={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteCategory.mutate(pendingDelete.id, {
              onSettled: () => setPendingDelete(null),
            })
          }
        }}
        title="Delete category"
        message={
          pendingDelete && pendingDelete.productCount > 0
            ? `"${pendingDelete.name}" still has ${pendingDelete.productCount} product(s). Move or delete them first — the server will refuse to delete it otherwise.`
            : `Delete "${pendingDelete?.name}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        loading={deleteCategory.isPending}
      />
    </>
  )
}
