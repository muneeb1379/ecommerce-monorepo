import { useEffect, useState } from 'react'
import { Button, Group, Select, TextInput } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDebouncedValue } from '@mantine/hooks'
import { IconCalendar, IconSearch } from '@tabler/icons-react'
import { useOrderFiltersStore } from '@/stores/list-filters.store'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const paymentStatusOptions = [
  { value: 'all', label: 'All payments' },
  { value: 'pending', label: 'Payment pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
]

const sortOptions = [
  { value: 'created-desc', label: 'Newest first' },
  { value: 'created-asc', label: 'Oldest first' },
  { value: 'total-desc', label: 'Total (high to low)' },
  { value: 'total-asc', label: 'Total (low to high)' },
]

export function OrderFiltersBar() {
  const { search, status, paymentStatus, dateFrom, dateTo, sort, setFilters, reset } =
    useOrderFiltersStore()
  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch] = useDebouncedValue(searchInput, 300)

  useEffect(() => {
    // Only react to real changes so returning from a detail page keeps the current page.
    if (debouncedSearch !== search) setFilters({ search: debouncedSearch })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const hasFilters =
    search !== '' ||
    status !== 'all' ||
    paymentStatus !== 'all' ||
    dateFrom !== undefined ||
    dateTo !== undefined ||
    sort !== 'created-desc'

  return (
    <Group mb="md" wrap="wrap">
      <TextInput
        placeholder="Order #, customer name or email…"
        leftSection={<IconSearch size={16} />}
        value={searchInput}
        onChange={(e) => setSearchInput(e.currentTarget.value)}
        w={280}
      />
      <Select
        data={statusOptions}
        value={status}
        onChange={(value) => setFilters({ status: (value ?? 'all') as typeof status })}
        w={160}
        allowDeselect={false}
      />
      <Select
        data={paymentStatusOptions}
        value={paymentStatus}
        onChange={(value) =>
          setFilters({ paymentStatus: (value ?? 'all') as typeof paymentStatus })
        }
        w={170}
        allowDeselect={false}
      />
      <DatePickerInput
        type="range"
        placeholder="Order date range"
        leftSection={<IconCalendar size={16} />}
        clearable
        valueFormat="MMM D, YYYY"
        w={250}
        value={[dateFrom ?? null, dateTo ?? null]}
        onChange={([from, to]) =>
          setFilters({ dateFrom: from ?? undefined, dateTo: to ?? undefined })
        }
      />
      <Select
        data={sortOptions}
        value={sort}
        onChange={(value) => setFilters({ sort: (value ?? 'created-desc') as typeof sort })}
        w={180}
        allowDeselect={false}
      />
      {hasFilters && (
        <Button
          variant="subtle"
          color="gray"
          onClick={() => {
            setSearchInput('')
            reset()
          }}
        >
          Clear filters
        </Button>
      )}
    </Group>
  )
}
