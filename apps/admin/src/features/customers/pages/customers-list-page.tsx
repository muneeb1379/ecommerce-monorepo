import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Group, Select, Table, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconSearch, IconUsers } from '@tabler/icons-react'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { useCurrency } from '@/features/dashboard/hooks/use-currency'
import { useCustomers } from '@/features/customers/hooks/use-customers'
import type { CustomerSort } from '@/types/api'

const sortOptions = [
  { value: 'created-desc', label: 'Newest customers' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'spent-desc', label: 'Top spenders' },
  { value: 'orders-desc', label: 'Most orders' },
]

export function CustomersListPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState<CustomerSort>('created-desc')
  const [search] = useDebouncedValue(searchInput, 300)
  const currency = useCurrency()

  const { data, isLoading, isError, error, refetch } = useCustomers({
    page,
    pageSize: 20,
    search,
    sort,
  })

  return (
    <>
      <PageHeader title="Customers" description="Everyone who has placed an order" />

      <Group mb="md">
        <TextInput
          placeholder="Search by name, email or phone…"
          leftSection={<IconSearch size={16} />}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.currentTarget.value)
            setPage(1)
          }}
          w={300}
        />
        <Select
          data={sortOptions}
          value={sort}
          onChange={(value) => {
            setSort((value ?? 'created-desc') as CustomerSort)
            setPage(1)
          }}
          w={190}
          allowDeselect={false}
        />
      </Group>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !isLoading && data?.items.length === 0 ? (
        <EmptyState icon={<IconUsers size={24} />} title="No customers found" />
      ) : (
        <>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Orders</Table.Th>
                <Table.Th>Total spent</Table.Th>
                <Table.Th>Last order</Table.Th>
                <Table.Th>Customer since</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <TableSkeleton columns={7} rows={8} />
              ) : (
                data?.items.map((customer) => (
                  <Table.Tr key={customer.id}>
                    <Table.Td>
                      <Text
                        component={Link}
                        to={`/customers/${customer.id}`}
                        size="sm"
                        fw={500}
                        c="blue"
                        style={{ textDecoration: 'none' }}
                      >
                        {customer.fullName}
                      </Text>
                    </Table.Td>
                    <Table.Td>{customer.email}</Table.Td>
                    <Table.Td>{customer.phone ?? '—'}</Table.Td>
                    <Table.Td>{customer.ordersCount}</Table.Td>
                    <Table.Td>{formatCurrency(customer.totalSpent, currency)}</Table.Td>
                    <Table.Td>
                      {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : '—'}
                    </Table.Td>
                    <Table.Td>{formatDate(customer.createdAt)}</Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          {data && <PaginationBar pagination={data.pagination} onPageChange={setPage} />}
        </>
      )}
    </>
  )
}
