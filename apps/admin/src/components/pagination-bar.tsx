import { Group, Pagination, Text } from '@mantine/core'
import type { Pagination as PaginationMeta } from '@/types/api'

interface PaginationBarProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
}

export function PaginationBar({ pagination, onPageChange }: PaginationBarProps) {
  if (pagination.total === 0) return null

  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)

  return (
    <Group justify="space-between" mt="md">
      <Text size="sm" c="dimmed">
        Showing {start}–{end} of {pagination.total}
      </Text>
      <Pagination
        total={pagination.totalPages}
        value={pagination.page}
        onChange={onPageChange}
        size="sm"
      />
    </Group>
  )
}
