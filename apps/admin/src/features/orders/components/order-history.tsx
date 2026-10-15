import { Paper, Text, Timeline, Title } from '@mantine/core'
import { formatDateTime } from '@/lib/format'
import type { OrderHistoryEntry } from '@/types/api'

/** Status changes, newest first, with who made them and any note. */
export function OrderHistory({ history }: { history: OrderHistoryEntry[] }) {
  const entries = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <Paper withBorder radius="md" p="lg">
      <Title order={5} mb="md">
        History
      </Title>
      {entries.length === 0 ? (
        <Text size="sm" c="dimmed">
          No status changes recorded.
        </Text>
      ) : (
        <Timeline active={0} bulletSize={14} lineWidth={2}>
          {entries.map((entry, index) => (
            <Timeline.Item
              key={`${entry.createdAt}-${index}`}
              title={
                <Text size="sm" fw={500} tt="capitalize">
                  {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
                </Text>
              }
            >
              {entry.note && (
                <Text size="xs" c="dimmed">
                  {entry.note}
                </Text>
              )}
              <Text size="xs" c="dimmed" mt={2}>
                {formatDateTime(entry.createdAt)}
                {entry.changedByName ? ` · ${entry.changedByName}` : ''}
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Paper>
  )
}
