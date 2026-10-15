import { Skeleton, Table } from '@mantine/core'

interface TableSkeletonProps {
  rows?: number
  columns: number
}

export function TableSkeleton({ rows = 8, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Table.Tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Table.Td key={colIndex}>
              <Skeleton height={16} radius="sm" />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  )
}
